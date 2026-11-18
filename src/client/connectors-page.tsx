import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  clearConnectorToken,
  deleteCustomConnector,
  fetchConnectorsState,
  saveConnectorToken,
  startConnectorOAuth,
  testConnectorConnection,
  updateConnectorConfig,
  upsertCustomConnector,
  type AuthMethod,
  type ConnectorCategory,
  type ConnectorView,
} from './api.ts'
import type { ConnectorsLocaleKey } from './locales.ts'

export interface ConnectorsSettingsPageProps {
  t: (key: ConnectorsLocaleKey) => string
}

const CATEGORIES: ReadonlyArray<{ id: 'all' | ConnectorCategory; key: ConnectorsLocaleKey }> = [
  { id: 'all', key: 'catAll' },
  { id: 'code', key: 'catCode' },
  { id: 'cloud', key: 'catCloud' },
  { id: 'communication', key: 'catCommunication' },
  { id: 'productivity', key: 'catProductivity' },
  { id: 'security', key: 'catSecurity' },
  { id: 'custom', key: 'catCustom' },
]

function statusTone(state: ConnectorView['runtime']['state']): 'ok' | 'warn' | 'err' | undefined {
  switch (state) {
    case 'connected':
      return 'ok'
    case 'needs_auth':
    case 'connecting':
      return 'warn'
    case 'error':
      return 'err'
    default:
      return undefined
  }
}

function statusLabelKey(state: ConnectorView['runtime']['state']): ConnectorsLocaleKey {
  switch (state) {
    case 'connected':
      return 'statusConnected'
    case 'needs_auth':
      return 'statusNeedsAuth'
    case 'connecting':
      return 'statusConnecting'
    case 'error':
      return 'statusError'
    default:
      return 'statusDisconnected'
  }
}

function categoryLabelKey(cat: ConnectorCategory): ConnectorsLocaleKey {
  switch (cat) {
    case 'code':
      return 'catCode'
    case 'cloud':
      return 'catCloud'
    case 'communication':
      return 'catCommunication'
    case 'productivity':
      return 'catProductivity'
    case 'security':
      return 'catSecurity'
    case 'custom':
      return 'catCustom'
  }
}

