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
export const inject = {
  optional: ['credentials', 'webServer', 'settings', 'commands', 'tools'],
}

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

export function apply(ctx: Context, config: Partial<Config> = {}): void {
  const logger = ctx.logger('connectors')
  const resolved = resolveConfig(config)
  const service = new ConnectorsService(ctx, resolved)
  const provide = (ctx as unknown as { provide?: (name: string, value: unknown) => void }).provide
  if (typeof provide === 'function') {
    provide.call(ctx, 'connectors', service)
  }

  ctx.effect(() => {
    const disposeRoutes = applyRoutes(ctx, { service })
    const disposeCommands = applyCommands(ctx, service)
    const disposeTui = applyConnectorsTuiSettings(ctx)
    return () => {
      disposeTui()
      disposeCommands()
      disposeRoutes()
      service.disposeAll()
    }
  }, 'dsh-connectors: lifecycle')

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
