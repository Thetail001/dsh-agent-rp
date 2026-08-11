/** Durable JSON schemas and decoders for roleplay Session records. @module @deepseek-ai/dsh-roleplay/schema */

import { snapshotJsonValue, type JsonValue } from '@deepseek-ai/dsh-session'
import {
  validateJsonSchemaValue,
  valueSchemaSpecToJsonSchema,
  type JsonSchemaNode,
  type ObjectJsonSchema,
  type ObjectValueSchemaSpec,
} from '@deepseek-ai/dsh-tools'
import { RoleplayError } from './error.ts'
import type { RoleplayCommit, RoleplayObserverBinding, RoleplayProposal, RoleplaySeed } from './types.ts'

const IDENTIFIER: JsonSchemaNode = { type: 'string' }
const NON_NEGATIVE_INTEGER: JsonSchemaNode = { type: 'integer' }

const RELATIONSHIP_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    actorId: IDENTIFIER,
    affinity: { type: 'integer' },
  },
  required: ['actorId', 'affinity'],
}

const VISIBILITY_SCHEMA: JsonSchemaNode = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: { kind: { type: 'string', const: 'public' } },
      required: ['kind'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'observers' },
        observerIds: { type: 'array', items: IDENTIFIER },
      },
      required: ['kind', 'observerIds'],
    },
  ],
}

const VISIBILITY_VALUE_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'public', required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'observers', required: true },
        observerIds: { type: 'array', items: { type: 'string' }, required: true },
      },
    },
  ],
} as const

/** Enforced JSON shape of the initial `rp/seed` payload. */
const ROLEPLAY_SEED_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 0 },
    observers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: IDENTIFIER, name: { type: 'string' } },
        required: ['id', 'name'],
      },
    },
    actors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: IDENTIFIER,
          name: { type: 'string' },
          observerId: IDENTIFIER,
          location: { type: 'string' },
          relationships: { type: 'array', items: RELATIONSHIP_SCHEMA },
        },
        required: ['id', 'name', 'observerId', 'location', 'relationships'],
      },
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: IDENTIFIER,
          text: { type: 'string' },
          visibility: VISIBILITY_SCHEMA,
        },
        required: ['id', 'text', 'visibility'],
      },
    },
    scene: {
      type: 'object',
      additionalProperties: false,
      properties: {
        location: { type: 'string' },
        participantIds: { type: 'array', items: IDENTIFIER },
      },
      required: ['location', 'participantIds'],
    },
  },
  required: ['version', 'observers', 'actors', 'facts', 'scene'],
}

/** Enforced JSON shape of the immutable `rp/observer` Session binding. */
const ROLEPLAY_OBSERVER_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 0 },
    observerId: IDENTIFIER,
  },
  required: ['version', 'observerId'],
}

/** Shared value-schema branches for all canonical resolver-produced events. */
const ROLEPLAY_WORLD_EVENT_VALUE_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'actor/move', required: true },
        actorId: { type: 'string', required: true },
        location: { type: 'string', required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'relationship/adjust', required: true },
        actorId: { type: 'string', required: true },
        targetId: { type: 'string', required: true },
        delta: { type: 'integer', required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'fact/reveal', required: true },
        factId: { type: 'string', required: true },
        observerIds: { type: 'array', items: { type: 'string' }, required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'scene/advance', required: true },
        location: { type: 'string', required: true },
        participantIds: { type: 'array', items: { type: 'string' }, required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'choice/record', required: true },
        choiceId: { type: 'string', required: true },
        text: { type: 'string', required: true },
        visibility: { ...VISIBILITY_VALUE_SCHEMA, required: true },
      },
    },
  ],
} as const

const CHARACTER_PROPOSAL_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string', const: 'character' },
    actorId: IDENTIFIER,
    resolver: IDENTIFIER,
    resolverVersion: IDENTIFIER,
    arguments: {},
  },
  required: ['role', 'actorId', 'resolver', 'resolverVersion', 'arguments'],
}

const DIRECTOR_PROPOSAL_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string', const: 'director' },
    guidance: { type: 'string' },
    focusActorIds: { type: 'array', items: IDENTIFIER },
  },
  required: ['role', 'guidance', 'focusActorIds'],
}

const CONTINUITY_FINDING_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    severity: { type: 'string', enum: ['info', 'warning', 'error'] },
    summary: { type: 'string' },
    actorIds: { type: 'array', items: IDENTIFIER },
    factIds: { type: 'array', items: IDENTIFIER },
  },
  required: ['severity', 'summary', 'actorIds', 'factIds'],
}

