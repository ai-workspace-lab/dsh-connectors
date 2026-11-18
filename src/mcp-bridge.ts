import { safeErrorMessage } from './sanitize.ts'
import type { McpToolSummary, ResolvedConnectorAuth } from './types.ts'

export interface RemoteMcpTool {
  readonly name: string
  readonly description?: string | undefined
  readonly inputSchema?: Record<string, unknown> | undefined
}

export interface McpDiscoveryResult {
  readonly serverName?: string | undefined
  readonly protocolVersion?: string | undefined
  readonly sessionId?: string | undefined
  readonly tools: readonly RemoteMcpTool[]
}

export interface ToolOutputBlock {
  type: string
  [key: string]: unknown
}

export interface ToolOutputSpec {
  schema: Record<string, unknown>
  render: (args: Record<string, unknown>, value: unknown) => ToolOutputBlock[]
  presentationMeta?: ((args: Record<string, unknown>, value: unknown) => Record<string, unknown>) | undefined
}

export interface ToolDefinitionLike {
  name: string
  description?: string | undefined
  parameters?: Record<string, unknown> | undefined
  output: ToolOutputSpec
  execute: (input: Record<string, unknown>, execution?: unknown) => Promise<unknown>
  timeoutMs?: number | undefined
}

export interface ToolRegistryLike {
  register(definition: ToolDefinitionLike): () => void
}

/**
 * Creates standard output schema & renderer matching DeepSeek Harness tools.register requirements:
 * output { schema, render, presentationMeta? }
 */
export function createDefaultToolOutput(): ToolOutputSpec {
  return {
    schema: {},
    render: (_args, value) => {
      if (
        value &&
        typeof value === 'object' &&
        Array.isArray((value as { content?: unknown[] }).content) &&
        (value as { content: unknown[] }).content.every(
          (b) => b && typeof b === 'object' && typeof (b as { type?: unknown }).type === 'string',
        )
      ) {
        return (value as { content: ToolOutputBlock[] }).content
      }
      let text: string
      if (typeof value === 'string') {
        text = value
      } else if (value === null || value === undefined) {
        text = ''
      } else {
        try {
          text = JSON.stringify(value, null, 2)
        } catch {
          text = String(value)
        }
      }
      return [{ type: 'text', text }]
    },
  }
}

function parseJsonRpcFromSse(text: string): Record<string, unknown> | undefined {
  const lines = text.split(/\r?\n/)
  let lastPayload: Record<string, unknown> | undefined
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length === 0) return
    const raw = buffer.join('\n').trim()
    buffer = []
    if (!raw || raw === '[DONE]') return
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if ('result' in parsed || 'error' in parsed) {
        lastPayload = parsed
      }
    } catch {
      // Ignore non-JSON event frames
    }
  }

  for (const line of lines) {
    if (line === '') {
      flush()
      continue
    }
    if (line.startsWith('data:')) {
      buffer.push(line.slice(5).trimStart())
    }
  }
  flush()
  return lastPayload
}

async function readJsonRpcResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream')) {
    const body = await response.text()
    const parsed = parseJsonRpcFromSse(body)
    if (!parsed) {
      throw new Error('MCP SSE response did not contain a JSON-RPC result')
    }
    return parsed
  }
  const text = await response.text()
  if (!text.trim()) return {}
  return JSON.parse(text) as Record<string, unknown>
}

export function buildAuthHeaders(
  auth: ResolvedConnectorAuth | undefined,
  headerName: string = 'Authorization',
  authPrefix: string = 'Bearer',
): Record<string, string> {
  if (!auth?.token) return {}
  if (headerName.toLowerCase() === 'authorization') {
    const prefix = auth.tokenType || authPrefix
    return {
      Authorization: prefix ? `${prefix} ${auth.token}` : auth.token,
    }
  }
  return {
    [headerName]: authPrefix ? `${authPrefix} ${auth.token}` : auth.token,
  }
}

async function mcpRpcCall(options: {
  url: string
  method: string
  params?: Record<string, unknown> | undefined
  id: number
  headers: Record<string, string>
  sessionId?: string | undefined
  fetchFn: typeof fetch
  signal?: AbortSignal | undefined
}): Promise<{ payload: Record<string, unknown>; sessionId?: string | undefined }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    ...options.headers,
  }
  if (options.sessionId) {
    headers['mcp-session-id'] = options.sessionId
  }

  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: options.id,
      method: options.method,
      params: options.params ?? {},
    }),
  }
  if (options.signal) init.signal = options.signal

  const response = await options.fetchFn(options.url, init)

  if (!response.ok) {
    throw new Error(`MCP ${options.method} failed (HTTP ${response.status})`)
  }

  const nextSessionId = response.headers.get('mcp-session-id') ?? options.sessionId
  const payload = await readJsonRpcResponse(response)
  if (payload.error && typeof payload.error === 'object') {
    const msg = (payload.error as { message?: unknown }).message
    throw new Error(typeof msg === 'string' ? msg : `MCP ${options.method} returned an error`)
  }
  return { payload, sessionId: nextSessionId }
}

