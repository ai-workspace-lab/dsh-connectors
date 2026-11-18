import type { Context } from '@deepseek-ai/cordis'
import type {
  ApiKeyRecord,
  CredentialKey,
  CredentialProvider,
  CredentialRecord,
  CredentialRef,
  GrantRecord,
} from '@deepseek-ai/dsh-credentials'

import type {
  ConnectorCredentialStatus,
  OAuthGrantPayload,
  ResolvedConnectorAuth,
} from './types.ts'

export const CREDENTIAL_SCOPE = 'connectors'
const REFRESH_SKEW_MS = 60_000
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const KEY_SEGMENT_PATTERN = /^[a-z][a-z0-9-]*$/

function isCredentialRefName(value: string): boolean {
  return REF_PATTERN.test(value)
}

function credentialRef(value: string): CredentialRef {
  if (!isCredentialRefName(value)) {
    throw new TypeError(`credential ref "${value}" must match ${String(REF_PATTERN)}`)
  }
  return value as CredentialRef
}

function isCredentialKeySegment(value: string): boolean {
  return KEY_SEGMENT_PATTERN.test(value)
}

function credentialKey(scope: string, id: string): CredentialKey {
  for (const segment of [scope, id]) {
    if (!KEY_SEGMENT_PATTERN.test(segment)) {
      throw new TypeError(`credential key segment "${segment}" must match ${String(KEY_SEGMENT_PATTERN)}`)
    }
  }
  return `${scope}/${id}` as CredentialKey
}

export function connectorCredentialKey(connectorId: string): CredentialKey {
  const normalized = connectorId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const safeId = isCredentialKeySegment(normalized) ? normalized : `c-${normalized}`
  return credentialKey(CREDENTIAL_SCOPE, safeId)
}

function getCredentialsService(ctx: Context): CredentialProvider | undefined {
  return (ctx as unknown as { get?: (name: string) => unknown }).get?.('credentials') as CredentialProvider | undefined
}

function isOAuthGrantPayload(value: unknown): value is OAuthGrantPayload {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { accessToken?: unknown }).accessToken === 'string'
    && (value as { accessToken: string }).accessToken.length > 0
}

export async function saveTokenCredential(
  ctx: Context,
  connectorId: string,
  token: string,
  extraEnv?: Readonly<Record<string, string>>,
): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Token must not be empty')
  }
  const credentials = getCredentialsService(ctx)
  if (!credentials) {
    throw new Error('DSH credentials service is not available')
  }
  const key = connectorCredentialKey(connectorId)
  const cleanExtra: Record<string, string> = {}
  if (extraEnv) {
    for (const [k, v] of Object.entries(extraEnv)) {
      if (v.trim() !== '') cleanExtra[k] = v.trim()
    }
  }
  const record: ApiKeyRecord = {
    kind: 'api-key',
    key: trimmed,
    ...(Object.keys(cleanExtra).length > 0 ? { env: cleanExtra } : {}),
  }
  await credentials.modifyRecord(key, async () => record)
}

export async function saveOAuthGrant(
  ctx: Context,
  connectorId: string,
  grant: OAuthGrantPayload,
): Promise<void> {
  if (!grant.accessToken.trim()) {
    throw new Error('OAuth accessToken must not be empty')
  }
  const credentials = getCredentialsService(ctx)
  if (!credentials) {
    throw new Error('DSH credentials service is not available')
  }
  const key = connectorCredentialKey(connectorId)
  const record: GrantRecord = {
    kind: 'grant',
    payload: grant,
  }
  await credentials.modifyRecord(key, async () => record)
}

export async function deleteConnectorCredential(ctx: Context, connectorId: string): Promise<void> {
  const credentials = getCredentialsService(ctx)
  if (!credentials) return
  const key = connectorCredentialKey(connectorId)
  await credentials.deleteRecord(key)
}

