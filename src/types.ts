/**
 * Core domain types for `@ai-workspace-lab/dsh-connectors`.
 */

export type BuiltinConnectorId =
  | 'github'
  | 'gitea'
  | 'gitlab'
  | 'gmail'
  | 'google-workspaces'
  | 'vault-server'
  | 'cloudflare'
  | 'aws-lightsail'
  | 'gcp'
  | 'linode-vps'

export type ConnectorCategory = 'code' | 'communication' | 'productivity' | 'security' | 'cloud' | 'custom'

export type AuthMethod = 'oidc' | 'oauth' | 'token' | 'header' | 'none'

export type ConnectorSourceKind = 'builtin' | 'custom' | 'package'

export type ConnectionState =
  | 'disconnected'
  | 'needs_auth'
  | 'connecting'
  | 'connected'
  | 'error'

export interface OAuthEndpoints {
  readonly authorizeUrl: string
  readonly tokenUrl: string
  readonly defaultScopes: readonly string[]
  readonly pkce?: boolean | undefined
  readonly extraAuthorizeParams?: Readonly<Record<string, string>> | undefined
}

export interface ConnectorFieldSpec {
  readonly key: 'baseUrl' | 'mcpUrl' | 'region' | 'projectId' | 'namespace' | 'headerName' | 'envRef' | 'oauthClientId' | 'oauthScopes'
  readonly labelKey: string
  readonly placeholder?: string | undefined
  readonly required?: boolean | undefined
}

export interface ConnectorDefinition {
  readonly id: string
  readonly name: string
  readonly shortDescEn: string
  readonly shortDescZh: string
  readonly category: ConnectorCategory
  readonly source: ConnectorSourceKind
  readonly packageName?: string | undefined
  readonly authMethods: readonly AuthMethod[]
  readonly defaultBaseUrl?: string | undefined
  readonly defaultMcpUrl?: string | undefined
  readonly defaultAuthHeader?: string | undefined
  readonly defaultAuthPrefix?: string | undefined
  readonly defaultEnvRef?: string | undefined
  readonly secondaryEnvRef?: string | undefined
  readonly oauth?: OAuthEndpoints | undefined
  readonly docsUrl?: string | undefined
  readonly fields: readonly ConnectorFieldSpec[]
  readonly supportsMcp: boolean
}

export interface ConnectorPackage {
  readonly packageName: string
  readonly connectors: readonly ConnectorDefinition[]
}

export interface ConnectorInstanceSettings {
  readonly enabled: boolean
  readonly authMethod?: AuthMethod | undefined
  readonly baseUrl?: string | undefined
  readonly mcpUrl?: string | undefined
  readonly envRef?: string | undefined
  readonly region?: string | undefined
  readonly projectId?: string | undefined
  readonly namespace?: string | undefined
  readonly headerName?: string | undefined
  readonly oauthClientId?: string | undefined
  readonly oauthScopes?: string | undefined
}

export interface CustomMcpConnectorSpec {
  readonly id: string
  readonly name: string
  readonly mcpUrl: string
  readonly authMethod: AuthMethod
  readonly headerName?: string | undefined
  readonly envRef?: string | undefined
  readonly oauthAuthorizeUrl?: string | undefined
  readonly oauthTokenUrl?: string | undefined
  readonly oauthClientId?: string | undefined
  readonly oauthScopes?: string | undefined
  readonly enabled: boolean
}

export interface ConnectorCredentialStatus {
  readonly configured: boolean
  readonly kind?: 'api-key' | 'grant' | 'env-ref' | undefined
  readonly source?: string | undefined
  readonly writable: boolean
  readonly expiresAt?: number | undefined
  readonly hasRefreshToken?: boolean | undefined
  readonly hasExtraFields?: boolean | undefined
}

export interface McpToolSummary {
  readonly name: string
  readonly qualifiedName: string
  readonly description?: string | undefined
}

export interface ConnectorRuntimeState {
  readonly id: string
  readonly state: ConnectionState
  readonly lastCheckedAt?: number | undefined
  readonly latencyMs?: number | undefined
  readonly message?: string | undefined
  readonly accountLabel?: string | undefined
  readonly tools: readonly McpToolSummary[]
}

export interface ConnectorView {
  readonly definition: ConnectorDefinition
  readonly settings: ConnectorInstanceSettings
  readonly credential: ConnectorCredentialStatus
  readonly runtime: ConnectorRuntimeState
}

export interface OAuthGrantPayload {
  readonly accessToken: string
  readonly refreshToken?: string | undefined
  readonly tokenType?: string | undefined
  readonly expiresAt?: number | undefined
  readonly scope?: string | undefined
  readonly clientId?: string | undefined
  readonly tokenUrl?: string | undefined
  readonly accountLabel?: string | undefined
}

export interface ResolvedConnectorAuth {
  readonly kind: 'api-key' | 'grant' | 'env-ref'
  readonly token: string
  readonly tokenType?: string | undefined
  readonly source: string
  readonly extra?: Readonly<Record<string, string>> | undefined
  readonly expiresAt?: number | undefined
}
