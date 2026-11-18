import type { ReactNode } from 'react'

interface BrandStyle {
  readonly bg: string
  readonly fg: string
  readonly glyph: ReactNode
}

const BRAND_ICONS: Record<string, BrandStyle> = {
  github: {
    bg: '#18181b',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.9c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
      </svg>
    ),
  },
  gitea: {
    bg: '#609926',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 9h10v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M15 10h2.5a2.5 2.5 0 0 1 0 5H15" />
        <path d="M9 5v2m3-2v2" strokeLinecap="round" />
      </svg>
    ),
  },
  gitlab: {
    bg: '#fc6d26',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M21.9 13.4 20.6 9.3l-2.1-6.5a.45.45 0 0 0-.86 0l-2.1 6.5H8.46L6.36 2.8a.45.45 0 0 0-.86 0L3.4 9.3 2.1 13.4a.9.9 0 0 0 .33 1L12 21.4l9.57-7a.9.9 0 0 0 .33-1Z" />
      </svg>
    ),
  },
  gmail: {
    bg: '#ffffff',
    fg: '#ea4335',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M3 7.5v9A1.5 1.5 0 0 0 4.5 18H7v-6.5L12 15l5-3.5V18h2.5a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 19.5 6L12 11.2 4.5 6A1.5 1.5 0 0 0 3 7.5Z" fill="#EA4335" />
      </svg>
    ),
  },
  'google-workspaces': {
    bg: '#1a73e8',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      </svg>
    ),
  },
  'vault-server': {
    bg: '#111827',
    fg: '#ffd814',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M3 4h18l-9 17L3 4Zm7.5 4.5v3h3v-3h-3Z" />
      </svg>
    ),
  },
  cloudflare: {
    bg: '#f38020',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M17.5 17.5H7.2a3.7 3.7 0 0 1-.4-7.38A5 5 0 0 1 16.4 9a3.5 3.5 0 0 1 1.1 8.5Z" />
      </svg>
    ),
  },
  'aws-lightsail': {
    bg: '#232f3e',
    fg: '#ff9900',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" fill="currentColor" fillOpacity="0.18" />
        <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
      </svg>
    ),
  },
  gcp: {
    bg: '#4285f4',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17.5 17.5H7a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A3.5 3.5 0 0 1 17.5 17.5Z" />
        <circle cx="12" cy="13" r="1.8" fill="currentColor" />
      </svg>
    ),
  },
  'linode-vps': {
    bg: '#00b050',
    fg: '#ffffff',
    glyph: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="4" y="5" width="16" height="5" rx="1.5" fill="currentColor" fillOpacity="0.2" />
        <rect x="4" y="14" width="16" height="5" rx="1.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="8" cy="7.5" r="1" fill="currentColor" />
        <circle cx="8" cy="16.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
}

export function ConnectorIcon({ id, name, size = 38 }: { id: string; name: string; size?: number }) {
  const brand = BRAND_ICONS[id]
  if (brand) {
    return (
      <span
        className="dsh-conn-icon"
        style={{
          width: size,
          height: size,
          backgroundColor: brand.bg,
          color: brand.fg,
        }}
      >
        {brand.glyph}
      </span>
    )
  }
  const letter = (name.trim()[0] || 'M').toUpperCase()
  return (
    <span
      className="dsh-conn-icon"
      style={{
        width: size,
        height: size,
        backgroundColor: '#4f46e5',
        color: '#ffffff',
      }}
    >
      <span style={{ fontSize: Math.round(size * 0.42), fontWeight: 700 }}>{letter}</span>
    </span>
  )
}
