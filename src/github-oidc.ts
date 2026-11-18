import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { Context } from '@deepseek-ai/cordis'

import { saveOAuthGrant } from './credentials.ts'
import { createDefaultToolOutput, type ToolRegistryLike } from './mcp-bridge.ts'
import { safeErrorMessage } from './sanitize.ts'
import type { McpToolSummary, ResolvedConnectorAuth } from './types.ts'

const execFileAsync = promisify(execFile)

/** Default public GitHub OAuth / Device Flow Client ID (GitHub CLI). */
export const DEFAULT_GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98'

export interface GitHubDeviceFlowSession {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly expiresIn: number
  readonly interval: number
  readonly clientId: string
}

export interface GitHubDevicePollOutcome {
  readonly status: 'pending' | 'authorized' | 'expired'
  readonly accountLabel?: string | undefined
  readonly message?: string | undefined
}

export async function startGitHubDeviceFlow(options: {
  clientId?: string | undefined
  scopes?: string | undefined
  fetchFn?: typeof fetch | undefined
} = {}): Promise<GitHubDeviceFlowSession> {
  const fetchFn = options.fetchFn ?? fetch
  const clientId = options.clientId?.trim() || DEFAULT_GITHUB_CLIENT_ID
  const scope = options.scopes?.trim() || 'repo read:org read:user workflow'

  const body = new URLSearchParams({
    client_id: clientId,
    scope,
  })

  const response = await fetchFn('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'dsh-connectors/0.1.0',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`GitHub device flow start failed (HTTP ${response.status})`)
  }

  const data = await response.json() as Record<string, unknown>
  const deviceCode = typeof data.device_code === 'string' ? data.device_code : ''
  const userCode = typeof data.user_code === 'string' ? data.user_code : ''
  const verificationUri = typeof data.verification_uri === 'string'
    ? data.verification_uri
    : 'https://github.com/login/device'

  if (!deviceCode || !userCode) {
    throw new Error('GitHub device flow response missing device_code or user_code')
  }

  return {
    deviceCode,
    userCode,
    verificationUri,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 900,
    interval: typeof data.interval === 'number' ? data.interval : 5,
    clientId,
  }
}

export async function pollGitHubDeviceFlow(
  ctx: Context,
  options: {
    deviceCode: string
    clientId?: string | undefined
    fetchFn?: typeof fetch | undefined
  },
): Promise<GitHubDevicePollOutcome> {
  const fetchFn = options.fetchFn ?? fetch
  const clientId = options.clientId?.trim() || DEFAULT_GITHUB_CLIENT_ID

  const body = new URLSearchParams({
    client_id: clientId,
    device_code: options.deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })

  const response = await fetchFn('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'dsh-connectors/0.1.0',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`GitHub device token poll failed (HTTP ${response.status})`)
  }

  const data = await response.json() as Record<string, unknown>
  const errorCode = typeof data.error === 'string' ? data.error : undefined
  if (errorCode === 'authorization_pending' || errorCode === 'slow_down') {
    return { status: 'pending', message: 'Waiting for user authorization on GitHub' }
  }
  if (errorCode === 'expired_token' || errorCode === 'access_denied') {
    return { status: 'expired', message: `GitHub authorization ${errorCode}` }
  }
  if (errorCode) {
    throw new Error(typeof data.error_description === 'string' ? data.error_description : errorCode)
  }

  const accessToken = typeof data.access_token === 'string' ? data.access_token : ''
  if (!accessToken) {
    return { status: 'pending' }
  }

  const accountLabel = await verifyGitHubUser(accessToken, 'https://api.github.com', fetchFn)
  await saveOAuthGrant(ctx, 'github', {
    accessToken,
    tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
    scope: typeof data.scope === 'string' ? data.scope : undefined,
    clientId,
    accountLabel,
  })

  return {
    status: 'authorized',
    accountLabel,
    message: `Connected as ${accountLabel ?? 'GitHub'}`,
  }
}

async function verifyGitHubUser(
  token: string,
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<string | undefined> {
  const res = await fetchFn(`${baseUrl.replace(/\/+$/, '')}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-connectors/0.1.0',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub token verification failed (HTTP ${res.status})`)
  }
  const user = await res.json() as { login?: string }
  return user.login ? `@${user.login}` : 'GitHub'
}