const CONTINUITY_PROPOSAL_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string', const: 'continuity' },
    findings: { type: 'array', items: CONTINUITY_FINDING_SCHEMA },
  },
  required: ['role', 'findings'],
}

/** Enforced JSON shape of one durable, non-canonical `rp/proposal` record. */
const ROLEPLAY_PROPOSAL_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 0 },
    id: IDENTIFIER,
    callId: IDENTIFIER,
    baseRevision: NON_NEGATIVE_INTEGER,
    observerId: IDENTIFIER,
    payload: {
      oneOf: [
        CHARACTER_PROPOSAL_SCHEMA,
        DIRECTOR_PROPOSAL_SCHEMA,
        CONTINUITY_PROPOSAL_SCHEMA,
      ],
    },
  },
  required: ['version', 'id', 'callId', 'baseRevision', 'observerId', 'payload'],
}

/** Single schema source for the commit tool output and durable `rp/commit` decoder. */
export const ROLEPLAY_COMMIT_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', const: 'rp/commit', required: true },
    version: { type: 'integer', const: 0, required: true },
    origin: {
      required: true,
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', const: 'model-tool', required: true },
            callId: { type: 'string', required: true },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', const: 'application', required: true },
            source: { type: 'string', required: true },
            sourceEventSeq: { type: 'integer', required: true },
          },
        },
      ],
    },
    baseRevision: { type: 'integer', required: true },
    revision: { type: 'integer', required: true },
    narration: { type: 'string', required: true },
    causes: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          actorId: { type: 'string', required: true },
          resolver: { type: 'string', required: true },
        },
      },
    },
    events: { type: 'array', items: ROLEPLAY_WORLD_EVENT_VALUE_SCHEMA, required: true },
  },
} as const satisfies ObjectValueSchemaSpec

/** Enforced raw JSON Schema derived for durable `rp/commit` validation. */
export const ROLEPLAY_COMMIT_SCHEMA = valueSchemaSpecToJsonSchema(
  ROLEPLAY_COMMIT_VALUE_SCHEMA,
) as ObjectJsonSchema

/** Snapshot and validate a durable boundary value against one owned schema. */
function decode(value: unknown, schema: ObjectJsonSchema, label: string): JsonValue {
  const snapshot = snapshotJsonValue(value)
  if (snapshot === undefined) {
    throw new RoleplayError(`${label} is not losslessly JSON-serializable`, 'ROLEPLAY_INVALID_DATA')
  }
  const violations = validateJsonSchemaValue(schema, snapshot)
  if (violations.length > 0) {
    throw new RoleplayError(`${label} is invalid: ${violations.join('; ')}`, 'ROLEPLAY_INVALID_DATA')
  }
  return snapshot as JsonValue
}

/**
 * Detach and validate an initial Storyworld payload.
 * @param value - untrusted or caller-owned seed value.
 * @returns the lossless validated snapshot.
 */
export function decodeRoleplaySeed(value: unknown): RoleplaySeed {
  return decode(value, ROLEPLAY_SEED_SCHEMA, 'roleplay seed') as unknown as RoleplaySeed
}

/**
 * Detach and validate one Session observer binding.
 * @param value - untrusted or caller-owned binding value.
 * @returns the lossless validated snapshot.
 */
export function decodeRoleplayObserver(value: unknown): RoleplayObserverBinding {
  return decode(value, ROLEPLAY_OBSERVER_SCHEMA, 'roleplay observer binding') as unknown as RoleplayObserverBinding
}

/**
 * Detach and validate one durable accepted transaction.
 * @param value - untrusted or caller-owned commit value.
 * @returns the lossless validated snapshot.
 */
export function decodeRoleplayCommit(value: unknown): RoleplayCommit {
  return decode(value, ROLEPLAY_COMMIT_SCHEMA, 'roleplay commit') as unknown as RoleplayCommit
}

/**
 * Detach and validate one durable non-canonical proposal.
 * @param value - untrusted or caller-owned proposal value.
 * @returns the lossless validated snapshot.
 */
export function decodeRoleplayProposal(value: unknown): RoleplayProposal {
  return decode(value, ROLEPLAY_PROPOSAL_SCHEMA, 'roleplay proposal') as unknown as RoleplayProposal
}
