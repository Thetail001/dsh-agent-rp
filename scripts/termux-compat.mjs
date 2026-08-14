#!/usr/bin/env node

import { constants } from 'node:fs'
import { access, chmod, copyFile, link, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, parse, resolve } from 'node:path'

const marker = 'dsh-agent-rp Android hard-link fallback'
const restrictedLinkCodes = '["EACCES", "EPERM", "EMLINK", "ENOSYS"]'

function fail(message) {
  throw new Error(`Termux compatibility patch failed: ${message}`)
}

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) fail(`${label} was not found; this DSH version needs a newer compatibility recipe`)
  if (source.indexOf(before) !== source.lastIndexOf(before)) fail(`${label} was not unique`)
  return source.replace(before, after)
}

async function packageEntry(dshRoot, packageName) {
  const requireFromDsh = createRequire(join(dshRoot, 'package.json'))
  const packageJson = requireFromDsh.resolve(`${packageName}/package.json`)
  const entry = join(dirname(packageJson), 'lib', 'index.js')
  await access(entry, constants.R_OK | constants.W_OK)
  return entry
}

async function patchFile(file, transform) {
  const source = await readFile(file, 'utf8')
  if (source.includes(marker)) {
    process.stdout.write(`兼容层已存在：${file}\n`)
    return
  }
  const output = transform(source)
  if (output === source || !output.includes(marker)) fail(`no verified change was produced for ${file}`)
  const info = await stat(file)
  const backup = `${file}.dsh-agent-rp-original`
  const temporary = `${file}.dsh-agent-rp-${process.pid}.tmp`
  try {
    await access(backup, constants.F_OK)
  } catch {
    await copyFile(file, backup)
  }
  await writeFile(temporary, output, { mode: info.mode })
  await chmod(temporary, info.mode)
  await rename(temporary, file)
  process.stdout.write(`已加入安卓兼容层：${file}\n`)
}

function patchSession(source) {
  let output = replaceOnce(
    source,
    'import { link, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, stat, truncate } from "node:fs/promises";',
    'import { link, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, stat, truncate } from "node:fs/promises";',
    'session persistence fs import',
  )
  output = replaceOnce(
    output,
    '\t\ttry {\n\t\t\tawait link(tmp, finalPath);\n\t\t\tlinked = true;\n\t\t} finally {',
    `\t\ttry {\n\t\t\ttry {\n\t\t\t\tawait link(tmp, finalPath);\n\t\t\t} catch (error) {\n\t\t\t\tconst code = error instanceof Error && "code" in error ? error.code : void 0;\n\t\t\t\tif (!${restrictedLinkCodes}.includes(code)) throw error;\n\t\t\t\tawait rename(tmp, finalPath);\n\t\t\t}\n\t\t\tlinked = true;\n\t\t\t/* ${marker} */\n\t\t} finally {`,
    'session persistence publish operation',
  )
  return output
}

