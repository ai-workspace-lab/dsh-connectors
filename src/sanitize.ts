/**
 * Secret redaction and URL validation utilities.
 * Ensures tokens, OAuth secrets, and authorization headers never leak into logs,
 * error messages, or HTTP responses.
 */

const SECRET_PATTERNS: readonly RegExp[] = [
  /Bearer\s+[A-Za-z0-9._~+/=-]{6,}/gi,
  /Basic\s+[A-Za-z0-9+/=]{6,}/gi,
  /\b(ghp|gho|ghu|ghs|ghr|github_pat|glpat|hvs|lin|cf|ya29|AIza|AKIA|ASIA)[A-Za-z0-9._-]{8,}/g,
  /([?&](?:access_token|token|client_secret|code|api_key|key)=)[^&\s]+/gi,
]

export function safeErrorMessage(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? 'Unknown error')
  let sanitized = raw
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match, prefix?: string) => {
      if (typeof prefix === 'string' && prefix.length > 0 && match.startsWith(prefix)) {
        return `${prefix}[REDACTED]`
      }
      return '[REDACTED]'
    })
  }
  return sanitized.slice(0, 500)
}

export function maskSecret(secret: string | undefined): string {
  if (!secret || secret.length < 8) return secret ? '••••' : ''
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

export function normalizeHttpUrl(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported URL protocol "${parsed.protocol}"; expected http: or https:`)
  }
  return parsed.toString().replace(/\/+$/, '')
}

export function isValidConnectorSlug(id: string): boolean {
  return /^[a-z][a-z0-9-]{1,47}$/.test(id)
}
