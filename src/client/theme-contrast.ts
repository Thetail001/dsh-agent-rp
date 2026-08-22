/** Browser-safe contrast helpers for roleplay text over third-party themes. */

interface RgbaColor {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
}

function channel(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 255 ? parsed : undefined
}

/** Parse the normalized rgb()/rgba() values returned by getComputedStyle(). */
export function parseComputedColor(value: string): RgbaColor | undefined {
  const match = value.trim().match(
    /^rgba?\(\s*([\d.]+)\s*(?:,|\s)\s*([\d.]+)\s*(?:,|\s)\s*([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+))?\s*\)$/iu,
  )
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return undefined
  const red = channel(match[1])
  const green = channel(match[2])
  const blue = channel(match[3])
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  if (red === undefined || green === undefined || blue === undefined
    || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) return undefined
  return { red, green, blue, alpha }
}

function linearChannel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(color: RgbaColor): number {
  return 0.2126 * linearChannel(color.red)
    + 0.7152 * linearChannel(color.green)
    + 0.0722 * linearChannel(color.blue)
}

/** WCAG contrast ratio for two opaque normalized CSS colors. */
export function computedColorContrast(left: string, right: string): number | undefined {
  const first = parseComputedColor(left)
  const second = parseComputedColor(right)
  if (first === undefined || second === undefined || first.alpha < 0.98 || second.alpha < 0.98) return undefined
  const bright = Math.max(luminance(first), luminance(second))
  const dark = Math.min(luminance(first), luminance(second))
  return (bright + 0.05) / (dark + 0.05)
}

export type RoleplayContrastPalette = 'dark' | 'light'

/** Return a local replacement palette only when the active theme is unreadable. */
export function roleplayContrastOverride(
  foreground: string,
  background: string,
  minimum = 4.5,
): RoleplayContrastPalette | undefined {
  const current = computedColorContrast(foreground, background)
  if (current === undefined || current >= minimum) return undefined
  const dark = computedColorContrast('rgb(23, 24, 29)', background) ?? 0
  const light = computedColorContrast('rgb(249, 250, 251)', background) ?? 0
  return dark >= light ? 'dark' : 'light'
}
