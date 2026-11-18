import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'

import {
  importLocalGitHubOidcOrCliAuth,
  pollGitHubDeviceFlow,
  registerBuiltinGitHubTools,
  startGitHubDeviceFlow,
} from '../src/github-oidc.ts'

test('GitHub OIDC / Device Flow / SSO and built-in GitHub MCP tools work end-to-end', async () => {
  const store = new Map<string, unknown>()
  const ctx = {
    get: (name: string) => name === 'credentials'
      ? {
          async modifyRecord(k: string, mutate: (c: unknown) => Promise<unknown>) {
            const next = await mutate(store.get(k))
            if (next !== undefined) store.set(k, next)
            return store.get(k)
          },
        }
      : undefined,
  } as unknown as Context

  const mockFetch = (async (url: RequestInfo | URL) => {
    const target = String(url)
    if (target.includes('/login/device/code')) {
      return new Response(JSON.stringify({
        device_code: 'dev-code-1',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }), { status: 200 })
    }
    if (target.includes('/login/oauth/access_token')) {
      return new Response(JSON.stringify({
        access_token: 'gho_device_flow_token',
        token_type: 'Bearer',
        scope: 'repo read:user',
      }), { status: 200 })
    }
    if (target.endsWith('/user')) {
      return new Response(JSON.stringify({ login: 'haitaopanhq' }), { status: 200 })
    }
    if (target.includes('/search/repositories')) {
      return new Response(JSON.stringify({ total_count: 1, items: [{ full_name: 'ai-workspace-lab/dsh-connectors' }] }), { status: 200 })
    }
    return new Response(JSON.stringify([]), { status: 200 })
  }) as typeof fetch

  // 1. Device Flow
  const session = await startGitHubDeviceFlow({ fetchFn: mockFetch })
  assert.equal(session.userCode, 'ABCD-1234')

  const outcome = await pollGitHubDeviceFlow(ctx, { deviceCode: session.deviceCode, fetchFn: mockFetch })
  assert.equal(outcome.status, 'authorized')
  assert.equal(outcome.accountLabel, '@haitaopanhq')
  assert.ok(store.has('connectors/github'))

  // 2. Local CLI / OIDC SSO import
  const imported = await importLocalGitHubOidcOrCliAuth(ctx, {
    fetchFn: mockFetch,
    readCliToken: async () => 'gho_local_cli_token',
  })
  assert.equal(imported.accountLabel, '@haitaopanhq')
  assert.equal(imported.source, 'gh-cli')

  // 3. Built-in GitHub MCP tools
  const registered = new Map<string, { execute: (input: Record<string, unknown>) => Promise<unknown> }>()
  const { summaries, dispose } = registerBuiltinGitHubTools({
    registry: {
      register: (def) => {
        registered.set(def.name, def)
        return () => registered.delete(def.name)
      },
    },
    baseUrl: 'https://api.github.com',
    fetchFn: mockFetch,
    resolveAuth: async () => ({ kind: 'grant', token: 'gho_local_cli_token', source: 'dsh-credentials' }),
  })

  assert.equal(summaries.length, 4)
  assert.ok(registered.has('mcp__github__get_authenticated_user'))
  assert.ok(registered.has('mcp__github__search_repositories'))

  const user = await registered.get('mcp__github__get_authenticated_user')!.execute({}) as { login: string }
  assert.equal(user.login, 'haitaopanhq')

  dispose()
  assert.equal(registered.size, 0)
})
