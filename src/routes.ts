import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { WebRoute, WebServer } from '@deepseek-ai/dsh-host-webserver'

import { cleanAuthMethod } from './config.ts'
import { createRouteGuard } from './route-guard.ts'
import { safeErrorMessage } from './sanitize.ts'
import type { ConnectorsService } from './service.ts'

const MAX_BODY_BYTES = 256 * 1024

export interface RouteDeps {
  readonly service: ConnectorsService
  readonly verifyDesktop?: ((req: IncomingMessage) => Promise<boolean>) | undefined
  readonly verifyHost?: ((req: IncomingMessage) => Promise<boolean>) | undefined
  readonly fetchFn?: typeof fetch | undefined
}

function json(res: ServerResponse, status: number, value: unknown): void {
  const safe = typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof (value as { error?: unknown }).error === 'string'
    ? { ...value, error: safeErrorMessage((value as { error: string }).error) }
    : value
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(safe))
}

function html(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    total += buf.byteLength
    if (total > MAX_BODY_BYTES) {
      throw new Error('Request body too large')
    }
    chunks.push(buf)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) return {}
  const parsed = JSON.parse(text) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected JSON object body')
  }
  return parsed as Record<string, unknown>
}

function createDesktopVerifier(ctx: Context): (req: IncomingMessage) => Promise<boolean> {
  return async (req: IncomingMessage) => {
    const server = (ctx as unknown as { get?: (n: string) => unknown }).get?.('webServer') as
      | (WebServer & { verifyDesktop?: (r: IncomingMessage) => Promise<boolean> })
      | undefined
    if (server && typeof server.verifyDesktop === 'function') {
      return server.verifyDesktop(req)
    }
    const host = req.headers.host ?? ''
    return host.startsWith('127.0.0.1') || host.startsWith('localhost')
  }
}