export async function importLocalGitHubOidcOrCliAuth(
  ctx: Context,
  options: {
    audience?: string | undefined
    fetchFn?: typeof fetch | undefined
    readCliToken?: (() => Promise<string | undefined>) | undefined
  } = {},
): Promise<{ accountLabel: string; source: 'oidc-id-token' | 'gh-cli' | 'env' }> {
  const fetchFn = options.fetchFn ?? fetch

  // 1. Check GitHub Actions / Workload OIDC ID Token endpoint if present
  const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const oidcBearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (oidcUrl && oidcBearer) {
    const target = new URL(oidcUrl)
    if (options.audience) target.searchParams.set('audience', options.audience)
    const res = await fetchFn(target.toString(), {
      headers: {
        Authorization: `Bearer ${oidcBearer}`,
        accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json() as { value?: string }
      if (data.value) {
        await saveOAuthGrant(ctx, 'github', {
          accessToken: data.value,
          tokenType: 'Bearer',
          accountLabel: 'GitHub OIDC Workload',
        })
        return { accountLabel: 'GitHub OIDC Workload', source: 'oidc-id-token' }
      }
    }
  }

  // 2. Check local `gh auth token` (GitHub CLI keyring SSO)
  const readCli = options.readCliToken ?? (async () => {
    try {
      const { stdout } = await execFileAsync('gh', ['auth', 'token'], { timeout: 5_000 })
      const tok = stdout.trim()
      return tok || undefined
    } catch {
      return undefined
    }
  })

  const cliToken = await readCli()
  if (cliToken) {
    const accountLabel = (await verifyGitHubUser(cliToken, 'https://api.github.com', fetchFn)) ?? 'GitHub'
    await saveOAuthGrant(ctx, 'github', {
      accessToken: cliToken,
      tokenType: 'Bearer',
      accountLabel,
    })
    return { accountLabel, source: 'gh-cli' }
  }

  // 3. Check ambient GITHUB_TOKEN / GH_TOKEN
  const envToken = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim()
  if (envToken) {
    const accountLabel = (await verifyGitHubUser(envToken, 'https://api.github.com', fetchFn)) ?? 'GitHub'
    await saveOAuthGrant(ctx, 'github', {
      accessToken: envToken,
      tokenType: 'Bearer',
      accountLabel,
    })
    return { accountLabel, source: 'env' }
  }

  throw new Error('No local GitHub OIDC endpoint, gh CLI session, or GITHUB_TOKEN found')
}

export function registerBuiltinGitHubTools(options: {
  registry: ToolRegistryLike | undefined
  baseUrl: string
  resolveAuth: () => Promise<ResolvedConnectorAuth | undefined>
  fetchFn?: typeof fetch | undefined
}): { summaries: McpToolSummary[]; dispose: () => void } {
  const fetchFn = options.fetchFn ?? fetch
  const apiBase = options.baseUrl.replace(/\/+$/, '')

  const callGh = async (path: string) => {
    const auth = await options.resolveAuth()
    if (!auth?.token) throw new Error('GitHub credential is not configured')
    const res = await fetchFn(`${apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'dsh-connectors/0.1.0',
      },
    })
    if (!res.ok) {
      throw new Error(`GitHub API ${path} failed (HTTP ${res.status})`)
    }
    return res.json()
  }

  const specs: ReadonlyArray<{
    rawName: string
    description: string
    parameters: Record<string, unknown>
    execute: (input: Record<string, unknown>) => Promise<unknown>
  }> = [
    {
      rawName: 'get_authenticated_user',
      description: 'Get the currently authenticated GitHub user profile.',
      parameters: { type: 'object', properties: {} },
      execute: async () => callGh('/user'),
    },
    {
      rawName: 'search_repositories',
      description: 'Search GitHub repositories by query string.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'GitHub repository search query' },
          per_page: { type: 'number', description: 'Results per page (default 10)' },
        },
        required: ['query'],
      },
      execute: async (input) => {
        const q = encodeURIComponent(String(input.query ?? ''))
        const perPage = typeof input.per_page === 'number' ? input.per_page : 10
        return callGh(`/search/repositories?q=${q}&per_page=${perPage}`)
      },
    },
    {
      rawName: 'list_issues',
      description: 'List issues in a GitHub repository (owner/repo).',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          state: { type: 'string', description: 'open | closed | all' },
        },
        required: ['owner', 'repo'],
      },
      execute: async (input) => {
        const owner = encodeURIComponent(String(input.owner ?? ''))
        const repo = encodeURIComponent(String(input.repo ?? ''))
        const state = encodeURIComponent(String(input.state ?? 'open'))
        return callGh(`/repos/${owner}/${repo}/issues?state=${state}&per_page=20`)
      },
    },
    {
      rawName: 'list_pull_requests',
      description: 'List pull requests in a GitHub repository (owner/repo).',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          state: { type: 'string', description: 'open | closed | all' },
        },
        required: ['owner', 'repo'],
      },
      execute: async (input) => {
        const owner = encodeURIComponent(String(input.owner ?? ''))
        const repo = encodeURIComponent(String(input.repo ?? ''))
        const state = encodeURIComponent(String(input.state ?? 'open'))
        return callGh(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`)
      },
    },
  ]

  const disposers: Array<() => void> = []
  const summaries: McpToolSummary[] = []

  for (const spec of specs) {
    const qualifiedName = `mcp__github__${spec.rawName}`
    summaries.push({
      name: spec.rawName,
      qualifiedName,
      description: spec.description,
    })
    if (options.registry && typeof options.registry.register === 'function') {
      try {
        const dispose = options.registry.register({
          name: qualifiedName,
          description: spec.description,
          parameters: spec.parameters,
          output: createDefaultToolOutput(),
          execute: async (input) => {
            try {
              return await spec.execute(input)
            } catch (err) {
              throw new Error(safeErrorMessage(err))
            }
          },
        })
        disposers.push(dispose)
      } catch (err) {
        // Ignore duplicate tool name if remote MCP already registered it, or log registration error
        console.warn(`[dsh-connectors] Failed to register built-in GitHub tool "${qualifiedName}":`, safeErrorMessage(err))
      }
    }
  }

  return {
    summaries,
    dispose: () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          // Best-effort cleanup
        }
      }
    },
  }
}
