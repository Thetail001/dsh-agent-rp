import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve as resolvePath, sep } from 'node:path'
import { defineConfig, type UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_ID = '@dsh-external/dsh-roleplay-portable-spike'
const CLIENT_EXTERNALS: readonly string[] = ['react', 'react/jsx-runtime']
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const cssSourcePaths = new Map<string, string>()

interface DshSourcePackage {
  readonly directory: string
  readonly name: string
}

/** Resolve the matching private DSH checkout used only to produce committed bundles. */
function sourceRoot(): string {
  const configured = process.env.DSH_SOURCE_ROOT
  if (configured === undefined || configured.trim().length === 0) {
    throw new Error('DSH_SOURCE_ROOT must name the matching DSH source checkout')
  }
  if (!isAbsolute(configured)) throw new Error('DSH_SOURCE_ROOT must be an absolute path')
  const root = realpathSync(configured)
  if (!existsSync(resolvePath(root, 'packages')) || !existsSync(resolvePath(root, 'vendor/cordis/src/index.ts'))) {
    throw new Error(`DSH_SOURCE_ROOT is not a DSH source checkout: ${JSON.stringify(root)}`)
  }
  return root
}

/** Index DSH workspace package names without depending on its package-manager links. */
function sourcePackages(root: string): ReadonlyMap<string, DshSourcePackage> {
  const packages = new Map<string, DshSourcePackage>()
  const packagesRoot = resolvePath(root, 'packages')
  for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const groupDirectory = resolvePath(packagesRoot, group.name)
    for (const item of readdirSync(groupDirectory, { withFileTypes: true })) {
      if (!item.isDirectory()) continue
      const directory = resolvePath(groupDirectory, item.name)
      const manifestPath = resolvePath(directory, 'package.json')
      if (!existsSync(manifestPath)) continue
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly name?: unknown }
      if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@deepseek-ai/dsh-')) continue
      if (packages.has(manifest.name)) throw new Error(`duplicate DSH source package ${JSON.stringify(manifest.name)}`)
      packages.set(manifest.name, { directory, name: manifest.name })
    }
  }
  return packages
}

const DSH_SOURCE_ROOT = sourceRoot()
const DSH_SOURCE_PACKAGES = sourcePackages(DSH_SOURCE_ROOT)
const DSH_BRIDGE_PREFIX = '\0dsh-source-bridge:'
const DSH_SOURCE_BRIDGES = new Map<string, string>([
  ['@deepseek-ai/dsh-llm', [
    "export { HarnessError } from '@deepseek-ai/dsh-llm/src/error.ts'",
    "export { assertNever } from '@deepseek-ai/dsh-llm/src/never.ts'",
    "export { createUserMessage } from '@deepseek-ai/dsh-llm/src/message.ts'",
    "export { deepFreeze } from '@deepseek-ai/dsh-llm/src/call-config.ts'",
  ].join('\n')],
  ['@deepseek-ai/dsh-session', [
    "export { isJsonValue, snapshotJsonValue } from '@deepseek-ai/dsh-session/src/json.ts'",
  ].join('\n')],
  ['@deepseek-ai/dsh-subagent', [
    "export { delegationDepthOf } from '@deepseek-ai/dsh-subagent/src/depth.ts'",
  ].join('\n')],
  ['@deepseek-ai/dsh-tools', [
    "export { assertObjectJsonSchema, validateJsonSchemaValue } from '@deepseek-ai/dsh-tools/src/json-schema.ts'",
    "export { defineTool, validateArgs, valueSchemaSpecToJsonSchema } from '@deepseek-ai/dsh-tools/src/schema.ts'",
  ].join('\n')],
])

/** Map one public DSH package import to its TypeScript source entry. */
function resolveDshSource(id: string): string | undefined {
  if (id === 'cordis') return resolvePath(DSH_SOURCE_ROOT, 'vendor/cordis/src/index.ts')
  if (id.startsWith('cordis/src/')) return resolvePath(DSH_SOURCE_ROOT, 'vendor/cordis', id.slice('cordis/'.length))
  for (const sourcePackage of DSH_SOURCE_PACKAGES.values()) {
    if (id !== sourcePackage.name && !id.startsWith(`${sourcePackage.name}/`)) continue
    const subpath = id === sourcePackage.name ? '' : id.slice(sourcePackage.name.length + 1)
    if (subpath === 'package.json') return resolvePath(sourcePackage.directory, 'package.json')
    const logical = subpath.startsWith('src/') ? subpath.slice('src/'.length) : subpath
    const candidates = logical.length === 0
      ? [resolvePath(sourcePackage.directory, 'src/index.ts')]
      : [
          resolvePath(sourcePackage.directory, `src/${logical}`),
          resolvePath(sourcePackage.directory, `src/${logical}.ts`),
          resolvePath(sourcePackage.directory, `src/${logical}/index.ts`),
        ]
    const matched = candidates.find(existsSync)
    if (matched === undefined) throw new Error(`cannot map DSH source import ${JSON.stringify(id)}`)
    return matched
  }
  return undefined
}

const dshSourcePlugin: NonNullable<UserConfig['plugins']>[number] = {
  name: 'dsh-source-workspace',
  resolveId(id: string) {
    if (DSH_SOURCE_BRIDGES.has(id)) return DSH_BRIDGE_PREFIX + id
    return resolveDshSource(id) ?? null
  },
  load(id: string) {
    if (!id.startsWith(DSH_BRIDGE_PREFIX)) return null
    const source = DSH_SOURCE_BRIDGES.get(id.slice(DSH_BRIDGE_PREFIX.length))
    if (source === undefined) throw new Error(`missing DSH source bridge ${JSON.stringify(id)}`)
    return source
  },
}

const host: UserConfig = {
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  codeSplitting: false,
  deps: {
    alwaysBundle: id => !id.startsWith('node:'),
    onlyBundle: false,
  },
  plugins: [dshSourcePlugin, {
    name: 'assert-self-contained-host-bundle',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        const external = [...output.imports, ...output.dynamicImports]
          .filter(id => !id.startsWith('node:'))
        if (external.length > 0) this.error(`Host bundle retains external imports: ${external.join(', ')}`)
      }
    },
  }, {
    name: 'normalize-generated-host-bundle',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        output.code = output.code
          .replace(/^\/\/#(?:end)?region.*(?:\r?\n|$)/gmu, '')
          .replace(/[ \t]+$/gmu, '')
      }
    },
  }],
}

const client: UserConfig = {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: id => CLIENT_EXTERNALS.includes(id) ? undefined : true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [{
    name: 'roleplay-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const absolute = importer === undefined ? source : resolvePath(dirname(importer), source)
      const logical = relative(process.cwd(), absolute).split(sep).join('/')
      const virtualId = CSS_VIRTUAL_PREFIX + logical + CSS_VIRTUAL_SUFFIX
      cssSourcePaths.set(virtualId, absolute)
      return virtualId
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = cssSourcePaths.get(virtualId)
      if (fileId === undefined) throw new Error(`missing CSS source for ${JSON.stringify(virtualId)}`)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      const sortedExports = Object.entries(cssExports ?? {}).sort(([left], [right]) => left.localeCompare(right))
      for (const [local, exported] of sortedExports) classMap[local] = exported.name
      const tagId = `${PACKAGE_ID}/${basename(fileId)}`
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([host, client])
