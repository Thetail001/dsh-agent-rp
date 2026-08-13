/** Browser-to-Host mutation accepted by the session Prompt Manager. */
export type PresetConfigurationRequest =
  | {
    readonly operation: 'replace'
    readonly revision: number
    readonly order: readonly { readonly identifier: string; readonly enabled: boolean }[]
    readonly prompts?: readonly {
      readonly identifier: string
      readonly name: string
      readonly role: 'system' | 'user' | 'assistant'
      readonly content: string
    }[]
    readonly content: readonly { readonly identifier: string; readonly content: string }[]
    readonly generation: {
      readonly temperature?: number | null
      readonly maxTokens?: number | null
      readonly reasoningEffort?: string | null
    }
    readonly regex: readonly { readonly index: number; readonly disabled: boolean }[]
  }
  | {
    readonly operation: 'toggle'
    readonly revision: number
    readonly identifier: string
    readonly enabled: boolean
  }
  | {
    readonly operation: 'move'
    readonly revision: number
    readonly identifier: string
    readonly before?: string
  }
  | {
    readonly operation: 'generation'
    readonly revision: number
    readonly temperature?: number | null
    readonly maxTokens?: number | null
    readonly reasoningEffort?: string | null
  }
  | {
    readonly operation: 'reset'
    readonly revision: number
  }