function patchAttachment(source) {
  let output = replaceOnce(
    source,
    'import { chmod, link, mkdir, open, readFile, unlink } from "node:fs/promises";',
    'import { chmod, link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";',
    'attachment fs import',
  )
  output = replaceOnce(
    output,
    '\t\tawait ensureDurableDirectory(home, parse(home).root);',
    `\t\tconst prefixRoot = process.env.PREFIX === void 0 ? void 0 : dirname(resolve(process.env.PREFIX));\n\t\tconst boundary = prefixRoot !== void 0 && (home === prefixRoot || home.startsWith(\`${'${prefixRoot}'}/\`)) ? prefixRoot : parse(home).root;\n\t\tawait ensureDurableDirectory(home, boundary);`,
    'attachment durability boundary',
  )
  output = replaceOnce(
    output,
    '\t\ttry {\n\t\t\tawait link(temporary, target);\n\t\t} catch (error) {\n\t\t\t/* v8 ignore next -- Private same-filesystem directories make EEXIST the only recoverable link race. */\n\t\t\tif (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;\n\t\t\tif (digest(new Uint8Array(await readFile(target))) !== sha256) throw new AttachmentError("Stored attachment failed integrity verification.", "ATTACHMENT_CORRUPT");\n\t\t}',
    `\t\ttry {\n\t\t\tawait link(temporary, target);\n\t\t} catch (error) {\n\t\t\tconst code = error instanceof Error && "code" in error ? error.code : void 0;\n\t\t\tif (${restrictedLinkCodes}.includes(code)) {\n\t\t\t\tawait rename(temporary, target);\n\t\t\t} else {\n\t\t\t\tif (code !== "EEXIST") throw error;\n\t\t\t\tif (digest(new Uint8Array(await readFile(target))) !== sha256) throw new AttachmentError("Stored attachment failed integrity verification.", "ATTACHMENT_CORRUPT");\n\t\t\t}\n\t\t\t/* ${marker} */\n\t\t}`,
    'attachment publish operation',
  )
  output = replaceOnce(
    output,
    '\t\tawait syncDirectory(join(root, "objects"));\n\t\tawait unlink(temporary);\n\t} catch (error) {',
    '\t\tawait syncDirectory(join(root, "objects"));\n\t\tawait unlink(temporary).catch((cleanupError) => {\n\t\t\tif (!(cleanupError instanceof Error && "code" in cleanupError && cleanupError.code === "ENOENT")) throw cleanupError;\n\t\t});\n\t} catch (error) {',
    'attachment published-temp cleanup',
  )
  return output
}

async function supportsHardLinks() {
  if (process.env.DSH_AGENT_RP_FORCE_HARDLINK_FALLBACK === '1') return false
  const directory = join(homedir(), '.dsh', '.agent-rp-termux-link-probe')
  const source = join(directory, 'source')
  const target = join(directory, 'target')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try {
    await writeFile(source, 'probe', { mode: 0o600 })
    await link(source, target)
    return true
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined
    if (code === 'EACCES' || code === 'EPERM' || code === 'EMLINK' || code === 'ENOSYS') return false
    throw error
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function supportsAncestorDirectorySync() {
  if (
    process.env.DSH_AGENT_RP_FORCE_HARDLINK_FALLBACK === '1' ||
    process.env.DSH_AGENT_RP_FORCE_ANCESTOR_SYNC_FALLBACK === '1'
  ) {
    return false
  }
  const home = resolve(homedir())
  const root = parse(home).root
  let level = home
  while (level !== root) {
    const parent = dirname(level)
    let handle
    try {
      handle = await open(parent, constants.O_RDONLY)
      await handle.sync()
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined
      if (code === 'EACCES' || code === 'EPERM' || code === 'ENOSYS') return false
      throw error
    } finally {
      await handle?.close()
    }
    level = parent
  }
  return true
}

const dshRoot = process.argv[2] === undefined ? undefined : resolve(process.argv[2])
if (dshRoot === undefined) fail('usage: node termux-compat.mjs <global DSH package root>')
await access(join(dshRoot, 'package.json'), constants.R_OK)

const hardLinks = await supportsHardLinks()
const ancestorDirectorySync = hardLinks ? await supportsAncestorDirectorySync() : true

if (hardLinks) {
  process.stdout.write('当前文件系统支持硬链接，不需要会话兼容补丁。\n')
} else {
  process.stdout.write('当前安卓文件系统拒绝硬链接，正在启用会话存储兼容层。\n')
  await patchFile(await packageEntry(dshRoot, '@deepseek-ai/dsh-session-persistence-jsonl'), patchSession)
}

if (hardLinks && ancestorDirectorySync) {
  process.stdout.write('当前文件系统支持角色卡与附件所需的持久化操作。\n')
} else {
  const reason = hardLinks ? '系统祖先目录不允许同步' : '文件系统拒绝硬链接'
  process.stdout.write(`角色卡与附件存储受限（${reason}），正在启用兼容层。\n`)
  await patchFile(await packageEntry(dshRoot, '@deepseek-ai/dsh-attachment-local'), patchAttachment)
}
