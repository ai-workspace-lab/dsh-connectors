export const CSS_ID = 'dsh-connectors-styles'

export const CSS = `
:where(.dsh-conn-page) {
  --conn-border: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.22));
  --conn-fill: var(--dsw-alias-settings-card-fill, rgba(128, 128, 128, 0.05));
  --conn-fill-soft: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.08));
  --conn-fill-hover: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
  --conn-text: var(--dsw-alias-label-primary, inherit);
  --conn-text-secondary: var(--dsw-alias-label-secondary, inherit);
  --conn-accent: var(--dsw-alias-state-business-primary, #2563eb);
  --conn-accent-soft: color-mix(in srgb, var(--conn-accent) 14%, transparent);
  --conn-accent-border: color-mix(in srgb, var(--conn-accent) 50%, transparent);
  --conn-success: var(--dsw-alias-state-success-primary, #059669);
  --conn-success-soft: color-mix(in srgb, var(--conn-success) 12%, transparent);
  --conn-success-border: color-mix(in srgb, var(--conn-success) 45%, transparent);
  --conn-warning: var(--dsw-alias-state-warning-primary, #d97706);
  --conn-warning-soft: color-mix(in srgb, var(--conn-warning) 12%, transparent);
  --conn-warning-border: color-mix(in srgb, var(--conn-warning) 45%, transparent);
  --conn-danger: var(--dsw-alias-state-error-primary, #dc2626);
  --conn-danger-soft: color-mix(in srgb, var(--conn-danger) 12%, transparent);
  --conn-danger-border: color-mix(in srgb, var(--conn-danger) 40%, transparent);
  --conn-focus: var(--dsw-focus-ring-color, var(--conn-accent));
}

.dsh-conn-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 2px 24px;
  color: var(--conn-text);
  font-size: 13px;
  line-height: 1.5;
}

.dsh-conn-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dsh-conn-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  color: var(--conn-text);
}

.dsh-conn-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--conn-text-secondary);
  opacity: 0.8;
  max-width: 680px;
}

.dsh-conn-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dsh-conn-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dsh-conn-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dsh-conn-pill {
  font: inherit;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill);
  color: var(--conn-text-secondary);
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.dsh-conn-pill:hover {
  background: var(--conn-fill-hover);
}

.dsh-conn-pill[data-active="true"] {
  background: var(--conn-accent-soft);
  color: var(--conn-accent);
  border-color: var(--conn-accent-border);
  font-weight: 550;
}

.dsh-conn-search {
  font: inherit;
  min-width: 220px;
  flex: 1 1 220px;
  max-width: 340px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  font-size: 12px;
}

.dsh-conn-search:focus {
  outline: 2px solid var(--conn-focus);
  outline-offset: 1px;
}

/* Vertical list layout */
.dsh-conn-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dsh-conn-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill);
}

.dsh-conn-card[data-selected="true"] {
  border-color: var(--conn-accent);
}

.dsh-conn-card-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dsh-conn-card-info {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dsh-conn-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dsh-conn-card-name {
  font-weight: 650;
  font-size: 14px;
  color: var(--conn-text);
}

.dsh-conn-card-desc {
  margin: 0;
  font-size: 12px;
  color: var(--conn-text-secondary);
  opacity: 0.8;
}

.dsh-conn-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
}

.dsh-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text-secondary);
}

.dsh-conn-badge[data-tone="ok"] {
  color: var(--conn-success);
  border-color: var(--conn-success-border);
  background: var(--conn-success-soft);
}

.dsh-conn-badge[data-tone="warn"] {
  color: var(--conn-warning);
  border-color: var(--conn-warning-border);
  background: var(--conn-warning-soft);
}

.dsh-conn-badge[data-tone="err"] {
  color: var(--conn-danger);
  border-color: var(--conn-danger-border);
  background: var(--conn-danger-soft);
}

.dsh-conn-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dsh-conn-btn {
  font: inherit;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  border-radius: 7px;
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
}

.dsh-conn-btn:hover:not(:disabled) {
  background: var(--conn-fill-hover);
}

.dsh-conn-btn[data-variant="primary"] {
  background: var(--conn-accent-soft);
  border-color: var(--conn-accent-border);
  color: var(--conn-accent);
  font-weight: 550;
}

.dsh-conn-btn[data-variant="danger"] {
  color: var(--conn-danger);
  border-color: var(--conn-danger-border);
  background: var(--conn-danger-soft);
}

.dsh-conn-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dsh-conn-drawer {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dsh-conn-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dsh-conn-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.dsh-conn-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dsh-conn-label {
  font-size: 12px;
  font-weight: 550;
  color: var(--conn-text-secondary);
}

.dsh-conn-input,
.dsh-conn-select {
  font: inherit;
  padding: 6px 9px;
  border-radius: 7px;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  font-size: 12px;
}

.dsh-conn-input:focus,
.dsh-conn-select:focus {
  outline: 2px solid var(--conn-focus);
  outline-offset: 1px;
}

.dsh-conn-banner {
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 12px;
  border: 1px solid var(--conn-accent-border);
  background: var(--conn-accent-soft);
  color: var(--conn-text);
}

.dsh-conn-banner[data-tone="err"] {
  border-color: var(--conn-danger-border);
  background: var(--conn-danger-soft);
  color: var(--conn-danger);
}

.dsh-conn-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--conn-border);
}

.dsh-conn-tool-item {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--conn-fill-soft);
  border: 1px solid var(--conn-border);
}
`
