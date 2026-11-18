import assert from 'node:assert/strict'
import test from 'node:test'

import { BUILTIN_CONNECTORS, findBuiltinConnector } from '../src/catalog.ts'
import { isValidConnectorSlug, maskSecret, normalizeHttpUrl, safeErrorMessage } from '../src/sanitize.ts'

const EXPECTED_IDS = [
  'github',
  'gitea',
  'gitlab',
  'gmail',
  'google-workspaces',
  'vault-server',
  'cloudflare',
  'aws-lightsail',
  'gcp',
  'linode-vps',
] as const

test('BUILTIN_CONNECTORS includes all 10 first-batch connectors', () => {
  const ids = BUILTIN_CONNECTORS.map((c) => c.id)
  assert.equal(ids.length, 10)
  for (const id of EXPECTED_IDS) {
    assert.ok(ids.includes(id), `missing built-in connector: ${id}`)
    const found = findBuiltinConnector(id)
    assert.ok(found)
    assert.ok(found.name.length > 0)
    assert.ok(found.shortDescEn.length > 0)
    assert.ok(found.shortDescZh.length > 0)
    assert.ok(found.authMethods.length > 0)
  }
})

test('sanitize helpers redact secrets and validate URLs', () => {
  const raw = new Error('Authorization: Bearer ghp_1234567890abcdef failed at ?access_token=secret123')
  const safe = safeErrorMessage(raw)
  assert.ok(!safe.includes('ghp_1234567890abcdef'))
  assert.ok(!safe.includes('secret123'))
  assert.ok(safe.includes('[REDACTED]'))

  assert.equal(maskSecret('ghp_abcdefgh1234'), 'ghp_••••1234')
  assert.equal(maskSecret('short'), '••••')
  assert.equal(normalizeHttpUrl('https://mcp.example.com/mcp/'), 'https://mcp.example.com/mcp')
  assert.throws(() => normalizeHttpUrl('ftp://invalid.example.com'))

  assert.equal(isValidConnectorSlug('linear-mcp'), true)
  assert.equal(isValidConnectorSlug('Bad_Slug!'), false)
})
