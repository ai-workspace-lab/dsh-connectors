import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

import { ConnectorsSettingsPage } from './connectors-page.tsx'
import { dictionaries, NS } from './locales.ts'
import { CSS, CSS_ID } from './styles.ts'

interface LooseSlots {
  inject(name: string, callback: () => () => void): () => void
  register(options: Record<string, unknown>, component: unknown): () => void
}

function injectCss(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.querySelector(`style[data-plugin-css="${CSS_ID}"]`) !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.dshPlugin = 'dsh-connectors'
  tag.dataset.pluginCss = CSS_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}

export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, 'en', dictionaries.en), 'dsh-connectors: en copy')
  ctx.effect(() => ctx.locale.register(NS, 'zh', dictionaries.zh), 'dsh-connectors: zh copy')
  ctx.effect(() => injectCss(), 'dsh-connectors: styles')

  const t = ctx.locale.bind(NS)
  const slots = ctx.slots as unknown as LooseSlots

  ctx.slots.inject('settings.section', () => slots.register({
    name: 'settings.section',
    id: 'connectors',
    order: 25,
    label: () => t('nav'),
    locale: NS,
  }, ConnectorsSettingsPage))
}
