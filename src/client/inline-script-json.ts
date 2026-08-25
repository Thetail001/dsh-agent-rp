/** JSON encoding safe to embed as an expression inside an HTML script element. */

/**
 * Encode a JSON value without allowing HTML parser termination or JavaScript line separators.
 * @param value - JSON-serializable value embedded in an inline script.
 * @returns An expression-safe JSON string.
 */
export function inlineScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, '\\u003c')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029')
}
