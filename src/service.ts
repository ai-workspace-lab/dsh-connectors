import type { Context } from '@deepseek-ai/cordis'

import { BUILTIN_CONNECTORS } from './catalog.ts'
import { NS, type ResolvedConnectorsConfig } from './config.ts'
import {
  deleteConnectorCredential,
  describeConnectorCredential,
  resolveConnectorAuth,
  saveTokenCredential,
} from './credentials.ts'
import {
  buildAuthHeaders,
  registerMcpToolsOnRegistry,
  type ToolRegistryLike,
} from './mcp-bridge.ts'
import { OAuthFlowManager } from './oauth.ts'
import { probeConnector, type ProbeResult } from './probe.ts'
import { isValidConnectorSlug, normalizeHttpUrl, safeErrorMessage } from './sanitize.ts'
import type {
  ConnectorDefinition,
  ConnectorInstanceSettings,
  ConnectorPackage,
  ConnectorRuntimeState,
  ConnectorView,
  CustomMcpConnectorSpec,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    connectors: ConnectorsService
  }
}

interface SettingsMutatorLike {
  mutate?(ns: string, operations: Array<{ op: 'set'; path: string[]; value: unknown }>): Promise<unknown>
}

export class ConnectorsService {
  private readonly ctx: Context
  private readonly packages = new Map<string, ConnectorPackage>()
  private readonly runtime = new Map<string, ConnectorRuntimeState>()
  private readonly toolDisposers = new Map<string, () => void>()
  readonly oauth = new OAuthFlowManager()
  private state: ResolvedConnectorsConfig
  private readonly fetchFn: typeof fetch

  constructor(
    ctx: Context,
    initialConfig: ResolvedConnectorsConfig,
    fetchFn: typeof fetch = fetch,
  ) {
    this.ctx = ctx
    this.state = initialConfig
    this.fetchFn = fetchFn
  }

  /**
   * Allow other DSH plugins to contribute connector packages.
   */
  registerPackage(pkg: ConnectorPackage): () => void {
    const normalized: ConnectorPackage = {
      packageName: pkg.packageName,
      connectors: pkg.connectors.map((item) => ({
        ...item,
        source: 'package' as const,
        packageName: pkg.packageName,
      })),
    }
    this.packages.set(pkg.packageName, normalized)
    return () => {
      this.packages.delete(pkg.packageName)
      for (const item of normalized.connectors) {
        this.disposeTools(item.id)
        this.runtime.delete(item.id)
      }
    }
  }

  listDefinitions(): ConnectorDefinition[] {
    const customDefs: ConnectorDefinition[] = this.state.customConnectors.map((custom) => ({
      id: custom.id,
      name: custom.name,
      shortDescEn: `Custom remote MCP server (${custom.mcpUrl})`,
      shortDescZh: `自定义远程 MCP 服务器 (${custom.mcpUrl})`,
      category: 'custom',
      source: 'custom',
      authMethods: [custom.authMethod],
      defaultMcpUrl: custom.mcpUrl,
      defaultAuthHeader: custom.headerName || 'Authorization',
      defaultAuthPrefix: custom.authMethod === 'header' ? '' : 'Bearer',
      defaultEnvRef: custom.envRef,
      oauth: custom.oauthAuthorizeUrl && custom.oauthTokenUrl
        ? {
            authorizeUrl: custom.oauthAuthorizeUrl,
            tokenUrl: custom.oauthTokenUrl,
            defaultScopes: custom.oauthScopes ? custom.oauthScopes.split(/\s+/).filter(Boolean) : [],
            pkce: true,
          }
        : undefined,
      fields: [
        { key: 'mcpUrl', labelKey: 'fieldMcpUrl', placeholder: custom.mcpUrl, required: true },
        ...(custom.authMethod === 'header'
          ? [{ key: 'headerName' as const, labelKey: 'fieldHeaderName', placeholder: custom.headerName || 'X-API-Key' }]
          : []),
        ...(custom.authMethod === 'oauth'
          ? [{ key: 'oauthClientId' as const, labelKey: 'fieldOAuthClientId', placeholder: 'OAuth Client ID' }]
          : []),
        { key: 'envRef', labelKey: 'fieldEnvRef', placeholder: 'CUSTOM_MCP_TOKEN' },
      ],
      supportsMcp: true,
    }))

    const packageDefs = Array.from(this.packages.values()).flatMap((p) => p.connectors)
    return [...BUILTIN_CONNECTORS, ...packageDefs, ...customDefs]
  }

