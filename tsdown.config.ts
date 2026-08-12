import { defineConfig, type UserConfig } from 'tsdown'

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
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: ['react', 'react/jsx-runtime'],
    alwaysBundle: id => ['react', 'react/jsx-runtime'].includes(id) ? undefined : true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "@dsh-external/dsh-agent-rp", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([host, client])