export async function describeConnectorCredential(
  ctx: Context,
  connectorId: string,
  fallbackEnvRef?: string,
): Promise<ConnectorCredentialStatus> {
  const credentials = getCredentialsService(ctx)
  if (!credentials) {
    return { configured: false, writable: false }
  }
  const key = connectorCredentialKey(connectorId)
  const info = await credentials.describeRecord(key)
  if (info.configured) {
    const record = await credentials.readRecord(key)
    if (record?.kind === 'grant' && isOAuthGrantPayload(record.payload)) {
      return {
        configured: true,
        kind: 'grant',
        source: 'dsh-credentials',
        writable: info.writable,
        expiresAt: record.payload.expiresAt,
        hasRefreshToken: Boolean(record.payload.refreshToken),
      }
    }
    if (record?.kind === 'api-key') {
      return {
        configured: Boolean(record.key),
        kind: 'api-key',
        source: 'dsh-credentials',
        writable: info.writable,
        hasExtraFields: Boolean(record.env && Object.keys(record.env).length > 0),
      }
    }
    return {
      configured: true,
      kind: info.kind === 'grant' ? 'grant' : 'api-key',
      source: 'dsh-credentials',
      writable: info.writable,
    }
  }

  if (fallbackEnvRef && isCredentialRefName(fallbackEnvRef)) {
    const refInfo = await credentials.describe(credentialRef(fallbackEnvRef))
    if (refInfo.configured) {
      return {
        configured: true,
        kind: 'env-ref',
        source: refInfo.source ?? 'env',
        writable: refInfo.writable,
      }
    }
  }

  return {
    configured: false,
    writable: info.writable,
  }
}

async function refreshOAuthGrantIfNeeded(
  credentials: CredentialProvider,
  key: CredentialKey,
  current: GrantRecord,
  fetchFn: typeof fetch,
): Promise<OAuthGrantPayload | undefined> {
  if (!isOAuthGrantPayload(current.payload)) return undefined
  const payload = current.payload
  const expired = payload.expiresAt !== undefined && Date.now() + REFRESH_SKEW_MS >= payload.expiresAt
  if (!expired || !payload.refreshToken || !payload.tokenUrl) {
    return payload
  }

  let refreshedPayload: OAuthGrantPayload | undefined
  await credentials.modifyRecord(key, async (latest): Promise<CredentialRecord | undefined> => {
    if (latest?.kind !== 'grant' || !isOAuthGrantPayload(latest.payload)) return undefined
    const latestPayload = latest.payload
    if (latestPayload.expiresAt !== undefined && Date.now() + REFRESH_SKEW_MS < latestPayload.expiresAt) {
      refreshedPayload = latestPayload
      return undefined
    }
    if (!latestPayload.refreshToken || !latestPayload.tokenUrl) {
      refreshedPayload = latestPayload
      return undefined
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: latestPayload.refreshToken,
    })
    if (latestPayload.clientId) body.set('client_id', latestPayload.clientId)

    const response = await fetchFn(latestPayload.tokenUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!response.ok) {
      refreshedPayload = latestPayload
      return undefined
    }
    const json = await response.json() as Record<string, unknown>
    const nextToken = typeof json.access_token === 'string' ? json.access_token : undefined
    if (!nextToken) {
      refreshedPayload = latestPayload
      return undefined
    }
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : undefined
    refreshedPayload = {
      ...latestPayload,
      accessToken: nextToken,
      refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : latestPayload.refreshToken,
      tokenType: typeof json.token_type === 'string' ? json.token_type : latestPayload.tokenType,
      expiresAt: expiresIn !== undefined ? Date.now() + expiresIn * 1000 : latestPayload.expiresAt,
      scope: typeof json.scope === 'string' ? json.scope : latestPayload.scope,
    }
    return { kind: 'grant', payload: refreshedPayload }
  })

  return refreshedPayload ?? payload
}

export async function resolveConnectorAuth(
  ctx: Context,
  connectorId: string,
  fallbackEnvRef?: string,
  fetchFn: typeof fetch = fetch,
): Promise<ResolvedConnectorAuth | undefined> {
  const credentials = getCredentialsService(ctx)
  if (!credentials) return undefined

  const key = connectorCredentialKey(connectorId)
  const record = await credentials.readRecord(key)
  if (record?.kind === 'api-key' && record.key) {
    return {
      kind: 'api-key',
      token: record.key,
      source: 'dsh-credentials',
      extra: record.env,
    }
  }
  if (record?.kind === 'grant' && isOAuthGrantPayload(record.payload)) {
    const active = await refreshOAuthGrantIfNeeded(credentials, key, record, fetchFn)
    if (active?.accessToken) {
      return {
        kind: 'grant',
        token: active.accessToken,
        tokenType: active.tokenType ?? 'Bearer',
        source: 'dsh-credentials',
        expiresAt: active.expiresAt,
      }
    }
  }

  if (fallbackEnvRef && isCredentialRefName(fallbackEnvRef)) {
    const resolved = await credentials.resolve(credentialRef(fallbackEnvRef))
    if (resolved?.value) {
      return {
        kind: 'env-ref',
        token: resolved.value,
        source: resolved.source,
      }
    }
  }

  return undefined
}
