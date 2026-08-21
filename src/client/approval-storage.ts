/** Bounded browser persistence for exact, user-approved capability keys. */

/** Minimal storage interface used by browser permission persistence. */
export interface ApprovalStorage {
  /** Return one serialized value or `null` when it is absent. */
  getItem(key: string): string | null
  /** Replace one serialized value. */
  setItem(key: string, value: string): void
}

/** Read a sorted-string-set payload while ignoring corrupt or obsolete entries. */
export function readApprovalSet(
  storage: ApprovalStorage,
  key: string,
  maximumEntryLength: number,
): ReadonlySet<string> {
  try {
    const value = JSON.parse(storage.getItem(key) ?? '[]') as unknown
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((item): item is string => (
      typeof item === 'string' && item.length <= maximumEntryLength
    )))
  } catch {
    return new Set()
  }
}

/** Persist capability keys in deterministic order. */
export function writeApprovalSet(
  storage: ApprovalStorage,
  key: string,
  approvals: ReadonlySet<string>,
): void {
  storage.setItem(key, JSON.stringify([...approvals].sort()))
}
