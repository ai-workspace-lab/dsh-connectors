import { buildAuthHeaders, discoverRemoteMcpTools, type RemoteMcpTool } from './mcp-bridge.ts'
import { normalizeHttpUrl, safeErrorMessage } from './sanitize.ts'
import type {
  ConnectorDefinition,
  ConnectorInstanceSettings,
  ConnectionState,
  ResolvedConnectorAuth,
} from './types.ts'

export interface ProbeResult {
  readonly state: ConnectionState
  readonly latencyMs: number
  readonly message: string
  readonly accountLabel?: string | undefined
  readonly mcpTools: readonly RemoteMcpTool[]
  readonly sessionId?: string | undefined
}

async function probeRestIdentity(options: {
  definition: ConnectorDefinition
  settings: ConnectorInstanceSettings
  auth: ResolvedConnectorAuth
  fetchFn: typeof fetch
  signal: AbortSignal
}): Promise<{ ok: boolean; accountLabel?: string; message?: string }> {
  const baseUrl = normalizeHttpUrl(options.settings.baseUrl || options.definition.defaultBaseUrl)
  const authHeader = options.settings.headerName || options.definition.defaultAuthHeader || 'Authorization'
  const authPrefix = options.definition.defaultAuthPrefix ?? 'Bearer'
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...buildAuthHeaders(options.auth, authHeader, authPrefix),
  }

  switch (options.definition.id) {
    case 'github': {
      const res = await options.fetchFn(`${baseUrl}/user`, {
        headers: { ...headers, 'user-agent': 'dsh-connectors/0.1.0' },
        signal: options.signal,
      })
      if (!res.ok) return { ok: false, message: `GitHub API returned HTTP ${res.status}` }
      const body = await res.json() as { login?: string }
      return { ok: true, accountLabel: body.login ? `@${body.login}` : 'GitHub' }
    }
    case 'gitea': {
      const res = await options.fetchFn(`${baseUrl}/api/v1/user`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `Gitea API returned HTTP ${res.status}` }
      const body = await res.json() as { login?: string; username?: string }
      return { ok: true, accountLabel: body.login || body.username || 'Gitea' }
    }
    case 'gitlab': {
      const res = await options.fetchFn(`${baseUrl}/api/v4/user`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `GitLab API returned HTTP ${res.status}` }
      const body = await res.json() as { username?: string }
      return { ok: true, accountLabel: body.username ? `@${body.username}` : 'GitLab' }
    }
    case 'gmail': {
      const res = await options.fetchFn(`${baseUrl}/gmail/v1/users/me/profile`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `Gmail API returned HTTP ${res.status}` }
      const body = await res.json() as { emailAddress?: string }
      return { ok: true, accountLabel: body.emailAddress || 'Gmail' }
    }
    case 'google-workspaces': {
      const res = await options.fetchFn(`${baseUrl}/oauth2/v3/userinfo`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `Google Workspaces API returned HTTP ${res.status}` }
      const body = await res.json() as { email?: string }
      return { ok: true, accountLabel: body.email || 'Google Workspaces' }
    }
    case 'vault-server': {
      const vaultHeaders: Record<string, string> = {
        ...headers,
        ...(options.settings.namespace ? { 'X-Vault-Namespace': options.settings.namespace } : {}),
      }
      const res = await options.fetchFn(`${baseUrl}/v1/auth/token/lookup-self`, {
        headers: vaultHeaders,
        signal: options.signal,
      })
      if (!res.ok) return { ok: false, message: `Vault returned HTTP ${res.status}` }
      const body = await res.json() as { data?: { display_name?: string } }
      return { ok: true, accountLabel: body.data?.display_name || 'Vault Token' }
    }
    case 'cloudflare': {
      const res = await options.fetchFn(`${baseUrl}/user/tokens/verify`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `Cloudflare API returned HTTP ${res.status}` }
      const body = await res.json() as { success?: boolean; result?: { status?: string } }
      if (body.success === false) return { ok: false, message: 'Cloudflare token verification failed' }
      return { ok: true, accountLabel: body.result?.status || 'Cloudflare' }
    }
    case 'gcp': {
      const url = options.settings.projectId
        ? `${baseUrl}/v1/projects/${encodeURIComponent(options.settings.projectId)}`
        : `${baseUrl}/v1/projects?pageSize=1`
      const res = await options.fetchFn(url, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `GCP API returned HTTP ${res.status}` }
      return { ok: true, accountLabel: options.settings.projectId || 'GCP' }
    }
    case 'linode-vps': {
      const res = await options.fetchFn(`${baseUrl}/profile`, { headers, signal: options.signal })
      if (!res.ok) return { ok: false, message: `Linode API returned HTTP ${res.status}` }
      const body = await res.json() as { username?: string }
      return { ok: true, accountLabel: body.username || 'Linode' }
    }
    case 'aws-lightsail': {
      const hasSecret = Boolean(options.auth.extra?.AWS_SECRET_ACCESS_KEY) || options.auth.token.length > 0
      return hasSecret
        ? { ok: true, accountLabel: options.settings.region || 'us-east-1' }
        : { ok: false, message: 'AWS credentials incomplete' }
    }
    default:
      return { ok: true }
  }
}

