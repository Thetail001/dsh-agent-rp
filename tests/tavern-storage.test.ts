import assert from 'node:assert/strict'
import test from 'node:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import {
  installedStExtensionSettingsIdentity,
  parseInstalledStExtensionSettingsIdentity,
  parseTavernExtensionSettingsIdentity,
  parseTavernScriptStorageIdentity,
  tavernExtensionSettingsIdentity,
  tavernScriptStorageIdentity,
} from '../src/tavern-script-identity.ts'
import {
  executeTavernStorageRequest,
  LEGACY_TAVERN_EXTENSION_SETTINGS_KEY,
  readTavernExtensionSettings,
  writeTavernExtensionSettings,
} from '../src/client/tavern-storage.ts'

const databaseName = 'dsh-agent-rp-tavern-storage'
const scopedDatabaseName = 'dsh-agent-rp-tavern-storage-scoped'
const extensionSettingsDatabaseName = 'dsh-agent-rp-tavern-extension-settings-scoped'
const factory = new IDBFactory()
Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: factory })
Object.defineProperty(globalThis, 'IDBKeyRange', { configurable: true, value: IDBKeyRange })

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => { resolve(request.result) })
    request.addEventListener('error', () => { reject(request.error) })
  })
}

function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => { resolve() })
    transaction.addEventListener('abort', () => { reject(transaction.error) })
    transaction.addEventListener('error', () => { reject(transaction.error) })
  })
}

async function seedLegacyStorage(): Promise<IDBDatabase> {
  const opening = factory.open(databaseName, 1)
  opening.addEventListener('upgradeneeded', () => {
    const store = opening.result.createObjectStore('entries', { keyPath: ['namespace', 'key'] })
    store.createIndex('namespace', 'namespace', { unique: false })
  })
  const db = await requestResult(opening)
  const transaction = db.transaction('entries', 'readwrite')
  const store = transaction.objectStore('entries')
  store.put({ namespace: 'localforage\u0000keyvaluepairs', key: 'shared', value: { owner: 'legacy' } })
  store.put({ namespace: 'localforage\u0000keyvaluepairs', key: 'legacy-only', value: ['retained'] })
  await transactionCompleted(transaction)
  return db
}

test('migrates legacy values once while isolating every Host-owned script installation', async () => {
  const legacyConnection = await seedLegacyStorage()
  const characterOwner = tavernScriptStorageIdentity('character-a', 'preset-a', 'character', 'shared-script')
  const otherCharacterOwner = tavernScriptStorageIdentity('character-b', 'preset-a', 'character', 'shared-script')
  const presetOwner = tavernScriptStorageIdentity('character-a', 'preset-a', 'preset', 'shared-script')
  assert.deepEqual(parseTavernScriptStorageIdentity(characterOwner), {
    characterId: 'character-a', presetId: 'preset-a', scope: 'character', scriptId: 'shared-script',
  })
  assert.equal(parseTavernScriptStorageIdentity('["character","shared-script"]'), undefined)

  const namespace = 'localforage\u0000keyvaluepairs'
  assert.deepEqual(await executeTavernStorageRequest(characterOwner, {
    operation: 'get', namespace, key: 'shared',
  }), { owner: 'legacy' })
  assert.deepEqual(await executeTavernStorageRequest(characterOwner, {
    operation: 'set', namespace, key: 'shared', value: { owner: 'character-a' },
  }), { owner: 'character-a' })
  assert.deepEqual(await executeTavernStorageRequest(characterOwner, {
    operation: 'get', namespace, key: 'shared',
  }), { owner: 'character-a' })

  assert.deepEqual(await executeTavernStorageRequest(otherCharacterOwner, {
    operation: 'get', namespace, key: 'shared',
  }), null)
  assert.equal(await executeTavernStorageRequest(presetOwner, {
    operation: 'get', namespace, key: 'shared',
  }), null)
  assert.deepEqual(await executeTavernStorageRequest(characterOwner, {
    operation: 'keys', namespace,
  }), ['legacy-only', 'shared'])

  await executeTavernStorageRequest(characterOwner, { operation: 'clear', namespace })
  assert.deepEqual(await executeTavernStorageRequest(characterOwner, { operation: 'keys', namespace }), [])
  assert.equal(await executeTavernStorageRequest(characterOwner, {
    operation: 'get', namespace, key: 'legacy-only',
  }), null)
  assert.equal(await executeTavernStorageRequest(otherCharacterOwner, {
    operation: 'get', namespace, key: 'legacy-only',
  }), null)

  const db = await requestResult(factory.open(scopedDatabaseName, 1))
  assert.deepEqual([...db.objectStoreNames], [
    'legacy-storage-claims', 'scoped-entries', 'storage-migrations',
  ])
  db.close()
  const read = legacyConnection.transaction('entries', 'readonly')
  const legacy = await requestResult(read.objectStore('entries').get([namespace, 'shared'])) as { value: unknown }
  assert.deepEqual(legacy.value, { owner: 'legacy' })
  legacyConnection.close()
})