export function applyRoutes(ctx: Context, deps: RouteDeps): () => void {
  const verifyDesktop = deps.verifyDesktop ?? createDesktopVerifier(ctx)
  const verifyHost = deps.verifyHost ?? verifyDesktop
  const testGuard = createRouteGuard(500)
  const webServer = (ctx as unknown as { webServer?: WebServer; get?: (n: string) => unknown }).webServer
    ?? ((ctx as unknown as { get?: (n: string) => unknown }).get?.('webServer') as WebServer | undefined)
  if (!webServer || typeof webServer.register !== 'function') {
    return () => {}
  }

  const routes: WebRoute[] = [
    {
      kind: 'exact',
      path: '/plugins/connectors/state',
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          json(res, 405, { error: 'Method Not Allowed' })
          return
        }
        if (!(await verifyHost(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        const connectors = await deps.service.listViews()
        json(res, 200, { connectors })
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/config',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method Not Allowed' })
          return
        }
        if (!(await verifyDesktop(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        try {
          const body = await readJsonBody(req)
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          if (!id || !deps.service.findDefinition(id)) {
            json(res, 400, { error: `Unknown connector "${id}"` })
            return
          }
          const patch: Record<string, unknown> = {}
          if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
          if (body.authMethod !== undefined) patch.authMethod = cleanAuthMethod(body.authMethod)
          for (const key of ['baseUrl', 'mcpUrl', 'envRef', 'region', 'projectId', 'namespace', 'headerName', 'oauthClientId', 'oauthScopes'] as const) {
            if (typeof body[key] === 'string') patch[key] = body[key].trim()
          }
          await deps.service.updateInstanceSettings(id, patch)
          const connectors = await deps.service.listViews()
          json(res, 200, { ok: true, connectors })
        } catch (err) {
          json(res, 400, { error: safeErrorMessage(err) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/token',
      handler: async (req, res) => {
        if (!(await verifyDesktop(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const id = typeof body.id === 'string' ? body.id.trim() : ''
            const token = typeof body.token === 'string' ? body.token : ''
            if (!id || !deps.service.findDefinition(id)) {
              json(res, 400, { error: `Unknown connector "${id}"` })
              return
            }
            const extra = typeof body.extra === 'object' && body.extra !== null && !Array.isArray(body.extra)
              ? Object.fromEntries(
                  Object.entries(body.extra as Record<string, unknown>)
                    .filter(([, v]) => typeof v === 'string')
                    .map(([k, v]) => [k, v as string]),
                )
              : undefined
            await deps.service.saveToken(id, token, extra)
            const connectors = await deps.service.listViews()
            json(res, 200, { ok: true, connectors })
          } catch (err) {
            json(res, 400, { error: safeErrorMessage(err) })
          }
          return
        }
        if (req.method === 'DELETE') {
          try {
            const body = await readJsonBody(req)
            const id = typeof body.id === 'string' ? body.id.trim() : ''
            if (!id) {
              json(res, 400, { error: 'Connector id is required' })
              return
            }
            await deps.service.clearCredential(id)
            const connectors = await deps.service.listViews()
            json(res, 200, { ok: true, connectors })
          } catch (err) {
            json(res, 400, { error: safeErrorMessage(err) })
          }
          return
        }
        json(res, 405, { error: 'Method Not Allowed' })
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/oauth/start',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method Not Allowed' })
          return
        }
        if (!(await verifyDesktop(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        try {
          const body = await readJsonBody(req)
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          const def = deps.service.findDefinition(id)
          if (!def || !def.oauth) {
            json(res, 400, { error: `Connector "${id}" does not support OAuth` })
            return
          }
          const settings = deps.service.getInstanceSettings(id)
          const clientId = (typeof body.clientId === 'string' ? body.clientId : settings.oauthClientId) ?? ''
          const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret : undefined
          const scopes = typeof body.scopes === 'string' ? body.scopes : settings.oauthScopes
          const origin = typeof body.origin === 'string' && body.origin.startsWith('http')
            ? body.origin.replace(/\/+$/, '')
            : `http://${req.headers.host || '127.0.0.1'}`
          const redirectUri = `${origin}/plugins/connectors/oauth/callback`

          const started = deps.service.oauth.startFlow({
            connectorId: id,
            endpoints: def.oauth,
            clientId,
            clientSecret,
            redirectUri,
            scopes,
          })
          json(res, 200, started)
        } catch (err) {
          json(res, 400, { error: safeErrorMessage(err) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/oauth/callback',
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          json(res, 405, { error: 'Method Not Allowed' })
          return
        }
        try {
          const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`)
          const errorParam = parsedUrl.searchParams.get('error')
          if (errorParam) {
            const desc = parsedUrl.searchParams.get('error_description') || errorParam
            html(res, 400, `<!doctype html><html><body><h2>OAuth Authorization Failed</h2><p>${safeErrorMessage(desc)}</p><script>window.close()</script></body></html>`)
            return
          }
          const state = parsedUrl.searchParams.get('state') ?? ''
          const code = parsedUrl.searchParams.get('code') ?? ''
          if (!state || !code) {
            html(res, 400, '<!doctype html><html><body><h2>Missing OAuth state or code</h2></body></html>')
            return
          }
          const completed = await deps.service.oauth.completeCallback(ctx, { state, code }, deps.fetchFn)
          await deps.service.updateInstanceSettings(completed.connectorId, { enabled: true, authMethod: 'oauth' })
          html(res, 200, `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h2>Connected (${completed.connectorId})</h2><p>Credentials saved securely to DSH Credential Store. You may close this window.</p><script>if(window.opener){window.opener.postMessage({type:'dsh-connector-oauth-complete',connectorId:'${completed.connectorId}'},'*');}setTimeout(()=>window.close(),1200);</script></body></html>`)
        } catch (err) {
          html(res, 400, `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h2>OAuth Callback Error</h2><p>${safeErrorMessage(err)}</p></body></html>`)
        }
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/test',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method Not Allowed' })
          return
        }
        if (!(await verifyDesktop(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        const gate = testGuard.begin()
        if (gate !== 'ok') {
          json(res, 429, { error: 'Test already in progress, please wait' })
          return
        }
        try {
          const body = await readJsonBody(req)
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          if (!id || !deps.service.findDefinition(id)) {
            json(res, 400, { error: `Unknown connector "${id}"` })
            return
          }
          const result = await deps.service.connectAndSync(id)
          const connectors = await deps.service.listViews()
          json(res, 200, { result, connectors })
        } catch (err) {
          json(res, 400, { error: safeErrorMessage(err) })
        } finally {
          testGuard.end()
        }
      },
    },
    {
      kind: 'exact',
      path: '/plugins/connectors/custom',
      handler: async (req, res) => {
        if (!(await verifyDesktop(req))) {
          json(res, 403, { error: 'Forbidden' })
          return
        }
        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const created = await deps.service.upsertCustomConnector({
              id: typeof body.id === 'string' ? body.id : '',
              name: typeof body.name === 'string' ? body.name : '',
              mcpUrl: typeof body.mcpUrl === 'string' ? body.mcpUrl : '',
              authMethod: cleanAuthMethod(body.authMethod) ?? 'token',
              headerName: typeof body.headerName === 'string' ? body.headerName : undefined,
              envRef: typeof body.envRef === 'string' ? body.envRef : undefined,
              oauthAuthorizeUrl: typeof body.oauthAuthorizeUrl === 'string' ? body.oauthAuthorizeUrl : undefined,
              oauthTokenUrl: typeof body.oauthTokenUrl === 'string' ? body.oauthTokenUrl : undefined,
              oauthClientId: typeof body.oauthClientId === 'string' ? body.oauthClientId : undefined,
              oauthScopes: typeof body.oauthScopes === 'string' ? body.oauthScopes : undefined,
              enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
            })
            const connectors = await deps.service.listViews()
            json(res, 200, { ok: true, custom: created, connectors })
          } catch (err) {
            json(res, 400, { error: safeErrorMessage(err) })
          }
          return
        }
        if (req.method === 'DELETE') {
          try {
            const body = await readJsonBody(req)
            const id = typeof body.id === 'string' ? body.id.trim() : ''
            if (!id) {
              json(res, 400, { error: 'Custom connector id is required' })
              return
            }
            await deps.service.removeCustomConnector(id)
            const connectors = await deps.service.listViews()
            json(res, 200, { ok: true, connectors })
          } catch (err) {
            json(res, 400, { error: safeErrorMessage(err) })
          }
          return
        }
        json(res, 405, { error: 'Method Not Allowed' })
      },
    },
  ]

  const disposers = routes.map((r) => webServer.register(r))
  return () => {
    for (const dispose of disposers) {
      dispose()
    }
  }
}
