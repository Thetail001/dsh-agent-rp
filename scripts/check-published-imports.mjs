import { builtinModules } from 'node:module'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const declared = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
])
const builtins = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`)])
const missing = new Map()
const clientBuiltins = new Set()

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

for (const file of ['../lib/index.js', '../lib/repair-session.js', '../lib/client.js']) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const specifiers = [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu),
    ...source.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gu),
  ].map(match => match[1])

  for (const specifier of specifiers) {
    if (builtins.has(specifier)) {
      if (file === '../lib/client.js') clientBuiltins.add(specifier)
      continue
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) continue
    const dependency = packageName(specifier)
    if (declared.has(dependency)) continue
    const locations = missing.get(dependency) ?? []
    locations.push(file.slice(3))
    missing.set(dependency, locations)
  }
}

if (clientBuiltins.size > 0) {
  throw new Error(`Published client bundle imports Node builtins:\n${[...clientBuiltins].sort().join('\n')}`)
}

if (missing.size > 0) {
  const details = [...missing]
    .map(([dependency, files]) => `${dependency} (${[...new Set(files)].join(', ')})`)
    .join('\n')
  throw new Error(`Published bundles import undeclared packages:\n${details}`)
}

console.log('Published bundle imports are declared.')