test('migrates global extension settings once and isolates script-tree installations', async () => {
  const values = new Map<string, string>([[
    LEGACY_TAVERN_EXTENSION_SETTINGS_KEY,
    '{"cardRefinery":{"theme":"legacy"}}',
  ]])
  const legacyStorage = { getItem(key: string) { return values.get(key) ?? null } }
  const characterOwner = tavernExtensionSettingsIdentity('character-a', 'preset-a', 'character')
  const otherCharacterOwner = tavernExtensionSettingsIdentity('character-b', 'preset-a', 'character')
  const otherPresetOwner = tavernExtensionSettingsIdentity('character-a', 'preset-b', 'character')
  const presetTreeOwner = tavernExtensionSettingsIdentity('character-a', 'preset-a', 'preset')
  const installedOwner = installedStExtensionSettingsIdentity()
  assert.deepEqual(parseTavernExtensionSettingsIdentity(characterOwner), {
    characterId: 'character-a', presetId: 'preset-a', scope: 'character',
  })
  assert.equal(parseTavernExtensionSettingsIdentity('[0,"character-a",null,"script"]'), undefined)
  assert.deepEqual(parseInstalledStExtensionSettingsIdentity(installedOwner), { kind: 'installed' })
  assert.equal(parseInstalledStExtensionSettingsIdentity(characterOwner), undefined)

  assert.deepEqual(await readTavernExtensionSettings(installedOwner, legacyStorage), {})
  assert.deepEqual(await writeTavernExtensionSettings(installedOwner, {
    communityWorldbook: { expanded: true },
  }), { communityWorldbook: { expanded: true } })
  assert.deepEqual(await readTavernExtensionSettings(installedOwner, legacyStorage), {
    communityWorldbook: { expanded: true },
  })

  assert.deepEqual(await readTavernExtensionSettings(characterOwner, legacyStorage), {
    cardRefinery: { theme: 'legacy' },
  })
  assert.deepEqual(await writeTavernExtensionSettings(characterOwner, {
    cardRefinery: { theme: 'night', autosave: true },
  }), { cardRefinery: { theme: 'night', autosave: true } })
  assert.deepEqual(await readTavernExtensionSettings(characterOwner, legacyStorage), {
    cardRefinery: { theme: 'night', autosave: true },
  })
  assert.deepEqual(await readTavernExtensionSettings(otherCharacterOwner, legacyStorage), {})
  assert.deepEqual(await readTavernExtensionSettings(otherPresetOwner, legacyStorage), {})
  assert.deepEqual(await readTavernExtensionSettings(presetTreeOwner, legacyStorage), {})

  await writeTavernExtensionSettings(characterOwner, {})
  assert.deepEqual(await readTavernExtensionSettings(characterOwner, legacyStorage), {})
  assert.equal(values.get(LEGACY_TAVERN_EXTENSION_SETTINGS_KEY), '{"cardRefinery":{"theme":"legacy"}}')
  await assert.rejects(writeTavernExtensionSettings(characterOwner, []), /必须是对象/u)
  await assert.rejects(writeTavernExtensionSettings('invalid', {}), /身份无效/u)
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  await assert.rejects(writeTavernExtensionSettings(characterOwner, cyclic), /必须可以保存为 JSON/u)
  await assert.rejects(writeTavernExtensionSettings(characterOwner, {
    large: '猫'.repeat(700_000),
  }), /超过 2 MiB/u)

  const db = await requestResult(factory.open(extensionSettingsDatabaseName, 1))
  assert.deepEqual([...db.objectStoreNames], [
    'legacy-settings-claim', 'settings', 'settings-migrations',
  ])
  db.close()
})