  findDefinition(id: string): ConnectorDefinition | undefined {
    return this.listDefinitions().find((item) => item.id === id)
  }

  getInstanceSettings(id: string): ConnectorInstanceSettings {
    const custom = this.state.customConnectors.find((c) => c.id === id)
    const saved = this.state.instances[id]
    if (saved) return saved
    if (custom) {
      return {
        enabled: custom.enabled,
        authMethod: custom.authMethod,
        mcpUrl: custom.mcpUrl,
        headerName: custom.headerName,
        envRef: custom.envRef,
        oauthClientId: custom.oauthClientId,
        oauthScopes: custom.oauthScopes,
      }
    }
    return { enabled: false }
  }

  async updateInstanceSettings(id: string, patch: Partial<ConnectorInstanceSettings>): Promise<ConnectorInstanceSettings> {
    const prev = this.getInstanceSettings(id)
    const next: ConnectorInstanceSettings = {
      ...prev,
      ...patch,
      ...(patch.baseUrl !== undefined ? { baseUrl: normalizeHttpUrl(patch.baseUrl) } : {}),
      ...(patch.mcpUrl !== undefined ? { mcpUrl: normalizeHttpUrl(patch.mcpUrl) } : {}),
    }
    this.state = {
      ...this.state,
      instances: {
        ...this.state.instances,
        [id]: next,
      },
    }
    await this.persistSettings('instances', this.state.instances)

    if (!next.enabled) {
      this.disposeTools(id)
      this.runtime.set(id, {
        id,
        state: 'disconnected',
        tools: [],
      })
    } else if (this.state.autoConnect) {
      await this.connectAndSync(id).catch(() => undefined)
    }
    return next
  }

  async upsertCustomConnector(spec: CustomMcpConnectorSpec): Promise<CustomMcpConnectorSpec> {
    const id = spec.id.trim().toLowerCase()
    if (!isValidConnectorSlug(id)) {
      throw new Error('Custom connector ID must be lowercase alphanumeric with hyphens (2-48 chars)')
    }
    if (BUILTIN_CONNECTORS.some((b) => b.id === id)) {
      throw new Error(`Connector ID "${id}" is reserved for a built-in connector`)
    }
    const mcpUrl = normalizeHttpUrl(spec.mcpUrl)
    if (!mcpUrl) {
      throw new Error('MCP URL is required')
    }
    const cleanSpec: CustomMcpConnectorSpec = {
      ...spec,
      id,
      name: spec.name.trim() || id,
      mcpUrl,
      oauthAuthorizeUrl: normalizeHttpUrl(spec.oauthAuthorizeUrl),
      oauthTokenUrl: normalizeHttpUrl(spec.oauthTokenUrl),
    }

    const existingIndex = this.state.customConnectors.findIndex((c) => c.id === id)
    const nextList = [...this.state.customConnectors]
    if (existingIndex >= 0) {
      nextList[existingIndex] = cleanSpec
    } else {
      nextList.push(cleanSpec)
    }
    this.state = { ...this.state, customConnectors: nextList }
    await this.persistSettings('customConnectors', nextList)

    await this.updateInstanceSettings(id, {
      enabled: cleanSpec.enabled,
      authMethod: cleanSpec.authMethod,
      mcpUrl: cleanSpec.mcpUrl,
      headerName: cleanSpec.headerName,
      envRef: cleanSpec.envRef,
      oauthClientId: cleanSpec.oauthClientId,
      oauthScopes: cleanSpec.oauthScopes,
    })
    return cleanSpec
  }

  async removeCustomConnector(id: string): Promise<void> {
    this.disposeTools(id)
    this.runtime.delete(id)
    const nextList = this.state.customConnectors.filter((c) => c.id !== id)
    const nextInstances = { ...this.state.instances }
    delete nextInstances[id]
    this.state = {
      ...this.state,
      customConnectors: nextList,
      instances: nextInstances,
    }
    await this.persistSettings('customConnectors', nextList)
    await this.persistSettings('instances', nextInstances)
    await deleteConnectorCredential(this.ctx, id)
  }

  async saveToken(id: string, token: string, extraEnv?: Readonly<Record<string, string>>): Promise<void> {
    await saveTokenCredential(this.ctx, id, token, extraEnv)
    await this.updateInstanceSettings(id, { enabled: true })
  }

  async clearCredential(id: string): Promise<void> {
    await deleteConnectorCredential(this.ctx, id)
    this.disposeTools(id)
    this.runtime.set(id, {
      id,
      state: 'needs_auth',
      tools: [],
      message: 'Credentials removed',
    })
  }

