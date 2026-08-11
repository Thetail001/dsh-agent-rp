import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import { defineConfig, type UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_ID = '@dsh-external/dsh-roleplay-portable-spike'
const CLIENT_EXTERNALS: readonly string[] = ['react', 'react/jsx-runtime']
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const cssSourcePaths = new Map<string, string>()

function isHostExternal(id: string): boolean {
  return id.startsWith('node:') || id.startsWith('@deepseek-ai/')
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
  deps: {
    neverBundle: isHostExternal,
    alwaysBundle: id => isHostExternal(id) ? undefined : true,
  },
  plugins: [{
    name: 'assert-profile-host-externals',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        const invalid = [...output.imports, ...output.dynamicImports]
          .filter(id => !isHostExternal(id))
        if (invalid.length > 0) this.error(`Host bundle retains unsupported imports: ${invalid.join(', ')}`)
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
