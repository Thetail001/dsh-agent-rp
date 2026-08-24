import { defineConfig } from 'tsdown'
import { host } from './tsdown.config.ts'

/** Fast Host-only bundle used while iterating on Runtime behavior. */
export default defineConfig(host({ index: 'src/index.ts' }))
