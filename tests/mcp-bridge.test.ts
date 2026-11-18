import assert from 'node:assert/strict'
import test from 'node:test'

import {
  discoverRemoteMcpTools,
  qualifyConnectorToolName,
  registerMcpToolsOnRegistry,
} from '../src/mcp-bridge.ts'

test('discoverRemoteMcpTools handles JSON and SSE responses and registers tools on ctx.tools', async () => {
  const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const req = JSON.parse(String(init?.body ?? '{}')) as { method?: string; id?: number }
    if (req.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: 'mock-mcp' },
        },
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'mcp-session-id': 'sess-42',
        },
      })
    }
    if (req.method === 'notifications/initialized') {
      return new Response('', { status: 202 })
    }
    if (req.method === 'tools/list') {
      const sse = [
        'event: message',
        `data: ${JSON.stringify({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            tools: [
              { name: 'list_repos', description: 'List repositories' },
              { name: 'get_issue', description: 'Get issue details' },
            ],
          },
        })}`,
        '',
        '',
      ].join('\n')
      return new Response(sse, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    }
    if (req.method === 'tools/call') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: req.id,
        result: { content: [{ type: 'text', text: 'ok' }] },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response('Not found', { status: 404 })
  }) as typeof fetch

  const discovery = await discoverRemoteMcpTools({
    url: 'https://mcp.example.com/mcp',
    headers: { Authorization: 'Bearer tok' },
    fetchFn: mockFetch,
  })

  assert.equal(discovery.serverName, 'mock-mcp')
  assert.equal(discovery.sessionId, 'sess-42')
  assert.equal(discovery.tools.length, 2)

  const registered = new Map<string, { execute: (input: Record<string, unknown>) => Promise<unknown> }>()
  const { summaries, dispose } = registerMcpToolsOnRegistry({
    registry: {
      register: (def) => {
        registered.set(def.name, def)
        return () => registered.delete(def.name)
      },
    },
    connectorId: 'github',
    mcpUrl: 'https://mcp.example.com/mcp',
    tools: discovery.tools,
    sessionId: discovery.sessionId,
    fetchFn: mockFetch,
    resolveHeaders: async () => ({ Authorization: 'Bearer tok' }),
  })

  assert.equal(summaries.length, 2)
  assert.equal(qualifyConnectorToolName('github', 'list_repos'), 'mcp__github__list_repos')
  assert.ok(registered.has('mcp__github__list_repos'))

  const callResult = await registered.get('mcp__github__list_repos')!.execute({})
  assert.deepEqual(callResult, { content: [{ type: 'text', text: 'ok' }] })

  dispose()
  assert.equal(registered.size, 0)
})
