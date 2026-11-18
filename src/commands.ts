import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-commands'

import { safeErrorMessage } from './sanitize.ts'
import type { ConnectorsService } from './service.ts'

interface CommandRegistryLike {
  register?(cmd: {
    name: string
    description: string
    usage?: string
    run: (args: string) => Promise<string>
  }): () => void
}

async function formatConnectorsList(service: ConnectorsService): Promise<string> {
  const views = await service.listViews()
  const lines = ['Connectors:']
  for (const v of views) {
    const status = v.runtime.state
    const cred = v.credential.configured ? `auth:${v.credential.kind ?? 'ok'}` : 'auth:none'
    const tools = v.runtime.tools.length > 0 ? ` · ${v.runtime.tools.length} MCP tools` : ''
    const enabled = v.settings.enabled ? 'on' : 'off'
    lines.push(`- ${v.definition.id} (${v.definition.name}) [${enabled}] · ${status} · ${cred}${tools}`)
  }
  return lines.join('\n')
}

export function applyCommands(ctx: Context, service: ConnectorsService): () => void {
  const commands = (ctx as unknown as { get?: (n: string) => unknown }).get?.('commands') as CommandRegistryLike | undefined
  if (!commands || typeof commands.register !== 'function') {
    return () => {}
  }

  const disposers: Array<() => void> = []

  disposers.push(commands.register({
    name: 'connectors',
    description: 'List configured connectors and their remote MCP status.',
    usage: '/connectors',
    run: async () => formatConnectorsList(service),
  }))

  disposers.push(commands.register({
    name: 'connector',
    description: 'Test or inspect a specific connector (e.g. /connector test github).',
    usage: '/connector <list|test <id>>',
    run: async (rawArgs) => {
      const parts = rawArgs.trim().split(/\s+/).filter(Boolean)
      const sub = parts[0] ?? 'list'
      if (sub === 'list') {
        return formatConnectorsList(service)
      }
      if (sub === 'test' && parts[1]) {
        try {
          const result = await service.connectAndSync(parts[1])
          return `${parts[1]}: ${result.state} (${result.latencyMs}ms) — ${result.message}`
        } catch (err) {
          return `${parts[1]}: error — ${safeErrorMessage(err)}`
        }
      }
      return 'Usage: /connector <list|test <id>>'
    },
  }))

  return () => {
    for (const d of disposers) d()
  }
}
