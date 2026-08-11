/** Shared model-facing roleplay commit parameter contract. @module @deepseek-ai/dsh-roleplay/commit-parameters */

/** Single parameter schema consumed by live execution and durable causal validation. */
export const ROLEPLAY_COMMIT_PARAMETERS = {
  base_revision: {
    type: 'integer',
    required: true,
    description: 'Exact current revision from the Storyworld view.',
  },
  narration: {
    type: 'string',
    required: true,
    description: 'Player-visible narration committed with the accepted events.',
  },
  intents: {
    type: 'array',
    required: true,
    description: 'Direct actions or Character proposal references to resolve atomically in order.',
    items: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            actor_id: { type: 'string', required: true },
            resolver: { type: 'string', required: true },
            arguments: { type: 'json', required: true },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            proposal_id: {
              type: 'string',
              required: true,
              description: 'Same-Session Character proposal id at this exact base revision.',
            },
          },
        },
      ],
    },
  },
} as const