export async function probeConnector(options: {
  definition: ConnectorDefinition
  settings: ConnectorInstanceSettings
  auth: ResolvedConnectorAuth | undefined
  fetchFn?: typeof fetch
  timeoutMs?: number
}): Promise<ProbeResult> {
  const started = Date.now()
  const fetchFn = options.fetchFn ?? fetch
  const mcpUrl = normalizeHttpUrl(options.settings.mcpUrl || options.definition.defaultMcpUrl)
  const requiresAuth = !options.definition.authMethods.includes('none')

  if (requiresAuth && !options.auth?.token) {
    return {
      state: 'needs_auth',
      latencyMs: Date.now() - started,
      message: 'Credentials not configured',
      mcpTools: [],
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000)
  timer.unref?.()

  try {
    let mcpTools: readonly RemoteMcpTool[] = []
    let sessionId: string | undefined
    let mcpMessage: string | undefined

    if (mcpUrl) {
      const authHeader = options.settings.headerName || options.definition.defaultAuthHeader || 'Authorization'
      const authPrefix = options.definition.defaultAuthPrefix ?? 'Bearer'
      const headers = buildAuthHeaders(options.auth, authHeader, authPrefix)
      try {
        const discovered = await discoverRemoteMcpTools({
          url: mcpUrl,
          headers,
          fetchFn,
          ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        })
        mcpTools = discovered.tools
        sessionId = discovered.sessionId
        mcpMessage = `MCP connected (${mcpTools.length} tools)`
      } catch (err) {
        if (options.definition.source === 'custom') {
          return {
            state: 'error',
            latencyMs: Date.now() - started,
            message: safeErrorMessage(err),
            mcpTools: [],
          }
        }
        mcpMessage = `MCP unavailable: ${safeErrorMessage(err)}`
      }
    }

    if (options.definition.source === 'builtin' && options.auth) {
      const rest = await probeRestIdentity({
        definition: options.definition,
        settings: options.settings,
        auth: options.auth,
        fetchFn,
        signal: controller.signal,
      })
      if (!rest.ok) {
        return {
          state: 'error',
          latencyMs: Date.now() - started,
          message: rest.message ?? 'Verification failed',
          mcpTools,
          sessionId,
        }
      }
      return {
        state: 'connected',
        latencyMs: Date.now() - started,
        message: mcpTools.length > 0
          ? `${rest.accountLabel ?? options.definition.name} · ${mcpTools.length} MCP tools`
          : (mcpMessage ? `${rest.accountLabel ?? 'Verified'} (${mcpMessage})` : `Connected (${rest.accountLabel ?? 'Verified'})`),
        accountLabel: rest.accountLabel,
        mcpTools,
        sessionId,
      }
    }

    return {
      state: 'connected',
      latencyMs: Date.now() - started,
      message: mcpMessage ?? 'Connected',
      mcpTools,
      sessionId,
    }
  } catch (err) {
    return {
      state: 'error',
      latencyMs: Date.now() - started,
      message: safeErrorMessage(err),
      mcpTools: [],
    }
  } finally {
    clearTimeout(timer)
  }
}
