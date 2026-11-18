import assert from 'node:assert/strict'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'

import { applyCommands } from '../src/commands.ts'
import { resolveConfig } from '../src/config.ts'
import { applyRoutes } from '../src/routes.ts'
import { ConnectorsService } from '../src/service.ts'
import { applyConnectorsTuiSettings } from '../src/tui-settings.ts'

function createHarness() {
  const credStore = new Map<string, unknown>()
  const registeredRoutes = new Map<string, (req: IncomingMessage, res: ServerResponse) => Promise<void> | void>()
  const registeredTools = new Map<string, unknown>()
  const registeredCommands = new Map<string, { run: (args: string) => Promise<string> }>()
  let tuiSection: unknown

  const services: Record<string, unknown> = {
    credentials: {
      async resolve() { return undefined },
      async describe() { return { configured: false, writable: true } },
      async readRecord(k: string) { return credStore.get(k) },
      async describeRecord(k: string) {
        const rec = credStore.get(k) as { kind?: string } | undefined
        return { configured: rec !== undefined, kind: rec?.kind, writable: true }
      },
      async modifyRecord(k: string, mutate: (c: unknown) => Promise<unknown>) {
        const next = await mutate(credStore.get(k))
        if (next !== undefined) credStore.set(k, next)
        return credStore.get(k)
      },
      async deleteRecord(k: string) { credStore.delete(k) },
    },
    webServer: {
      register(route: { kind: string; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) {
        registeredRoutes.set(route.path, route.handler)
        return () => registeredRoutes.delete(route.path)
      },
    },
    tools: {
      register(def: { name: string; output?: { schema?: unknown; render?: unknown } }) {
        if (!def.output || typeof def.output.render !== 'function') {
          throw new TypeError(`tool "${def.name}" must declare output { schema, render, presentationMeta? }`)
        }
        registeredTools.set(def.name, def)
        return () => registeredTools.delete(def.name)
      },
    },
    commands: {
      register(cmd: { name: string; run: (args: string) => Promise<string> }) {
        registeredCommands.set(cmd.name, cmd)
        return () => registeredCommands.delete(cmd.name)
      },
    },
    'tui.settings.sections': {
      register(section: unknown) {
        tuiSection = section
        return () => { tuiSection = undefined }
      },
    },
  }

  const ctx = {
    root: { provide: () => {} },
    get: (name: string) => services[name],
    set: () => {},
    provide: () => {},
    logger: () => ({ info: () => {}, warn: () => {}, debug: () => {} }),
    effect: (fn: () => void | (() => void)) => fn(),
  } as unknown as Context

  const mockFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const target = String(url)
    if (target.includes('api.github.com/user')) {
      return new Response(JSON.stringify({ login: 'octocat' }), { status: 200 })
    }
    if (target.includes('mcp.linear.app')) {
      const req = JSON.parse(String(init?.body ?? '{}')) as { method?: string; id?: number }
      if (req.method === 'initialize') {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2025-03-26' } }), { status: 200 })
      }
      if (req.method === 'tools/list') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: req.id,
          result: { tools: [{ name: 'search_issues', description: 'Search Linear issues' }] },
        }), { status: 200 })
      }
      return new Response('', { status: 202 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }) as typeof fetch

  return {
    ctx,
    credStore,
    registeredRoutes,
    registeredTools,
    registeredCommands,
    getTuiSection: () => tuiSection,
    mockFetch,
  }
}

async function invokeRoute(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
  method: string,
  url: string,
  body?: unknown,
) {
  const req = new PassThrough() as unknown as IncomingMessage & {
    method: string
    url: string
    headers: Record<string, string>
  }
  req.method = method
  req.url = url
  req.headers = { host: '127.0.0.1:3000' }

  let statusCode = 200
  let rawBody = ''
  const res = {
    set statusCode(code: number) { statusCode = code },
    get statusCode() { return statusCode },
    setHeader: () => {},
    end: (chunk?: string) => { rawBody += chunk ?? '' },
  } as unknown as ServerResponse

  const stream = req as unknown as PassThrough
  if (body !== undefined) {
    stream.end(Buffer.from(JSON.stringify(body)))
  } else {
    stream.end()
  }
  await handler(req, res)
  return { statusCode, body: rawBody ? JSON.parse(rawBody) : null }
}

