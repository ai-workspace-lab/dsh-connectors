import type { Context } from '@deepseek-ai/cordis'

import { NS } from './config.ts'

export interface TuiSettingsSection {
  readonly ns: string
  readonly title: string
  readonly groups?: readonly { readonly id: string; readonly title: string }[]
  readonly fields: readonly {
    readonly path: readonly string[]
    readonly label: string
    readonly hint?: string
    readonly group?: string
    readonly kind: 'text' | 'number' | 'boolean' | 'select'
  }[]
}

export interface TuiSettingsSectionsService {
  register(section: TuiSettingsSection): () => void
}

export function buildConnectorsTuiSection(): TuiSettingsSection {
  return {
    ns: NS,
    title: 'Connectors',
    groups: [
      { id: 'general', title: 'General' },
    ],
    fields: [
      {
        path: ['autoConnect'],
        label: 'Auto-connect enabled connectors on startup',
        group: 'general',
        kind: 'boolean',
      },
      {
        path: ['requestTimeoutMs'],
        label: 'Remote MCP & API probe timeout (ms)',
        group: 'general',
        kind: 'number',
      },
    ],
  }
}

export function applyConnectorsTuiSettings(ctx: Context): () => void {
  const tui = (ctx as unknown as { get?: (n: string) => unknown }).get?.('tui.settings.sections') as TuiSettingsSectionsService | undefined
  if (!tui || typeof tui.register !== 'function') {
    return () => {}
  }
  return tui.register(buildConnectorsTuiSection())
}
