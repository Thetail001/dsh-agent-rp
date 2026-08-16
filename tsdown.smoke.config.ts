import { defineConfig } from 'tsdown'

/** Keep Playwright external so its runtime-owned CommonJS modules retain their directory semantics. */
export default defineConfig({
  entry: ['scripts/smoke-card-compat.ts'],
  outDir: '.smoke-dist',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: true,
  clean: true,
  deps: { neverBundle: ['playwright-core'] },
})
