import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { CredentialKey, CredentialRecord, CredentialRef } from '@deepseek-ai/dsh-credentials'

import {
  connectorCredentialKey,
  deleteConnectorCredential,
  describeConnectorCredential,
  resolveConnectorAuth,
  saveTokenCredential,
} from '../src/credentials.ts'
import { OAuthFlowManager } from '../src/oauth.ts'

function createMockCredentialContext(envMap: Record<string, string> = {}) {
  const store = new Map<string, CredentialRecord>()
  const credentials = {
    async resolve(ref: CredentialRef) {
      const value = envMap[ref]
      return value ? { value, source: 'env' } : undefined
    },
    async describe(ref: CredentialRef) {
      const configured = Boolean(envMap[ref])
      return { configured, source: configured ? 'env' : undefined, writable: false }
    },
    async readRecord(key: CredentialKey) {
      return store.get(key)
    },
    async describeRecord(key: CredentialKey) {
      const rec = store.get(key)
      return {
        configured: rec !== undefined,
        kind: rec?.kind,
        writable: true,
      }
    },
    async modifyRecord(
      key: CredentialKey,
      mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>,
    ) {
      const next = await mutate(store.get(key))
      if (next !== undefined) {
        store.set(key, next)
      }
      return store.get(key)
    },
    async deleteRecord(key: CredentialKey) {
      store.delete(key)
    },
  }
  const ctx = {
    get: (name: string) => (name === 'credentials' ? credentials : undefined),
  } as unknown as Context
  return { ctx, store }
}

test('DSH Credential Store saves, describes without leaking, resolves, and deletes tokens', async () => {
  const { ctx, store } = createMockCredentialContext({ GITHUB_TOKEN: 'env-fallback-token' })

  // Falls back to env ref when nothing stored
  const envDesc = await describeConnectorCredential(ctx, 'github', 'GITHUB_TOKEN')
  assert.equal(envDesc.configured, true)
  assert.equal(envDesc.kind, 'env-ref')

  // Save token into DSH Credential Store
  await saveTokenCredential(ctx, 'github', 'ghp_secret_value_12345')
  const key = connectorCredentialKey('github')
  assert.equal(key, 'connectors/github')
  assert.equal(store.get(key)?.kind, 'api-key')

  const desc = await describeConnectorCredential(ctx, 'github', 'GITHUB_TOKEN')
  assert.equal(desc.configured, true)
  assert.equal(desc.kind, 'api-key')
  assert.equal(desc.source, 'dsh-credentials')
  assert.equal(JSON.stringify(desc).includes('ghp_secret_value_12345'), false)

  const resolved = await resolveConnectorAuth(ctx, 'github', 'GITHUB_TOKEN')
  assert.equal(resolved?.token, 'ghp_secret_value_12345')
  assert.equal(resolved?.kind, 'api-key')

  await deleteConnectorCredential(ctx, 'github')
  assert.equal(store.has(key), false)
})

test('OAuthFlowManager completes PKCE flow, stores GrantRecord, and refreshes expired tokens', async () => {
  const { ctx } = createMockCredentialContext()
  const oauth = new OAuthFlowManager()

  const { authorizeUrl, state } = oauth.startFlow({
    connectorId: 'gitlab',
    endpoints: {
      authorizeUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      defaultScopes: ['api', 'mcp'],
      pkce: true,
    },
    clientId: 'client-123',
    redirectUri: 'http://127.0.0.1:3000/plugins/connectors/oauth/callback',
  })

  const parsed = new URL(authorizeUrl)
  assert.equal(parsed.searchParams.get('client_id'), 'client-123')
  assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(parsed.searchParams.get('state'), state)

  let callCount = 0
  const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    callCount += 1
    const bodyText = String(init?.body ?? '')
    if (bodyText.includes('grant_type=authorization_code')) {
      return new Response(JSON.stringify({
        access_token: 'oauth-access-1',
        refresh_token: 'oauth-refresh-1',
        expires_in: 1, // Already within 60s refresh skew window
        token_type: 'Bearer',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      access_token: 'oauth-access-refreshed',
      refresh_token: 'oauth-refresh-2',
      expires_in: 3600,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const completed = await oauth.completeCallback(ctx, { state, code: 'auth-code-1' }, mockFetch)
  assert.equal(completed.connectorId, 'gitlab')
  assert.equal(completed.grant.accessToken, 'oauth-access-1')

  // Resolving now triggers automatic refresh under modifyRecord lock
  const resolved = await resolveConnectorAuth(ctx, 'gitlab', undefined, mockFetch)
  assert.equal(callCount, 2)
  assert.equal(resolved?.kind, 'grant')
  assert.equal(resolved?.token, 'oauth-access-refreshed')
})
