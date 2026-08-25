/** Host-theme capture for isolated inline-HTML display frames. */

/** Host message styles inherited by a sanitized inline-HTML display frame. */
export interface CardFrameAppearance {
  readonly backgroundColor: string
  readonly color: string
  readonly fontFamily: string
  readonly fontSize: string
  readonly fontStyle: string
  readonly fontWeight: string
  readonly letterSpacing: string
  readonly lineHeight: string
}

function transparentBackground(value: string): boolean {
  const normalized = value.toLowerCase().replaceAll(' ', '')
  return normalized === 'transparent'
    || /^rgba\([^)]*,0(?:\.0+)?\)$/u.test(normalized)
    || /^(?:color|rgb|hsl)\([^)]*\/0(?:\.0+)?\)$/u.test(normalized)
}

/** Capture the visible Host message theme before replacing it with an isolated display frame. */
export function captureCardFrameAppearance(element: HTMLElement): CardFrameAppearance {
  const style = getComputedStyle(element)
  let backgroundColor: string | undefined
  for (let current: HTMLElement | null = element; current !== null; current = current.parentElement) {
    const candidate = getComputedStyle(current).backgroundColor
    if (!transparentBackground(candidate)) {
      backgroundColor = candidate
      break
    }
  }
  return {
    backgroundColor: backgroundColor ?? 'Canvas',
    color: style.color || 'CanvasText',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
  }
}