export function ConnectorsSettingsPage({ t }: ConnectorsSettingsPageProps) {
  const [connectors, setConnectors] = useState<ConnectorView[]>([])
  const [category, setCategory] = useState<'all' | ConnectorCategory>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'info' | 'err'; text: string } | null>(null)

  // Draft fields for selected connector
  const [draftAuthMethod, setDraftAuthMethod] = useState<AuthMethod>('token')
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [draftToken, setDraftToken] = useState('')
  const [draftAwsSecret, setDraftAwsSecret] = useState('')
  const [draftOAuthSecret, setDraftOAuthSecret] = useState('')

  // Draft fields for custom MCP modal
  const [customId, setCustomId] = useState('')
  const [customName, setCustomName] = useState('')
  const [customMcpUrl, setCustomMcpUrl] = useState('')
  const [customAuthMethod, setCustomAuthMethod] = useState<AuthMethod>('token')
  const [customHeaderName, setCustomHeaderName] = useState('')
  const [customOAuthAuthUrl, setCustomOAuthAuthUrl] = useState('')
  const [customOAuthTokenUrl, setCustomOAuthTokenUrl] = useState('')
  const [customOAuthClientId, setCustomOAuthClientId] = useState('')

  const reload = useCallback(async () => {
    try {
      const list = await fetchConnectorsState()
      setConnectors(list)
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && (event.data as { type?: string }).type === 'dsh-connector-oauth-complete') {
        void reload()
        setBanner({ tone: 'info', text: t('savedBanner') })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [reload, t])

  const selected = useMemo(
    () => connectors.find((c) => c.definition.id === selectedId) ?? null,
    [connectors, selectedId],
  )

  const openEditor = (view: ConnectorView) => {
    setSelectedId(view.definition.id)
    setDraftAuthMethod(view.settings.authMethod ?? view.definition.authMethods[0] ?? 'token')
    setDraftFields({
      baseUrl: view.settings.baseUrl ?? view.definition.defaultBaseUrl ?? '',
      mcpUrl: view.settings.mcpUrl ?? view.definition.defaultMcpUrl ?? '',
      envRef: view.settings.envRef ?? view.definition.defaultEnvRef ?? '',
      region: view.settings.region ?? '',
      projectId: view.settings.projectId ?? '',
      namespace: view.settings.namespace ?? '',
      headerName: view.settings.headerName ?? view.definition.defaultAuthHeader ?? '',
      oauthClientId: view.settings.oauthClientId ?? '',
      oauthScopes: view.settings.oauthScopes ?? view.definition.oauth?.defaultScopes.join(' ') ?? '',
    })
    setDraftToken('')
    setDraftAwsSecret('')
    setDraftOAuthSecret('')
    setBanner(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return connectors.filter((item) => {
      if (category !== 'all' && item.definition.category !== category) return false
      if (!q) return true
      return (
        item.definition.name.toLowerCase().includes(q)
        || item.definition.id.toLowerCase().includes(q)
        || item.definition.shortDescEn.toLowerCase().includes(q)
        || item.definition.shortDescZh.includes(q)
      )
    })
  }, [connectors, category, search])

  const isZh = t('nav') === '连接器'

  const handleToggleEnabled = async (view: ConnectorView) => {
    setBusyId(view.definition.id)
    setBanner(null)
    try {
      const next = await updateConnectorConfig({
        id: view.definition.id,
        enabled: !view.settings.enabled,
      })
      setConnectors(next)
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleTest = async (id: string) => {
    setBusyId(id)
    setBanner(null)
    try {
      const res = await testConnectorConnection(id)
      setConnectors(res.connectors)
      setBanner({
        tone: res.result.state === 'error' || res.result.state === 'needs_auth' ? 'err' : 'info',
        text: `${id}: ${res.result.message} (${res.result.latencyMs}ms)`,
      })
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveSettings = async () => {
    if (!selected) return
    setBusyId(selected.definition.id)
    setBanner(null)
    try {
      const next = await updateConnectorConfig({
        id: selected.definition.id,
        authMethod: draftAuthMethod,
        baseUrl: draftFields.baseUrl,
        mcpUrl: draftFields.mcpUrl,
        envRef: draftFields.envRef,
        region: draftFields.region,
        projectId: draftFields.projectId,
        namespace: draftFields.namespace,
        headerName: draftFields.headerName,
        oauthClientId: draftFields.oauthClientId,
        oauthScopes: draftFields.oauthScopes,
      })
      setConnectors(next)
      setBanner({ tone: 'info', text: t('savedBanner') })
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveToken = async () => {
    if (!selected || !draftToken.trim()) return
    setBusyId(selected.definition.id)
    setBanner(null)
    try {
      const extra = selected.definition.id === 'aws-lightsail' && draftAwsSecret.trim()
        ? { AWS_SECRET_ACCESS_KEY: draftAwsSecret.trim() }
        : undefined
      const next = await saveConnectorToken(selected.definition.id, draftToken, extra)
      setConnectors(next)
      setDraftToken('')
      setDraftAwsSecret('')
      setBanner({ tone: 'info', text: t('credStored') })
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleClearToken = async () => {
    if (!selected) return
    setBusyId(selected.definition.id)
    setBanner(null)
    try {
      const next = await clearConnectorToken(selected.definition.id)
      setConnectors(next)
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleStartOAuth = async () => {
    if (!selected) return
    setBusyId(selected.definition.id)
    setBanner(null)
    try {
      await updateConnectorConfig({
        id: selected.definition.id,
        authMethod: 'oauth',
        oauthClientId: draftFields.oauthClientId,
        oauthScopes: draftFields.oauthScopes,
      })
      const started = await startConnectorOAuth({
        id: selected.definition.id,
        clientId: draftFields.oauthClientId,
        clientSecret: draftOAuthSecret || undefined,
        scopes: draftFields.oauthScopes,
      })
      if (typeof window !== 'undefined') {
        window.open(started.authorizeUrl, '_blank', 'noopener,noreferrer,width=640,height=740')
      }
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleCreateCustom = async () => {
    setBusyId('__custom__')
    setBanner(null)
    try {
      const next = await upsertCustomConnector({
        id: customId.trim().toLowerCase(),
        name: customName.trim(),
        mcpUrl: customMcpUrl.trim(),
        authMethod: customAuthMethod,
        headerName: customHeaderName.trim() || undefined,
        oauthAuthorizeUrl: customOAuthAuthUrl.trim() || undefined,
        oauthTokenUrl: customOAuthTokenUrl.trim() || undefined,
        oauthClientId: customOAuthClientId.trim() || undefined,
        enabled: true,
      })
      setConnectors(next)
      setShowCustomModal(false)
      setCustomId('')
      setCustomName('')
      setCustomMcpUrl('')
      setBanner({ tone: 'info', text: t('savedBanner') })
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  const handleRemoveCustom = async (id: string) => {
    setBusyId(id)
    setBanner(null)
    try {
      const next = await deleteCustomConnector(id)
      setConnectors(next)
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      setBanner({ tone: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="dsh-conn-page">
      <div className="dsh-conn-header">
        <div>
          <h2 className="dsh-conn-title">{t('title')}</h2>
          <p className="dsh-conn-subtitle">{t('subtitle')}</p>
        </div>
        <div className="dsh-conn-actions">
          <button type="button" className="dsh-conn-btn" onClick={() => void reload()}>
            {t('refresh')}
          </button>
          <button
            type="button"
            className="dsh-conn-btn"
            data-variant="primary"
            onClick={() => setShowCustomModal((v) => !v)}
          >
            {t('addCustom')}
          </button>
        </div>
      </div>

      {banner && (
        <div className="dsh-conn-banner" data-tone={banner.tone === 'err' ? 'err' : undefined}>
          {banner.text}
        </div>
      )}

      {showCustomModal && (
        <div className="dsh-conn-drawer">
          <div className="dsh-conn-drawer-head">
            <strong>{t('customModalTitle')}</strong>
            <button type="button" className="dsh-conn-btn" onClick={() => setShowCustomModal(false)}>
              {t('cancel')}
            </button>
          </div>
          <div className="dsh-conn-form-grid">
            <label className="dsh-conn-field">
              <span className="dsh-conn-label">{t('customId')}</span>
              <input
                className="dsh-conn-input"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="linear-mcp"
              />
            </label>
            <label className="dsh-conn-field">
              <span className="dsh-conn-label">{t('customName')}</span>
              <input
                className="dsh-conn-input"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Linear MCP"
              />
            </label>
            <label className="dsh-conn-field">
              <span className="dsh-conn-label">{t('customMcpUrl')}</span>
              <input
                className="dsh-conn-input"
                value={customMcpUrl}
                onChange={(e) => setCustomMcpUrl(e.target.value)}
                placeholder="https://mcp.linear.app/mcp"
              />
            </label>
            <label className="dsh-conn-field">
              <span className="dsh-conn-label">{t('authMethod')}</span>
              <select
                className="dsh-conn-select"
                value={customAuthMethod}
                onChange={(e) => setCustomAuthMethod(e.target.value as AuthMethod)}
              >
                <option value="token">{t('authToken')}</option>
                <option value="oauth">{t('authOAuth')}</option>
                <option value="header">{t('authHeader')}</option>
                <option value="none">{t('authNone')}</option>
              </select>
            </label>
            {customAuthMethod === 'header' && (
              <label className="dsh-conn-field">
                <span className="dsh-conn-label">{t('fieldHeaderName')}</span>
                <input
                  className="dsh-conn-input"
                  value={customHeaderName}
                  onChange={(e) => setCustomHeaderName(e.target.value)}
                  placeholder="X-API-Key"
                />
              </label>
            )}
            {customAuthMethod === 'oauth' && (
              <>
                <label className="dsh-conn-field">
                  <span className="dsh-conn-label">{t('customOAuthAuthorizeUrl')}</span>
                  <input
                    className="dsh-conn-input"
                    value={customOAuthAuthUrl}
                    onChange={(e) => setCustomOAuthAuthUrl(e.target.value)}
                    placeholder="https://provider.example.com/oauth/authorize"
                  />
                </label>
                <label className="dsh-conn-field">
                  <span className="dsh-conn-label">{t('customOAuthTokenUrl')}</span>
                  <input
                    className="dsh-conn-input"
                    value={customOAuthTokenUrl}
                    onChange={(e) => setCustomOAuthTokenUrl(e.target.value)}
                    placeholder="https://provider.example.com/oauth/token"
                  />
                </label>
                <label className="dsh-conn-field">
                  <span className="dsh-conn-label">{t('fieldOAuthClientId')}</span>
                  <input
                    className="dsh-conn-input"
                    value={customOAuthClientId}
                    onChange={(e) => setCustomOAuthClientId(e.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          <div className="dsh-conn-actions">
            <button
              type="button"
              className="dsh-conn-btn"
              data-variant="primary"
              disabled={busyId === '__custom__'}
              onClick={() => void handleCreateCustom()}
            >
              {t('createCustom')}
            </button>
          </div>
        </div>
      )}

      <div className="dsh-conn-toolbar">
        <div className="dsh-conn-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="dsh-conn-pill"
              data-active={category === cat.id ? 'true' : undefined}
              onClick={() => setCategory(cat.id)}
            >
              {t(cat.key)}
            </button>
          ))}
        </div>
        <input
          className="dsh-conn-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
        />
      </div>

      {selected && (
        <div className="dsh-conn-drawer">
          <div className="dsh-conn-drawer-head">
            <div>
              <strong>{selected.definition.name}</strong>{' '}
              <span className="dsh-conn-badge">
                {selected.credential.configured
                  ? (selected.credential.kind === 'env-ref' ? t('credEnv') : t('credStored'))
                  : t('credNone')}
              </span>
            </div>
            <button type="button" className="dsh-conn-btn" onClick={() => setSelectedId(null)}>
              {t('close')}
            </button>
          </div>

          <div className="dsh-conn-form-grid">
            <label className="dsh-conn-field">
              <span className="dsh-conn-label">{t('authMethod')}</span>
              <select
                className="dsh-conn-select"
                value={draftAuthMethod}
                onChange={(e) => setDraftAuthMethod(e.target.value as AuthMethod)}
              >
                {selected.definition.authMethods.map((m) => (
                  <option key={m} value={m}>
                    {m === 'oauth' ? t('authOAuth') : m === 'token' ? t('authToken') : m === 'header' ? t('authHeader') : t('authNone')}
                  </option>
                ))}
              </select>
            </label>

            {selected.definition.fields.map((field) => (
              <label key={field.key} className="dsh-conn-field">
                <span className="dsh-conn-label">{t(field.labelKey as ConnectorsLocaleKey)}</span>
                <input
                  className="dsh-conn-input"
                  value={draftFields[field.key] ?? ''}
                  onChange={(e) => setDraftFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              </label>
            ))}
          </div>

          {draftAuthMethod !== 'none' && draftAuthMethod !== 'oauth' && (
            <div className="dsh-conn-form-grid">
              <label className="dsh-conn-field">
                <span className="dsh-conn-label">{t('tokenInputLabel')}</span>
                <input
                  className="dsh-conn-input"
                  type="password"
                  value={draftToken}
                  onChange={(e) => setDraftToken(e.target.value)}
                  placeholder={t('tokenInputPlaceholder')}
                />
              </label>
              {selected.definition.id === 'aws-lightsail' && (
                <label className="dsh-conn-field">
                  <span className="dsh-conn-label">{t('awsSecretLabel')}</span>
                  <input
                    className="dsh-conn-input"
                    type="password"
                    value={draftAwsSecret}
                    onChange={(e) => setDraftAwsSecret(e.target.value)}
                    placeholder={t('awsSecretPlaceholder')}
                  />
                </label>
              )}
            </div>
          )}

          {draftAuthMethod === 'oauth' && selected.definition.oauth && (
            <div className="dsh-conn-form-grid">
              <label className="dsh-conn-field">
                <span className="dsh-conn-label">{t('oauthClientSecretLabel')}</span>
                <input
                  className="dsh-conn-input"
                  type="password"
                  value={draftOAuthSecret}
                  onChange={(e) => setDraftOAuthSecret(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="dsh-conn-actions">
            <button
              type="button"
              className="dsh-conn-btn"
              disabled={busyId === selected.definition.id}
              onClick={() => void handleSaveSettings()}
            >
              {t('saveSettings')}
            </button>
            {draftAuthMethod !== 'none' && draftAuthMethod !== 'oauth' && (
              <button
                type="button"
                className="dsh-conn-btn"
                data-variant="primary"
                disabled={busyId === selected.definition.id || !draftToken.trim()}
                onClick={() => void handleSaveToken()}
              >
                {t('saveToken')}
              </button>
            )}
            {draftAuthMethod === 'oauth' && selected.definition.oauth && (
              <button
                type="button"
                className="dsh-conn-btn"
                data-variant="primary"
                disabled={busyId === selected.definition.id}
                onClick={() => void handleStartOAuth()}
              >
                {t('startOAuth')}
              </button>
            )}
            <button
              type="button"
              className="dsh-conn-btn"
              disabled={busyId === selected.definition.id}
              onClick={() => void handleTest(selected.definition.id)}
            >
              {busyId === selected.definition.id ? t('testing') : t('testConnection')}
            </button>
            {selected.credential.configured && (
              <button
                type="button"
                className="dsh-conn-btn"
                data-variant="danger"
                disabled={busyId === selected.definition.id}
                onClick={() => void handleClearToken()}
              >
                {t('clearToken')}
              </button>
            )}
            {selected.definition.source === 'custom' && (
              <button
                type="button"
                className="dsh-conn-btn"
                data-variant="danger"
                disabled={busyId === selected.definition.id}
                onClick={() => void handleRemoveCustom(selected.definition.id)}
              >
                {t('removeCustom')}
              </button>
            )}
          </div>

          <div className="dsh-conn-tools">
            <strong>{t('toolsHeading')} ({selected.runtime.tools.length})</strong>
            {selected.runtime.tools.length === 0 ? (
              <span className="dsh-conn-card-desc">{t('noTools')}</span>
            ) : (
              selected.runtime.tools.map((tool) => (
                <div key={tool.qualifiedName} className="dsh-conn-tool-item">
                  <strong>{tool.qualifiedName}</strong>
                  {tool.description ? ` — ${tool.description}` : ''}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="dsh-conn-card-desc">{t('emptyList')}</p>
      ) : (
        <div className="dsh-conn-grid">
          {filtered.map((item) => {
            const isSelected = item.definition.id === selectedId
            const busy = busyId === item.definition.id
            return (
              <div
                key={item.definition.id}
                className="dsh-conn-card"
                data-selected={isSelected ? 'true' : undefined}
              >
                <div className="dsh-conn-card-main">
                  <div className="dsh-conn-card-info">
                    <div className="dsh-conn-card-top">
                      <span className="dsh-conn-card-name">{item.definition.name}</span>
                      <span className="dsh-conn-badge" data-tone={statusTone(item.runtime.state)}>
                        {t(statusLabelKey(item.runtime.state))}
                      </span>
                      <span className="dsh-conn-badge">{t(categoryLabelKey(item.definition.category))}</span>
                      <span className="dsh-conn-badge">
                        {item.definition.source === 'custom'
                          ? t('sourceCustom')
                          : item.definition.source === 'package'
                            ? t('sourcePackage')
                            : t('sourceBuiltin')}
                      </span>
                      {item.credential.configured && (
                        <span className="dsh-conn-badge" data-tone="ok">
                          {item.credential.kind === 'env-ref' ? t('credEnv') : t('credStored')}
                        </span>
                      )}
                      {item.runtime.tools.length > 0 && (
                        <span className="dsh-conn-badge">{item.runtime.tools.length} MCP</span>
                      )}
                    </div>
                    <p className="dsh-conn-card-desc">
                      {isZh ? item.definition.shortDescZh : item.definition.shortDescEn}
                    </p>
                  </div>

                  <div className="dsh-conn-card-foot">
                    <button
                      type="button"
                      className="dsh-conn-btn"
                      onClick={() => openEditor(item)}
                    >
                      {t('configure')}
                    </button>
                    <button
                      type="button"
                      className="dsh-conn-btn"
                      disabled={busy}
                      onClick={() => void handleTest(item.definition.id)}
                    >
                      {busy ? t('testing') : t('testConnection')}
                    </button>
                    <button
                      type="button"
                      className="dsh-conn-btn"
                      data-variant={item.settings.enabled ? undefined : 'primary'}
                      disabled={busy}
                      onClick={() => void handleToggleEnabled(item)}
                    >
                      {item.settings.enabled ? t('disable') : t('enable')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
