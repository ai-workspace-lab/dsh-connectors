import z from '@deepseek-ai/schemastery'

import type {
  AuthMethod,
  ConnectorInstanceSettings,
  CustomMcpConnectorSpec,
} from './types.ts'

export const NS = 'connectors'

export interface Config {
  autoConnect: boolean
  requestTimeoutMs: number
  instances: Record<string, ConnectorInstanceSettings>
  customConnectors: CustomMcpConnectorSpec[]
}

const InstanceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  authMethod: z.union([
    z.const('oidc'),
    z.const('oauth'),
    z.const('token'),
    z.const('header'),
    z.const('none'),
  ]),
  baseUrl: z.string(),
  mcpUrl: z.string(),
  envRef: z.string(),
  region: z.string(),
  projectId: z.string(),
  namespace: z.string(),
  headerName: z.string(),
  oauthClientId: z.string(),
  oauthScopes: z.string(),
})

const CustomConnectorSchema = z.object({
  id: z.string().required(),
  name: z.string().required(),
  mcpUrl: z.string().required(),
  authMethod: z.union([
    z.const('oidc'),
    z.const('oauth'),
    z.const('token'),
    z.const('header'),
    z.const('none'),
  ]).default('token'),
  headerName: z.string(),
  envRef: z.string(),
  oauthAuthorizeUrl: z.string(),
  oauthTokenUrl: z.string(),
  oauthClientId: z.string(),
  oauthScopes: z.string(),
  enabled: z.boolean().default(true),
})

export const Config = z.object({
  autoConnect: z.boolean().default(true),
  requestTimeoutMs: z.number().step(100).min(1000).max(120_000).default(12_000),
  instances: z.dict(InstanceSettingsSchema).default({}),
  customConnectors: z.array(CustomConnectorSchema).default([]),
}) as unknown as z<Partial<Config>, Config>

export interface ResolvedConnectorsConfig {
  readonly autoConnect: boolean
  readonly requestTimeoutMs: number
  readonly instances: Record<string, ConnectorInstanceSettings>
  readonly customConnectors: CustomMcpConnectorSpec[]
}

export function resolveConfig(raw?: Partial<Config>): ResolvedConnectorsConfig {
  return {
    autoConnect: raw?.autoConnect ?? true,
    requestTimeoutMs: raw?.requestTimeoutMs ?? 12_000,
    instances: { ...(raw?.instances ?? {}) },
    customConnectors: [...(raw?.customConnectors ?? [])],
  }
}

export function cleanAuthMethod(value: unknown): AuthMethod | undefined {
  if (value === 'oidc' || value === 'oauth' || value === 'token' || value === 'header' || value === 'none') {
    return value
  }
  return undefined
}