test('ConnectorsService + Routes + Commands + TUI settings work end-to-end', async () => {
  const h = createHarness()
  const service = new ConnectorsService(h.ctx, resolveConfig({ autoConnect: false }), h.mockFetch)
  const disposeRoutes = applyRoutes(h.ctx, { service, fetchFn: h.mockFetch })
  const disposeCommands = applyCommands(h.ctx, service)
  const disposeTui = applyConnectorsTuiSettings(h.ctx)

  // Register external connector package
  const disposePkg = service.registerPackage({
    packageName: '@example/dsh-connector-notion',
    connectors: [{
      id: 'notion',
      name: 'Notion',
      shortDescEn: 'Notion pages & databases',
      shortDescZh: 'Notion 页面与数据库',
      category: 'productivity',
      source: 'package',
      authMethods: ['oauth', 'token'],
      fields: [],
      supportsMcp: true,
    }],
  })

  // GET /plugins/connectors/state returns 10 built-in + 1 package connector
  const stateRes = await invokeRoute(h.registeredRoutes.get('/plugins/connectors/state')!, 'GET', '/plugins/connectors/state')
  assert.equal(stateRes.statusCode, 200)
  assert.equal(stateRes.body.connectors.length, 11)

  // Save GitHub token -> stored in DSH Credential Store, never returned in state
  const tokenRes = await invokeRoute(
    h.registeredRoutes.get('/plugins/connectors/token')!,
    'POST',
    '/plugins/connectors/token',
    { id: 'github', token: 'ghp_supersecret_token_999' },
  )
  assert.equal(tokenRes.statusCode, 200)
  assert.equal(JSON.stringify(tokenRes.body).includes('ghp_supersecret_token_999'), false)
  assert.ok(h.credStore.has('connectors/github'))

  // Add Custom MCP Server & test connection
  const customRes = await invokeRoute(
    h.registeredRoutes.get('/plugins/connectors/custom')!,
    'POST',
    '/plugins/connectors/custom',
    {
      id: 'linear-mcp',
      name: 'Linear MCP',
      mcpUrl: 'https://mcp.linear.app/mcp',
      authMethod: 'none',
      enabled: true,
    },
  )
  assert.equal(customRes.statusCode, 200)

  const testRes = await invokeRoute(
    h.registeredRoutes.get('/plugins/connectors/test')!,
    'POST',
    '/plugins/connectors/test',
    { id: 'linear-mcp' },
  )
  assert.equal(testRes.statusCode, 200)
  assert.equal(testRes.body.result.state, 'connected')
  assert.ok(h.registeredTools.has('mcp__linear-mcp__search_issues'))

  // Slash command works
  const cmdOut = await h.registeredCommands.get('connectors')!.run('')
  assert.ok(cmdOut.includes('github (GitHub)'))
  assert.ok(cmdOut.includes('linear-mcp (Linear MCP)'))

  // TUI settings registered
  assert.ok(h.getTuiSection())

  // Forbidden when desktop verifier rejects
  const lockedRoutes = new Map<string, (req: IncomingMessage, res: ServerResponse) => Promise<void> | void>()
  const lockedCtx = {
    get: (n: string) => n === 'webServer'
      ? { register: (r: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => void }) => { lockedRoutes.set(r.path, r.handler); return () => {} } }
      : undefined,
  } as unknown as Context
  applyRoutes(lockedCtx, { service, verifyDesktop: async () => false })
  const forbidden = await invokeRoute(lockedRoutes.get('/plugins/connectors/state')!, 'GET', '/plugins/connectors/state')
  assert.equal(forbidden.statusCode, 403)

  disposePkg()
  disposeTui()
  disposeCommands()
  disposeRoutes()
  service.disposeAll()
})