  async connectAndSync(id: string): Promise<ProbeResult> {
    const def = this.findDefinition(id)
    if (!def) {
      throw new Error(`Unknown connector: ${id}`)
    }
    const settings = this.getInstanceSettings(id)
    const fallbackEnvRef = settings.envRef || def.defaultEnvRef
    const auth = await resolveConnectorAuth(this.ctx, id, fallbackEnvRef, this.fetchFn)

    this.runtime.set(id, {
      id,
      state: 'connecting',
      tools: this.runtime.get(id)?.tools ?? [],
    })

    const result = await probeConnector({
      definition: def,
      settings,
      auth,
      fetchFn: this.fetchFn,
      timeoutMs: this.state.requestTimeoutMs,
    })

    this.disposeTools(id)
    const mcpUrl = normalizeHttpUrl(settings.mcpUrl || def.defaultMcpUrl)
    let summaries: import('./types.ts').McpToolSummary[] = result.mcpTools.map((t) => ({
      name: t.name,
      qualifiedName: `mcp__${id}__${t.name}`,
      description: t.description,
    }))

    if (mcpUrl && result.mcpTools.length > 0 && settings.enabled) {
      const registry = (this.ctx as unknown as { get?: (n: string) => unknown }).get?.('tools') as ToolRegistryLike | undefined
      const authHeader = settings.headerName || def.defaultAuthHeader || 'Authorization'
      const authPrefix = def.defaultAuthPrefix ?? 'Bearer'
      const registered = registerMcpToolsOnRegistry({
        registry,
        connectorId: id,
        mcpUrl,
        tools: result.mcpTools,
        sessionId: result.sessionId,
        fetchFn: this.fetchFn,
        resolveHeaders: async () => {
          const freshAuth = await resolveConnectorAuth(this.ctx, id, fallbackEnvRef, this.fetchFn)
          return buildAuthHeaders(freshAuth, authHeader, authPrefix)
        },
      })
      summaries = registered.summaries
      this.toolDisposers.set(id, registered.dispose)
    }

    this.runtime.set(id, {
      id,
      state: result.state,
      lastCheckedAt: Date.now(),
      latencyMs: result.latencyMs,
      message: result.message,
      accountLabel: result.accountLabel,
      tools: summaries,
    })

    return result
  }

  async listViews(): Promise<ConnectorView[]> {
    const definitions = this.listDefinitions()
    return Promise.all(definitions.map(async (definition) => {
      const settings = this.getInstanceSettings(definition.id)
      const fallbackEnvRef = settings.envRef || definition.defaultEnvRef
      const credential = await describeConnectorCredential(this.ctx, definition.id, fallbackEnvRef)
      const runtime = this.runtime.get(definition.id) ?? {
        id: definition.id,
        state: settings.enabled ? (credential.configured ? 'disconnected' : 'needs_auth') : 'disconnected',
        tools: [],
      }
      return {
        definition,
        settings,
        credential,
        runtime,
      }
    }))
  }

  async syncEnabledConnectors(): Promise<void> {
    if (!this.state.autoConnect) return
    const defs = this.listDefinitions()
    for (const def of defs) {
      const settings = this.getInstanceSettings(def.id)
      if (settings.enabled) {
        await this.connectAndSync(def.id).catch((err) => {
          this.runtime.set(def.id, {
            id: def.id,
            state: 'error',
            lastCheckedAt: Date.now(),
            message: safeErrorMessage(err),
            tools: [],
          })
        })
      }
    }
  }

  disposeAll(): void {
    for (const id of Array.from(this.toolDisposers.keys())) {
      this.disposeTools(id)
    }
  }

  private disposeTools(id: string): void {
    const dispose = this.toolDisposers.get(id)
    if (dispose) {
      try {
        dispose()
      } catch {
        // Best-effort cleanup
      }
      this.toolDisposers.delete(id)
    }
  }

  private async persistSettings(key: 'instances' | 'customConnectors', value: unknown): Promise<void> {
    const settingsSvc = (this.ctx as unknown as { get?: (n: string) => unknown }).get?.('settings') as SettingsMutatorLike | undefined
    if (settingsSvc && typeof settingsSvc.mutate === 'function') {
      try {
        await settingsSvc.mutate(NS, [{ op: 'set', path: [key], value }])
      } catch {
        // Non-fatal in test/headless environments without writable config file
      }
    }
  }
}
