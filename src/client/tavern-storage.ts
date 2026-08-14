/** Host-owned IndexedDB storage for isolated SillyTavern script sandboxes. */

const DATABASE_NAME = 'dsh-agent-rp-tavern-storage'
const DATABASE_VERSION = 1
const STORE_NAME = 'entries'

interface StoredTavernValue {
  readonly namespace: string
  readonly key: string
  readonly value: unknown
}

/** One validated localforage-compatible storage operation from a script sandbox. */
export interface TavernStorageRequest {
  readonly operation: 'get' | 'set' | 'remove' | 'clear' | 'keys' | 'length' | 'key'
  readonly namespace: string
  readonly key?: string
  readonly value?: unknown
  readonly index?: number
}

let database: Promise<IDBDatabase> | undefined

function openDatabase(): Promise<IDBDatabase> {
  if (database !== undefined) return database
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.addEventListener('upgradeneeded', () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: ['namespace', 'key'] })
      store.createIndex('namespace', 'namespace', { unique: false })
    })
    request.addEventListener('success', () => { resolve(request.result) })
    request.addEventListener('error', () => { reject(request.error ?? new Error('无法打开酒馆脚本存储')) })
    request.addEventListener('blocked', () => { reject(new Error('酒馆脚本存储正在被另一个页面升级')) })
  })
  database = opening.catch((reason: unknown): never => {
    database = undefined
    throw reason
  })
  return database
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => { resolve(request.result) })
    request.addEventListener('error', () => { reject(request.error ?? new Error('酒馆脚本存储操作失败')) })
  })
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => { resolve() })
    transaction.addEventListener('abort', () => { reject(transaction.error ?? new Error('酒馆脚本存储事务已取消')) })
    transaction.addEventListener('error', () => { reject(transaction.error ?? new Error('酒馆脚本存储事务失败')) })
  })
}

function key(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) {
    throw new Error('酒馆脚本存储键必须是 1–2048 个字符')
  }
  return value
}

function namespace(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new Error('酒馆脚本存储命名空间无效')
  }
  return value
}

async function entries(store: IDBObjectStore, name: string): Promise<StoredTavernValue[]> {
  return await result(store.index('namespace').getAll(IDBKeyRange.only(name))) as StoredTavernValue[]
}

/** Execute one localforage-compatible request against Host IndexedDB. */
export async function executeTavernStorageRequest(request: TavernStorageRequest): Promise<unknown> {
  const name = namespace(request.namespace)
  const db = await openDatabase()
  if (request.operation === 'get') {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const value = await result(transaction.objectStore(STORE_NAME).get([name, key(request.key)])) as StoredTavernValue | undefined
    return value?.value ?? null
  }
  if (request.operation === 'set') {
    const itemKey = key(request.key)
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({ namespace: name, key: itemKey, value: request.value ?? null })
    await completed(transaction)
    return request.value ?? null
  }
  if (request.operation === 'remove') {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete([name, key(request.key)])
    await completed(transaction)
    return undefined
  }
  if (request.operation === 'clear') {
    const read = db.transaction(STORE_NAME, 'readonly')
    const values = await entries(read.objectStore(STORE_NAME), name)
    const write = db.transaction(STORE_NAME, 'readwrite')
    const store = write.objectStore(STORE_NAME)
    for (const value of values) store.delete([name, value.key])
    await completed(write)
    return undefined
  }
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const values = await entries(transaction.objectStore(STORE_NAME), name)
  const keys = values.map(value => value.key)
  if (request.operation === 'keys') return keys
  if (request.operation === 'length') return keys.length
  if (!Number.isSafeInteger(request.index) || Number(request.index) < 0) return null
  return keys[Number(request.index)] ?? null
}