export async function discoverRemoteMcpTools(options: {
  url: string
  headers?: Record<string, string>
  fetchFn?: typeof fetch
  timeoutMs?: number
}): Promise<McpDiscoveryResult> {
  const fetchFn = options.fetchFn ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000)
  timer.unref?.()

  try {
    const baseHeaders = options.headers ?? {}
    const init = await mcpRpcCall({
      url: options.url,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'dsh-connectors', version: '0.1.0' },
      },
      id: 1,
      headers: baseHeaders,
      fetchFn,
      signal: controller.signal,
    })

    const initResult = (init.payload.result ?? {}) as {
      protocolVersion?: string
      serverInfo?: { name?: string }
    }
    let sessionId = init.sessionId

    // Best-effort initialized notification
    await fetchFn(options.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...baseHeaders,
        ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      signal: controller.signal,
    }).catch(() => undefined)

    const tools: RemoteMcpTool[] = []
    let cursor: string | undefined
    let reqId = 2
    for (let page = 0; page < 10; page += 1) {
      const listed = await mcpRpcCall({
        url: options.url,
        method: 'tools/list',
        params: cursor ? { cursor } : {},
        id: reqId++,
        headers: baseHeaders,
        sessionId,
        fetchFn,
        signal: controller.signal,
      })
      sessionId = listed.sessionId ?? sessionId
      const result = (listed.payload.result ?? {}) as {
        tools?: Array<{ name?: unknown; description?: unknown; inputSchema?: Record<string, unknown> }>
        nextCursor?: unknown
      }
      if (Array.isArray(result.tools)) {
        for (const item of result.tools) {
          if (typeof item.name === 'string' && item.name.trim() !== '') {
            tools.push({
              name: item.name,
              description: typeof item.description === 'string' ? item.description : undefined,
              inputSchema: item.inputSchema,
            })
          }
        }
      }
      if (typeof result.nextCursor === 'string' && result.nextCursor.length > 0) {
        cursor = result.nextCursor
      } else {
        break
      }
    }

    return {
      serverName: initResult.serverInfo?.name,
      protocolVersion: initResult.protocolVersion,
      sessionId,
      tools,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function callRemoteMcpTool(options: {
  url: string
  toolName: string
  args: Record<string, unknown>
  headers?: Record<string, string> | undefined
  sessionId?: string | undefined
  fetchFn?: typeof fetch | undefined
  timeoutMs?: number | undefined
}): Promise<unknown> {
  const fetchFn = options.fetchFn ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000)
  timer.unref?.()

  try {
    const res = await mcpRpcCall({
      url: options.url,
      method: 'tools/call',
      params: { name: options.toolName, arguments: options.args },
      id: Date.now(),
      headers: options.headers ?? {},
      sessionId: options.sessionId,
      fetchFn,
      signal: controller.signal,
    })
    return res.payload.result ?? res.payload
  } catch (err) {
    throw new Error(safeErrorMessage(err))
  } finally {
    clearTimeout(timer)
  }
}

export function qualifyConnectorToolName(connectorId: string, rawToolName: string): string {
  const safeConnector = connectorId.replace(/[^A-Za-z0-9_-]/g, '_')
  const safeTool = rawToolName.replace(/[^A-Za-z0-9_-]/g, '_')
  return `mcp__${safeConnector}__${safeTool}`
}

export function registerMcpToolsOnRegistry(options: {
  registry: ToolRegistryLike | undefined
  connectorId: string
  mcpUrl: string
  tools: readonly RemoteMcpTool[]
  resolveHeaders: () => Promise<Record<string, string>>
  sessionId?: string | undefined
  fetchFn?: typeof fetch | undefined
}): { summaries: McpToolSummary[]; dispose: () => void } {
  const disposers: Array<() => void> = []
  const summaries: McpToolSummary[] = []

  for (const tool of options.tools) {
    const qualifiedName = qualifyConnectorToolName(options.connectorId, tool.name)
    summaries.push({
      name: tool.name,
      qualifiedName,
      description: tool.description,
    })

    if (options.registry && typeof options.registry.register === 'function') {
      try {
        const dispose = options.registry.register({
          name: qualifiedName,
          description: tool.description ?? `Remote MCP tool ${tool.name} (${options.connectorId})`,
          parameters: tool.inputSchema ?? { type: 'object', properties: {} },
          output: createDefaultToolOutput(),
          execute: async (input) => {
            const headers = await options.resolveHeaders()
            return callRemoteMcpTool({
              url: options.mcpUrl,
              toolName: tool.name,
              args: input,
              headers,
              sessionId: options.sessionId,
              fetchFn: options.fetchFn,
            })
          },
        })
        disposers.push(dispose)
      } catch (err) {
        // Prevent individual remote tool registration failures (e.g. invalid schemas or name collisions)
        // from breaking the entire connector sync/test flow.
        console.warn(`[dsh-connectors] Failed to register tool "${qualifiedName}":`, safeErrorMessage(err))
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
          // Best-effort tool disposal
        }
      }
    },
  }
}
