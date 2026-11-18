import { createHash, randomBytes } from 'node:crypto'

import type { Context } from '@deepseek-ai/cordis'

import { saveOAuthGrant } from './credentials.ts'
import type { OAuthEndpoints, OAuthGrantPayload } from './types.ts'

export interface PendingOAuthAttempt {
  readonly state: string
  readonly connectorId: string
  readonly clientId: string
  readonly clientSecret?: string | undefined
  readonly tokenUrl: string
  readonly redirectUri: string
  readonly codeVerifier?: string | undefined
  readonly createdAt: number
}

const ATTEMPT_TTL_MS = 10 * 60_000

export class OAuthFlowManager {
  private readonly pending = new Map<string, PendingOAuthAttempt>()

  pruneExpired(now: number = Date.now()): void {
    for (const [state, attempt] of this.pending.entries()) {
      if (now - attempt.createdAt > ATTEMPT_TTL_MS) {
        this.pending.delete(state)
      }
    }
  }

  startFlow(options: {
    connectorId: string
    endpoints: OAuthEndpoints
    clientId: string
    clientSecret?: string | undefined
    redirectUri: string
    scopes?: string | undefined
  }): { authorizeUrl: string; state: string } {
    this.pruneExpired()
    const clientId = options.clientId.trim()
    if (!clientId) {
      throw new Error('OAuth clientId is required to start OAuth authorization')
    }

    const state = randomBytes(24).toString('base64url')
    const usePkce = options.endpoints.pkce !== false
    const codeVerifier = usePkce ? randomBytes(32).toString('base64url') : undefined

    const url = new URL(options.endpoints.authorizeUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', options.redirectUri)
    url.searchParams.set('state', state)

    const scopeText = options.scopes?.trim() || options.endpoints.defaultScopes.join(' ')
    if (scopeText) {
      url.searchParams.set('scope', scopeText)
    }
    if (codeVerifier) {
      const challenge = createHash('sha256').update(codeVerifier).digest('base64url')
      url.searchParams.set('code_challenge', challenge)
      url.searchParams.set('code_challenge_method', 'S256')
    }
    if (options.endpoints.extraAuthorizeParams) {
      for (const [k, v] of Object.entries(options.endpoints.extraAuthorizeParams)) {
        url.searchParams.set(k, v)
      }
    }

    this.pending.set(state, {
      state,
      connectorId: options.connectorId,
      clientId,
      clientSecret: options.clientSecret?.trim() || undefined,
      tokenUrl: options.endpoints.tokenUrl,
      redirectUri: options.redirectUri,
      codeVerifier,
      createdAt: Date.now(),
    })

    return {
      authorizeUrl: url.toString(),
      state,
    }
  }

  getAttempt(state: string): PendingOAuthAttempt | undefined {
    this.pruneExpired()
    return this.pending.get(state)
  }

  async completeCallback(
    ctx: Context,
    params: { state: string; code: string },
    fetchFn: typeof fetch = fetch,
  ): Promise<{ connectorId: string; grant: OAuthGrantPayload }> {
    this.pruneExpired()
    const attempt = this.pending.get(params.state)
    if (!attempt) {
      throw new Error('OAuth state is invalid or expired')
    }
    this.pending.delete(params.state)

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: attempt.clientId,
      redirect_uri: attempt.redirectUri,
    })
    if (attempt.clientSecret) {
      body.set('client_secret', attempt.clientSecret)
    }
    if (attempt.codeVerifier) {
      body.set('code_verifier', attempt.codeVerifier)
    }

    const response = await fetchFn(attempt.tokenUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed (HTTP ${response.status})`)
    }

    const data = await response.json() as Record<string, unknown>
    const accessToken = typeof data.access_token === 'string' ? data.access_token : undefined
    if (!accessToken) {
      const errDesc = typeof data.error_description === 'string'
        ? data.error_description
        : (typeof data.error === 'string' ? data.error : 'missing access_token')
      throw new Error(`OAuth token exchange error: ${errDesc}`)
    }

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined
    const grant: OAuthGrantPayload = {
      accessToken,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
      tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
      expiresAt: expiresIn !== undefined ? Date.now() + expiresIn * 1000 : undefined,
      scope: typeof data.scope === 'string' ? data.scope : undefined,
      clientId: attempt.clientId,
      tokenUrl: attempt.tokenUrl,
    }

    await saveOAuthGrant(ctx, attempt.connectorId, grant)
    return { connectorId: attempt.connectorId, grant }
  }
}
