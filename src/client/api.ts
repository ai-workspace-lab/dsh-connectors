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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  const data = await res.json() as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchConnectorsState(): Promise<ConnectorView[]> {
  const data = await requestJson<{ connectors: ConnectorView[] }>('/plugins/connectors/state')
  return data.connectors
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
