/** Agent RP plugin-authored message sources, merged into the dsh-llm source map. */

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** Plugin-produced message: staged RP projections, worldbook snapshots, recalls, notices. */
    plugin: {
      readonly kind: 'plugin'
      readonly plugin: string
      readonly form?: string
      readonly operation?: string
      readonly summary?: string
      readonly channel?: string
      readonly sections?: readonly { readonly name: string; readonly text: string }[]
    }
  }
}

export {}
