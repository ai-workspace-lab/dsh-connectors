export const CSS_ID = 'dsh-connectors-styles'

export const CSS = `
:where(.dsh-conn-page) {
  --conn-border: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.2));
  --conn-fill: var(--dsw-alias-settings-card-fill, rgba(128, 128, 128, 0.04));
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
  gap: 16px;
  padding: 4px 2px 28px;
  color: var(--conn-text);
  font-size: 13px;
  line-height: 1.5;
}

.dsh-conn-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dsh-conn-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  color: var(--conn-text);
}

.dsh-conn-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dsh-conn-connected-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--conn-text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 999px;
}

.dsh-conn-connected-summary:hover {
  background: var(--conn-fill-hover);
}

.dsh-conn-mini-stack {
  display: inline-flex;
  align-items: center;
}

.dsh-conn-mini-stack > span {
  margin-left: -4px;
  border: 1.5px solid var(--dsw-alias-bg-layer-1, #ffffff);
}

.dsh-conn-mini-stack > span:first-child {
  margin-left: 0;
}

.dsh-conn-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dsh-conn-search-wrap {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
}

.dsh-conn-search-icon {
  position: absolute;
  left: 12px;
  opacity: 0.55;
  pointer-events: none;
  display: inline-flex;
}

.dsh-conn-search {
  font: inherit;
  width: 100%;
  padding: 8px 14px 8px 34px;
  border-radius: 999px;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  font-size: 13px;
}

.dsh-conn-search:focus {
  outline: 2px solid var(--conn-focus);
  outline-offset: 1px;
}

.dsh-conn-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dsh-conn-pill {
  font: inherit;
  border: 1px solid transparent;
  background: var(--conn-fill-soft);
  color: var(--conn-text-secondary);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.dsh-conn-pill:hover {
  background: var(--conn-fill-hover);
}

.dsh-conn-pill[data-active="true"] {
  background: var(--conn-text);
  color: var(--dsw-alias-bg-layer-1, #ffffff);
}

.dsh-conn-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 2px;
}

.dsh-conn-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--conn-text);
  margin: 0;
}

/* Two-column clean app rows on wide panels, vertical stack on narrow */
.dsh-conn-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
}

@media (max-width: 720px) {
  .dsh-conn-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.dsh-conn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dsh-conn-row:hover {
  background: var(--conn-fill);
}

.dsh-conn-row[data-selected="true"] {
  background: var(--conn-fill);
  border-color: var(--conn-accent-border);
}

.dsh-conn-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 auto;
}

.dsh-conn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.14);
}

.dsh-conn-row-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-conn-row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 550;
  color: var(--conn-text);
}

.dsh-conn-row-desc {
  font-size: 12px;
  color: var(--conn-text-secondary);
  opacity: 0.72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dsh-conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--conn-success);
  flex-shrink: 0;
}

.dsh-conn-dot[data-tone="err"] {
  background: var(--conn-danger);
}

.dsh-conn-pill-btn {
  font: inherit;
  flex-shrink: 0;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dsh-conn-pill-btn:hover:not(:disabled) {
  background: var(--conn-fill-hover);
}

.dsh-conn-pill-btn[data-connected="true"] {
  color: var(--conn-success);
  border-color: var(--conn-success-border);
  background: var(--conn-success-soft);
}

.dsh-conn-pill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dsh-conn-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dsh-conn-btn {
  font: inherit;
  border: 1px solid var(--conn-border);
  background: var(--conn-fill-soft);
  color: var(--conn-text);
  border-radius: 999px;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.dsh-conn-btn:hover:not(:disabled) {
  background: var(--conn-fill-hover);
}

.dsh-conn-btn[data-variant="primary"] {
  background: var(--conn-accent-soft);
  border-color: var(--conn-accent-border);
  color: var(--conn-accent);
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

.dsh-conn-drawer {
  padding: 16px;
  border-radius: 12px;
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
  padding: 7px 10px;
  border-radius: 8px;
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
  border-radius: 8px;
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
