export const CSS_ID = 'dsh-connectors-styles'

export const CSS = `
.dsh-conn-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--text-primary, #e5e7eb);
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
  font-weight: 600;
  color: var(--text-primary, #f3f4f6);
}

.dsh-conn-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #9ca3af);
  max-width: 680px;
}

.dsh-conn-actions {
  display: flex;
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
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-surface, rgba(255, 255, 255, 0.04));
  color: var(--text-secondary, #9ca3af);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.dsh-conn-pill[data-active="true"] {
  background: var(--accent-soft, rgba(59, 130, 246, 0.16));
  color: var(--accent, #60a5fa);
  border-color: var(--accent, #3b82f6);
}

.dsh-conn-search {
  min-width: 220px;
  flex: 1 1 220px;
  max-width: 320px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  background: var(--bg-input, rgba(0, 0, 0, 0.2));
  color: var(--text-primary, #f3f4f6);
  font-size: 12px;
}

.dsh-conn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
}

.dsh-conn-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
}

.dsh-conn-card[data-selected="true"] {
  border-color: var(--accent, #3b82f6);
}

.dsh-conn-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.dsh-conn-card-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #f9fafb);
}

.dsh-conn-card-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #9ca3af);
}

.dsh-conn-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.dsh-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  color: var(--text-secondary, #9ca3af);
}

.dsh-conn-badge[data-tone="ok"] {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(16, 185, 129, 0.12);
}

.dsh-conn-badge[data-tone="warn"] {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(245, 158, 11, 0.12);
}

.dsh-conn-badge[data-tone="err"] {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(239, 68, 68, 0.12);
}

.dsh-conn-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.07));
}

.dsh-conn-btn {
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  background: var(--bg-elevated, rgba(255, 255, 255, 0.06));
  color: var(--text-primary, #f3f4f6);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}

.dsh-conn-btn[data-variant="primary"] {
  background: var(--accent, #2563eb);
  border-color: var(--accent, #2563eb);
  color: #ffffff;
}

.dsh-conn-btn[data-variant="danger"] {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
}

.dsh-conn-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dsh-conn-drawer {
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary, #9ca3af);
}

.dsh-conn-input,
.dsh-conn-select {
  padding: 6px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  background: var(--bg-input, rgba(0, 0, 0, 0.25));
  color: var(--text-primary, #f3f4f6);
  font-size: 12px;
}

.dsh-conn-banner {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: rgba(59, 130, 246, 0.1);
}

.dsh-conn-banner[data-tone="err"] {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
}

.dsh-conn-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.dsh-conn-tool-item {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.2);
}
`
