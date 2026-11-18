import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-settings'

import { applyCommands } from './commands.ts'
import { Config, NS, resolveConfig } from './config.ts'
import { applyRoutes } from './routes.ts'
import { ConnectorsService } from './service.ts'
import { applyConnectorsTuiSettings } from './tui-settings.ts'

export const name = '@ai-workspace-lab/dsh-connectors'
export const inject: string[] = []

export { Config, NS, resolveConfig }
export { BUILTIN_CONNECTORS, findBuiltinConnector } from './catalog.ts'
export {
  CREDENTIAL_SCOPE,
  connectorCredentialKey,
  deleteConnectorCredential,
  describeConnectorCredential,
  resolveConnectorAuth,
  saveOAuthGrant,
  saveTokenCredential,
} from './credentials.ts'
export {
  DEFAULT_GITHUB_CLIENT_ID,
  importLocalGitHubOidcOrCliAuth,
  pollGitHubDeviceFlow,
  registerBuiltinGitHubTools,
  startGitHubDeviceFlow,
} from './github-oidc.ts'
export {
  buildAuthHeaders,
  callRemoteMcpTool,
  discoverRemoteMcpTools,
  qualifyConnectorToolName,
  registerMcpToolsOnRegistry,
} from './mcp-bridge.ts'
export { OAuthFlowManager } from './oauth.ts'
export { probeConnector } from './probe.ts'
export { applyRoutes } from './routes.ts'
export { ConnectorsService } from './service.ts'
export { applyCommands } from './commands.ts'
export { applyConnectorsTuiSettings, buildConnectorsTuiSection } from './tui-settings.ts'
export type * from './types.ts'

function onServiceAvailable(
  ctx: Context,
  serviceName: string,
  callback: (serviceCtx: Context) => () => void,
): void {
  const injectFn = (ctx as unknown as { inject?: (deps: string[], cb: (c: Context) => void) => void }).inject
  if (typeof injectFn === 'function') {
    injectFn.call(ctx, [serviceName], (serviceCtx: Context) => {
      const dispose = callback(serviceCtx)
      serviceCtx.effect(() => dispose, `dsh-connectors: ${serviceName}`)
    })
    return
  }
  if ((ctx as unknown as { get?: (n: string) => unknown }).get?.(serviceName)) {
    const dispose = callback(ctx)
    ctx.effect(() => dispose, `dsh-connectors: ${serviceName}`)
  }
}

export function apply(ctx: Context, config: Partial<Config> = {}): void {
  const logger = ctx.logger('connectors')
  const resolved = resolveConfig(config)
  const service = new ConnectorsService(ctx, resolved)
  const provide = (ctx as unknown as { provide?: (name: string, value: unknown) => void }).provide
  if (typeof provide === 'function') {
    provide.call(ctx, 'connectors', service)
  }

  onServiceAvailable(ctx, 'webServer', (webCtx) => applyRoutes(webCtx, { service }))
  onServiceAvailable(ctx, 'commands', (cmdCtx) => applyCommands(cmdCtx, service))
  onServiceAvailable(ctx, 'tui.settings.sections', (tuiCtx) => applyConnectorsTuiSettings(tuiCtx))

  ctx.effect(() => () => {
    service.disposeAll()
  }, 'dsh-connectors: dispose-tools')

  ctx.effect(() => {
    const timer = setTimeout(() => {
      void service.syncEnabledConnectors().catch((err) => {
        logger.warn('dsh-connectors: initial sync failed: %s', err instanceof Error ? err.message : String(err))
      })
    }, 250)
    timer.unref?.()
    return () => clearTimeout(timer)
  }, 'dsh-connectors: startup-sync')

  logger.info('dsh-connectors initialized with %d built-in connectors', service.listDefinitions().length)
}
