/** Provider route owned by this plugin. */
export const PROVIDER = 'nvidia-nim'

/** Historical ids kept only for analytics continuity. */
export const LEGACY_PROVIDERS = ['nvidia-cloud', 'ollama-cloud', 'ollama'] as const

export const PLUGIN_AND_LEGACY_PROVIDERS = new Set<string>([PROVIDER, ...LEGACY_PROVIDERS])

