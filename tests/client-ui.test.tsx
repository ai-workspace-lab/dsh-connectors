import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import { BUILTIN_CONNECTORS } from '../src/catalog.ts'
import { ConnectorsSettingsPage } from '../src/client/connectors-page.tsx'
import { apply as applyClient } from '../src/client/index.tsx'
import { dictionaries, type ConnectorsLocaleKey } from '../src/client/locales.ts'

test('client entry registers settings.section for connectors', () => {
  const registered: Array<{ name: string; id: string; label: () => string }> = []
  const ctx = {
    effect: (fn: () => void) => fn(),
    locale: {
      register: () => () => {},
      bind: () => (k: ConnectorsLocaleKey) => dictionaries.zh[k],
    },
    slots: {
      inject: (_name: string, cb: () => () => void) => cb(),
      register: (opts: { name: string; id: string; label: () => string }) => {
        registered.push(opts)
        return () => {}
      },
    },
  } as unknown as Parameters<typeof applyClient>[0]

  applyClient(ctx)
  assert.equal(registered.length, 1)
  assert.equal(registered[0]?.name, 'settings.section')
  assert.equal(registered[0]?.id, 'connectors')
  assert.equal(registered[0]?.label(), '连接器')
})

test('ConnectorsSettingsPage renders all 10 first-batch connectors and custom MCP modal', async () => {
  const win = new Window({ url: 'http://127.0.0.1:3000/' })
  Object.assign(globalThis, {
    window: win,
    document: win.document,
    HTMLElement: win.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const mockConnectors = BUILTIN_CONNECTORS.map((definition) => ({
    definition,
    settings: { enabled: false },
    credential: { configured: false, writable: true },
    runtime: { id: definition.id, state: 'disconnected' as const, tools: [] },
  }))

  const prevFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ connectors: mockConnectors }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch

  const container = win.document.createElement('div')
  win.document.body.appendChild(container)
  const root = createRoot(container)

  try {
    await act(async () => {
      root.render(<ConnectorsSettingsPage t={(k) => dictionaries.zh[k]} />)
    })

    const text = container.textContent ?? ''
    assert.ok(text.includes('连接器'))
    assert.ok(text.includes('GitHub'))
    assert.ok(text.includes('Gitea'))
    assert.ok(text.includes('GitLab'))
    assert.ok(text.includes('Gmail'))
    assert.ok(text.includes('Google Workspaces'))
    assert.ok(text.includes('Vault Server'))
    assert.ok(text.includes('Cloudflare'))
    assert.ok(text.includes('AWS Lightsail'))
    assert.ok(text.includes('GCP'))
    assert.ok(text.includes('Linode VPS'))
  } finally {
    await act(async () => {
      root.unmount()
    })
    globalThis.fetch = prevFetch
    await win.close()
  }
})
