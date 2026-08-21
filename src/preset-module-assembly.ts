/** Minimal state shared by prompt definitions and their active-order projection. */
export interface PresetModuleAssemblyEntry {
  readonly identifier: string
  readonly attached: boolean
  readonly enabled: boolean
}

/**
 * Adds one catalog module to the end of the active order without enabling it.
 * This matches SillyTavern's distinction between installing a module and
 * switching it on, while retaining every prompt definition in the catalog.
 */
export function attachPresetModule<T extends PresetModuleAssemblyEntry>(
  modules: readonly T[],
  identifier: string,
): T[] {
  const index = modules.findIndex(module => module.identifier === identifier)
  if (index < 0 || modules[index]!.attached) return [...modules]
  const module = modules[index]!
  const remaining = modules.filter((_, moduleIndex) => moduleIndex !== index)
  const boundary = remaining.findLastIndex(item => item.attached) + 1
  const attached = { ...module, attached: true, enabled: false }
  return [...remaining.slice(0, boundary), attached, ...remaining.slice(boundary)]
}

/** Moves one active module back to the catalog without deleting its definition. */
export function detachPresetModule<T extends PresetModuleAssemblyEntry>(
  modules: readonly T[],
  identifier: string,
): T[] {
  const index = modules.findIndex(module => module.identifier === identifier)
  if (index < 0 || !modules[index]!.attached) return [...modules]
  const module = modules[index]!
  const remaining = modules.filter((_, moduleIndex) => moduleIndex !== index)
  const boundary = remaining.findLastIndex(item => item.attached) + 1
  const detached = { ...module, attached: false, enabled: false }
  return [...remaining.slice(0, boundary), detached, ...remaining.slice(boundary)]
}

/** Reorders active modules while leaving the catalog order untouched. */
export function movePresetModule<T extends PresetModuleAssemblyEntry>(
  modules: readonly T[],
  identifier: string,
  direction: -1 | 1,
): T[] {
  const attached = modules.filter(module => module.attached)
  const catalog = modules.filter(module => !module.attached)
  const index = attached.findIndex(module => module.identifier === identifier)
  const destination = index + direction
  if (index < 0 || destination < 0 || destination >= attached.length) return [...modules]
  const reordered = [...attached]
  const [entry] = reordered.splice(index, 1)
  if (entry === undefined) return [...modules]
  reordered.splice(destination, 0, entry)
  return [...reordered, ...catalog]
}
