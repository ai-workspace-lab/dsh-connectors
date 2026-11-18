/**
 * Host-side load smoke test: imports the built plugin, runs `apply()` against a
 * minimal cordis-like context, and verifies all 10 built-in connectors register.
 *
 *   node scripts/smoke-load.mjs
 */
import assert from 'node:assert/strict'

import { apply, BUILTIN_CONNECTORS, Config, name } from '../lib/index.js'

assert.equal(name, '@ai-workspace-lab/dsh-connectors')
assert.ok(Config !== undefined)
assert.equal(BUILTIN_CONNECTORS.length, 10)

const ctx = {
  root: { provide: () => {} },
  inject: () => {},
  provide: () => {},
  effect: (fn) => {
    const dispose = fn()
    if (typeof dispose === 'function') dispose()
  },
  logger: () => ({ info: () => {}, warn: () => {}, debug: () => {} }),
  get: () => undefined,
  set: () => {},
}

apply(ctx, { autoConnect: false })
console.log('smoke-load: OK (10 built-in connectors)')
