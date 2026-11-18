import { BUILTIN_CONNECTORS } from '../catalog.ts'
import type {
  AuthMethod,
  ConnectorView,
  CustomMcpConnectorSpec,
} from '../types.ts'

export type {
  AuthMethod,
  ConnectorCategory,
  ConnectorCredentialStatus,
  ConnectorDefinition,
  ConnectorInstanceSettings,
  ConnectorRuntimeState,
  ConnectorView,
  CustomMcpConnectorSpec,
  McpToolSummary,
} from '../types.ts'

function fallbackBuiltinViews(): ConnectorView[] {
  return BUILTIN_CONNECTORS.map((definition) => ({
    definition,
    settings: { enabled: false },
    credential: { configured: false, writable: true },
    runtime: { id: definition.id, state: 'disconnected', tools: [] },
  }))
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  const text = await res.text()
  if (!text.trim()) {
    throw new Error(`Empty response from server (HTTP ${res.status})`)
  }
  let data: T & { error?: string }
  try {
    data = JSON.parse(text) as T & { error?: string }
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${res.status})`)
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchConnectorsState(): Promise<ConnectorView[]> {
  try {
    const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/state')
    return data.connectors
  } catch {
    return fallbackBuiltinViews()
  }
}

export async function updateConnectorConfig(payload: {
  id: string
  enabled?: boolean | undefined
  authMethod?: AuthMethod | undefined
  baseUrl?: string | undefined
  mcpUrl?: string | undefined
  envRef?: string | undefined
  region?: string | undefined
  projectId?: string | undefined
  namespace?: string | undefined
  headerName?: string | undefined
  oauthClientId?: string | undefined
  oauthScopes?: string | undefined
}): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/config', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.connectors
}

export async function saveConnectorToken(
  id: string,
  token: string,
  extra?: Record<string, string>,
): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/token', {
    method: 'POST',
    body: JSON.stringify({ id, token, extra }),
  })
  return data.connectors
}

export async function clearConnectorToken(id: string): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/token', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
  return data.connectors
}

export async function startConnectorOAuth(payload: {
  id: string
  clientId?: string | undefined
  clientSecret?: string | undefined
  scopes?: string | undefined
}): Promise<{ authorizeUrl: string; state: string }> {
  return requestJson<{ authorizeUrl: string; state: string }>('/plugins/connectors/oauth/start', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
  })
}

export async function startGitHubDeviceOAuth(payload: {
  clientId?: string | undefined
  scopes?: string | undefined
} = {}): Promise<{
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}> {
  return requestJson('/plugins/connectors/github/device/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function pollGitHubDeviceOAuth(payload: {
  deviceCode: string
  clientId?: string | undefined
}): Promise<{
  outcome: { status: 'pending' | 'authorized' | 'expired'; accountLabel?: string; message?: string }
  connectors: ConnectorView[]
}> {
  return requestJson('/plugins/connectors/github/device/poll', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function importGitHubLocalSso(): Promise<{
  imported: { accountLabel: string; source: string }
  connectors: ConnectorView[]
}> {
  return requestJson('/plugins/connectors/github/sso', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function testConnectorConnection(id: string): Promise<{
  result: { state: string; latencyMs: number; message: string }
  connectors: ConnectorView[]
}> {
  return requestJson('/plugins/connectors/test', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function upsertCustomConnector(spec: CustomMcpConnectorSpec): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/custom', {
    method: 'POST',
    body: JSON.stringify(spec),
  })
  return data.connectors
}

export async function deleteCustomConnector(id: string): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/custom', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
  return data.connectors
}
