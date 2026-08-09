import { isDeepStrictEqual } from "node:util";
import { Service } from "cordis";
import { HarnessError, assertNever, createUserMessage, deepFreeze } from "@deepseek-ai/dsh-llm";
import { assertObjectJsonSchema, defineTool, validateArgs, validateJsonSchemaValue, valueSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import { snapshotJsonValue } from "@deepseek-ai/dsh-session";
import { randomUUID } from "node:crypto";
//#region src/runtime/error.ts
/** Stable roleplay errors shared by replay, setup, and the model-facing tool. */
/** A machine-routable roleplay contract failure. */
var RoleplayError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
		this.name = "RoleplayError";
	}
};
//#endregion
//#region src/runtime/schema.ts
/** Durable JSON schemas and decoders for roleplay Session records. @module @deepseek-ai/dsh-roleplay/schema */
const IDENTIFIER = { type: "string" };
const NON_NEGATIVE_INTEGER = { type: "integer" };
const RELATIONSHIP_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		actorId: IDENTIFIER,
		affinity: { type: "integer" }
	},
	required: ["actorId", "affinity"]
};
const VISIBILITY_SCHEMA = { oneOf: [{
	type: "object",
	additionalProperties: false,
	properties: { kind: {
		type: "string",
		const: "public"
	} },
	required: ["kind"]
}, {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "observers"
		},
		observerIds: {
			type: "array",
			items: IDENTIFIER
		}
	},
	required: ["kind", "observerIds"]
}] };
const VISIBILITY_VALUE_SCHEMA = { oneOf: [{
	type: "object",
	additionalProperties: false,
	properties: { kind: {
		type: "string",
		const: "public",
		required: true
	} }
}, {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "observers",
			required: true
		},
		observerIds: {
			type: "array",
			items: { type: "string" },
			required: true
		}
	}
}] };
/** Enforced JSON shape of the initial `rp/seed` payload. */
const ROLEPLAY_SEED_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			const: 0
		},
		observers: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: IDENTIFIER,
					name: { type: "string" }
				},
				required: ["id", "name"]
			}
		},
		actors: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: IDENTIFIER,
					name: { type: "string" },
					observerId: IDENTIFIER,
					location: { type: "string" },
					relationships: {
						type: "array",
						items: RELATIONSHIP_SCHEMA
					}
				},
				required: [
					"id",
					"name",
					"observerId",
					"location",
					"relationships"
				]
			}
		},
		facts: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: IDENTIFIER,
					text: { type: "string" },
					visibility: VISIBILITY_SCHEMA
				},
				required: [
					"id",
					"text",
					"visibility"
				]
			}
		},
		scene: {
			type: "object",
			additionalProperties: false,
			properties: {
				location: { type: "string" },
				participantIds: {
					type: "array",
					items: IDENTIFIER
				}
			},
			required: ["location", "participantIds"]
		}
	},
	required: [
		"version",
		"observers",
		"actors",
		"facts",
		"scene"
	]
};
/** Enforced JSON shape of the immutable `rp/observer` Session binding. */
const ROLEPLAY_OBSERVER_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			const: 0
		},
		observerId: IDENTIFIER
	},
	required: ["version", "observerId"]
};
/** Shared value-schema branches for all canonical resolver-produced events. */
const ROLEPLAY_WORLD_EVENT_VALUE_SCHEMA = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "actor/move",
				required: true
			},
			actorId: {
				type: "string",
				required: true
			},
			location: {
				type: "string",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "relationship/adjust",
				required: true
			},
			actorId: {
				type: "string",
				required: true
			},
			targetId: {
				type: "string",
				required: true
			},
			delta: {
				type: "integer",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "fact/reveal",
				required: true
			},
			factId: {
				type: "string",
				required: true
			},
			observerIds: {
				type: "array",
				items: { type: "string" },
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "scene/advance",
				required: true
			},
			location: {
				type: "string",
				required: true
			},
			participantIds: {
				type: "array",
				items: { type: "string" },
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "choice/record",
				required: true
			},
			choiceId: {
				type: "string",
				required: true
			},
			text: {
				type: "string",
				required: true
			},
			visibility: {
				...VISIBILITY_VALUE_SCHEMA,
				required: true
			}
		}
	}
] };
/** Enforced JSON shape of one durable, non-canonical `rp/proposal` record. */
const ROLEPLAY_PROPOSAL_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			const: 0
		},
		id: IDENTIFIER,
		callId: IDENTIFIER,
		baseRevision: NON_NEGATIVE_INTEGER,
		observerId: IDENTIFIER,
		payload: { oneOf: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					role: {
						type: "string",
						const: "character"
					},
					actorId: IDENTIFIER,
					resolver: IDENTIFIER,
					resolverVersion: IDENTIFIER,
					arguments: {}
				},
				required: [
					"role",
					"actorId",
					"resolver",
					"resolverVersion",
					"arguments"
				]
			},
			{
				type: "object",
				additionalProperties: false,
				properties: {
					role: {
						type: "string",
						const: "director"
					},
					guidance: { type: "string" },
					focusActorIds: {
						type: "array",
						items: IDENTIFIER
					}
				},
				required: [
					"role",
					"guidance",
					"focusActorIds"
				]
			},
			{
				type: "object",
				additionalProperties: false,
				properties: {
					role: {
						type: "string",
						const: "continuity"
					},
					findings: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								severity: {
									type: "string",
									enum: [
										"info",
										"warning",
										"error"
									]
								},
								summary: { type: "string" },
								actorIds: {
									type: "array",
									items: IDENTIFIER
								},
								factIds: {
									type: "array",
									items: IDENTIFIER
								}
							},
							required: [
								"severity",
								"summary",
								"actorIds",
								"factIds"
							]
						}
					}
				},
				required: ["role", "findings"]
			}
		] }
	},
	required: [
		"version",
		"id",
		"callId",
		"baseRevision",
		"observerId",
		"payload"
	]
};
/** Single schema source for the commit tool output and durable `rp/commit` decoder. */
const ROLEPLAY_COMMIT_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "rp/commit",
			required: true
		},
		version: {
			type: "integer",
			const: 0,
			required: true
		},
		origin: {
			required: true,
			oneOf: [{
				type: "object",
				additionalProperties: false,
				properties: {
					kind: {
						type: "string",
						const: "model-tool",
						required: true
					},
					callId: {
						type: "string",
						required: true
					}
				}
			}, {
				type: "object",
				additionalProperties: false,
				properties: {
					kind: {
						type: "string",
						const: "application",
						required: true
					},
					source: {
						type: "string",
						required: true
					},
					sourceEventSeq: {
						type: "integer",
						required: true
					}
				}
			}]
		},
		baseRevision: {
			type: "integer",
			required: true
		},
		revision: {
			type: "integer",
			required: true
		},
		narration: {
			type: "string",
			required: true
		},
		causes: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					actorId: {
						type: "string",
						required: true
					},
					resolver: {
						type: "string",
						required: true
					}
				}
			}
		},
		events: {
			type: "array",
			items: ROLEPLAY_WORLD_EVENT_VALUE_SCHEMA,
			required: true
		}
	}
};
/** Enforced raw JSON Schema derived for durable `rp/commit` validation. */
const ROLEPLAY_COMMIT_SCHEMA = valueSchemaSpecToJsonSchema(ROLEPLAY_COMMIT_VALUE_SCHEMA);
/** Snapshot and validate a durable boundary value against one owned schema. */
function decode$1(value, schema, label) {
	const snapshot = snapshotJsonValue(value);
	if (snapshot === void 0) throw new RoleplayError(`${label} is not losslessly JSON-serializable`, "ROLEPLAY_INVALID_DATA");
	const violations = validateJsonSchemaValue(schema, snapshot);
	if (violations.length > 0) throw new RoleplayError(`${label} is invalid: ${violations.join("; ")}`, "ROLEPLAY_INVALID_DATA");
	return snapshot;
}
/**
* Detach and validate an initial Storyworld payload.
* @param value - untrusted or caller-owned seed value.
* @returns the lossless validated snapshot.
*/
function decodeRoleplaySeed(value) {
	return decode$1(value, ROLEPLAY_SEED_SCHEMA, "roleplay seed");
}
/**
* Detach and validate one Session observer binding.
* @param value - untrusted or caller-owned binding value.
* @returns the lossless validated snapshot.
*/
function decodeRoleplayObserver(value) {
	return decode$1(value, ROLEPLAY_OBSERVER_SCHEMA, "roleplay observer binding");
}
/**
* Detach and validate one durable accepted transaction.
* @param value - untrusted or caller-owned commit value.
* @returns the lossless validated snapshot.
*/
function decodeRoleplayCommit(value) {
	return decode$1(value, ROLEPLAY_COMMIT_SCHEMA, "roleplay commit");
}
/**
* Detach and validate one durable non-canonical proposal.
* @param value - untrusted or caller-owned proposal value.
* @returns the lossless validated snapshot.
*/
function decodeRoleplayProposal(value) {
	return decode$1(value, ROLEPLAY_PROPOSAL_SCHEMA, "roleplay proposal");
}
//#endregion
//#region src/runtime/commit-parameters.ts
/** Shared model-facing roleplay commit parameter contract. @module @deepseek-ai/dsh-roleplay/commit-parameters */
/** Single parameter schema consumed by live execution and durable causal validation. */
const ROLEPLAY_COMMIT_PARAMETERS = {
	base_revision: {
		type: "integer",
		required: true,
		description: "Exact current revision from the Storyworld view."
	},
	narration: {
		type: "string",
		required: true,
		description: "Player-visible narration committed with the accepted events."
	},
	intents: {
		type: "array",
		required: true,
		description: "Direct actions or Character proposal references to resolve atomically in order.",
		items: { oneOf: [{
			type: "object",
			additionalProperties: false,
			properties: {
				actor_id: {
					type: "string",
					required: true
				},
				resolver: {
					type: "string",
					required: true
				},
				arguments: {
					type: "json",
					required: true
				}
			}
		}, {
			type: "object",
			additionalProperties: false,
			properties: { proposal_id: {
				type: "string",
				required: true,
				description: "Same-Session Character proposal id at this exact base revision."
			} }
		}] }
	}
};
//#endregion
//#region src/runtime/ids.ts
/**
* Brand one actor id after its owning boundary validates the string.
* @param value - validated actor identifier.
* @returns the branded actor identifier.
*/
const asRoleplayActorId = (value) => value;
/**
* Brand one fact id after its owning boundary validates the string.
* @param value - validated fact identifier.
* @returns the branded fact identifier.
*/
const asRoleplayFactId = (value) => value;
/**
* Brand one observer id after its owning boundary validates the string.
* @param value - validated observer identifier.
* @returns the branded observer identifier.
*/
const asRoleplayObserverId = (value) => value;
/**
* Brand one choice id after its owning boundary validates the string.
* @param value - validated choice identifier.
* @returns the branded choice identifier.
*/
const asRoleplayChoiceId = (value) => value;
/**
* Brand one proposal id after its owning boundary validates the string.
* @param value - validated proposal identifier.
* @returns the branded proposal identifier.
*/
const asRoleplayProposalId = (value) => value;
/**
* Brand one resolver name after its owning boundary validates the string.
* @param value - validated resolver name.
* @returns the branded resolver name.
*/
const asRoleplayResolverName = (value) => value;
/**
* Brand one scenario presenter identity after validation.
* @param value - validated presenter identity.
* @returns the branded surface kind.
*/
const asRoleplaySurfaceKind = (value) => value;
/**
* Brand one surface actor id copied from an observer-safe projection.
* @param value - projected actor identity.
* @returns the branded surface actor id.
*/
const asRoleplaySurfaceActorId = (value) => value;
/**
* Brand one surface fact id copied from an observer-safe projection.
* @param value - projected fact identity.
* @returns the branded surface fact id.
*/
const asRoleplaySurfaceFactId = (value) => value;
/**
* Brand one ephemeral surface action id owned by a scenario presenter.
* @param value - presenter-owned action identity.
* @returns the branded surface action id.
*/
const asRoleplaySurfaceActionId = (value) => value;
/**
* Brand one stable public-record id owned by a scenario presenter.
* @param value - presenter-owned public-record identity.
* @returns the branded public-record id.
*/
const asRoleplaySurfaceRecordId = (value) => value;
/**
* Brand one stable completed-session review entry id owned by a scenario presenter.
* @param value - presenter-owned review entry identity.
* @returns the branded review entry id.
*/
const asRoleplaySurfaceReviewEntryId = (value) => value;
//#endregion
//#region src/runtime/reference-validation.ts
/** Shared reference validation for live proposals and durable replay. @module @deepseek-ai/dsh-roleplay/reference-validation */
/**
* Reject references that are unauthorized or repeated within one payload.
* @param values - opaque ids supplied by the payload.
* @param allowed - ids visible at the validating boundary.
* @param label - diagnostic subject for one id.
* @param code - boundary-specific stable error code.
*/
function assertVisibleReferences(values, allowed, label, code) {
	const seen = /* @__PURE__ */ new Set();
	for (const value of values) {
		if (!allowed.has(value)) throw new RoleplayError(`${label} ${JSON.stringify(value)} is not visible`, code);
		if (seen.has(value)) throw new RoleplayError(`${label} ${JSON.stringify(value)} is duplicated`, code);
		seen.add(value);
	}
}
//#endregion
//#region src/runtime/reducer.ts
/** Strict replay reducer and observer projection for the canonical Storyworld. @module @deepseek-ai/dsh-roleplay/reducer */
/** Reject an empty identifier or human-readable field at the semantic boundary. */
function requireText(value, label) {
	if (value.trim().length === 0) throw new RoleplayError(`${label} must be non-empty`, "ROLEPLAY_INVALID_DATA");
}
/** Reject a duplicate id while constructing one indexed seed domain. */
function requireUnique(values, label) {
	const seen = /* @__PURE__ */ new Set();
	for (const value of values) {
		requireText(value, label);
		if (seen.has(value)) throw new RoleplayError(`${label} ${JSON.stringify(value)} is duplicated`, "ROLEPLAY_INVALID_DATA");
		seen.add(value);
	}
}
/** Validate one observer policy against its owning Storyworld domain. */
function validateVisibility(visibility, observerIds, label) {
	if (visibility.kind === "public") return;
	requireUnique(visibility.observerIds, `${label} observer id`);
	for (const observerId of visibility.observerIds) if (!observerIds.has(observerId)) throw new RoleplayError(`${label} names unknown observer ${JSON.stringify(observerId)}`, "ROLEPLAY_INVALID_DATA");
}
/** Validate semantic links inside a structurally valid seed. */
function validateSeed(seed) {
	if (seed.observers.length === 0) throw new RoleplayError("roleplay seed requires at least one observer", "ROLEPLAY_INVALID_DATA");
	if (seed.actors.length === 0) throw new RoleplayError("roleplay seed requires at least one actor", "ROLEPLAY_INVALID_DATA");
	requireUnique(seed.observers.map((observer) => observer.id), "observer id");
	requireUnique(seed.actors.map((actor) => actor.id), "actor id");
	requireUnique(seed.facts.map((fact) => fact.id), "fact id");
	const observerIds = new Set(seed.observers.map((observer) => observer.id));
	const actorIds = new Set(seed.actors.map((actor) => actor.id));
	for (const observer of seed.observers) requireText(observer.name, `observer ${JSON.stringify(observer.id)} name`);
	for (const actor of seed.actors) {
		requireText(actor.name, `actor ${JSON.stringify(actor.id)} name`);
		requireText(actor.location, `actor ${JSON.stringify(actor.id)} location`);
		if (!observerIds.has(actor.observerId)) throw new RoleplayError(`actor ${JSON.stringify(actor.id)} names unknown observer ${JSON.stringify(actor.observerId)}`, "ROLEPLAY_INVALID_DATA");
		requireUnique(actor.relationships.map((relationship) => relationship.actorId), `actor ${JSON.stringify(actor.id)} relationship target`);
		for (const relationship of actor.relationships) {
			if (!actorIds.has(relationship.actorId)) throw new RoleplayError(`actor ${JSON.stringify(actor.id)} relates to unknown actor ${JSON.stringify(relationship.actorId)}`, "ROLEPLAY_INVALID_DATA");
			if (!Number.isSafeInteger(relationship.affinity)) throw new RoleplayError("relationship affinity must be a safe integer", "ROLEPLAY_INVALID_DATA");
		}
	}
	for (const fact of seed.facts) {
		requireText(fact.text, `fact ${JSON.stringify(fact.id)} text`);
		validateVisibility(fact.visibility, observerIds, `fact ${JSON.stringify(fact.id)}`);
	}
	requireText(seed.scene.location, "scene location");
	if (seed.scene.participantIds.length === 0) throw new RoleplayError("scene requires at least one participant", "ROLEPLAY_INVALID_DATA");
	requireUnique(seed.scene.participantIds, "scene participant id");
	for (const actorId of seed.scene.participantIds) if (!actorIds.has(actorId)) throw new RoleplayError(`scene names unknown actor ${JSON.stringify(actorId)}`, "ROLEPLAY_INVALID_DATA");
}
/**
* Build revision zero from one validated seed.
* @param candidate - untrusted or caller-owned seed value.
* @returns the immutable initial Storyworld.
*/
function storyworldFromSeed(candidate) {
	const seed = decodeRoleplaySeed(candidate);
	validateSeed(seed);
	return deepFreeze({
		revision: 0,
		observers: seed.observers,
		actors: seed.actors,
		facts: seed.facts,
		scene: seed.scene,
		choices: []
	});
}
/** Find one canonical actor or reject the resolver-produced reference. */
function actorAt(world, actorId) {
	const index = world.actors.findIndex((actor) => actor.id === actorId);
	const actor = world.actors[index];
	if (actor === void 0) throw new RoleplayError(`world event names unknown actor ${JSON.stringify(actorId)}`, "ROLEPLAY_INVALID_DATA");
	return {
		actor,
		index
	};
}
/** Find one canonical fact or reject the resolver-produced reference. */
function factAt(world, factId) {
	const index = world.facts.findIndex((fact) => fact.id === factId);
	const fact = world.facts[index];
	if (fact === void 0) throw new RoleplayError(`world event names unknown fact ${JSON.stringify(factId)}`, "ROLEPLAY_INVALID_DATA");
	return {
		fact,
		index
	};
}
/** Apply one trusted resolver event without advancing the transaction revision. */
function applyWorldEvent(world, event) {
	switch (event.kind) {
		case "actor/move": {
			const { actor, index } = actorAt(world, event.actorId);
			requireText(event.location, "actor/move location");
			if (actor.location === event.location) throw new RoleplayError(`actor ${JSON.stringify(event.actorId)} is already at ${JSON.stringify(event.location)}`, "ROLEPLAY_INVALID_DATA");
			const actors = [...world.actors];
			actors[index] = {
				...actor,
				location: event.location
			};
			return {
				...world,
				actors
			};
		}
		case "relationship/adjust": {
			const { actor, index } = actorAt(world, event.actorId);
			actorAt(world, event.targetId);
			if (!Number.isSafeInteger(event.delta) || event.delta === 0) throw new RoleplayError("relationship/adjust delta must be a non-zero safe integer", "ROLEPLAY_INVALID_DATA");
			const relationshipIndex = actor.relationships.findIndex((item) => item.actorId === event.targetId);
			const affinity = (actor.relationships[relationshipIndex]?.affinity ?? 0) + event.delta;
			if (!Number.isSafeInteger(affinity)) throw new RoleplayError("relationship/adjust affinity overflowed a safe integer", "ROLEPLAY_INVALID_DATA");
			const relationships = [...actor.relationships];
			const next = {
				actorId: event.targetId,
				affinity
			};
			if (relationshipIndex < 0) relationships.push(next);
			else relationships[relationshipIndex] = next;
			const actors = [...world.actors];
			actors[index] = {
				...actor,
				relationships
			};
			return {
				...world,
				actors
			};
		}
		case "fact/reveal": {
			const { fact, index } = factAt(world, event.factId);
			if (fact.visibility.kind === "public") throw new RoleplayError(`fact ${JSON.stringify(event.factId)} is already public`, "ROLEPLAY_INVALID_DATA");
			if (event.observerIds.length === 0) throw new RoleplayError("fact/reveal requires at least one observer", "ROLEPLAY_INVALID_DATA");
			requireUnique(event.observerIds, "fact/reveal observer id");
			const known = new Set(world.observers.map((observer) => observer.id));
			const observerIds = [...fact.visibility.observerIds];
			let changed = false;
			for (const observerId of event.observerIds) {
				if (!known.has(observerId)) throw new RoleplayError(`fact/reveal names unknown observer ${JSON.stringify(observerId)}`, "ROLEPLAY_INVALID_DATA");
				if (!observerIds.includes(observerId)) {
					observerIds.push(observerId);
					changed = true;
				}
			}
			if (!changed) throw new RoleplayError(`fact ${JSON.stringify(event.factId)} is already visible to every named observer`, "ROLEPLAY_INVALID_DATA");
			const facts = [...world.facts];
			facts[index] = {
				...fact,
				visibility: {
					kind: "observers",
					observerIds
				}
			};
			return {
				...world,
				facts
			};
		}
		case "scene/advance":
			requireText(event.location, "scene/advance location");
			if (event.participantIds.length === 0) throw new RoleplayError("scene/advance requires at least one participant", "ROLEPLAY_INVALID_DATA");
			requireUnique(event.participantIds, "scene/advance participant id");
			for (const actorId of event.participantIds) actorAt(world, actorId);
			if (world.scene.location === event.location && world.scene.participantIds.length === event.participantIds.length && world.scene.participantIds.every((actorId, index) => actorId === event.participantIds[index])) throw new RoleplayError("scene/advance must change the active scene", "ROLEPLAY_INVALID_DATA");
			return {
				...world,
				scene: {
					location: event.location,
					participantIds: [...event.participantIds]
				}
			};
		case "choice/record":
			requireText(event.choiceId, "choice id");
			requireText(event.text, `choice ${JSON.stringify(event.choiceId)} text`);
			if (world.choices.some((choice) => choice.id === event.choiceId)) throw new RoleplayError(`choice id ${JSON.stringify(event.choiceId)} is duplicated`, "ROLEPLAY_INVALID_DATA");
			validateVisibility(event.visibility, new Set(world.observers.map((observer) => observer.id)), `choice ${JSON.stringify(event.choiceId)}`);
			return {
				...world,
				choices: [...world.choices, {
					id: event.choiceId,
					text: event.text,
					visibility: event.visibility
				}]
			};
		/* v8 ignore next 2 -- RoleplayWorldEvent is closed and every variant is handled above. */
		default: return assertNever(event, "roleplay world event");
	}
}
/**
* Apply resolver-produced events as one still-uncommitted draft.
* @param world - canonical base state.
* @param events - deterministic resolver output in causal order.
* @returns a detached state with the same revision.
*/
function applyRoleplayWorldEvents(world, events) {
	if (events.length === 0) throw new RoleplayError("an accepted resolver must produce at least one world event", "ROLEPLAY_INVALID_DATA");
	let next = world;
	for (const event of events) next = applyWorldEvent(next, event);
	return deepFreeze(next);
}
/**
* Apply one durable transaction after exact revision validation.
* @param world - current canonical state.
* @param candidate - untrusted or caller-owned commit value.
* @returns the next immutable revision.
*/
function applyRoleplayCommit(world, candidate) {
	const commit = decodeRoleplayCommit(candidate);
	if (commit.origin.kind === "model-tool") requireText(commit.origin.callId, "roleplay commit tool callId");
	else {
		requireText(commit.origin.source, "roleplay commit application source");
		if (!Number.isSafeInteger(commit.origin.sourceEventSeq) || commit.origin.sourceEventSeq < 0) throw new RoleplayError("roleplay commit application sourceEventSeq must be a non-negative safe integer", "ROLEPLAY_INVALID_DATA");
	}
	requireText(commit.narration, "roleplay commit narration");
	if (commit.causes.length === 0) throw new RoleplayError("roleplay commit requires at least one cause", "ROLEPLAY_INVALID_DATA");
	if (commit.baseRevision !== world.revision) throw new RoleplayError(`stale roleplay revision ${commit.baseRevision}; current revision is ${world.revision}`, "ROLEPLAY_STALE_REVISION");
	if (commit.revision !== commit.baseRevision + 1) throw new RoleplayError(`roleplay commit revision must advance ${commit.baseRevision} to ${commit.baseRevision + 1}, got ${commit.revision}`, "ROLEPLAY_INVALID_DATA");
	const actorIds = new Set(world.actors.map((actor) => actor.id));
	for (const cause of commit.causes) {
		requireText(cause.resolver, "roleplay resolver name");
		if (!actorIds.has(cause.actorId)) throw new RoleplayError(`roleplay cause names unknown actor ${JSON.stringify(cause.actorId)}`, "ROLEPLAY_INVALID_DATA");
	}
	return deepFreeze({
		...applyRoleplayWorldEvents(world, commit.events),
		revision: commit.revision
	});
}
/**
* Strictly replay the roleplay records in one Session prefix.
* @param events - durable Session events in log order.
* @returns the reconstructed Storyworld, or `undefined` before any `rp/seed`.
*/
function replayStoryworld(events) {
	let world;
	for (const event of events) {
		if (event.type === "rp/seed") {
			if (world !== void 0) throw new RoleplayError("a Session may contain exactly one rp/seed", "ROLEPLAY_INVALID_DATA");
			world = storyworldFromSeed(event.data);
			continue;
		}
		if (event.type !== "user/message" || event.data.source.kind !== "roleplay") continue;
		if (world === void 0) throw new RoleplayError("rp/commit appeared before rp/seed", "ROLEPLAY_NO_SEED");
		world = applyRoleplayCommit(world, event.data.source.commit);
	}
	return world;
}
/**
* Project one canonical state without retaining unauthorized fact records or visibility metadata.
* @param world - canonical Storyworld.
* @param observerId - exact observer receiving the view.
* @returns an immutable structurally redacted projection.
*/
function projectStoryworld(world, observerId) {
	if (!world.observers.some((observer) => observer.id === observerId)) throw new RoleplayError(`unknown roleplay observer ${JSON.stringify(observerId)}`, "ROLEPLAY_INVALID_DATA");
	const facts = world.facts.filter((fact) => fact.visibility.kind === "public" || fact.visibility.observerIds.includes(observerId)).map((fact) => ({
		id: fact.id,
		text: fact.text
	}));
	const choices = world.choices.filter((choice) => choice.visibility.kind === "public" || choice.visibility.observerIds.includes(observerId)).map((choice) => ({
		id: choice.id,
		text: choice.text
	}));
	return deepFreeze({
		revision: world.revision,
		observerId,
		actors: world.actors.map((actor) => ({
			id: actor.id,
			name: actor.name,
			location: actor.location,
			relationships: actor.relationships
		})),
		facts,
		scene: world.scene,
		choices
	});
}
//#endregion
//#region src/runtime/proposal.ts
/** Least-knowledge role-agent consultation and privacy-safe proposal projection. @module @deepseek-ai/dsh-roleplay/proposal */
/** Native tool name for optional role-agent consultation. */
const ROLEPLAY_CONSULT_TOOL = "roleplay_consult";
const ROLEPLAY_CONSULT_RECEIPT = "Roleplay proposal processing completed. Use only a following roleplay-owned context as a usable proposal; if none follows, retry the consultation.";
/**
* Render the non-authoritative tool receipt that never exposes an unrecorded proposal id.
* @returns model-facing guidance to wait for the separately admitted proposal context.
*/
function renderRoleplayConsultReceipt() {
	return [{
		type: "text",
		text: ROLEPLAY_CONSULT_RECEIPT
	}];
}
/**
* Render one observer-safe result only after its private proposal record was accepted.
* @param result - validated safe consultation result.
* @returns model-facing context containing the usable proposal id and safe payload.
*/
function renderRoleplayConsultContext(result) {
	return [{
		type: "text",
		text: JSON.stringify(result)
	}];
}
const CHARACTER_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		resolver: { type: "string" },
		arguments: {}
	},
	required: ["resolver", "arguments"]
};
const DIRECTOR_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		guidance: { type: "string" },
		focus_actor_ids: {
			type: "array",
			items: { type: "string" }
		}
	},
	required: ["guidance", "focus_actor_ids"]
};
const CONTINUITY_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: { findings: {
		type: "array",
		items: {
			type: "object",
			additionalProperties: false,
			properties: {
				severity: {
					type: "string",
					enum: [
						"info",
						"warning",
						"error"
					]
				},
				summary: { type: "string" },
				actor_ids: {
					type: "array",
					items: { type: "string" }
				},
				fact_ids: {
					type: "array",
					items: { type: "string" }
				}
			},
			required: [
				"severity",
				"summary",
				"actor_ids",
				"fact_ids"
			]
		}
	} },
	required: ["findings"]
};
/** Build one closed observer-safe event branch without repeating schema framing. */
function previewEventOutput(kind, properties) {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: kind,
				required: true
			},
			...properties
		}
	};
}
/** Enforced model-facing result union of `roleplay_consult`. */
const ROLEPLAY_CONSULT_OUTPUT_SCHEMA = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "character",
				required: true
			},
			proposalId: {
				type: "string",
				required: true
			},
			baseRevision: {
				type: "integer",
				required: true
			},
			actorId: {
				type: "string",
				required: true
			},
			resolver: {
				type: "string",
				required: true
			},
			preview: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					events: {
						type: "array",
						items: { oneOf: [
							previewEventOutput("actor/move", { actorId: {
								type: "string",
								required: true
							} }),
							previewEventOutput("relationship/adjust", {
								actorId: {
									type: "string",
									required: true
								},
								targetId: {
									type: "string",
									required: true
								}
							}),
							previewEventOutput("fact/reveal", { factId: {
								type: "string",
								required: true
							} }),
							previewEventOutput("scene/advance", {}),
							previewEventOutput("choice/record", {})
						] },
						required: true
					},
					withheldFactReveals: {
						type: "integer",
						required: true
					}
				}
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "director",
				required: true
			},
			proposalId: {
				type: "string",
				required: true
			},
			baseRevision: {
				type: "integer",
				required: true
			},
			guidance: {
				type: "string",
				required: true
			},
			focusActorIds: {
				type: "array",
				items: { type: "string" },
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "continuity",
				required: true
			},
			proposalId: {
				type: "string",
				required: true
			},
			baseRevision: {
				type: "integer",
				required: true
			},
			findings: {
				type: "array",
				required: true,
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						severity: {
							type: "string",
							enum: [
								"info",
								"warning",
								"error"
							],
							required: true
						},
						summary: {
							type: "string",
							required: true
						},
						actorIds: {
							type: "array",
							items: { type: "string" },
							required: true
						},
						factIds: {
							type: "array",
							items: { type: "string" },
							required: true
						}
					}
				}
			}
		}
	}
] };
const PERSONAS = {
	character: "You are a private Character proposal agent. Use only the supplied actor-specific Storyworld view and action schemas. Propose exactly one intent for the named actor. Do not narrate, commit state, or claim that the proposal happened.",
	director: "You are a Director proposal agent. Use only the supplied narrator-visible Storyworld view. Return structured pacing and focus guidance; do not narrate or commit state.",
	continuity: "You are a Continuity proposal agent. Use only the supplied narrator-visible Storyworld view. Return structured consistency findings; do not invent hidden facts, narrate, or commit state."
};
/**
* Require the exact provider capabilities that keep role-agent inputs least-knowledge.
* @param subagents - provider registry consulted before the Agent is published.
* @param name - configured provider name that must supply the complete isolation contract.
*/
function assertRoleplayProposalProvider(subagents, name) {
	if (name.trim().length === 0) throw new RoleplayError("roleplay proposal provider must be non-empty", "ROLEPLAY_PROPOSAL_UNAVAILABLE");
	const provider = subagents.getProvider(name);
	if (provider === void 0) throw new RoleplayError(`roleplay proposal provider ${JSON.stringify(name)} is not registered`, "ROLEPLAY_PROPOSAL_UNAVAILABLE");
	if (provider.inheritsParentContext) throw new RoleplayError(`roleplay proposal provider ${JSON.stringify(name)} inherits parent context`, "ROLEPLAY_PROPOSAL_UNAVAILABLE");
	const missing = [
		"outputSchema",
		"depthLimit",
		"toolFilter",
		"persona",
		"sessionVisibility"
	].filter((capability) => !provider.capabilities[capability]);
	if (missing.length > 0) throw new RoleplayError(`roleplay proposal provider ${JSON.stringify(name)} lacks ${missing.join(", ")} capability`, "ROLEPLAY_PROPOSAL_UNAVAILABLE");
}
/** Child-visible request with no parent transcript or canonical authority. */
function proposalPrompt(request, world, observerId, resolvers) {
	const value = {
		role: request.role,
		task: request.task,
		...request.role === "character" ? { actor_id: request.actorId } : {},
		storyworld: projectStoryworld(world, observerId),
		actions: resolvers
	};
	return [{
		type: "text",
		text: `Produce one non-canonical roleplay proposal from this least-knowledge input.

<roleplay-proposal-request>\n${JSON.stringify(value)}\n</roleplay-proposal-request>`
	}];
}
/** Observer identity and structured schema granted to one role. */
function childComposition(request, world, parentObserverId) {
	switch (request.role) {
		case "character": {
			const actor = world.actors.find((candidate) => candidate.id === request.actorId);
			if (actor === void 0) throw new RoleplayError(`roleplay consultation names unknown actor ${JSON.stringify(request.actorId)}`, "ROLEPLAY_INVALID_INTENT");
			return {
				observerId: actor.observerId,
				outputSchema: CHARACTER_OUTPUT_SCHEMA,
				persona: PERSONAS.character
			};
		}
		case "director": return {
			observerId: parentObserverId,
			outputSchema: DIRECTOR_OUTPUT_SCHEMA,
			persona: PERSONAS.director
		};
		case "continuity": return {
			observerId: parentObserverId,
			outputSchema: CONTINUITY_OUTPUT_SCHEMA,
			persona: PERSONAS.continuity
		};
		/* v8 ignore next -- RoleplayConsultRequest is closed and every role is composed above. */
		default: return assertNever(request, "roleplay consultation role");
	}
}
/** Await one published run and preserve both execution and quiescent-disposal failures. */
async function settleChild(run) {
	const [runResult] = await Promise.allSettled([run.result]);
	const [disposal] = await Promise.allSettled([run.dispose()]);
	if (runResult.status === "rejected" || disposal.status === "rejected") {
		const failures = [];
		if (runResult.status === "rejected") failures.push(runResult.reason);
		if (disposal.status === "rejected") failures.push(disposal.reason);
		throw new RoleplayError("roleplay proposal child failed", "ROLEPLAY_PROPOSAL_FAILED", { cause: failures.length === 1 ? failures[0] : new AggregateError(failures, "roleplay proposal child failed and did not dispose cleanly") });
	}
	return runResult.value;
}
/** Convert resolver events into a preview that cannot disclose newly visible facts. */
function safePreview(world, observerId, events) {
	const visibleFacts = new Set(projectStoryworld(world, observerId).facts.map((fact) => fact.id));
	const safe = [];
	let withheldFactReveals = 0;
	for (const event of events) switch (event.kind) {
		case "actor/move":
			safe.push({
				kind: event.kind,
				actorId: event.actorId
			});
			break;
		case "relationship/adjust":
			safe.push({
				kind: event.kind,
				actorId: event.actorId,
				targetId: event.targetId
			});
			break;
		case "fact/reveal":
			if (visibleFacts.has(event.factId)) safe.push({
				kind: event.kind,
				factId: event.factId
			});
			else withheldFactReveals += 1;
			break;
		case "scene/advance":
			safe.push({ kind: event.kind });
			break;
		case "choice/record":
			safe.push({ kind: event.kind });
			break;
		/* v8 ignore next -- RoleplayWorldEvent is closed and every variant is projected above. */
		default: assertNever(event, "roleplay proposal preview event");
	}
	return {
		events: safe,
		withheldFactReveals
	};
}
/** Convert one validated child value into a durable record and observer-safe result. */
function materializeProposal(options, world, observerId, structured) {
	const id = asRoleplayProposalId(randomUUID());
	const base = {
		version: 0,
		id,
		callId: options.callId,
		baseRevision: world.revision,
		observerId
	};
	switch (options.request.role) {
		case "character": {
			const output = structured;
			const intent = {
				actorId: options.request.actorId,
				resolver: asRoleplayResolverName(output.resolver),
				arguments: output.arguments
			};
			const offeredResolver = options.resolvers.find((resolver) => resolver.name === intent.resolver);
			if (offeredResolver === void 0) throw new RoleplayError(`character proposal names unoffered resolver ${JSON.stringify(intent.resolver)}`, "ROLEPLAY_INVALID_INTENT");
			const resolution = options.resolveIntent(world, intent);
			if (resolution.resolverVersion !== offeredResolver.version) throw new RoleplayError(`stale roleplay resolver ${JSON.stringify(intent.resolver)} version ${JSON.stringify(offeredResolver.version)}; current version is ` + JSON.stringify(resolution.resolverVersion), "ROLEPLAY_STALE_RESOLVER");
			return {
				proposal: decodeRoleplayProposal({
					...base,
					payload: {
						role: "character",
						actorId: intent.actorId,
						resolver: intent.resolver,
						resolverVersion: resolution.resolverVersion,
						arguments: intent.arguments
					}
				}),
				result: {
					kind: "character",
					proposalId: id,
					baseRevision: world.revision,
					actorId: intent.actorId,
					resolver: intent.resolver,
					preview: safePreview(world, options.parentObserverId, resolution.events)
				}
			};
		}
		case "director": {
			const output = structured;
			if (output.guidance.trim().length === 0) throw new RoleplayError("director guidance must be non-empty", "ROLEPLAY_PROPOSAL_FAILED");
			const actorIds = new Set(world.actors.map((actor) => String(actor.id)));
			assertVisibleReferences(output.focus_actor_ids, actorIds, "director focus actor id", "ROLEPLAY_PROPOSAL_FAILED");
			const focusActorIds = output.focus_actor_ids.map(asRoleplayActorId);
			return {
				proposal: decodeRoleplayProposal({
					...base,
					payload: {
						role: "director",
						guidance: output.guidance,
						focusActorIds
					}
				}),
				result: {
					kind: "director",
					proposalId: id,
					baseRevision: world.revision,
					guidance: output.guidance,
					focusActorIds
				}
			};
		}
		case "continuity": {
			const output = structured;
			const view = projectStoryworld(world, observerId);
			const actorIds = new Set(view.actors.map((actor) => String(actor.id)));
			const factIds = new Set(view.facts.map((fact) => String(fact.id)));
			const findings = output.findings.map((finding) => {
				if (finding.summary.trim().length === 0) throw new RoleplayError("continuity finding summary must be non-empty", "ROLEPLAY_PROPOSAL_FAILED");
				assertVisibleReferences(finding.actor_ids, actorIds, "continuity actor id", "ROLEPLAY_PROPOSAL_FAILED");
				assertVisibleReferences(finding.fact_ids, factIds, "continuity fact id", "ROLEPLAY_PROPOSAL_FAILED");
				return {
					severity: finding.severity,
					summary: finding.summary,
					actorIds: finding.actor_ids.map(asRoleplayActorId),
					factIds: finding.fact_ids.map(asRoleplayFactId)
				};
			});
			return {
				proposal: decodeRoleplayProposal({
					...base,
					payload: {
						role: "continuity",
						findings
					}
				}),
				result: {
					kind: "continuity",
					proposalId: id,
					baseRevision: world.revision,
					findings
				}
			};
		}
		/* v8 ignore next -- RoleplayConsultRequest is closed and every result is materialized above. */
		default: return assertNever(options.request, "roleplay consultation result");
	}
}
/**
* Run one fresh structured role agent, recheck its world revision, and materialize its proposal.
* @param options - parent authority, least-knowledge view, provider, and deterministic resolver seam.
* @returns the private durable record and its observer-safe model result.
*/
async function consultRoleplay(options) {
	if (options.request.task.trim().length === 0) throw new RoleplayError("roleplay consultation task must be non-empty", "ROLEPLAY_INVALID_INTENT");
	assertRoleplayProposalProvider(options.subagents, options.providerName);
	const initial = options.getWorld();
	const composition = childComposition(options.request, initial, options.parentObserverId);
	const { delegationDepthOf } = await import("@deepseek-ai/dsh-subagent");
	const maxDepth = delegationDepthOf(options.agent) + 1;
	if (!Number.isSafeInteger(maxDepth)) throw new RoleplayError("roleplay proposal depth exceeds the safe-integer range", "ROLEPLAY_PROPOSAL_UNAVAILABLE");
	const child = await settleChild(await options.subagents.start(options.providerName, {
		label: `roleplay ${options.request.role} proposal`,
		prompt: proposalPrompt(options.request, initial, composition.observerId, options.resolvers),
		parent: options.agent,
		signal: options.signal,
		outputSchema: composition.outputSchema,
		maxDepth,
		toolFilter: { allow: [] },
		persona: composition.persona,
		sessionVisibility: "internal"
	}));
	if (child.stopReason !== "completed" || child.structured === void 0) throw new RoleplayError(`roleplay proposal child stopped with ${JSON.stringify(child.stopReason)}`, "ROLEPLAY_PROPOSAL_FAILED");
	const current = options.getWorld();
	if (current.revision !== initial.revision) throw new RoleplayError(`stale roleplay proposal revision ${initial.revision}; current revision is ${current.revision}`, "ROLEPLAY_STALE_REVISION");
	return materializeProposal(options, current, composition.observerId, child.structured);
}
//#endregion
//#region src/runtime/protocol.ts
function invalidRoleplayCommitResponse() {
	throw new RoleplayError("a committing assistant message must contain exactly one roleplay_commit call, made directly, and no other visible content", "ROLEPLAY_INVALID_RESPONSE");
}
/**
* Require one direct commit call while permitting provider reasoning that is not player-visible.
* @param blocks - complete assistant response content.
* @param callId - causal tool call id that must occur exactly once.
* @param toolName - commit tool name that must match the causal call.
*/
function assertRoleplayCommitResponse(blocks, callId, toolName) {
	let matchingCall = false;
	for (const block of blocks) {
		if (block.type === "reasoning") continue;
		if (block.type === "tool-call" && !matchingCall && block.id === callId && block.name === toolName) {
			matchingCall = true;
			continue;
		}
		invalidRoleplayCommitResponse();
	}
	if (!matchingCall) invalidRoleplayCommitResponse();
}
//#endregion
//#region src/runtime/log.ts
/** Durable roleplay record rendering and causal Session-log validation. @module @deepseek-ai/dsh-roleplay/log */
/** Native tool name that owns accepted roleplay commits. */
const ROLEPLAY_COMMIT_TOOL = "roleplay_commit";
/**
* Render a model-safe receipt for the durable canonical transaction.
* @param commit - accepted transaction.
* @returns model-facing content without resolver events or visibility metadata.
*/
function renderRoleplayToolResult(commit) {
	if (commit.origin.kind !== "model-tool") throw new RoleplayError("application roleplay commits have no model tool result", "ROLEPLAY_INVALID_DATA");
	return [{
		type: "text",
		text: JSON.stringify({
			kind: commit.kind,
			version: commit.version,
			callId: commit.origin.callId,
			baseRevision: commit.baseRevision,
			revision: commit.revision
		})
	}];
}
/**
* Render the model-visible commit marker whose source carries the full transaction.
* @param commit - accepted transaction.
* @returns the concise context content appended after the successful tool result.
*/
function renderRoleplayCommitContext(commit) {
	return [{
		type: "text",
		text: `Roleplay revision ${commit.revision} committed.`
	}];
}
/** Whether one Session event belongs to this package's canonical vocabulary. */
function isRoleplayRecord(event) {
	return event.type === "rp/seed" || event.type === "rp/observer" || event.type === "rp/proposal" || event.type === "user/message" && event.data.source.kind === "roleplay";
}
/** Validate the immutable Session-to-observer binding at its exact seed boundary. */
function validateObserverRelation(events, index) {
	const event = events[index];
	if (event?.type !== "rp/observer") return;
	const binding = decodeRoleplayObserver(event.data);
	if (events.slice(0, index).some((candidate) => candidate.type === "rp/observer")) throw new RoleplayError("a roleplay Session may contain exactly one rp/observer", "ROLEPLAY_INVALID_DATA");
	const world = replayStoryworld(events.slice(0, index));
	if (world === void 0) throw new RoleplayError("rp/observer appeared before rp/seed", "ROLEPLAY_NO_SEED");
	if (events[index - 1]?.type !== "rp/seed") throw new RoleplayError("rp/observer must immediately follow rp/seed", "ROLEPLAY_INVALID_DATA");
	if (!world.observers.some((observer) => observer.id === binding.observerId)) throw new RoleplayError(`rp/observer names unknown observer ${JSON.stringify(binding.observerId)}`, "ROLEPLAY_INVALID_DATA");
}
/** Reject an empty durable proposal field. */
function requireProposalText(value, label) {
	if (value.trim().length === 0) throw new RoleplayError(`${label} must be non-empty`, "ROLEPLAY_INVALID_DATA");
}
/** Parse the causal consultation arguments needed to bind a proposal to its call. */
function proposalCallArguments(call) {
	let value;
	try {
		value = JSON.parse(call.data.arguments);
	} catch {
		throw new RoleplayError("roleplay_consult arguments are not valid JSON", "ROLEPLAY_INVALID_DATA");
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new RoleplayError("roleplay_consult arguments must be an object", "ROLEPLAY_INVALID_DATA");
	const record = value;
	if (record.role !== "character" && record.role !== "director" && record.role !== "continuity") throw new RoleplayError("roleplay_consult role is invalid", "ROLEPLAY_INVALID_DATA");
	if (typeof record.task !== "string" || record.task.trim().length === 0) throw new RoleplayError("roleplay_consult task must be non-empty", "ROLEPLAY_INVALID_DATA");
	if (record.role === "character") {
		if (typeof record.actor_id !== "string" || record.actor_id.trim().length === 0) throw new RoleplayError("Character roleplay_consult requires actor_id", "ROLEPLAY_INVALID_DATA");
		return {
			role: record.role,
			task: record.task,
			actorId: record.actor_id
		};
	}
	if ("actor_id" in record) throw new RoleplayError(`${record.role} roleplay_consult does not accept actor_id`, "ROLEPLAY_INVALID_DATA");
	return {
		role: record.role,
		task: record.task
	};
}
/** Parse the causal commit arguments and expand proposal references into their retained causes. */
function commitCallArguments(events, index, call) {
	let value;
	try {
		value = JSON.parse(call.data.arguments);
	} catch {
		throw new RoleplayError("roleplay_commit arguments are not valid JSON", "ROLEPLAY_INVALID_DATA");
	}
	const violations = validateArgs(ROLEPLAY_COMMIT_PARAMETERS, value);
	if (violations.length > 0) throw new RoleplayError(`roleplay_commit arguments are invalid: ${violations.join("; ")}`, "ROLEPLAY_INVALID_DATA");
	const args = value;
	if (!Number.isSafeInteger(args.base_revision) || args.base_revision < 0) throw new RoleplayError("roleplay_commit base_revision must be a non-negative safe integer", "ROLEPLAY_INVALID_DATA");
	if (args.narration.trim().length === 0) throw new RoleplayError("roleplay_commit narration must be non-empty", "ROLEPLAY_INVALID_DATA");
	if (args.intents.length === 0) throw new RoleplayError("roleplay_commit intents must be a non-empty array", "ROLEPLAY_INVALID_DATA");
	const baseRevision = args.base_revision;
	const seenProposals = /* @__PURE__ */ new Set();
	const causes = args.intents.map((intent, intentIndex) => {
		if ("proposal_id" in intent) {
			if (intent.proposal_id.trim().length === 0) throw new RoleplayError(`roleplay_commit intent ${intentIndex} proposal_id must be non-empty`, "ROLEPLAY_INVALID_DATA");
			if (seenProposals.has(intent.proposal_id)) throw new RoleplayError(`roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is referenced more than once`, "ROLEPLAY_INVALID_DATA");
			seenProposals.add(intent.proposal_id);
			const proposalEvent = events.slice(0, index).findLast((candidate) => candidate.type === "rp/proposal" && candidate.data.id === intent.proposal_id);
			if (proposalEvent?.type !== "rp/proposal") throw new RoleplayError(`roleplay_commit references unknown proposal ${JSON.stringify(intent.proposal_id)}`, "ROLEPLAY_INVALID_DATA");
			const proposal = decodeRoleplayProposal(proposalEvent.data);
			if (proposal.payload.role !== "character") throw new RoleplayError(`roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is advisory and cannot be committed`, "ROLEPLAY_INVALID_DATA");
			if (proposal.baseRevision !== baseRevision) throw new RoleplayError(`roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is stale`, "ROLEPLAY_INVALID_DATA");
			return {
				actorId: proposal.payload.actorId,
				resolver: proposal.payload.resolver
			};
		}
		if (intent.actor_id.trim().length === 0) throw new RoleplayError(`roleplay_commit intent ${intentIndex} actor_id must be non-empty`, "ROLEPLAY_INVALID_DATA");
		if (intent.resolver.trim().length === 0) throw new RoleplayError(`roleplay_commit intent ${intentIndex} resolver must be non-empty`, "ROLEPLAY_INVALID_DATA");
		return {
			actorId: intent.actor_id,
			resolver: intent.resolver
		};
	});
	return {
		baseRevision,
		narration: args.narration,
		causes
	};
}
/** Validate one proposal against the exact Storyworld prefix that produced it. */
function validateProposalRelation(events, index, seenIds) {
	const event = events[index];
	if (event?.type !== "rp/proposal") return;
	const proposal = decodeRoleplayProposal(event.data);
	requireProposalText(proposal.id, "roleplay proposal id");
	requireProposalText(proposal.callId, "roleplay proposal call id");
	if (seenIds.has(proposal.id)) throw new RoleplayError(`roleplay proposal id ${JSON.stringify(proposal.id)} is duplicated`, "ROLEPLAY_INVALID_DATA");
	seenIds.add(proposal.id);
	const call = events.slice(0, index).findLast((candidate) => candidate.type === "tool/call" && candidate.data.callId === proposal.callId);
	if (call?.type !== "tool/call" || call.data.name !== "roleplay_consult") throw new RoleplayError("rp/proposal has no causal roleplay_consult tool/call", "ROLEPLAY_INVALID_DATA");
	const callArgs = proposalCallArguments(call);
	if (callArgs.role !== proposal.payload.role) throw new RoleplayError(`rp/proposal role ${JSON.stringify(proposal.payload.role)} does not match its causal consultation`, "ROLEPLAY_INVALID_DATA");
	const world = replayStoryworld(events.slice(0, index));
	if (world === void 0) throw new RoleplayError("rp/proposal appeared before rp/seed", "ROLEPLAY_NO_SEED");
	if (proposal.baseRevision !== world.revision) throw new RoleplayError(`rp/proposal base revision ${proposal.baseRevision} does not match ${world.revision}`, "ROLEPLAY_INVALID_DATA");
	if (!world.observers.some((observer) => observer.id === proposal.observerId)) throw new RoleplayError(`rp/proposal names unknown observer ${JSON.stringify(proposal.observerId)}`, "ROLEPLAY_INVALID_DATA");
	const actorIds = new Set(world.actors.map((actor) => String(actor.id)));
	const visibleFactIds = new Set(projectStoryworld(world, proposal.observerId).facts.map((fact) => String(fact.id)));
	const payload = proposal.payload;
	switch (payload.role) {
		case "character": {
			const actor = world.actors.find((candidate) => candidate.id === payload.actorId);
			if (callArgs.actorId !== payload.actorId) throw new RoleplayError("character proposal actor does not match its causal consultation", "ROLEPLAY_INVALID_DATA");
			if (actor === void 0 || actor.observerId !== proposal.observerId) throw new RoleplayError("character proposal observer does not own its actor", "ROLEPLAY_INVALID_DATA");
			requireProposalText(payload.resolver, "character proposal resolver");
			requireProposalText(payload.resolverVersion, "character proposal resolver version");
			break;
		}
		case "director":
			requireProposalText(payload.guidance, "director proposal guidance");
			assertVisibleReferences(payload.focusActorIds, actorIds, "director focus actor id", "ROLEPLAY_INVALID_DATA");
			break;
		case "continuity":
			for (const finding of payload.findings) {
				requireProposalText(finding.summary, "continuity finding summary");
				assertVisibleReferences(finding.actorIds, actorIds, "continuity actor id", "ROLEPLAY_INVALID_DATA");
				assertVisibleReferences(finding.factIds, visibleFactIds, "continuity fact id", "ROLEPLAY_INVALID_DATA");
			}
			break;
	}
}
/** Validate the durable provenance of one roleplay commit message. */
function validateCommitRelation(events, index) {
	const event = events[index];
	if (event?.type !== "user/message" || event.data.source.kind !== "roleplay") return;
	const commit = decodeRoleplayCommit(event.data.source.commit);
	if (JSON.stringify(event.data.content) !== JSON.stringify(renderRoleplayCommitContext(commit))) throw new RoleplayError("rp/commit message content does not match its canonical transaction", "ROLEPLAY_INVALID_DATA");
	if (commit.origin.kind === "application") {
		const { source, sourceEventSeq } = commit.origin;
		if (!/^[a-z][a-z0-9-]*$/.test(source)) throw new RoleplayError(`rp/commit application source ${JSON.stringify(source)} must use lower-kebab-case`, "ROLEPLAY_INVALID_DATA");
		const sourceEvent = events[sourceEventSeq];
		if (sourceEvent === void 0 || sourceEvent.seq !== sourceEventSeq || sourceEventSeq >= event.seq) throw new RoleplayError("rp/commit application source event is absent or not prior", "ROLEPLAY_INVALID_DATA");
		if (!isDeepStrictEqual(event.sourceEventSeqs, [sourceEventSeq])) throw new RoleplayError("rp/commit application message provenance must name only its source event", "ROLEPLAY_INVALID_DATA");
		return;
	}
	const callId = commit.origin.callId;
	const result = events[index - 1];
	if (result?.type !== "tool/result" || result.data.message.source.callId !== callId || result.data.message.content[0].isError) throw new RoleplayError("rp/commit must immediately follow its successful causal tool/result", "ROLEPLAY_INVALID_DATA");
	if (JSON.stringify(result.data.message.content[0].content) !== JSON.stringify(renderRoleplayToolResult(commit))) throw new RoleplayError("rp/commit does not match the canonical causal tool result", "ROLEPLAY_INVALID_DATA");
	const call = events.slice(0, index - 1).findLast((candidate) => candidate.type === "tool/call" && candidate.data.callId === callId && candidate.data.turn === result.data.turn && candidate.data.step === result.data.step);
	if (call?.type !== "tool/call" || call.data.name !== "roleplay_commit") throw new RoleplayError("rp/commit has no causal roleplay_commit tool/call in its step", "ROLEPLAY_INVALID_DATA");
	const callArguments = commitCallArguments(events, index, call);
	if (callArguments.baseRevision !== commit.baseRevision) throw new RoleplayError("rp/commit base revision does not match its causal roleplay_commit call", "ROLEPLAY_INVALID_DATA");
	if (callArguments.narration !== commit.narration) throw new RoleplayError("rp/commit narration does not match its causal roleplay_commit call", "ROLEPLAY_INVALID_DATA");
	if (!isDeepStrictEqual(callArguments.causes, commit.causes)) throw new RoleplayError("rp/commit causes do not match its causal roleplay_commit intents", "ROLEPLAY_INVALID_DATA");
	const assistant = events.slice(0, index - 1).findLast((candidate) => candidate.type === "assistant/message" && candidate.data.turn === result.data.turn && candidate.data.step === result.data.step);
	const blocks = assistant?.type === "assistant/message" ? assistant.data.message.content : [];
	assertRoleplayCommitResponse(blocks, callId, ROLEPLAY_COMMIT_TOOL);
	const assistantCall = blocks.find((block) => block.type === "tool-call" && block.id === callId && block.name === "roleplay_commit");
	/* v8 ignore next -- assertRoleplayCommitResponse requires this exact call immediately above. */
	if (assistantCall?.type !== "tool-call") throw new Error("roleplay commit response invariant violated");
	if (assistantCall.arguments !== call.data.arguments) throw new RoleplayError("roleplay_commit tool/call arguments do not match the committing assistant response", "ROLEPLAY_INVALID_DATA");
}
/**
* Validate all roleplay records and reconstruct their final Storyworld.
* @param events - complete Session prefix.
* @returns the final reconstructed state, or `undefined` before `rp/seed`.
*/
function validateRoleplayHistory(events) {
	const proposalIds = /* @__PURE__ */ new Set();
	for (let index = 0; index < events.length; index += 1) {
		validateObserverRelation(events, index);
		validateCommitRelation(events, index);
		validateProposalRelation(events, index, proposalIds);
	}
	const world = replayStoryworld(events);
	if (world !== void 0 && !events.some((event) => event.type === "rp/observer")) throw new RoleplayError("roleplay Session has no rp/observer binding", "ROLEPLAY_INVALID_DATA");
	return world;
}
/**
* Read the durable observer identity after history validation.
* @param events - validated roleplay Session history.
* @returns the bound observer, or `undefined` before the initial seed.
*/
function roleplaySessionObserver(events) {
	const event = events.find((candidate) => candidate.type === "rp/observer");
	return event?.type === "rp/observer" ? decodeRoleplayObserver(event.data).observerId : void 0;
}
/**
* Validate one candidate append against the exact live Session prefix.
* @param session - Session that would own the event.
* @param event - pre-commit candidate event.
*/
function validateRoleplayAppend(session, event) {
	if (!isRoleplayRecord(event)) return;
	const events = [...session.events, event];
	const proposalIds = /* @__PURE__ */ new Set();
	for (const candidate of session.events) if (candidate.type === "rp/proposal") proposalIds.add(candidate.data.id);
	const index = events.length - 1;
	validateObserverRelation(events, index);
	validateCommitRelation(events, index);
	validateProposalRelation(events, index, proposalIds);
	replayStoryworld(events);
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
var _a$1;
function $constructor(name, initializer, params) {
	function init(inst, def) {
		if (!inst._zod) Object.defineProperty(inst, "_zod", {
			value: {
				def,
				constr: _,
				traits: /* @__PURE__ */ new Set()
			},
			enumerable: false
		});
		if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		const proto = _.prototype;
		const keys = Object.keys(proto);
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i];
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	return { get value() {
		{
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
		throw new Error("cached value already set");
	} };
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__*/ cached(() => {
	if (globalConfig.jitless) return false;
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	if (o instanceof Map) return new Map(o);
	if (o instanceof Set) return new Set(o);
	return o;
}
const propertyKeyTypes = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = schema._zod.def.shape;
		for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function merge(a, b) {
	if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	return clone(a, mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: b._zod.def.checks ?? []
	}));
}
function partial(Class, schema, mask) {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class ? new Class({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class ? new Class({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function required(Class, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const oldShape = schema._zod.def.shape;
		const shape = { ...oldShape };
		if (mask) for (const key in mask) {
			if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
			if (!mask[key]) continue;
			shape[key] = new Class({
				type: "nonoptional",
				innerType: oldShape[key]
			});
		}
		else for (const key in oldShape) shape[key] = new Class({
			type: "nonoptional",
			innerType: oldShape[key]
		});
		assignProp(this, "shape", shape);
		return shape;
	} }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
	rest.path ?? (rest.path = []);
	rest.message = message;
	if (ctx?.reportInput) rest.input = _input;
	return rest;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error, path = []) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else {
			const fullpath = [...path, ...issue.path];
			if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
			else {
				let curr = fieldErrors;
				let i = 0;
				while (i < fullpath.length) {
					const el = fullpath[i];
					if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
					else {
						curr[el] = curr[el] || { _errors: [] };
						curr[el]._errors.push(mapper(issue));
					}
					curr = curr[el];
					i++;
				}
			}
		}
	};
	processError(error);
	return fieldErrors;
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
const _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
	return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time}(?:${opts.join("|")})`;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
		else bag.exclusiveMaximum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
		else bag.exclusiveMinimum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		var _a;
		(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 4,
	patch: 3
};
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	defineLazy(inst, "~standard", () => ({
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	}));
});
const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			if (!def.normalize && def.protocol?.source === httpProtocol.source) {
				if (!/^https?:\/\//i.test(trimmed)) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						note: "Invalid URL format",
						input: payload.value,
						inst,
						continue: !def.abort
					});
					return;
				}
			}
			const url = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: def.hostname.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid);
	$ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv6`;
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const parts = payload.value.split("/");
		try {
			if (parts.length !== 2) throw new Error();
			const [address, prefix] = parts;
			if (!prefix) throw new Error();
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (/\s/.test(data)) return false;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64";
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64url";
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
	const isPresent = key in input;
	if (result.issues.length) {
		if (isOptionalIn && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && !isOptionalIn) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		keys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const isOptionalIn = _catchall.optin === "optional";
	const isOptionalOut = _catchall.optout === "optional";
	for (const key in input) {
		if (key === "__proto__") continue;
		if (keySet.has(key)) continue;
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
		else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
		const sh = def.shape;
		Object.defineProperty(def, "shape", { get: () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			return newSh;
		} });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const isObject$2 = isObject;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = {};
		const proms = [];
		const shape = value.shape;
		for (const key of value.keys) {
			const el = shape[key];
			const isOptionalIn = el._zod.optin === "optional";
			const isOptionalOut = el._zod.optout === "optional";
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
			else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
	};
});
const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {};`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			const schema = shape[key];
			const isOptionalIn = schema?._zod?.optin === "optional";
			const isOptionalOut = schema?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(key)};`);
			if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
			else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
			else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$1 = isObject;
	const jit = !globalConfig.jitless;
	const fastEnabled = jit && allowsEval.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const first = def.options.length === 1 ? def.options[0]._zod.run : null;
	inst._zod.parse = (payload, ctx) => {
		if (first) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
const $ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
	def.inclusive = false;
	$ZodUnion.init(inst, def);
	const _super = inst._zod.parse;
	defineLazy(inst._zod, "propValues", () => {
		const propValues = {};
		for (const option of def.options) {
			const pv = option._zod.propValues;
			if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
			for (const [k, v] of Object.entries(pv)) {
				if (!propValues[k]) propValues[k] = /* @__PURE__ */ new Set();
				for (const val of v) propValues[k].add(val);
			}
		}
		return propValues;
	});
	const disc = cached(() => {
		const opts = def.options;
		const map = /* @__PURE__ */ new Map();
		for (const o of opts) {
			const values = o._zod.propValues?.[def.discriminator];
			if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
			for (const v of values) {
				if (map.has(v)) throw new Error(`Duplicate discriminator value "${String(v)}"`);
				map.set(v, o);
			}
		}
		return map;
	});
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isObject(input)) {
			payload.issues.push({
				code: "invalid_type",
				expected: "object",
				input,
				inst
			});
			return payload;
		}
		const opt = disc.value.get(input?.[def.discriminator]);
		if (opt) return opt._zod.run(payload, ctx);
		if (def.unionFallback || ctx.direction === "backward") return _super(payload, ctx);
		payload.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: def.discriminator,
			options: Array.from(disc.value.keys()),
			input,
			path: [def.discriminator],
			inst
		});
		return payload;
	};
});
const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
		unrecIssue ?? (unrecIssue = iss);
		for (const k of iss.keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k).l = true;
		}
	} else result.issues.push(iss);
	for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
		if (!unrecKeys.has(k)) unrecKeys.set(k, {});
		unrecKeys.get(k).r = true;
	}
	else result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length && unrecIssue) result.issues.push({
		...unrecIssue,
		keys: bothKeys
	});
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
	const values = new Set(def.values);
	inst._zod.values = values;
	inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		payload.fallback = true;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (input === void 0 && (result.issues.length || result.fallback)) return {
		issues: [],
		value: void 0
	};
	return result;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const input = payload.value;
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
			return handleOptionalResult(result, input);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => {
			payload.value = result.value;
			if (result.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
				payload.fallback = true;
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
			payload.fallback = true;
		}
		return payload;
	};
});
const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues,
		fallback: left.fallback
	}, ctx);
}
const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
	defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class({
		type: "string",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link _cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	}, params);
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		external: params?.external ?? void 0
	};
}
function process(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			process(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) Object.assign(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
			};
		}
		if (entry[1] === root) return { ref: "#" };
		const defUriPrefix = `#/${defsSegment}/`;
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + defId
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") {
				extractToDef(entry);
				continue;
			}
		}
	}
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else Object.assign(schema, refSchema);
			Object.assign(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	Object.assign(result, root.def ?? root.schema);
	const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
	if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
	const defs = ctx.external?.defs ?? {};
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) {
			if (seen.def.id === seen.defId) delete seen.def.id;
			defs[seen.defId] = seen.def;
		}
	}
	if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
	else result.definitions = defs;
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") {
		if (_schema._zod.traits.has("$ZodCodec")) return true;
		return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	}
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	process(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	process(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
const formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
const stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time") delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const regexes = [...patterns];
		if (regexes.length === 1) json.pattern = regexes[0].source;
		else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
const numberProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
	if (typeof format === "string" && format.includes("int")) json.type = "integer";
	else json.type = "number";
	const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
	const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
	const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
	if (exMin) if (legacy) {
		json.minimum = exclusiveMinimum;
		json.exclusiveMinimum = true;
	} else json.exclusiveMinimum = exclusiveMinimum;
	else if (typeof minimum === "number") json.minimum = minimum;
	if (exMax) if (legacy) {
		json.maximum = exclusiveMaximum;
		json.exclusiveMaximum = true;
	} else json.exclusiveMaximum = exclusiveMaximum;
	else if (typeof maximum === "number") json.maximum = maximum;
	if (typeof multipleOf === "number") json.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
const neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
const enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
	const def = schema._zod.def;
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
	} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
	else vals.push(Number(val));
	else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
const customProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
};
const transformProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
};
const arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = schema._zod.bag;
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = process(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
const objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	json.properties = {};
	const shape = def.shape;
	for (const key in shape) json.properties[key] = process(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	});
	const allKeys = new Set(Object.keys(shape));
	const requiredKeys = new Set([...allKeys].filter((key) => {
		const v = def.shape[key]._zod;
		if (ctx.io === "input") return v.optin === void 0;
		else return v.optout === void 0;
	}));
	if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
const unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => process(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
const intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = process(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = process(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
};
const nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		throw new Error("Dynamic catch values are not supported in JSON Schema");
	}
	json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const inIsTransform = def.in._zod.traits.has("$ZodTransform");
	const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
	process(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date(params) {
	return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue) => {
			inst.issues.push(issue);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues) => {
			inst.issues.push(...issues);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
//#endregion
//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
const _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
	const proto = Object.getPrototypeOf(inst);
	let installed = _installedGroups.get(proto);
	if (!installed) {
		installed = /* @__PURE__ */ new Set();
		_installedGroups.set(proto, installed);
	}
	if (installed.has(group)) return;
	installed.add(group);
	for (const key in methods) {
		const fn = methods[key];
		Object.defineProperty(proto, key, {
			configurable: true,
			enumerable: false,
			get() {
				const bound = fn.bind(this);
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: bound
				});
				return bound;
			},
			set(v) {
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: v
				});
			}
		});
	}
}
const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	Object.assign(inst["~standard"], { jsonSchema: {
		input: createStandardJSONSchemaMethod(inst, "input"),
		output: createStandardJSONSchemaMethod(inst, "output")
	} });
	inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
	inst.def = def;
	inst.type = def.type;
	Object.defineProperty(inst, "_def", { value: def });
	inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.encode = (data, params) => encode(inst, data, params);
	inst.decode = (data, params) => decode(inst, data, params);
	inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
	inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
	inst.safeEncode = (data, params) => safeEncode(inst, data, params);
	inst.safeDecode = (data, params) => safeDecode(inst, data, params);
	inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
	inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
	_installLazyMethods(inst, "ZodType", {
		check(...chks) {
			const def = this.def;
			return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
				check: ch,
				def: { check: "custom" },
				onattach: []
			} } : ch)] }), { parent: true });
		},
		with(...chks) {
			return this.check(...chks);
		},
		clone(def, params) {
			return clone(this, def, params);
		},
		brand() {
			return this;
		},
		register(reg, meta) {
			reg.add(this, meta);
			return this;
		},
		refine(check, params) {
			return this.check(refine(check, params));
		},
		superRefine(refinement, params) {
			return this.check(superRefine(refinement, params));
		},
		overwrite(fn) {
			return this.check(/* @__PURE__ */ _overwrite(fn));
		},
		optional() {
			return optional(this);
		},
		exactOptional() {
			return exactOptional(this);
		},
		nullable() {
			return nullable(this);
		},
		nullish() {
			return optional(nullable(this));
		},
		nonoptional(params) {
			return nonoptional(this, params);
		},
		array() {
			return array(this);
		},
		or(arg) {
			return union([this, arg]);
		},
		and(arg) {
			return intersection(this, arg);
		},
		transform(tx) {
			return pipe(this, transform(tx));
		},
		default(d) {
			return _default(this, d);
		},
		prefault(d) {
			return prefault(this, d);
		},
		catch(params) {
			return _catch(this, params);
		},
		pipe(target) {
			return pipe(this, target);
		},
		readonly() {
			return readonly(this);
		},
		describe(description) {
			const cl = this.clone();
			globalRegistry.add(cl, { description });
			return cl;
		},
		meta(...args) {
			if (args.length === 0) return globalRegistry.get(this);
			const cl = this.clone();
			globalRegistry.add(cl, args[0]);
			return cl;
		},
		isOptional() {
			return this.safeParse(void 0).success;
		},
		isNullable() {
			return this.safeParse(null).success;
		},
		apply(fn) {
			return fn(this);
		}
	});
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	return inst;
});
/** @internal */
const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	_installLazyMethods(inst, "_ZodString", {
		regex(...args) {
			return this.check(/* @__PURE__ */ _regex(...args));
		},
		includes(...args) {
			return this.check(/* @__PURE__ */ _includes(...args));
		},
		startsWith(...args) {
			return this.check(/* @__PURE__ */ _startsWith(...args));
		},
		endsWith(...args) {
			return this.check(/* @__PURE__ */ _endsWith(...args));
		},
		min(...args) {
			return this.check(/* @__PURE__ */ _minLength(...args));
		},
		max(...args) {
			return this.check(/* @__PURE__ */ _maxLength(...args));
		},
		length(...args) {
			return this.check(/* @__PURE__ */ _length(...args));
		},
		nonempty(...args) {
			return this.check(/* @__PURE__ */ _minLength(1, ...args));
		},
		lowercase(params) {
			return this.check(/* @__PURE__ */ _lowercase(params));
		},
		uppercase(params) {
			return this.check(/* @__PURE__ */ _uppercase(params));
		},
		trim() {
			return this.check(/* @__PURE__ */ _trim());
		},
		normalize(...args) {
			return this.check(/* @__PURE__ */ _normalize(...args));
		},
		toLowerCase() {
			return this.check(/* @__PURE__ */ _toLowerCase());
		},
		toUpperCase() {
			return this.check(/* @__PURE__ */ _toUpperCase());
		},
		slugify() {
			return this.check(/* @__PURE__ */ _slugify());
		}
	});
});
const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
	inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
	inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
	return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	_installLazyMethods(inst, "ZodNumber", {
		gt(value, params) {
			return this.check(/* @__PURE__ */ _gt(value, params));
		},
		gte(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		min(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		lt(value, params) {
			return this.check(/* @__PURE__ */ _lt(value, params));
		},
		lte(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		max(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		int(params) {
			return this.check(int(params));
		},
		safe(params) {
			return this.check(int(params));
		},
		positive(params) {
			return this.check(/* @__PURE__ */ _gt(0, params));
		},
		nonnegative(params) {
			return this.check(/* @__PURE__ */ _gte(0, params));
		},
		negative(params) {
			return this.check(/* @__PURE__ */ _lt(0, params));
		},
		nonpositive(params) {
			return this.check(/* @__PURE__ */ _lte(0, params));
		},
		multipleOf(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		step(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		finite() {
			return this;
		}
	});
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number(params) {
	return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
	return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function unknown() {
	return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
	_installLazyMethods(inst, "ZodArray", {
		min(n, params) {
			return this.check(/* @__PURE__ */ _minLength(n, params));
		},
		nonempty(params) {
			return this.check(/* @__PURE__ */ _minLength(1, params));
		},
		max(n, params) {
			return this.check(/* @__PURE__ */ _maxLength(n, params));
		},
		length(n, params) {
			return this.check(/* @__PURE__ */ _length(n, params));
		},
		unwrap() {
			return this.element;
		}
	});
});
function array(element, params) {
	return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	defineLazy(inst, "shape", () => {
		return def.shape;
	});
	_installLazyMethods(inst, "ZodObject", {
		keyof() {
			return _enum(Object.keys(this._zod.def.shape));
		},
		catchall(catchall) {
			return this.clone({
				...this._zod.def,
				catchall
			});
		},
		passthrough() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		loose() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		strict() {
			return this.clone({
				...this._zod.def,
				catchall: never()
			});
		},
		strip() {
			return this.clone({
				...this._zod.def,
				catchall: void 0
			});
		},
		extend(incoming) {
			return extend(this, incoming);
		},
		safeExtend(incoming) {
			return safeExtend(this, incoming);
		},
		merge(other) {
			return merge(this, other);
		},
		pick(mask) {
			return pick(this, mask);
		},
		omit(mask) {
			return omit(this, mask);
		},
		partial(...args) {
			return partial(ZodOptional, this, args[0]);
		},
		required(...args) {
			return required(ZodNonOptional, this, args[0]);
		}
	});
});
function object(shape, params) {
	const def = {
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	};
	return new ZodObject(def);
}
const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
	ZodUnion.init(inst, def);
	$ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
	return new ZodDiscriminatedUnion({
		type: "union",
		options,
		discriminator,
		...normalizeParams(params)
	});
}
const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
	return new ZodEnum({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		payload.value = output;
		payload.fallback = true;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
	return /* @__PURE__ */ _superRefine(fn, params);
}
const surfaceKindSchema = string().min(1).max(80);
const surfaceObserverIdSchema = string().min(1).max(240);
const surfaceActorIdSchema = string().min(1).max(240);
const surfaceFactIdSchema = string().min(1).max(240);
const surfaceActionIdSchema = string().min(1).max(160);
const surfaceRecordIdSchema = string().min(1).max(240);
const surfaceReviewEntryIdSchema = string().min(1).max(240);
const surfaceText = (max) => string().min(1).max(max).refine((value) => value.trim().length > 0, { message: "Roleplay surface text must be non-blank" });
const surfaceRecordSchema = object({
	id: surfaceRecordIdSchema,
	kind: _enum([
		"statement",
		"ballot",
		"outcome"
	]),
	phase: surfaceText(320),
	text: surfaceText(2048),
	revision: number().int().nonnegative().optional(),
	actorId: surfaceActorIdSchema.optional(),
	targetActorId: surfaceActorIdSchema.optional()
});
/** Wire schema for the optional Roleplay player surface. */
const roleplayPlayerSurfaceSchema = object({
	kind: surfaceKindSchema,
	locale: surfaceText(40),
	title: surfaceText(160),
	phase: surfaceText(320),
	guidance: surfaceText(2048),
	guidanceDetail: surfaceText(2048).optional(),
	status: _enum(["active", "complete"]),
	revision: number().int().nonnegative(),
	observerId: surfaceObserverIdSchema,
	narration: array(object({
		revision: number().int().positive(),
		text: surfaceText(65536),
		phase: surfaceText(320).optional()
	})).max(40),
	facts: array(object({
		id: surfaceFactIdSchema,
		text: surfaceText(16384)
	})).max(512),
	notice: object({
		title: surfaceText(160),
		text: surfaceText(2048)
	}).optional(),
	actors: array(object({
		id: surfaceActorIdSchema,
		label: surfaceText(160),
		state: _enum([
			"active",
			"inactive",
			"unknown"
		]),
		detail: surfaceText(320).optional(),
		badges: array(surfaceText(80)).max(8).optional()
	})).max(256),
	records: array(surfaceRecordSchema).max(1024),
	actions: array(object({
		id: surfaceActionIdSchema,
		label: surfaceText(240),
		submission: discriminatedUnion("kind", [object({
			kind: literal("prompt"),
			text: surfaceText(16384)
		}), object({
			kind: literal("command"),
			line: surfaceText(16384)
		})]),
		emphasis: _enum(["primary", "secondary"]),
		actorId: surfaceActorIdSchema.optional(),
		automatic: boolean().optional()
	})).max(64),
	input: object({
		placeholder: surfaceText(320),
		submitLabel: surfaceText(120),
		maxLength: number().int().positive().max(16384).optional(),
		submission: discriminatedUnion("kind", [object({ kind: literal("prompt") }), object({
			kind: literal("command"),
			prefix: surfaceText(16384)
		})])
	}).optional(),
	progress: object({
		title: surfaceText(160),
		detail: surfaceText(2048),
		completed: number().int().nonnegative().optional(),
		total: number().int().positive().optional(),
		records: array(surfaceRecordSchema).max(256).optional()
	}).superRefine((progress, refinement) => {
		if (progress.completed !== void 0 && progress.total === void 0) refinement.addIssue({
			code: "custom",
			message: "Roleplay progress completed requires total"
		});
		if (progress.completed !== void 0 && progress.total !== void 0 && progress.completed > progress.total) refinement.addIssue({
			code: "custom",
			message: "Roleplay progress completed cannot exceed total"
		});
	}).optional(),
	review: object({
		title: surfaceText(160),
		detail: surfaceText(2048),
		entries: array(object({
			id: surfaceReviewEntryIdSchema,
			actor: surfaceText(160),
			phase: surfaceText(320),
			decision: surfaceText(2048),
			rationale: surfaceText(2048),
			confidence: surfaceText(80),
			evidence: array(surfaceText(320)).max(64)
		})).max(256)
	}).optional()
}).superRefine((surface, refinement) => {
	const uniqueIds = (values, field) => {
		const seen = /* @__PURE__ */ new Set();
		for (const [index, value] of values.entries()) {
			if (!seen.has(value.id)) {
				seen.add(value.id);
				continue;
			}
			refinement.addIssue({
				code: "custom",
				message: `duplicate Roleplay surface ${field} id ${JSON.stringify(value.id)}`,
				path: [
					field,
					index,
					"id"
				]
			});
		}
	};
	uniqueIds(surface.actors, "actors");
	uniqueIds(surface.facts, "facts");
	uniqueIds(surface.actions, "actions");
	const visibleRecords = [...surface.records.map((record, index) => ({
		record,
		path: ["records", index]
	})), ...(surface.progress?.records ?? []).map((record, index) => ({
		record,
		path: [
			"progress",
			"records",
			index
		]
	}))];
	const recordIds = /* @__PURE__ */ new Set();
	for (const { record, path } of visibleRecords) if (!recordIds.has(record.id)) recordIds.add(record.id);
	else refinement.addIssue({
		code: "custom",
		message: `duplicate Roleplay surface records id ${JSON.stringify(record.id)}`,
		path: [...path, "id"]
	});
	const actorIds = new Set(surface.actors.map((actor) => actor.id));
	if (surface.actions.filter((action) => action.automatic === true).length > 1) refinement.addIssue({
		code: "custom",
		message: "Roleplay surface may expose at most one automatic action",
		path: ["actions"]
	});
	for (const [index, action] of surface.actions.entries()) if (action.actorId !== void 0 && !actorIds.has(action.actorId)) refinement.addIssue({
		code: "custom",
		message: `Roleplay surface action names unknown actor ${JSON.stringify(action.actorId)}`,
		path: [
			"actions",
			index,
			"actorId"
		]
	});
	for (const { record, path } of visibleRecords) {
		if (record.actorId !== void 0 && !actorIds.has(record.actorId)) refinement.addIssue({
			code: "custom",
			message: `Roleplay surface record names unknown actor ${JSON.stringify(record.actorId)}`,
			path: [...path, "actorId"]
		});
		if (record.targetActorId !== void 0 && !actorIds.has(record.targetActorId)) refinement.addIssue({
			code: "custom",
			message: `Roleplay surface record names unknown target ${JSON.stringify(record.targetActorId)}`,
			path: [...path, "targetActorId"]
		});
	}
	if (surface.review !== void 0) {
		if (surface.status !== "complete") refinement.addIssue({
			code: "custom",
			message: "Roleplay surface review requires completed status",
			path: ["review"]
		});
		const seen = /* @__PURE__ */ new Set();
		for (const [index, entry] of surface.review.entries.entries()) {
			if (!seen.has(entry.id)) {
				seen.add(entry.id);
				continue;
			}
			refinement.addIssue({
				code: "custom",
				message: `duplicate Roleplay surface review entry id ${JSON.stringify(entry.id)}`,
				path: [
					"review",
					"entries",
					index,
					"id"
				]
			});
		}
	}
}).nullable();
/**
* Build the projection definition around the current presenter registry.
* @param present - present one observer-safe Roleplay view, or decline it.
* @param progress - fold one event through the matching scenario's safe progress policy.
* @param review - fold one event through the matching scenario's completed-review policy.
* @param narration - retain, rewrite, or suppress one commit's player-timeline narration from observer-safe views.
* @returns the validated Session projection definition for browser surfaces.
*/
function createRoleplaySurfaceProjection(present, progress = (current) => current, review = (current) => current, narration = (_before, _after, text) => text) {
	return {
		key: "roleplay",
		schema: roleplayPlayerSurfaceSchema,
		stateVersion: 3,
		init: () => ({
			world: null,
			observerId: null,
			narration: [],
			recordRevisions: [],
			progress: null,
			review: null
		}),
		apply(state, event) {
			if (event.type === "rp/seed") {
				if (state.world !== null) throw new Error("roleplay surface projection found duplicate rp/seed");
				return {
					...state,
					world: storyworldFromSeed(event.data)
				};
			}
			if (event.type === "rp/observer") {
				if (state.world === null) throw new Error("roleplay surface projection found rp/observer before rp/seed");
				if (state.observerId !== null) throw new Error("roleplay surface projection found duplicate rp/observer");
				const observerId = decodeRoleplayObserver(event.data).observerId;
				const view = projectStoryworld(state.world, observerId);
				const presentation = present(view);
				return {
					...state,
					observerId,
					recordRevisions: presentation?.records.map((record) => ({
						id: record.id,
						revision: view.revision
					})) ?? []
				};
			}
			let next = state;
			if (event.type === "user/message" && event.data.source.kind === "roleplay") {
				if (state.world === null) throw new Error("roleplay surface projection found a commit before rp/seed");
				const commit = event.data.source.commit;
				const beforeView = state.observerId === null ? void 0 : projectStoryworld(state.world, state.observerId);
				const completedPhase = beforeView === void 0 ? void 0 : present(beforeView)?.phase;
				const world = applyRoleplayCommit(state.world, commit);
				const afterView = state.observerId === null ? void 0 : projectStoryworld(world, state.observerId);
				const projectedNarration = beforeView === void 0 || afterView === void 0 ? commit.narration : narration(beforeView, afterView, commit.narration);
				const narrationItems = projectedNarration === null ? state.narration : [...state.narration, {
					revision: commit.revision,
					text: projectedNarration,
					...completedPhase === void 0 ? {} : { phase: completedPhase }
				}].slice(-40);
				const knownRecordIds = new Set(state.recordRevisions.map((record) => record.id));
				const committedRecords = state.observerId === null ? [] : present(projectStoryworld(world, state.observerId))?.records ?? [];
				const recordRevisions = [...state.recordRevisions];
				for (const record of committedRecords) {
					if (knownRecordIds.has(record.id)) continue;
					knownRecordIds.add(record.id);
					recordRevisions.push({
						id: record.id,
						revision: commit.revision
					});
				}
				next = {
					...state,
					world,
					narration: narrationItems,
					recordRevisions
				};
			}
			if (next.world === null || next.observerId === null) return next;
			const view = projectStoryworld(next.world, next.observerId);
			const value = progress(next.progress, view, event);
			const reviewValue = review(next.review, view, event);
			if (value === next.progress && reviewValue === next.review) return next;
			return {
				...next,
				progress: value,
				review: reviewValue
			};
		},
		view(state) {
			if (state.world === null || state.observerId === null) return null;
			const view = projectStoryworld(state.world, state.observerId);
			const presentation = present(view);
			if (presentation === void 0) return null;
			if (state.review?.ready === true && presentation.status !== "complete") throw new Error("roleplay surface presenter marked a review ready before completion");
			const recordRevisionById = new Map(state.recordRevisions.map((record) => [record.id, record.revision]));
			return {
				...presentation,
				records: presentation.records.map((record) => {
					const revision = recordRevisionById.get(record.id);
					return revision === void 0 ? record : {
						...record,
						revision
					};
				}),
				revision: view.revision,
				observerId: view.observerId,
				narration: state.narration,
				...state.progress === null ? {} : { progress: state.progress },
				...state.review?.ready === true ? { review: state.review.value } : {}
			};
		}
	};
}
/**
* Register the Roleplay projection only when the optional registry is composed.
* @param ctx - owning Cordis context with an optional projection registry.
* @param present - current scenario presentation selector.
* @param progress - current scenario progress fold.
* @param review - current scenario completed-review fold.
* @param narration - current scenario committed-narration projection.
*/
function installRoleplaySurfaceProjection(ctx, present, progress, review, narration) {
	ctx.inject(["sessionProjections"], (projectionCtx) => {
		projectionCtx.sessionProjections.register(createRoleplaySurfaceProjection(present, progress, review, narration));
	});
}
//#endregion
//#region src/runtime/index.ts
/** Experimental Storyworld service, resolver registry, and scoped commit runtime. @module @deepseek-ai/dsh-roleplay */
/** Stable roleplay protocol guidance registered only in an attached agent scope. */
const ROLEPLAY_INSTRUCTION = "You narrate from the supplied observer-specific Storyworld view. Treat ordinary prose, tool failures, and proposed intents as non-canonical. To accept a story turn, respond with exactly one roleplay_commit tool call and no other visible content. Copy the current revision as base_revision. The call commits only after every named resolver accepts; otherwise revise the proposal and retry.";
/** Additional protocol guidance present only when role-agent consultation is enabled. */
const ROLEPLAY_PROPOSAL_INSTRUCTION = "roleplay_consult creates non-canonical proposals in fresh, least-knowledge agents. Character proposal ids may replace direct intents in roleplay_commit. Director and continuity proposals are advisory and cannot be committed.";
/** Same-turn reminder used by the optional bounded correction controller. */
const ROLEPLAY_CORRECTION_INSTRUCTION = "No roleplay transaction was committed. Retry this turn with exactly one roleplay_commit tool call and no visible text. Use the current Storyworld revision and revise or replace any rejected intent.";
/** Validate one resolver name at the registry boundary. */
function assertResolverName(name) {
	if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new RoleplayError(`roleplay resolver name ${JSON.stringify(name)} must use lower_snake_case`, "ROLEPLAY_INVALID_DATA");
}
/** Validate that the model's committing message contains only this direct call. */
function assertCommittingResponse(agent, callId) {
	const assistant = agent.session.events.findLast((event) => event.type === "assistant/message");
	assertRoleplayCommitResponse(assistant?.type === "assistant/message" ? assistant.data.message.content : [], callId, ROLEPLAY_COMMIT_TOOL);
}
/** Render one complete observer view and the currently enabled action vocabulary. */
function renderView(world, observerId, resolvers) {
	const value = {
		storyworld: projectStoryworld(world, observerId),
		actions: resolvers
	};
	return `## Storyworld view\n\n<storyworld-view>\n${JSON.stringify(value)}\n</storyworld-view>`;
}
/** Generic pending card for the terminal commit tool. */
function presentCommit(args) {
	return {
		card: "generic",
		title: "Commit story turn",
		kind: "other",
		rawInput: args.narration
	};
}
/** Generic pending card for role-agent consultation. */
function presentConsult(args) {
	return {
		card: "generic",
		title: `Consult ${args.role}`,
		kind: "other",
		rawInput: args.task
	};
}
/** Resolve the optional bounded-correction count before Agent setup begins. */
function resolveMaxCorrectionAttempts(value) {
	if (value === void 0) return 0;
	if (!Number.isSafeInteger(value) || value < 0) throw new RoleplayError("roleplay maxCorrectionAttempts must be a non-negative safe integer", "ROLEPLAY_INVALID_DATA");
	return value;
}
/** Process-local trusted resolver registry and per-agent roleplay composer. */
var RoleplayService = class extends Service {
	static inject = ["tools", "systemPrompt"];
	resolvers = /* @__PURE__ */ new Map();
	presenters = /* @__PURE__ */ new Map();
	attachedAgents = /* @__PURE__ */ new WeakSet();
	constructor(ctx) {
		super(ctx, "roleplay");
		installRoleplaySurfaceProjection(ctx, (view) => this.present(view), (current, view, event) => this.presentProgress(current, view, event), (current, view, event) => this.presentReview(current, view, event), (before, after, text) => this.presentNarration(before, after, text));
	}
	/**
	* Register one scenario-owned observer-safe player presenter.
	* @param presenter - selector and pure presentation projection.
	* @returns an idempotent disposer for this exact presenter.
	*/
	registerPresenter(presenter) {
		if (!/^[a-z][a-z0-9-]*$/.test(presenter.name)) throw new RoleplayError(`roleplay presenter name ${JSON.stringify(presenter.name)} must use lower-kebab-case`, "ROLEPLAY_INVALID_DATA");
		if (this.presenters.has(presenter.name)) throw new RoleplayError(`roleplay presenter ${JSON.stringify(presenter.name)} is already registered`, "ROLEPLAY_INVALID_DATA");
		this.presenters.set(presenter.name, presenter);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			if (this.presenters.get(presenter.name) === presenter) this.presenters.delete(presenter.name);
		};
	}
	/** Resolve exactly one matching scenario presenter without exposing canonical state. */
	presenter(view) {
		const matches = [...this.presenters.values()].filter((presenter) => presenter.matches(view));
		if (matches.length > 1) throw new RoleplayError(`roleplay view matched multiple presenters: ${matches.map((item) => item.name).join(", ")}`, "ROLEPLAY_INVALID_DATA");
		return matches[0];
	}
	/** Produce one complete scenario presentation through its matching presenter. */
	present(view) {
		return this.presenter(view)?.present(view);
	}
	/** Project one commit's narration through the matching scenario presenter. */
	presentNarration(before, after, text) {
		const presenter = this.presenter(before);
		return presenter?.narration === void 0 ? text : presenter.narration(before, after, text);
	}
	/** Fold one event through the matching progress presenter, preserving its explicit clear result. */
	presentProgress(current, view, event) {
		const presenter = this.presenter(view);
		return presenter?.progress === void 0 ? current : presenter.progress(current, view, event);
	}
	/** Fold one event through the matching completed-review presenter. */
	presentReview(current, view, event) {
		const presenter = this.presenter(view);
		return presenter?.review === void 0 ? current : presenter.review(current, view, event);
	}
	/**
	* Register one trusted deterministic action resolver.
	* @param resolver - name, action description, enforced object schema, and transition function.
	* @returns an idempotent disposer that removes this exact registration.
	*/
	registerResolver(resolver) {
		assertResolverName(resolver.name);
		if (resolver.version.trim().length === 0) throw new RoleplayError("roleplay resolver version must be non-empty", "ROLEPLAY_INVALID_DATA");
		if (resolver.description.trim().length === 0) throw new RoleplayError("roleplay resolver description must be non-empty", "ROLEPLAY_INVALID_DATA");
		assertObjectJsonSchema(resolver.parameters);
		if (this.resolvers.has(resolver.name)) throw new RoleplayError(`roleplay resolver ${JSON.stringify(resolver.name)} is already registered`, "ROLEPLAY_DUPLICATE_RESOLVER");
		const stored = {
			...resolver,
			parameters: deepFreeze(structuredClone(resolver.parameters))
		};
		this.resolvers.set(stored.name, stored);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			/* v8 ignore else -- duplicate rejection prevents replacement while this active closure owns the exact entry. */
			if (this.resolvers.get(stored.name) === stored) this.resolvers.delete(stored.name);
		};
	}
	/** Return detached resolver metadata in registration order for model projection. */
	resolverViews() {
		return [...this.resolvers.values()].filter((resolver) => resolver.applicationOnly !== true).map((resolver) => ({
			name: resolver.name,
			version: resolver.version,
			description: resolver.description,
			parameters: structuredClone(resolver.parameters)
		}));
	}
	/** Resolve one trusted intent against an exact draft and validate its complete event sequence. */
	resolveIntent(world, intent, expectedResolverVersion) {
		if (!world.actors.some((actor) => actor.id === intent.actorId)) throw new RoleplayError(`roleplay intent names unknown actor ${JSON.stringify(intent.actorId)}`, "ROLEPLAY_INVALID_INTENT");
		const resolver = this.resolvers.get(intent.resolver);
		if (resolver === void 0) throw new RoleplayError(`unknown roleplay resolver ${JSON.stringify(intent.resolver)}`, "ROLEPLAY_UNKNOWN_RESOLVER");
		if (expectedResolverVersion !== void 0 && resolver.version !== expectedResolverVersion) throw new RoleplayError(`stale roleplay resolver ${JSON.stringify(intent.resolver)} version ${JSON.stringify(expectedResolverVersion)}; current version is ${JSON.stringify(resolver.version)}`, "ROLEPLAY_STALE_RESOLVER");
		const violations = validateJsonSchemaValue(resolver.parameters, intent.arguments);
		if (violations.length > 0) throw new RoleplayError(`invalid ${resolver.name} intent: ${violations.join("; ")}`, "ROLEPLAY_INVALID_INTENT");
		const resolution = resolver.resolve({
			world,
			actorId: intent.actorId
		}, intent.arguments);
		if (resolution.kind === "rejected") throw new RoleplayError(`${resolver.name} rejected the intent: ${resolution.reason}`, "ROLEPLAY_INTENT_REJECTED");
		return {
			world: applyRoleplayWorldEvents(world, resolution.events),
			events: resolution.events,
			resolverVersion: resolver.version
		};
	}
	/** Expand direct inputs and same-Session Character proposal references in caller order. */
	commitIntents(events, inputs, baseRevision) {
		const seenProposals = /* @__PURE__ */ new Set();
		return inputs.map((input) => {
			if (!("proposal_id" in input)) return {
				actorId: input.actor_id,
				resolver: input.resolver,
				arguments: input.arguments
			};
			if (seenProposals.has(input.proposal_id)) throw new RoleplayError(`roleplay proposal ${JSON.stringify(input.proposal_id)} is referenced more than once`, "ROLEPLAY_INVALID_INTENT");
			seenProposals.add(input.proposal_id);
			const event = events.findLast((candidate) => candidate.type === "rp/proposal" && candidate.data.id === input.proposal_id);
			if (event?.type !== "rp/proposal") throw new RoleplayError(`roleplay proposal ${JSON.stringify(input.proposal_id)} is not in this Session`, "ROLEPLAY_INVALID_INTENT");
			if (event.data.payload.role !== "character") throw new RoleplayError(`roleplay ${event.data.payload.role} proposal ${JSON.stringify(input.proposal_id)} is advisory`, "ROLEPLAY_INVALID_INTENT");
			if (event.data.baseRevision !== baseRevision) throw new RoleplayError(`stale roleplay proposal revision ${event.data.baseRevision}; current revision is ${baseRevision}`, "ROLEPLAY_STALE_REVISION");
			return {
				actorId: event.data.payload.actorId,
				resolver: event.data.payload.resolver,
				arguments: event.data.payload.arguments,
				expectedResolverVersion: event.data.payload.resolverVersion
			};
		});
	}
	/** Resolve trusted intents into one detached canonical transaction. */
	resolveCommit(world, intents, narration, origin) {
		if (narration.trim().length === 0 || intents.length === 0) throw new RoleplayError("roleplay commit requires non-empty narration and at least one intent", "ROLEPLAY_INVALID_INTENT");
		let draft = world;
		const events = [];
		for (const intent of intents) {
			if (origin.kind === "model-tool" && this.resolvers.get(intent.resolver)?.applicationOnly === true) throw new RoleplayError(`roleplay resolver ${JSON.stringify(intent.resolver)} is application-only and cannot be used by a model commit`, "ROLEPLAY_INVALID_INTENT");
			const resolution = this.resolveIntent(draft, intent, intent.expectedResolverVersion);
			draft = resolution.world;
			events.push(...resolution.events);
		}
		const outputEvents = events.map((event) => {
			switch (event.kind) {
				case "actor/move": return {
					kind: event.kind,
					actorId: String(event.actorId),
					location: event.location
				};
				case "relationship/adjust": return {
					kind: event.kind,
					actorId: String(event.actorId),
					targetId: String(event.targetId),
					delta: event.delta
				};
				case "fact/reveal": return {
					kind: event.kind,
					factId: String(event.factId),
					observerIds: event.observerIds.map(String)
				};
				case "scene/advance": return {
					kind: event.kind,
					location: event.location,
					participantIds: event.participantIds.map(String)
				};
				case "choice/record": return {
					kind: event.kind,
					choiceId: String(event.choiceId),
					text: event.text,
					visibility: event.visibility.kind === "public" ? { kind: "public" } : {
						kind: "observers",
						observerIds: event.visibility.observerIds.map(String)
					}
				};
				/* v8 ignore next -- RoleplayWorldEvent is closed and every variant is rendered above. */
				default: return assertNever(event, "roleplay commit output event");
			}
		});
		const commit = {
			kind: "rp/commit",
			version: 0,
			origin,
			baseRevision: world.revision,
			revision: world.revision + 1,
			narration,
			causes: intents.map((intent) => ({
				actorId: String(intent.actorId),
				resolver: String(intent.resolver)
			})),
			events: outputEvents
		};
		return {
			record: decodeRoleplayCommit(commit),
			value: commit
		};
	}
	/**
	* Reserve an idle Agent, let trusted application code prepare one revision, and append it atomically.
	* @param agent - attached Roleplay Agent whose next ordinary turn remains reserved until settlement.
	* @param options - durable application provenance and caller cancellation.
	* @param prepare - domain coordinator that receives the exact immutable starting Storyworld.
	* @returns the accepted canonical commit after its observer-safe message enters the Session.
	*/
	async runApplicationTurn(agent, options, prepare) {
		if (!this.attachedAgents.has(agent)) throw new RoleplayError("application turn requires an attached Roleplay Agent", "ROLEPLAY_INVALID_DATA");
		if (!/^[a-z][a-z0-9-]*$/.test(options.source)) throw new RoleplayError(`roleplay application source ${JSON.stringify(options.source)} must use lower-kebab-case`, "ROLEPLAY_INVALID_DATA");
		if (!Number.isSafeInteger(options.sourceEventSeq) || options.sourceEventSeq < 0) throw new RoleplayError("roleplay application sourceEventSeq must be a non-negative safe integer", "ROLEPLAY_INVALID_DATA");
		const sourceEvent = agent.session.events[options.sourceEventSeq];
		if (sourceEvent === void 0 || sourceEvent.seq !== options.sourceEventSeq) throw new RoleplayError("roleplay application source event does not exist", "ROLEPLAY_INVALID_DATA");
		const release = agent.reserveTurnAdmission();
		if (release === void 0) throw new RoleplayError("roleplay application turn requires an idle unreserved Agent", "ROLEPLAY_BUSY");
		try {
			options.signal.throwIfAborted();
			const initial = validateRoleplayHistory(agent.session.events);
			if (initial === void 0) throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
			const draft = await prepare(initial);
			options.signal.throwIfAborted();
			const current = validateRoleplayHistory(agent.session.events);
			if (current === void 0) throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
			if (current.revision !== initial.revision || draft.baseRevision !== current.revision) throw new RoleplayError(`stale roleplay application revision ${draft.baseRevision}; current revision is ${current.revision}`, "ROLEPLAY_STALE_REVISION");
			const { record: commit } = this.resolveCommit(current, draft.intents, draft.narration, {
				kind: "application",
				source: options.source,
				sourceEventSeq: options.sourceEventSeq
			});
			agent.session.append("user/message", createUserMessage({
				content: renderRoleplayCommitContext(commit),
				source: {
					kind: "roleplay",
					commit
				}
			}), {
				surfaceOp: "append",
				sourceEventSeqs: [options.sourceEventSeq]
			});
			return commit;
		} finally {
			release();
		}
	}
	/**
	* Compose one unpublished Agent with a Storyworld view and terminal commit tool.
	* @param options - observer identity and a seed for fresh Sessions.
	* @returns the creation-time setup callback; all registrations unwind with the Agent scope.
	*/
	setup(options) {
		const maxCorrectionAttempts = resolveMaxCorrectionAttempts(options.maxCorrectionAttempts);
		const seedRecord = options.seed === void 0 ? void 0 : decodeRoleplaySeed(options.seed);
		const preparedSeed = seedRecord === void 0 ? void 0 : storyworldFromSeed(seedRecord);
		return (agentCtx) => {
			const agent = agentCtx.agent;
			if (agent === void 0) throw new RoleplayError("roleplay setup requires an Agent scope", "ROLEPLAY_INVALID_DATA");
			const existing = validateRoleplayHistory(agent.session.events);
			const recordedObserver = roleplaySessionObserver(agent.session.events);
			const initial = existing ?? preparedSeed;
			if (initial === void 0) throw new RoleplayError("a fresh roleplay Session requires a seed", "ROLEPLAY_NO_SEED");
			const freshSeed = existing === void 0 ? seedRecord : void 0;
			if (existing !== void 0 && preparedSeed !== void 0) {
				const recordedSeed = agent.session.events.find((event) => event.type === "rp/seed");
				/* v8 ignore next -- successful history validation guarantees one preceding seed. */
				if (recordedSeed?.type !== "rp/seed") throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
				if (!isDeepStrictEqual(storyworldFromSeed(recordedSeed.data), preparedSeed)) throw new RoleplayError("supplied roleplay seed does not match the Session history", "ROLEPLAY_INVALID_DATA");
			}
			if (existing !== void 0 && recordedObserver !== options.observerId) throw new RoleplayError(`roleplay Session is bound to observer ${JSON.stringify(recordedObserver)} and cannot resume as ` + JSON.stringify(options.observerId), "ROLEPLAY_INVALID_DATA");
			projectStoryworld(initial, options.observerId);
			this.attachedAgents.add(agent);
			agentCtx.effect(() => () => {
				this.attachedAgents.delete(agent);
			});
			const proposalProvider = options.proposalProvider;
			const subagents = proposalProvider === void 0 ? void 0 : agentCtx.get("subagents");
			const stagedProposals = /* @__PURE__ */ new WeakMap();
			if (proposalProvider !== void 0) {
				if (subagents === void 0) throw new RoleplayError("roleplay proposalProvider requires the subagent service", "ROLEPLAY_PROPOSAL_UNAVAILABLE");
				assertRoleplayProposalProvider(subagents, proposalProvider);
				agentCtx.on("tools/result", (exec, result) => {
					if (exec.name !== "roleplay_consult") return;
					const staged = stagedProposals.get(exec);
					if (staged === void 0) return;
					stagedProposals.delete(exec);
					if (result.isError || !isDeepStrictEqual(result.value, staged.result)) return;
					agent.session.append("rp/proposal", staged.proposal);
					agent.inject(createUserMessage({
						content: renderRoleplayConsultContext(staged.result),
						source: {
							kind: "plugin",
							plugin: "roleplay"
						}
					}));
				});
			}
			agentCtx.on("internal/dispatch", (_mode, eventName, args) => {
				if (eventName !== "session/event") return;
				const [session, event] = args;
				if (session === agent.session) validateRoleplayAppend(session, event);
			});
			if (maxCorrectionAttempts > 0) {
				let correctionTurn;
				let correctionAttempts = 0;
				agentCtx.on("agent/turn-stopping", (_subject, turn, signal) => {
					signal.throwIfAborted();
					if (correctionTurn !== turn) {
						correctionTurn = turn;
						correctionAttempts = 0;
					}
					if (correctionAttempts >= maxCorrectionAttempts) return;
					correctionAttempts += 1;
					agent.steer(createUserMessage({
						content: [{
							type: "text",
							text: ROLEPLAY_CORRECTION_INSTRUCTION
						}],
						source: {
							kind: "plugin",
							plugin: "roleplay"
						}
					}));
				});
			}
			agentCtx.systemPrompt.section({
				name: "roleplay:protocol",
				order: 140,
				text: ROLEPLAY_INSTRUCTION
			});
			if (proposalProvider !== void 0) agentCtx.systemPrompt.section({
				name: "roleplay:proposals",
				order: 141,
				text: ROLEPLAY_PROPOSAL_INSTRUCTION
			});
			agentCtx.systemPrompt.context({
				name: "roleplay:view",
				order: 70,
				text: () => {
					const world = validateRoleplayHistory(agent.session.events);
					/* v8 ignore next -- setup requires or appends the seed before prompt assembly can call this context. */
					if (world === void 0) throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
					return renderView(world, options.observerId, this.resolverViews());
				}
			});
			agentCtx.tools.register(defineTool({
				name: ROLEPLAY_COMMIT_TOOL,
				description: "Atomically resolve and commit one narrated Storyworld revision. This terminal tool is valid only as the sole content of a direct assistant response.",
				parameters: ROLEPLAY_COMMIT_PARAMETERS,
				output: {
					schema: ROLEPLAY_COMMIT_VALUE_SCHEMA,
					render: (_args, commit) => renderRoleplayToolResult(decodeRoleplayCommit(commit))
				},
				execute: (args, exec) => {
					if (exec.agent !== agent) throw new RoleplayError("roleplay_commit belongs to a different Agent scope", "ROLEPLAY_INVALID_DATA");
					if (exec.parent !== void 0) throw new RoleplayError("roleplay_commit cannot run through a nested tool transport", "ROLEPLAY_NESTED_COMMIT");
					assertCommittingResponse(agent, exec.callId);
					const world = validateRoleplayHistory(agent.session.events);
					/* v8 ignore next -- the append-only Session passed setup's required-seed check before this tool was registered. */
					if (world === void 0) throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
					if (args.base_revision !== world.revision) throw new RoleplayError(`stale roleplay revision ${args.base_revision}; current revision is ${world.revision}`, "ROLEPLAY_STALE_REVISION");
					const intents = this.commitIntents(agent.session.events, args.intents, world.revision);
					const commit = this.resolveCommit(world, intents, args.narration, {
						kind: "model-tool",
						callId: exec.callId
					});
					exec.deferContext(createUserMessage({
						content: renderRoleplayCommitContext(commit.record),
						source: {
							kind: "roleplay",
							commit: commit.record
						}
					}));
					exec.concludeTurn();
					return Promise.resolve(commit.value);
				},
				presentCall: presentCommit,
				isConcurrencySafe: () => false
			}));
			if (proposalProvider !== void 0 && subagents !== void 0) agentCtx.tools.register(defineTool({
				name: ROLEPLAY_CONSULT_TOOL,
				description: "Ask one fresh least-knowledge Character, Director, or Continuity agent for a structured, non-canonical proposal. Character results can later be referenced by proposal_id; other roles advise.",
				parameters: {
					role: {
						type: "string",
						enum: [
							"character",
							"director",
							"continuity"
						],
						required: true,
						description: "Proposal responsibility."
					},
					task: {
						type: "string",
						required: true,
						description: "Specific question or candidate the role agent should evaluate."
					},
					actor_id: {
						type: "string",
						description: "Required only for a Character proposal."
					}
				},
				output: {
					schema: ROLEPLAY_CONSULT_OUTPUT_SCHEMA,
					render: () => renderRoleplayConsultReceipt()
				},
				execute: async (args, exec) => {
					if (exec.agent !== agent) throw new RoleplayError("roleplay_consult belongs to a different Agent scope", "ROLEPLAY_INVALID_DATA");
					if (exec.parent !== void 0) throw new RoleplayError("roleplay_consult cannot run through a nested tool transport", "ROLEPLAY_INVALID_DATA");
					if (args.role === "character" && args.actor_id === void 0) throw new RoleplayError("Character roleplay consultation requires actor_id", "ROLEPLAY_INVALID_INTENT");
					if (args.role !== "character" && args.actor_id !== void 0) throw new RoleplayError(`${args.role} roleplay consultation does not accept actor_id`, "ROLEPLAY_INVALID_INTENT");
					const request = args.role === "character" ? {
						role: args.role,
						task: args.task,
						actorId: asRoleplayActorId(args.actor_id)
					} : {
						role: args.role,
						task: args.task
					};
					const getWorld = () => {
						const world = validateRoleplayHistory(agent.session.events);
						/* v8 ignore next -- setup validated a seed before registering this scoped tool. */
						if (world === void 0) throw new RoleplayError("roleplay Session has no seed", "ROLEPLAY_NO_SEED");
						return world;
					};
					const consultation = await consultRoleplay({
						subagents,
						providerName: proposalProvider,
						agent,
						parentObserverId: options.observerId,
						request,
						callId: exec.callId,
						signal: exec.signal,
						getWorld,
						resolvers: this.resolverViews(),
						resolveIntent: (world, intent) => this.resolveIntent(world, intent)
					});
					stagedProposals.set(exec, consultation);
					return consultation.result;
				},
				presentCall: presentConsult,
				isConcurrencySafe: () => false
			}));
			if (freshSeed !== void 0) return { commit() {
				agent.session.append("rp/seed", freshSeed);
				agent.session.append("rp/observer", {
					version: 0,
					observerId: options.observerId
				});
			} };
		};
	}
};
//#endregion
//#region src/werewolf/werewolf.ts
/** Deterministic twelve-seat Werewolf scenario built from canonical Storyworld events. */
/** Frozen public rules exercised by the standard twelve-seat benchmark. */
const STANDARD_WEREWOLF_RULES = {
	playerCount: 12,
	roles: {
		villager: 4,
		seer: 1,
		witch: 1,
		hunter: 1,
		idiot: 1,
		wolf: 4
	},
	witch: {
		antidotes: 1,
		poisons: 1,
		selfSave: "first-night-only",
		onePotionPerNight: true
	},
	hunter: {
		shootsAfterNightKill: true,
		shootsAfterExile: true,
		shootsAfterPoison: false
	},
	idiot: {
		survivesExile: true,
		losesVote: true
	},
	sheriff: {
		election: "first-day",
		uncontested: "auto-elect",
		voteWeight: 1.5,
		secondTie: "no-sheriff"
	},
	exile: {
		secondTie: "no-elimination",
		revealOrdinaryRole: false
	},
	wolf: {
		selfKill: true,
		daytimeExplosion: true
	},
	victory: "slaughter-side"
};
/** Ordered fixed seats used by the standard scenario. */
const SEATS = Array.from({ length: STANDARD_WEREWOLF_RULES.playerCount }, (_, index) => asRoleplayActorId(`seat-${index + 1}`));
function seatAt(index) {
	const seat = SEATS[index];
	if (seat === void 0) throw new Error(`standard Werewolf seat ${index + 1} is missing`);
	return seat;
}
/** Default human-controlled seat used by the CLI fixture. */
const HUMAN = seatAt(0);
SEATS.slice(0, 4);
/** Fixed Seer seat. */
const SEER = seatAt(4);
/** Fixed Witch seat. */
const WITCH = seatAt(5);
/** Fixed Hunter seat. */
const HUNTER = seatAt(6);
/** Fixed Idiot seat. */
const IDIOT = seatAt(7);
/** Four fixed werewolf seats. */
const WOLVES = SEATS.slice(8);
/** Seats whose roles are fully playable through the browser surface. */
const STANDARD_WEREWOLF_HUMAN_SEATS = [...SEATS];
/** Fact revealed when the good faction wins. */
const GOOD_VICTORY = asRoleplayFactId("standard-good-victory");
const WOLF_VICTORY = asRoleplayFactId("standard-wolf-victory");
const FIXTURE_ROLES = new Map([
	[HUMAN, "villager"],
	[seatAt(1), "villager"],
	[seatAt(2), "villager"],
	[seatAt(3), "villager"],
	[SEER, "seer"],
	[WITCH, "witch"],
	[HUNTER, "hunter"],
	[IDIOT, "idiot"],
	...WOLVES.map((seat) => [seat, "wolf"])
]);
const OBSERVERS = new Map(SEATS.map((seat) => [seat, asRoleplayObserverId(`${seat}-observer`)]));
const ROLE_FACTS = new Map(SEATS.map((seat) => [seat, asRoleplayFactId(`${seat}-role`)]));
const ALIGNMENT_FACTS = new Map(SEATS.map((seat) => [seat, asRoleplayFactId(`${seat}-alignment`)]));
/**
* Resolve the observer durably assigned to one fixed seat.
* @param actorId - standard scenario seat.
* @returns observer bound to that seat.
*/
function observerOf(actorId) {
	const observerId = OBSERVERS.get(actorId);
	if (observerId === void 0) throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`);
	return observerId;
}
/**
* Resolve the hidden role assigned to one seat in the deterministic CLI fixture.
* @param actorId - standard scenario seat.
* @returns the role assigned by the fixture layout.
*/
function standardWerewolfRoleOf(actorId) {
	const role = FIXTURE_ROLES.get(actorId);
	if (role === void 0) throw new Error(`unknown standard Werewolf role for ${JSON.stringify(actorId)}`);
	return role;
}
/**
* Render one standard role for the Simplified Chinese player surface.
* @param role - role from the frozen layout.
* @returns concise role label.
*/
function standardWerewolfRoleLabel(role) {
	switch (role) {
		case "villager": return "普通村民";
		case "seer": return "预言家";
		case "witch": return "女巫";
		case "hunter": return "猎人";
		case "idiot": return "白痴";
		case "wolf": return "狼人";
	}
}
function roleConfirmationChoiceId(actorId) {
	return `setup:role-confirmed:${String(actorId)}`;
}
/**
* Report whether one player has acknowledged their private role before the first night.
* @param source - canonical world or observer view containing visible choices.
* @param actorId - player whose acknowledgement is required.
* @returns whether that player's private acknowledgement is present.
*/
function standardWerewolfRoleConfirmed(source, actorId) {
	return source.choices.some((choice) => String(choice.id) === roleConfirmationChoiceId(actorId));
}
/**
* Record one player's private role acknowledgement before play begins.
* @param world - canonical first-night world.
* @param actorId - player acknowledging their assigned role.
* @returns world retaining the acknowledgement only for that player's observer.
*/
function confirmStandardWerewolfRole(world, actorId) {
	if (world.scene.location !== "night-1") throw new Error(`standard Werewolf role confirmation requires night-1, got ${world.scene.location}`);
	standardWerewolfRoleIn(world, actorId);
	if (standardWerewolfRoleConfirmed(world, actorId)) throw new Error(`${actorId} already confirmed their standard Werewolf role`);
	return apply$1(world, [recordChoice$1(roleConfirmationChoiceId(actorId), `${actorId} confirmed their assigned role.`, {
		kind: "observers",
		observerIds: [observerOf(actorId)]
	})]);
}
function roleFactOf(actorId) {
	const factId = ROLE_FACTS.get(actorId);
	if (factId === void 0) throw new Error(`unknown standard Werewolf role fact for ${JSON.stringify(actorId)}`);
	return factId;
}
function alignmentFactOf(actorId) {
	const factId = ALIGNMENT_FACTS.get(actorId);
	if (factId === void 0) throw new Error(`unknown standard Werewolf alignment fact for ${JSON.stringify(actorId)}`);
	return factId;
}
function roleLabel(role) {
	switch (role) {
		case "villager": return "a villager";
		case "seer": return "the Seer";
		case "witch": return "the Witch";
		case "hunter": return "the Hunter";
		case "idiot": return "the Idiot";
		case "wolf": return "a werewolf";
	}
}
const ALL_OBSERVERS = SEATS.map(observerOf);
function roleFromLabel(label) {
	switch (label) {
		case "a villager": return "villager";
		case "the Seer": return "seer";
		case "the Witch": return "witch";
		case "the Hunter": return "hunter";
		case "the Idiot": return "idiot";
		case "a werewolf": return "wolf";
		default: return;
	}
}
/**
* Resolve one role from the active match's durable seed facts.
* @param source - canonical world or observer view containing the actor's visible role fact.
* @param actorId - actor whose role is required.
* @returns role encoded by that match rather than the deterministic CLI fixture.
*/
function standardWerewolfRoleIn(source, actorId) {
	if (!source.actors.some((actor) => actor.id === actorId)) throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`);
	const fact = source.facts.find((candidate) => candidate.id === roleFactOf(actorId));
	const match = fact === void 0 ? void 0 : /^seat-\d+ is (.+)\.$/u.exec(fact.text);
	const role = match?.[1] === void 0 ? void 0 : roleFromLabel(match[1]);
	if (role === void 0) throw new Error(`standard Werewolf role for ${JSON.stringify(actorId)} is not visible or malformed`);
	return role;
}
/**
* Resolve one visible faction from the active match's durable alignment facts.
* @param source - canonical world or observer view containing the actor's visible alignment fact.
* @param actorId - actor whose faction is required.
* @returns faction encoded by that match without exposing a hidden role.
*/
function standardWerewolfAlignmentIn(source, actorId) {
	if (!source.actors.some((actor) => actor.id === actorId)) throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`);
	const fact = source.facts.find((candidate) => candidate.id === alignmentFactOf(actorId));
	const match = fact === void 0 ? void 0 : /^seat-\d+ belongs to the (good|werewolf) faction\.$/u.exec(fact.text);
	if (match?.[1] === "good") return "good";
	if (match?.[1] === "werewolf") return "wolf";
	throw new Error(`standard Werewolf alignment for ${JSON.stringify(actorId)} is not visible or malformed`);
}
/**
* Find the unique actor carrying one singleton role in the active match.
* @param source - canonical world containing every role fact.
* @param role - Seer, Witch, Hunter, or Idiot.
* @returns the actor assigned that role.
*/
function standardWerewolfActorWithRole(source, role) {
	const actors = source.actors.filter((actor) => standardWerewolfRoleIn(source, actor.id) === role);
	if (actors.length !== 1 || actors[0] === void 0) throw new Error(`standard Werewolf match requires exactly one ${role}`);
	return actors[0].id;
}
/**
* List every actor assigned one role in the active match.
* @param source - canonical world containing every role fact.
* @param role - role to select.
* @returns actors in canonical seat order.
*/
function standardWerewolfActorsWithRole(source, role) {
	return source.actors.filter((actor) => standardWerewolfRoleIn(source, actor.id) === role).map((actor) => actor.id);
}
function validateRoleOrder(roles) {
	if (roles.length !== SEATS.length) throw new Error("standard Werewolf role order must name twelve seats");
	for (const [role, expected] of Object.entries(STANDARD_WEREWOLF_RULES.roles)) if (roles.filter((candidate) => candidate === role).length !== expected) throw new Error(`standard Werewolf role order requires ${String(expected)} ${role}`);
}
/**
* Build a revision-zero seed from one complete role order.
* @param roles - role for each item in `SEATS`, in canonical seat order.
* @returns validated replay-stable standard match seed.
*/
function createStandardWerewolfSeed(roles) {
	validateRoleOrder(roles);
	const roleByActor = /* @__PURE__ */ new Map();
	for (const [index, seat] of SEATS.entries()) {
		const role = roles[index];
		if (role === void 0) throw new Error(`standard Werewolf role for ${seat} is missing`);
		roleByActor.set(seat, role);
	}
	const roleOfSeedSeat = (seat) => {
		const role = roleByActor.get(seat);
		if (role === void 0) throw new Error(`standard Werewolf role for ${seat} is missing`);
		return role;
	};
	const wolfObservers = SEATS.filter((seat) => roleByActor.get(seat) === "wolf").map(observerOf);
	return {
		version: 0,
		observers: SEATS.map((seat) => ({
			id: observerOf(seat),
			name: `${seat} observer`
		})),
		actors: SEATS.map((seat) => ({
			id: seat,
			name: String(seat),
			observerId: observerOf(seat),
			location: "alive",
			relationships: []
		})),
		facts: [
			...SEATS.map((seat) => {
				const role = roleOfSeedSeat(seat);
				return {
					id: roleFactOf(seat),
					text: `${seat} is ${roleLabel(role)}.`,
					visibility: {
						kind: "observers",
						observerIds: role === "wolf" ? wolfObservers : [observerOf(seat)]
					}
				};
			}),
			...SEATS.map((seat) => {
				const role = roleOfSeedSeat(seat);
				return {
					id: alignmentFactOf(seat),
					text: `${seat} belongs to the ${role === "wolf" ? "werewolf" : "good"} faction.`,
					visibility: {
						kind: "observers",
						observerIds: role === "wolf" ? wolfObservers : [observerOf(seat)]
					}
				};
			}),
			{
				id: GOOD_VICTORY,
				text: "The good faction has won the standard match.",
				visibility: {
					kind: "observers",
					observerIds: []
				}
			},
			{
				id: WOLF_VICTORY,
				text: "The werewolf faction has won by slaughtering one good side.",
				visibility: {
					kind: "observers",
					observerIds: []
				}
			}
		],
		scene: {
			location: "night-1",
			participantIds: SEATS
		}
	};
}
createStandardWerewolfSeed(SEATS.map(standardWerewolfRoleOf));
function publicVisibility() {
	return { kind: "public" };
}
function observerVisibility(observerIds) {
	return {
		kind: "observers",
		observerIds
	};
}
function recordChoice$1(id, text, visibility) {
	return {
		kind: "choice/record",
		choiceId: asRoleplayChoiceId(id),
		text,
		visibility
	};
}
function apply$1(world, events) {
	return applyRoleplayWorldEvents(world, events);
}
function phaseRound(world, phase) {
	const match = new RegExp(`^${phase}-(\\d+)$`).exec(world.scene.location);
	if (match?.[1] === void 0) throw new Error(`standard Werewolf action requires ${phase}, got ${world.scene.location}`);
	return Number(match[1]);
}
function isLivingLocation(location) {
	return location === "alive" || location === "revealed-idiot";
}
/**
* List seats still participating in the match.
* @param world - canonical match state.
* @returns living seats, including a revealed Idiot.
*/
function livingSeats(world) {
	return world.actors.filter((actor) => isLivingLocation(actor.location)).map((actor) => actor.id);
}
function isLiving$1(world, actorId) {
	return world.actors.some((actor) => actor.id === actorId && isLivingLocation(actor.location));
}
function canVote$1(world, actorId) {
	return world.actors.some((actor) => actor.id === actorId && actor.location === "alive");
}
function choiceIds$1(world, prefix) {
	return world.choices.map((choice) => String(choice.id)).filter((id) => id.startsWith(prefix));
}
function choiceTarget$1(id) {
	return asRoleplayActorId(id.slice(id.lastIndexOf(":") + 1));
}
/**
* Read the wolf proposals visible in one world or observer projection.
* @param source - canonical world or wolf-observer view containing visible choices.
* @param round - night whose proposal table is requested.
* @returns proposals in durable choice order.
*/
function standardWerewolfWolfProposals(source, round) {
	const prefix = `night:${String(round)}:wolf-proposal:`;
	return source.choices.flatMap((choice) => {
		const id = String(choice.id);
		if (!id.startsWith(prefix)) return [];
		const match = /^(seat-(?:[1-9]|1[0-2])):(seat-(?:[1-9]|1[0-2]))$/u.exec(id.slice(prefix.length));
		if (match?.[1] === void 0 || match[2] === void 0) throw new Error(`malformed standard Werewolf wolf proposal ${JSON.stringify(id)}`);
		return [{
			actorId: asRoleplayActorId(match[1]),
			targetId: asRoleplayActorId(match[2])
		}];
	});
}
function assertLiving$1(world, actorId, label) {
	if (!isLiving$1(world, actorId)) throw new Error(`${label} must be living`);
}
function assertRole(world, actorId, role) {
	if (standardWerewolfRoleIn(world, actorId) !== role) throw new Error(`${actorId} is not ${role}`);
}
function nextDayLocation(round) {
	return round === 1 ? "sheriff-election-1" : `discussion-${round}`;
}
function nextNightLocation(round) {
	return `night-${round + 1}`;
}
function hunterShotPhase(world) {
	const match = /^hunter-shot-(night|exile)-(\d+)$/.exec(world.scene.location);
	if (match?.[1] === void 0 || match[2] === void 0) throw new Error(`standard Werewolf Hunter action requires a Hunter-shot scene, got ${world.scene.location}`);
	return {
		origin: match[1],
		round: Number(match[2])
	};
}
/**
* Record the wolves' private target without settling the night.
* @param world - canonical state in a night phase.
* @param wolfId - living werewolf used for resolver attribution after pack agreement.
* @param targetId - living target.
* @returns world containing the private wolf choice.
*/
function wolfKill(world, wolfId, targetId) {
	const round = phaseRound(world, "night");
	assertRole(world, wolfId, "wolf");
	assertLiving$1(world, wolfId, "acting werewolf");
	assertLiving$1(world, targetId, "wolf target");
	if (choiceIds$1(world, `night:${round}:wolf-kill:`).length > 0) throw new Error(`night ${round} already has a wolf target`);
	return apply$1(world, [recordChoice$1(`night:${round}:wolf-kill:${targetId}`, `The werewolves selected ${targetId}.`, observerVisibility([...standardWerewolfActorsWithRole(world, "wolf").map(observerOf), observerOf(standardWerewolfActorWithRole(world, "witch"))]))]);
}
/**
* Record one living wolf's private proposal without selecting the pack target.
* @param world - canonical state in a night phase.
* @param wolfId - living werewolf making this proposal.
* @param targetId - living proposed target.
* @returns world containing the proposal for living wolf observers only.
*/
function recordWolfProposal(world, wolfId, targetId) {
	const round = phaseRound(world, "night");
	assertRole(world, wolfId, "wolf");
	assertLiving$1(world, wolfId, "proposing werewolf");
	assertLiving$1(world, targetId, "wolf proposal target");
	if (standardWerewolfWolfProposals(world, round).some((proposal) => proposal.actorId === wolfId)) throw new Error(`${wolfId} already proposed a target during night ${String(round)}`);
	const livingWolfObservers = standardWerewolfActorsWithRole(world, "wolf").filter((actorId) => isLiving$1(world, actorId)).map(observerOf);
	return apply$1(world, [recordChoice$1(`night:${String(round)}:wolf-proposal:${String(wolfId)}:${String(targetId)}`, `${wolfId} proposed ${targetId} to the living wolf pack.`, observerVisibility(livingWolfObservers))]);
}
/**
* Record the Witch's private potion decision without settling the night.
* @param world - canonical state after the wolf choice.
* @param witchId - living seat assigned the Witch in this match.
* @param action - pass, antidote, or poison decision.
* @returns world containing the private Witch choice.
*/
function witchAct(world, witchId, action) {
	const round = phaseRound(world, "night");
	assertRole(world, witchId, "witch");
	assertLiving$1(world, witchId, "Witch");
	if (choiceIds$1(world, `night:${round}:witch:`).length > 0) throw new Error(`night ${round} already has a Witch action`);
	if (action.save && action.poisonTargetId !== void 0) throw new Error("the Witch cannot use both potions in one night");
	const wolfKillId = choiceIds$1(world, `night:${round}:wolf-kill:`)[0];
	if (wolfKillId === void 0) throw new Error("the Witch acts after the wolf target exists");
	const wolfTargetId = choiceTarget$1(wolfKillId);
	if (action.save) {
		if (choiceIds$1(world, "night:").some((id) => id.includes(":witch:save:"))) throw new Error("the Witch antidote is already spent");
		if (wolfTargetId === witchId && round !== 1) throw new Error("the Witch may self-save only during night 1");
		return apply$1(world, [recordChoice$1(`night:${round}:witch:save:${wolfTargetId}`, `The Witch used the antidote on ${wolfTargetId}.`, observerVisibility([observerOf(witchId)]))]);
	}
	if (action.poisonTargetId !== void 0) {
		assertLiving$1(world, action.poisonTargetId, "poison target");
		if (action.poisonTargetId === witchId) throw new Error("the Witch cannot poison herself");
		if (choiceIds$1(world, "night:").some((id) => id.includes(":witch:poison:"))) throw new Error("the Witch poison is already spent");
		return apply$1(world, [recordChoice$1(`night:${round}:witch:poison:${action.poisonTargetId}`, `The Witch poisoned ${action.poisonTargetId}.`, observerVisibility([observerOf(witchId)]))]);
	}
	return apply$1(world, [recordChoice$1(`night:${round}:witch:pass`, "The Witch used no potion.", observerVisibility([observerOf(witchId)]))]);
}
/**
* Record a private Seer inspection and reveal that alignment to the Seer.
* @param world - canonical state in a night phase.
* @param seerId - living seat assigned the Seer in this match.
* @param targetId - living seat to inspect.
* @returns world containing the inspection and observer-scoped reveal.
*/
function seerInspect(world, seerId, targetId) {
	const round = phaseRound(world, "night");
	assertRole(world, seerId, "seer");
	assertLiving$1(world, seerId, "Seer");
	assertLiving$1(world, targetId, "inspection target");
	if (seerId === targetId) throw new Error("the Seer cannot inspect herself");
	if (choiceIds$1(world, `night:${round}:seer:`).length > 0) throw new Error(`night ${round} already has a Seer inspection`);
	const seerObserver = observerOf(seerId);
	const alignmentFactId = alignmentFactOf(targetId);
	const alreadyKnown = projectStoryworld(world, seerObserver).facts.some((fact) => fact.id === alignmentFactId);
	const events = [recordChoice$1(`night:${round}:seer:inspect:${targetId}`, `The Seer inspected ${targetId}.`, observerVisibility([seerObserver]))];
	if (!alreadyKnown) events.unshift({
		kind: "fact/reveal",
		factId: alignmentFactId,
		observerIds: [seerObserver]
	});
	return apply$1(world, events);
}
function winnerAfter(world, eliminated) {
	const survivors = livingSeats(world).filter((seat) => !eliminated.has(seat));
	const wolves = survivors.filter((seat) => standardWerewolfRoleIn(world, seat) === "wolf").length;
	if (wolves === 0) return "good";
	const villagers = survivors.filter((seat) => standardWerewolfRoleIn(world, seat) === "villager").length;
	const gods = survivors.length - wolves - villagers;
	if (villagers === 0 || gods === 0) return "wolf";
}
function terminalEvents(world, eliminated, fallbackLocation, extraParticipants = []) {
	const survivors = livingSeats(world).filter((seat) => !eliminated.has(seat));
	const winner = winnerAfter(world, eliminated);
	const roleReveals = SEATS.flatMap((actorId) => {
		const factId = roleFactOf(actorId);
		const observerIds = ALL_OBSERVERS.filter((observerId) => !projectStoryworld(world, observerId).facts.some((fact) => fact.id === factId));
		return observerIds.length === 0 ? [] : [{
			kind: "fact/reveal",
			factId,
			observerIds
		}];
	});
	if (winner === "good") return [
		...roleReveals,
		{
			kind: "fact/reveal",
			factId: GOOD_VICTORY,
			observerIds: ALL_OBSERVERS
		},
		{
			kind: "scene/advance",
			location: "game-over-good",
			participantIds: survivors
		}
	];
	if (winner === "wolf") return [
		...roleReveals,
		{
			kind: "fact/reveal",
			factId: WOLF_VICTORY,
			observerIds: ALL_OBSERVERS
		},
		{
			kind: "scene/advance",
			location: "game-over-wolves",
			participantIds: survivors
		}
	];
	return [{
		kind: "scene/advance",
		location: fallbackLocation,
		participantIds: [...survivors, ...extraParticipants.filter((seat) => !survivors.includes(seat))]
	}];
}
/**
* Settle one complete night and advance to dawn, Hunter resolution, or game over.
* @param world - canonical state containing every required night choice.
* @returns world with deaths and the next phase committed.
*/
function resolveNight(world) {
	const round = phaseRound(world, "night");
	const witchId = standardWerewolfActorWithRole(world, "witch");
	const seerId = standardWerewolfActorWithRole(world, "seer");
	const hunterId = standardWerewolfActorWithRole(world, "hunter");
	const wolfKillId = choiceIds$1(world, `night:${round}:wolf-kill:`)[0];
	if (wolfKillId === void 0) throw new Error(`night ${round} has no wolf target`);
	const witchActions = choiceIds$1(world, `night:${round}:witch:`);
	if (isLiving$1(world, witchId) && witchActions.length !== 1) throw new Error(`night ${round} requires exactly one Witch action`);
	const inspections = choiceIds$1(world, `night:${round}:seer:`);
	if (isLiving$1(world, seerId) && inspections.length !== 1) throw new Error(`night ${round} requires exactly one Seer action`);
	const wolfTarget = choiceTarget$1(wolfKillId);
	const saved = witchActions.some((id) => id === `night:${round}:witch:save:${wolfTarget}`);
	const poisonId = witchActions.find((id) => id.includes(":witch:poison:"));
	const poisonTarget = poisonId === void 0 ? void 0 : choiceTarget$1(poisonId);
	const deaths = /* @__PURE__ */ new Set();
	if (!saved) deaths.add(wolfTarget);
	if (poisonTarget !== void 0) deaths.add(poisonTarget);
	const events = [...deaths].map((actorId) => ({
		kind: "actor/move",
		actorId,
		location: "dead"
	}));
	events.push(recordChoice$1(`day:${round}:announcement`, deaths.size === 0 ? `Day ${round} began without a death.` : `Day ${round} began with ${[...deaths].join(" and ")} dead.`, publicVisibility()));
	if (deaths.has(hunterId) && poisonTarget !== hunterId) events.push({
		kind: "scene/advance",
		location: `hunter-shot-night-${round}`,
		participantIds: [...livingSeats(world).filter((seat) => !deaths.has(seat)), hunterId]
	});
	else events.push(...terminalEvents(world, deaths, nextDayLocation(round)));
	return apply$1(world, events);
}
/**
* Resolve the eligible dead Hunter's shot.
* @param world - canonical state in a Hunter-shot phase.
* @param hunterId - dead seat assigned the Hunter in this match.
* @param targetId - living seat to eliminate.
* @returns world advanced to the interrupted dawn or next-night flow after the shot.
*/
function hunterShoot(world, hunterId, targetId) {
	const { origin, round } = hunterShotPhase(world);
	assertRole(world, hunterId, "hunter");
	if (world.actors.find((actor) => actor.id === hunterId)?.location !== "dead") throw new Error("the Hunter must be dead before shooting");
	if (choiceIds$1(world, `night:${round}:witch:poison:`).some((id) => choiceTarget$1(id) === hunterId)) throw new Error("a poisoned Hunter cannot shoot");
	assertLiving$1(world, targetId, "Hunter target");
	const eliminated = /* @__PURE__ */ new Set([targetId]);
	return apply$1(world, [
		{
			kind: "fact/reveal",
			factId: roleFactOf(hunterId),
			observerIds: ALL_OBSERVERS
		},
		{
			kind: "actor/move",
			actorId: targetId,
			location: "dead"
		},
		recordChoice$1(`day:${round}:hunter-shot:${targetId}`, `The Hunter shot ${targetId}.`, publicVisibility()),
		...terminalEvents(world, eliminated, origin === "night" ? nextDayLocation(round) : nextNightLocation(round))
	]);
}
function tally(world, ballots, weighted) {
	const seen = /* @__PURE__ */ new Set();
	const result = /* @__PURE__ */ new Map();
	const sheriff = weighted ? currentSheriff(world) : void 0;
	for (const ballot of ballots) {
		if (!canVote$1(world, ballot.voterId)) throw new Error(`${ballot.voterId} cannot vote`);
		if (seen.has(ballot.voterId)) throw new Error(`${ballot.voterId} voted more than once`);
		seen.add(ballot.voterId);
		if (ballot.targetId === void 0) continue;
		assertLiving$1(world, ballot.targetId, "vote target");
		const weight = ballot.voterId === sheriff ? STANDARD_WEREWOLF_RULES.sheriff.voteWeight : 1;
		result.set(ballot.targetId, (result.get(ballot.targetId) ?? 0) + weight);
	}
	return result;
}
function leaders(tallyResult) {
	if (tallyResult.size === 0) return [];
	const highVote = Math.max(...tallyResult.values());
	return [...tallyResult.entries()].filter(([, count]) => count === highVote).map(([actorId]) => actorId);
}
function ballotEvents(prefix, ballots) {
	return ballots.map((ballot) => recordChoice$1(`${prefix}:${ballot.voterId}:${ballot.targetId ?? "abstain"}`, ballot.targetId === void 0 ? `${ballot.voterId} abstained.` : `${ballot.voterId} voted for ${ballot.targetId}.`, publicVisibility()));
}
/**
* Resolve the first Sheriff ballot or open its runoff.
* @param world - canonical first-day Sheriff-election state.
* @param candidateIds - distinct living candidates.
* @param ballots - one ballot from every eligible non-candidate.
* @returns world with a Sheriff or a Sheriff runoff phase.
*/
function electSheriff(world, candidateIds, ballots) {
	if (phaseRound(world, "sheriff-election") !== 1) throw new Error("the Sheriff election occurs only on day 1");
	if (candidateIds.length === 0) throw new Error("the Sheriff election requires a candidate");
	if (new Set(candidateIds).size !== candidateIds.length) throw new Error("a Sheriff candidate may stand only once");
	for (const candidateId of candidateIds) assertLiving$1(world, candidateId, "Sheriff candidate");
	const candidateSet = new Set(candidateIds);
	const eligibleVoters = livingSeats(world).filter((actorId) => canVote$1(world, actorId) && !candidateSet.has(actorId));
	if (ballots.length !== eligibleVoters.length) throw new Error("every eligible non-candidate must submit one Sheriff ballot");
	for (const ballot of ballots) {
		if (candidateSet.has(ballot.voterId)) throw new Error("an active Sheriff candidate cannot vote");
		if (ballot.targetId !== void 0 && !candidateSet.has(ballot.targetId)) throw new Error("a Sheriff ballot must name an active candidate");
	}
	const events = ballotEvents("sheriff-election:1", ballots);
	const electionLeaders = leaders(tally(world, ballots, false));
	if (electionLeaders.length !== 1) {
		events.push({
			kind: "scene/advance",
			location: "sheriff-pk-1",
			participantIds: electionLeaders.length === 0 ? candidateIds : electionLeaders
		});
		return apply$1(world, events);
	}
	const sheriffId = electionLeaders[0];
	if (sheriffId === void 0) throw new Error("the Sheriff election has no winner");
	events.push(recordChoice$1(`sheriff:holder:${sheriffId}`, `${sheriffId} became Sheriff.`, publicVisibility()), {
		kind: "scene/advance",
		location: "discussion-1",
		participantIds: livingSeats(world)
	});
	return apply$1(world, events);
}
/**
* Resolve a first-day registration with at most one candidate.
* @param world - canonical first-day Sheriff-registration state with zero or one candidate.
* @returns world advanced to public discussion with the uncontested result.
*/
function closeSheriffRegistration(world) {
	if (phaseRound(world, "sheriff-election") !== 1) throw new Error("the Sheriff election occurs only on day 1");
	const candidateChoices = choiceIds$1(world, "sheriff:candidate:");
	if (candidateChoices.length > 1) throw new Error("Sheriff registration with multiple candidates must proceed to a ballot");
	const candidateId = candidateChoices[0]?.slice(18);
	return apply$1(world, [candidateId === void 0 ? recordChoice$1("sheriff:none", "No player stood for Sheriff.", publicVisibility()) : recordChoice$1(`sheriff:holder:${candidateId}`, `${candidateId} became Sheriff uncontested.`, publicVisibility()), {
		kind: "scene/advance",
		location: "discussion-1",
		participantIds: livingSeats(world)
	}]);
}
/**
* Resolve the Sheriff runoff and proceed with or without a Sheriff.
* @param world - canonical Sheriff-runoff state.
* @param ballots - one ballot from every eligible non-candidate.
* @returns world advanced to public discussion.
*/
function resolveSheriffPk(world, ballots) {
	const round = phaseRound(world, "sheriff-pk");
	const pkCandidates = new Set(world.scene.participantIds);
	const eligibleVoters = livingSeats(world).filter((actorId) => canVote$1(world, actorId) && !pkCandidates.has(actorId));
	if (ballots.length !== eligibleVoters.length) throw new Error("every eligible non-candidate must submit one Sheriff PK ballot");
	for (const ballot of ballots) {
		if (pkCandidates.has(ballot.voterId)) throw new Error("a Sheriff PK candidate cannot vote");
		if (ballot.targetId !== void 0 && !pkCandidates.has(ballot.targetId)) throw new Error("a Sheriff PK ballot must name a tied candidate");
	}
	const events = ballotEvents(`sheriff-pk:${round}`, ballots);
	const electionLeaders = leaders(tally(world, ballots, false));
	if (electionLeaders.length !== 1) {
		events.push(recordChoice$1("sheriff:none", "The second tie left the match without a Sheriff.", publicVisibility()), {
			kind: "scene/advance",
			location: `discussion-${round}`,
			participantIds: livingSeats(world)
		});
		return apply$1(world, events);
	}
	const sheriffId = electionLeaders[0];
	if (sheriffId === void 0) throw new Error("the Sheriff PK has no winner");
	events.push(recordChoice$1(`sheriff:holder:${sheriffId}`, `${sheriffId} became Sheriff.`, publicVisibility()), {
		kind: "scene/advance",
		location: `discussion-${round}`,
		participantIds: livingSeats(world)
	});
	return apply$1(world, events);
}
/**
* Read the last recorded Sheriff badge owner even when that actor has died.
* @param world - canonical match state.
* @returns recorded holder, or undefined after destruction or before election.
*/
function sheriffBadgeHolder(world) {
	const marker = world.choices.findLast((choice) => {
		const id = String(choice.id);
		return id === "sheriff:destroyed" || id.startsWith("sheriff:holder:");
	});
	if (marker === void 0 || marker.id === "sheriff:destroyed") return void 0;
	return choiceTarget$1(String(marker.id));
}
/**
* Read the current living Sheriff badge holder.
* @param world - canonical match state.
* @returns living holder, or undefined when absent or awaiting transfer.
*/
function currentSheriff(world) {
	const actorId = sheriffBadgeHolder(world);
	return actorId !== void 0 && isLiving$1(world, actorId) ? actorId : void 0;
}
/**
* Record one public statement per living seat and open exile voting.
* @param world - canonical public-discussion state.
* @param statements - non-empty statement keyed by every living seat.
* @returns world advanced to exile voting.
*/
function recordDaySpeeches(world, statements) {
	const round = phaseRound(world, "discussion");
	const living = livingSeats(world);
	if (statements.size !== living.length) throw new Error("every living player must speak before voting");
	const events = living.map((actorId) => {
		const statement = statements.get(actorId);
		if (statement === void 0 || statement.trim().length === 0) throw new Error(`${actorId} lacks a public statement`);
		if (statement.length > 500) throw new Error(`${actorId} public statement exceeds its length limit`);
		const normalized = statement.trim();
		return recordChoice$1(`day:${round}:speech:${actorId}`, `${actorId}: ${normalized}`, publicVisibility());
	});
	events.push({
		kind: "scene/advance",
		location: `exile-vote-${round}`,
		participantIds: living
	});
	return apply$1(world, events);
}
/**
* Resolve one exile ballot, including runoff, Idiot, Hunter, and victory rules.
* @param world - canonical exile or exile-runoff state.
* @param ballots - one ballot from every eligible voter.
* @returns world advanced to the resulting phase.
*/
function resolveExile(world, ballots) {
	const isPk = world.scene.location.startsWith("exile-pk-");
	const round = phaseRound(world, isPk ? "exile-pk" : "exile-vote");
	const pkCandidates = new Set(isPk ? world.scene.participantIds : []);
	const eligibleVoters = livingSeats(world).filter((actorId) => canVote$1(world, actorId) && !pkCandidates.has(actorId));
	if (ballots.length !== eligibleVoters.length) throw new Error("every eligible living player must submit one exile ballot");
	if (isPk) for (const ballot of ballots) {
		if (pkCandidates.has(ballot.voterId)) throw new Error("an exile PK candidate cannot vote");
		if (ballot.targetId !== void 0 && !pkCandidates.has(ballot.targetId)) throw new Error("an exile PK ballot must name a tied candidate");
	}
	const exileLeaders = leaders(tally(world, ballots, true));
	const events = ballotEvents(`day:${round}:${isPk ? "pk-vote" : "exile-vote"}`, ballots);
	if (exileLeaders.length !== 1) {
		if (!isPk) events.push({
			kind: "scene/advance",
			location: `exile-pk-${round}`,
			participantIds: exileLeaders.length === 0 ? livingSeats(world) : exileLeaders
		});
		else events.push(recordChoice$1(`day:${round}:no-exile`, `Day ${round} ended without an elimination after the second tie.`, publicVisibility()), {
			kind: "scene/advance",
			location: nextNightLocation(round),
			participantIds: livingSeats(world)
		});
		return apply$1(world, events);
	}
	const eliminatedId = exileLeaders[0];
	if (eliminatedId === void 0) throw new Error("the exile vote has no winner");
	if (standardWerewolfRoleIn(world, eliminatedId) === "idiot") {
		events.push({
			kind: "actor/move",
			actorId: eliminatedId,
			location: "revealed-idiot"
		}, {
			kind: "fact/reveal",
			factId: roleFactOf(eliminatedId),
			observerIds: ALL_OBSERVERS
		}, recordChoice$1(`day:${round}:idiot-reveal:${eliminatedId}`, `${eliminatedId} revealed as the Idiot, survived, and lost the vote.`, publicVisibility()), {
			kind: "scene/advance",
			location: nextNightLocation(round),
			participantIds: livingSeats(world)
		});
		return apply$1(world, events);
	}
	events.push({
		kind: "actor/move",
		actorId: eliminatedId,
		location: "dead"
	});
	if (standardWerewolfRoleIn(world, eliminatedId) === "hunter") {
		events.push({
			kind: "scene/advance",
			location: `hunter-shot-exile-${round}`,
			participantIds: livingSeats(world)
		});
		return apply$1(world, events);
	}
	events.push(...terminalEvents(world, /* @__PURE__ */ new Set([eliminatedId]), nextNightLocation(round)));
	return apply$1(world, events);
}
/**
* Transfer or destroy the badge after its holder dies.
* @param world - canonical match state with a dead badge holder.
* @param targetId - optional living recipient; omission destroys the badge.
* @returns world containing the public badge decision.
*/
function transferSheriff(world, targetId) {
	const sheriffId = sheriffBadgeHolder(world);
	if (sheriffId === void 0) throw new Error("the match has no Sheriff badge to transfer");
	if (isLiving$1(world, sheriffId)) throw new Error("a living Sheriff retains the badge");
	if (targetId !== void 0) assertLiving$1(world, targetId, "badge recipient");
	return apply$1(world, [recordChoice$1(targetId === void 0 ? "sheriff:destroyed" : `sheriff:holder:${targetId}`, targetId === void 0 ? `${sheriffId} destroyed the Sheriff badge.` : `${sheriffId} transferred the Sheriff badge to ${targetId}.`, publicVisibility())]);
}
/**
* Resolve a living wolf's daytime explosion and end that day.
* @param world - canonical public daytime state.
* @param wolfId - living wolf choosing to explode.
* @returns world advanced to the next night or game over.
*/
function wolfExplode(world, wolfId) {
	const match = /^(?:discussion|exile-vote|exile-pk)-(\d+)$/.exec(world.scene.location);
	if (match?.[1] === void 0) throw new Error("a werewolf may explode only during the day");
	const round = Number(match[1]);
	assertRole(world, wolfId, "wolf");
	assertLiving$1(world, wolfId, "exploding werewolf");
	const eliminated = /* @__PURE__ */ new Set([wolfId]);
	return apply$1(world, [
		{
			kind: "actor/move",
			actorId: wolfId,
			location: "dead"
		},
		{
			kind: "fact/reveal",
			factId: roleFactOf(wolfId),
			observerIds: ALL_OBSERVERS
		},
		recordChoice$1(`day:${round}:wolf-explosion:${wolfId}`, `${wolfId} exploded as a werewolf and ended the day.`, publicVisibility()),
		...terminalEvents(world, eliminated, nextNightLocation(round))
	]);
}
//#endregion
//#region src/werewolf/werewolf-progress.ts
/**
* Fold scenario progress into player-safe Chinese copy.
* @param current - prior player progress.
* @param _view - observer-projected world paired with the event cut.
* @param event - next committed Session event.
* @returns the replacement progress, the prior reference, or `null` to clear it.
*/
function presentStandardWerewolfProgress(current, view, event) {
	if (event.type === "session/end-seed") return null;
	if (event.type === "user/message" && event.data.source.kind === "roleplay") return null;
	if (event.type !== "werewolf/progress") return current;
	const state = event.data.state;
	if (state === null) return null;
	if (state.kind === "night") {
		const observerActor = SEATS.find((actorId) => observerOf(actorId) === view.observerId);
		if (observerActor !== void 0 && standardWerewolfRoleIn(view, observerActor) === "wolf" && state.stage === "independent") return {
			title: "狼队正在商议",
			detail: "等待所有存活狼人确认目标"
		};
		return {
			title: "夜间行动进行中",
			detail: "等待天亮"
		};
	}
	const settled = state.completed === state.total;
	if (state.kind === "sheriff-registration") return {
		title: settled ? "即将公布报名结果" : "其他玩家正在决定是否参选",
		detail: settled ? "正在公布候选人与竞选发言" : `已完成 ${state.completed}/${state.total}`,
		completed: state.completed,
		total: state.total
	};
	return {
		...state.kind === "sheriff-vote" ? settled ? {
			title: "正在公布警长投票结果",
			detail: "投票已经结束"
		} : {
			title: "其他玩家正在投票",
			detail: `已投票 ${state.completed}/${state.total}`
		} : state.kind === "sheriff-badge" ? settled ? {
			title: "正在公布警徽去向",
			detail: "警长已经做出决定"
		} : {
			title: "等待警徽去向",
			detail: `已完成 ${state.completed}/${state.total}`
		} : state.kind === "hunter-shot" ? settled ? {
			title: "正在公布猎人行动",
			detail: "猎人已经做出决定"
		} : {
			title: "等待猎人行动",
			detail: `已完成 ${state.completed}/${state.total}`
		} : state.kind === "discussion" ? settled ? {
			title: "本轮发言结束",
			detail: "正在进入投票"
		} : {
			title: `${state.currentActorId === void 0 ? "下一位玩家" : `${String(state.currentActorId).slice(5)} 号玩家`}正在发言`,
			detail: `已发言 ${state.completed}/${state.total}`
		} : settled ? {
			title: "正在公布放逐投票结果",
			detail: "投票已经结束"
		} : {
			title: "其他玩家正在投票",
			detail: `已投票 ${state.completed}/${state.total}`
		},
		completed: state.completed,
		total: state.total,
		...state.kind === "discussion" ? { records: state.statements.map((statement) => ({
			id: asRoleplaySurfaceRecordId(`day:${String(state.round)}:speech:${statement.actorId}`),
			kind: "statement",
			phase: `第 ${String(state.round)} 天 · 公开发言`,
			actorId: asRoleplaySurfaceActorId(statement.actorId),
			text: statement.text
		})) } : {}
	};
}
//#endregion
//#region src/werewolf/werewolf-review.ts
const REVIEW_TITLE = "角色决策复盘";
const REVIEW_DETAIL = "这里只列出已经随剧情提交的结构化选择摘要，不是模型思维链；未完成、超时、无效或被拒绝的尝试不会出现。";
function boundedReviewText(value) {
	return value.length <= 256 ? value : `${value.slice(0, 255)}…`;
}
function seatLabel$1(actorId) {
	const number = /^seat-(\d+)$/u.exec(actorId)?.[1];
	return number === void 0 ? String(actorId) : `${number} 号玩家`;
}
function decisionRole(decision) {
	switch (decision.action.name) {
		case "wolf-kill":
		case "wolf-explode": return "狼人";
		case "seer-inspect": return "预言家";
		case "witch-act": return "女巫";
		case "hunter-shoot": return "猎人";
		default: return;
	}
}
function actorLabel(view, decision) {
	const actorId = decision.actorId;
	const inferred = decisionRole(decision);
	const roleVisible = view.facts.some((fact) => String(fact.id) === `${String(actorId)}-role`);
	const role = inferred ?? (roleVisible ? standardWerewolfRoleLabel(standardWerewolfRoleIn(view, actorId)) : void 0);
	return role === void 0 ? seatLabel$1(actorId) : `${seatLabel$1(actorId)}（${role}）`;
}
function phaseLabel(phase) {
	const night = /^night-(\d+)$/u.exec(phase)?.[1];
	if (night !== void 0) return `第 ${night} 夜`;
	const sheriff = /^sheriff-(election|pk)-(\d+)$/u.exec(phase);
	if (sheriff?.[2] !== void 0) return sheriff[1] === "election" ? `第 ${sheriff[2]} 天 · 警长竞选` : `第 ${sheriff[2]} 天 · 警长平票重投`;
	const discussion = /^discussion-(\d+)$/u.exec(phase)?.[1];
	if (discussion !== void 0) return `第 ${discussion} 天 · 公开发言`;
	const exile = /^exile-(vote|pk)-(\d+)$/u.exec(phase);
	if (exile?.[2] !== void 0) return exile[1] === "vote" ? `第 ${exile[2]} 天 · 放逐投票` : `第 ${exile[2]} 天 · 放逐平票重投`;
	const hunter = /^hunter-shot-(night|exile)-(\d+)$/u.exec(phase);
	if (hunter?.[2] !== void 0) return hunter[1] === "night" ? `第 ${hunter[2]} 天 · 夜间猎人结算` : `第 ${hunter[2]} 天 · 放逐后猎人结算`;
	return "本局其他阶段";
}
function argumentObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function stringArgument(argumentsValue, name) {
	const value = argumentObject(argumentsValue)[name];
	return typeof value === "string" ? value : void 0;
}
function booleanArgument(argumentsValue, name) {
	const value = argumentObject(argumentsValue)[name];
	return typeof value === "boolean" ? value : void 0;
}
function targetDecision(prefix, decision) {
	const target = stringArgument(decision.action.arguments, "target_id");
	return target === void 0 ? `${prefix}（未记录目标）` : `${prefix}${seatLabel$1(target)}`;
}
function decisionLabel(decision) {
	switch (decision.action.name) {
		case "sheriff-registration": {
			if (booleanArgument(decision.action.arguments, "stand") !== true) return "不参加警长竞选";
			const statement = stringArgument(decision.action.arguments, "statement");
			return statement === void 0 ? "参加警长竞选" : `报名竞选警长：“${statement}”`;
		}
		case "sheriff-vote": return targetDecision("将警长票投给", decision);
		case "hunter-shoot": return targetDecision("开枪带走", decision);
		case "sheriff-badge": {
			const target = stringArgument(decision.action.arguments, "target_id");
			return target === void 0 ? "销毁警徽" : `将警徽移交给${seatLabel$1(target)}`;
		}
		case "wolf-explode": return "翻牌自爆";
		case "speak": {
			const statement = stringArgument(decision.action.arguments, "statement");
			const judgment = decision.publicJudgment;
			const stance = judgment?.stance === "trust" ? "信任" : judgment?.stance === "suspect" ? "怀疑" : judgment?.stance === "question" ? "追问" : judgment?.stance === "observe" ? "继续观察" : void 0;
			const prefix = judgment === void 0 || stance === void 0 ? "发表公开发言" : `对${seatLabel$1(judgment.targetId)}持“${stance}”立场`;
			return statement === void 0 ? prefix : `${prefix}：“${statement}”`;
		}
		case "exile-vote": return targetDecision("投票放逐", decision);
		case "wolf-kill": return targetDecision("选择袭击", decision);
		case "seer-inspect": return targetDecision("查验", decision);
		case "witch-act": {
			const action = stringArgument(decision.action.arguments, "action");
			if (action === "save") return "使用解药救人";
			if (action === "poison") {
				const target = stringArgument(decision.action.arguments, "poison_target_id");
				return target === void 0 ? "使用毒药" : `使用毒药带走${seatLabel$1(target)}`;
			}
			return "本夜不使用药剂";
		}
		default: return "完成一项合法行动";
	}
}
function evidenceLabel(id) {
	const actor = /^(seat-\d+)$/u.exec(id)?.[1];
	if (actor !== void 0) return seatLabel$1(actor);
	const fact = /^(seat-\d+)-(role|alignment)$/u.exec(id);
	if (fact?.[1] !== void 0) return `${seatLabel$1(fact[1])}${fact[2] === "role" ? "的身份" : "的阵营"}`;
	if (id === "standard-good-victory") return "好人阵营获胜事实";
	if (id === "standard-wolf-victory") return "狼人阵营获胜事实";
	const target = (/* @__PURE__ */ new RegExp("^(?:night:\\d+:(?:wolf-kill|seer:inspect|witch:(?:save|poison))|day:\\d+:(?:hunter-shot|idiot-reveal|wolf-explosion)):(seat-\\d+)$", "u")).exec(id)?.[1];
	if (target !== void 0) return `涉及${seatLabel$1(target)}的已提交记录`;
	const speaker = /^day:\d+:speech:(seat-\d+)$/u.exec(id)?.[1];
	if (speaker !== void 0) return `${seatLabel$1(speaker)}的公开发言`;
	const voter = /^(?:sheriff-(?:election|pk):\d+|day:\d+:(?:exile-vote|pk-vote)):(seat-\d+):(seat-\d+|abstain)$/u.exec(id);
	if (voter?.[1] !== void 0) return `${seatLabel$1(voter[1])}的已公开选票`;
	const sheriff = /^sheriff:(?:candidate|holder):(seat-\d+)$/u.exec(id)?.[1];
	if (sheriff !== void 0) return `${seatLabel$1(sheriff)}的警长记录`;
	if (id.startsWith("day:") && id.endsWith(":announcement")) return "当天公开的死亡信息";
	if (id.includes(":witch:pass")) return "女巫未使用药剂的私密记录";
	if (id === "sheriff:none" || id === "sheriff:destroyed") return "本局公开的警徽状态";
	return `已提交记录 ${id}`;
}
function reviewEntry(view, revision, phase, decision) {
	const confidence = decision.confidence === "high" ? "高" : decision.confidence === "medium" ? "中" : "低";
	const evidence = decision.evidenceIds.slice(0, 63).map(evidenceLabel);
	if (decision.evidenceIds.length >= 64) evidence.push(`另有 ${String(decision.evidenceIds.length - evidence.length)} 项已提交依据`);
	return {
		id: asRoleplaySurfaceReviewEntryId(`revision-${String(revision)}-${String(decision.actorId)}`),
		actor: actorLabel(view, decision),
		phase: phaseLabel(phase),
		decision: boundedReviewText(decisionLabel(decision)),
		rationale: boundedReviewText(decision.rationale.trim()),
		confidence,
		evidence
	};
}
/**
* Accumulate committed Character decisions and release them only with the final decision-memory batch.
* @param current - review entries retained privately by the Host projection.
* @param view - observer-safe world paired with the event cut.
* @param event - next committed Session event.
* @returns collecting or ready review state without raw model transcripts.
*/
function presentStandardWerewolfReview(current, view, event) {
	if (event.type !== "werewolf/decision-memory") return current;
	const entries = [...current?.value.entries ?? [], ...event.data.decisions.map((decision) => reviewEntry(view, event.data.revision, event.data.phase, decision))];
	return {
		ready: current?.ready === true || view.scene.location.startsWith("game-over-"),
		value: {
			title: REVIEW_TITLE,
			detail: REVIEW_DETAIL,
			entries
		}
	};
}
//#endregion
//#region src/werewolf/werewolf-presentation.ts
/**
* Observer-safe Simplified Chinese presentation for the standard Werewolf scenario.
* @module @deepseek-ai/dsh-roleplay-demo/werewolf-presentation
*/
function roundAt$1(location, phase) {
	const match = new RegExp(`^${phase}-(\\d+)$`).exec(location);
	return match?.[1] === void 0 ? void 0 : Number(match[1]);
}
function hunterShotAt(location) {
	const match = /^hunter-shot-(night|exile)-(\d+)$/.exec(location);
	if (match?.[1] === void 0 || match[2] === void 0) return void 0;
	return {
		origin: match[1],
		round: Number(match[2])
	};
}
function seatLabel(actorId) {
	const match = /^seat-(\d+)$/.exec(actorId);
	if (match?.[1] === void 0) throw new Error(`standard Werewolf player presentation found invalid seat ${JSON.stringify(actorId)}`);
	return `${match[1]} 号玩家`;
}
function seatList(actorIds) {
	return actorIds.map(seatLabel).join("、");
}
function firstSeat(actorIds, phase) {
	const [first] = actorIds;
	if (first === void 0) throw new Error(`standard Werewolf player presentation found no candidates during ${phase}`);
	return first;
}
function candidateIds(view) {
	const prefix = "sheriff:candidate:";
	return view.choices.flatMap((choice) => {
		const id = String(choice.id);
		return id.startsWith(prefix) ? [asRoleplayActorId(id.slice(18))] : [];
	});
}
function nightWolfTarget(view, round) {
	const prefix = `night:${String(round)}:wolf-kill:`;
	const id = view.choices.map((choice) => String(choice.id)).find((choiceId) => choiceId.startsWith(prefix));
	return id === void 0 ? void 0 : seatFromRecord(id.slice(prefix.length));
}
function potionSpent(view, potion) {
	return view.choices.some((choice) => new RegExp(`^night:\\d+:witch:${potion}:`, "u").test(String(choice.id)));
}
function surfaceActorId(actorId) {
	return asRoleplaySurfaceActorId(String(actorId));
}
function seatFromRecord(value) {
	const actorId = asRoleplayActorId(value);
	return SEATS.includes(actorId) ? actorId : void 0;
}
function statementAfter(text, prefix, fallback) {
	return text.startsWith(prefix) ? text.slice(prefix.length).trim() : fallback;
}
function sheriffBallotReference(choiceId) {
	const ballot = /^sheriff-(election|pk):(\d+):seat-\d+:(seat-\d+|abstain)$/u.exec(choiceId);
	if (ballot?.[1] === void 0 || ballot[2] === void 0 || ballot[3] === void 0) return void 0;
	const targetId = ballot[3] === "abstain" ? void 0 : seatFromRecord(ballot[3]);
	if (ballot[3] !== "abstain" && targetId === void 0) return void 0;
	return {
		phase: `第 ${ballot[2]} 天 · ${ballot[1] === "pk" ? "警长平票重投" : "警长投票"}`,
		...targetId === void 0 ? {} : { targetId }
	};
}
function precedingSheriffBallots(view, outcomeIndex) {
	const targets = [];
	let phase;
	for (let index = outcomeIndex - 1; index >= 0; index -= 1) {
		const ballot = sheriffBallotReference(String(view.choices[index]?.id));
		if (ballot === void 0 || phase !== void 0 && ballot.phase !== phase) break;
		phase = ballot.phase;
		targets.push(ballot.targetId);
	}
	return phase === void 0 ? void 0 : {
		phase,
		targets
	};
}
function uncontestedSheriffCandidate(view, outcomeIndex) {
	if (view.choices.slice(0, outcomeIndex).some((choice) => sheriffBallotReference(String(choice.id)) !== void 0)) return;
	const candidates = view.choices.slice(0, outcomeIndex).flatMap((choice) => {
		const id = /^sheriff:candidate:(seat-\d+)$/u.exec(String(choice.id))?.[1];
		const actorId = id === void 0 ? void 0 : seatFromRecord(id);
		return actorId === void 0 ? [] : [actorId];
	});
	return candidates.length === 1 ? candidates[0] : void 0;
}
function publicRecords(view) {
	return view.choices.flatMap((choice, choiceIndex) => {
		const id = String(choice.id);
		const recordId = asRoleplaySurfaceRecordId(id);
		const candidate = /^sheriff:candidate:(seat-\d+)$/u.exec(id)?.[1];
		if (candidate !== void 0) {
			const actorId = seatFromRecord(candidate);
			if (actorId === void 0) return [];
			return [{
				id: recordId,
				kind: "statement",
				phase: "第 1 天 · 警长竞选报名",
				actorId: surfaceActorId(actorId),
				text: statementAfter(choice.text, `${actorId} stood for Sheriff:`, "报名参选")
			}];
		}
		const sheriffBallot = /^sheriff-(election|pk):(\d+):(seat-\d+):(seat-\d+|abstain)$/u.exec(id);
		if (sheriffBallot?.[1] !== void 0 && sheriffBallot[2] !== void 0 && sheriffBallot[3] !== void 0 && sheriffBallot[4] !== void 0) {
			const actorId = seatFromRecord(sheriffBallot[3]);
			const targetId = sheriffBallot[4] === "abstain" ? void 0 : seatFromRecord(sheriffBallot[4]);
			if (actorId === void 0 || sheriffBallot[4] !== "abstain" && targetId === void 0) return [];
			return [{
				id: recordId,
				kind: "ballot",
				phase: `第 ${sheriffBallot[2]} 天 · ${sheriffBallot[1] === "pk" ? "警长平票重投" : "警长投票"}`,
				actorId: surfaceActorId(actorId),
				...targetId === void 0 ? {} : { targetActorId: surfaceActorId(targetId) },
				text: targetId === void 0 ? "弃票" : `投给${seatLabel(targetId)}`
			}];
		}
		const speech = /^day:(\d+):speech:(seat-\d+)$/u.exec(id);
		if (speech?.[1] !== void 0 && speech[2] !== void 0) {
			const actorId = seatFromRecord(speech[2]);
			if (actorId === void 0) return [];
			return [{
				id: recordId,
				kind: "statement",
				phase: `第 ${speech[1]} 天 · 公开发言`,
				actorId: surfaceActorId(actorId),
				text: statementAfter(choice.text, `${actorId}:`, choice.text)
			}];
		}
		const exileBallot = /^day:(\d+):(exile-vote|pk-vote):(seat-\d+):(seat-\d+|abstain)$/u.exec(id);
		if (exileBallot?.[1] !== void 0 && exileBallot[2] !== void 0 && exileBallot[3] !== void 0 && exileBallot[4] !== void 0) {
			const actorId = seatFromRecord(exileBallot[3]);
			const targetId = exileBallot[4] === "abstain" ? void 0 : seatFromRecord(exileBallot[4]);
			if (actorId === void 0 || exileBallot[4] !== "abstain" && targetId === void 0) return [];
			return [{
				id: recordId,
				kind: "ballot",
				phase: `第 ${exileBallot[1]} 天 · ${exileBallot[2] === "pk-vote" ? "放逐平票重投" : "放逐投票"}`,
				actorId: surfaceActorId(actorId),
				...targetId === void 0 ? {} : { targetActorId: surfaceActorId(targetId) },
				text: targetId === void 0 ? "弃票" : `投给${seatLabel(targetId)}`
			}];
		}
		const sheriff = /^sheriff:holder:(seat-\d+)$/u.exec(id)?.[1];
		if (sheriff !== void 0) {
			const actorId = seatFromRecord(sheriff);
			if (actorId === void 0) return [];
			const election = precedingSheriffBallots(view, choiceIndex);
			const uncontested = election === void 0 ? uncontestedSheriffCandidate(view, choiceIndex) : void 0;
			const votes = election?.targets.filter((targetId) => targetId === actorId).length;
			return [{
				id: recordId,
				kind: "outcome",
				phase: election?.phase ?? (uncontested === actorId ? "第 1 天 · 警长竞选" : "警徽流转"),
				actorId: surfaceActorId(actorId),
				text: election === void 0 ? uncontested === actorId ? `${seatLabel(actorId)}唯一参选，自动当选警长` : `${seatLabel(actorId)}持有警徽` : `${seatLabel(actorId)}当选警长 · ${String(votes)} 票`
			}];
		}
		if (id === "sheriff:none" || id === "sheriff:destroyed") {
			const election = id === "sheriff:none" ? precedingSheriffBallots(view, choiceIndex) : void 0;
			return [{
				id: recordId,
				kind: "outcome",
				phase: election?.phase ?? (id === "sheriff:none" ? "第 1 天 · 警长竞选" : "警徽流转"),
				text: id === "sheriff:none" ? election === void 0 ? "无人报名，本局没有警长" : "本轮未产生警长" : "警徽已销毁"
			}];
		}
		return [];
	});
}
function currentVisibleSheriff(view) {
	const marker = view.choices.findLast((choice) => {
		const id = String(choice.id);
		return id === "sheriff:none" || id === "sheriff:destroyed" || id.startsWith("sheriff:holder:");
	});
	if (marker === void 0 || marker.id === "sheriff:none" || marker.id === "sheriff:destroyed") return void 0;
	return seatFromRecord(String(marker.id).slice(15));
}
function pendingBadgeHolder(view) {
	if (view.scene.location.startsWith("game-over-")) return void 0;
	const marker = view.choices.findLast((choice) => {
		const id = String(choice.id);
		return id === "sheriff:destroyed" || id.startsWith("sheriff:holder:");
	});
	if (marker === void 0 || marker.id === "sheriff:destroyed") return void 0;
	const holder = asRoleplayActorId(String(marker.id).slice(15));
	const actor = view.actors.find((candidate) => candidate.id === holder);
	return actor !== void 0 && actor.location !== "alive" && actor.location !== "revealed-idiot" ? holder : void 0;
}
function coordinatedAction(id, label, revision, emphasis = "secondary", options = {}) {
	return {
		id: asRoleplaySurfaceActionId(id),
		label,
		submission: {
			kind: "command",
			line: `/roleplay-action ${String(revision)} ${id}`
		},
		emphasis,
		...options.actorId === void 0 ? {} : { actorId: surfaceActorId(options.actorId) },
		...options.automatic === true ? { automatic: true } : {}
	};
}
function guide(phase, nextAction, actions, input, status = "active", nextActionDetail) {
	return {
		phase,
		nextAction,
		...nextActionDetail === void 0 ? {} : { nextActionDetail },
		actions,
		...input === void 0 ? {} : { input },
		status
	};
}
function assertHumanView(view) {
	const humanActorId = STANDARD_WEREWOLF_HUMAN_SEATS.find((actorId) => view.observerId === observerOf(actorId));
	if (humanActorId === void 0) throw new Error(`standard Werewolf player presentation requires observer for a playable seat, got ${JSON.stringify(view.observerId)}`);
	const human = view.actors.find((actor) => actor.id === humanActorId);
	if (human === void 0) throw new Error("standard Werewolf player presentation cannot find the human seat");
	return human;
}
function roleIntroduction(view, actorId) {
	switch (standardWerewolfRoleIn(view, actorId)) {
		case "villager": return "好人阵营，没有夜间技能；白天通过发言和投票找出狼人";
		case "seer": return "好人阵营；每夜可查验一名其他存活玩家的阵营，结果仅你可见";
		case "witch": return "好人阵营；持有一瓶解药和一瓶毒药，每晚最多使用一瓶，仅第一夜可以自救，且不能毒杀自己";
		case "hunter": return "好人阵营；被狼人袭击或被放逐出局时必须开枪带走一名存活玩家，中毒出局不能开枪";
		case "idiot": return "好人阵营；被放逐时翻牌并继续留在场上，此后失去投票权";
		case "wolf": return `狼人阵营；每夜各自提出目标，再与存活队友共同确认；全员一致后袭击才会生效；同阵营：${seatList(view.actors.filter((candidate) => candidate.id !== actorId && view.facts.some((fact) => String(fact.id) === `${String(candidate.id)}-role`) && standardWerewolfRoleIn(view, candidate.id) === "wolf").map((candidate) => candidate.id))}`;
	}
}
function standardWerewolfGuide(view) {
	const human = assertHumanView(view);
	const humanRole = standardWerewolfRoleIn(view, human.id);
	const location = view.scene.location;
	if (view.revision === 0 && location === "night-1" && !standardWerewolfRoleConfirmed(view, human.id)) return guide("身份确认", "确认身份后进入第一夜", [coordinatedAction("role-confirm", "进入第一夜", view.revision)]);
	const hunterShot = hunterShotAt(location);
	if (hunterShot !== void 0) {
		if (humanRole === "hunter") {
			const targets = view.actors.filter((actor) => actor.location === "alive" || actor.location === "revealed-idiot").map((actor) => actor.id);
			return guide(hunterShot.origin === "night" ? `第 ${hunterShot.round} 天 · 猎人结算` : `第 ${hunterShot.round} 天 · 放逐后猎人结算`, "选择猎人的开枪目标", targets.map((target) => coordinatedAction(`hunter-shot-${String(target)}`, `开枪带走 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })), void 0, "active", "猎人不能放弃开枪");
		}
		return guide(hunterShot.origin === "night" ? `第 ${hunterShot.round} 天 · 猎人结算` : `第 ${hunterShot.round} 天 · 放逐后猎人结算`, "猎人正在决定是否开枪。", [coordinatedAction("hunter-shot-continue", "等待猎人决定", view.revision, "primary", { automatic: true })]);
	}
	const deadSheriff = pendingBadgeHolder(view);
	if (deadSheriff !== void 0) {
		if (deadSheriff !== human.id) return guide("警徽流转", `${seatLabel(deadSheriff)}已经出局，正在决定警徽去向。`, [coordinatedAction("sheriff-badge-continue", "等待警徽去向", view.revision, "primary", { automatic: true })]);
		return guide("警徽流转", "请选择警徽去向", [...view.actors.filter((actor) => actor.location === "alive" || actor.location === "revealed-idiot").map((actor) => actor.id).map((target) => coordinatedAction(`sheriff-badge-${String(target)}`, `移交给 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })), coordinatedAction("sheriff-badge-destroy", "销毁警徽", view.revision)], void 0, "active", "可以移交给一名存活玩家，也可以销毁");
	}
	const night = roundAt$1(location, "night");
	if (night !== void 0) {
		const role = humanRole;
		if (human.location === "alive" && role === "seer") {
			const targets = view.actors.filter((actor) => actor.location === "alive" && actor.id !== human.id).map((actor) => actor.id);
			return guide(`第 ${night} 夜`, "选择今晚要查验的玩家", targets.map((target) => coordinatedAction(`night-${String(night)}-seer-${String(target)}`, `查验 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })), void 0, "active", "查验结果仅你可见");
		}
		if (human.location === "alive" && role === "wolf") {
			const targets = view.actors.filter((actor) => actor.location === "alive").map((actor) => actor.id);
			const proposals = standardWerewolfWolfProposals(view, night);
			if (proposals.length > 0) return guide(`第 ${night} 夜`, "确认狼队今晚的袭击目标", targets.map((target) => coordinatedAction(`night-${String(night)}-wolf-confirm-${String(target)}`, `确认袭击 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })), void 0, "active", `当前提议：${proposals.map((proposal) => `${seatLabel(proposal.actorId)} → ${seatLabel(proposal.targetId)}`).join("；")}`);
			return guide(`第 ${night} 夜`, "提出一名袭击目标", targets.map((target) => coordinatedAction(`night-${String(night)}-wolf-propose-${String(target)}`, `提议 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })), void 0, "active", "提交后汇总所有存活狼人的提议");
		}
		if (human.location === "alive" && role === "witch") {
			const wolfTarget = nightWolfTarget(view, night);
			if (wolfTarget === void 0) return guide(`第 ${night} 夜`, "等待狼人行动", [coordinatedAction(`night-${String(night)}-witch-observe`, "查看今晚情况", view.revision, "primary", { automatic: true })], void 0, "active", "狼人行动后，女巫决定是否用药");
			const canSave = !potionSpent(view, "save") && (wolfTarget !== human.id || night === 1);
			const canPoison = !potionSpent(view, "poison");
			const poisonTargets = view.actors.filter((actor) => actor.location === "alive" && actor.id !== human.id).map((actor) => actor.id);
			return guide(`第 ${night} 夜`, "选择今晚的用药方式", [
				...canSave ? [coordinatedAction(`night-${String(night)}-witch-save`, `使用解药救下 ${seatLabel(wolfTarget)}`, view.revision)] : [],
				...canPoison ? poisonTargets.map((target) => coordinatedAction(`night-${String(night)}-witch-poison-${String(target)}`, `使用毒药毒杀 ${seatLabel(target)}`, view.revision, "secondary", { actorId: target })) : [],
				coordinatedAction(`night-${String(night)}-witch-pass`, "不使用药剂", view.revision)
			], void 0, "active", `今晚，${seatLabel(wolfTarget)}遭到狼人袭击`);
		}
		return guide(`第 ${night} 夜`, "等待天亮", [coordinatedAction(`night-${night}`, "等待天亮", view.revision, "primary", { automatic: true })], void 0, "active", human.location === "alive" ? `${standardWerewolfRoleLabel(role)}夜间没有可执行的技能` : "出局玩家不再参与夜间行动");
	}
	const sheriffElection = roundAt$1(location, "sheriff-election");
	if (sheriffElection !== void 0) {
		const candidates = candidateIds(view);
		if (candidates.length === 0) {
			if (human.location !== "alive") return guide(`第 ${sheriffElection} 天 · 警长竞选报名`, "你已经出局，可以旁观其他玩家报名。", [coordinatedAction("sheriff-registration-continue", "查看报名结果", view.revision, "primary", { automatic: true })]);
			return guide(`第 ${sheriffElection} 天 · 警长竞选报名`, "是否参加警长竞选？", [coordinatedAction("sheriff-skip", "不竞选", view.revision)], {
				placeholder: "输入竞选发言",
				submitLabel: "参加竞选",
				maxLength: 500,
				submission: {
					kind: "command",
					prefix: `/roleplay-action ${String(view.revision)} sheriff-join`
				}
			}, "active", "参选者需填写竞选发言");
		}
		const labels = seatList(candidates);
		const humanCanVote = human.location === "alive" && !candidates.includes(human.id);
		return guide(`第 ${sheriffElection} 天 · 警长投票`, !humanCanVote ? human.location === "alive" ? "你是候选人，本轮不参与投票。" : "你已经出局，可以旁观本轮投票。" : "选择一名候选人，或弃票", !humanCanVote ? [coordinatedAction("sheriff-vote-continue", human.location === "alive" ? "等待投票结果" : "查看投票结果", view.revision, "primary", { automatic: true })] : [...candidates.map((candidate) => coordinatedAction(`sheriff-vote-${String(candidate)}`, `投给 ${seatLabel(candidate)}`, view.revision, "secondary", { actorId: candidate })), coordinatedAction("sheriff-vote-abstain", "弃票", view.revision)], void 0, "active", humanCanVote ? `候选人：${labels}` : void 0);
	}
	const sheriffPk = roundAt$1(location, "sheriff-pk");
	if (sheriffPk !== void 0) {
		const candidates = view.scene.participantIds;
		if (candidates.length === 0) throw new Error("standard Werewolf player presentation found no candidates during Sheriff runoff");
		const labels = seatList(candidates);
		const humanCanVote = human.location === "alive" && !candidates.includes(human.id);
		return guide(`第 ${sheriffPk} 天 · 警长平票重投`, !humanCanVote ? human.location === "alive" ? "你是平票候选人，本轮不参与投票。" : "你已经出局，可以旁观本轮重投。" : "在平票候选人中选择一人，或弃票", !humanCanVote ? [coordinatedAction("sheriff-runoff-continue", human.location === "alive" ? "等待重投结果" : "查看重投结果", view.revision, "primary", { automatic: true })] : [...candidates.map((candidate) => coordinatedAction(`sheriff-runoff-${String(candidate)}`, `投给 ${seatLabel(candidate)}`, view.revision, "secondary", { actorId: candidate })), coordinatedAction("sheriff-runoff-abstain", "弃票", view.revision)], void 0, "active", humanCanVote ? `候选人：${labels}` : void 0);
	}
	const discussion = roundAt$1(location, "discussion");
	if (discussion !== void 0) {
		const speechPrefix = `day:${String(discussion)}:speech:`;
		const spoken = new Set(view.choices.flatMap((choice) => String(choice.id).startsWith(speechPrefix) ? [String(choice.id).slice(speechPrefix.length)] : []));
		const nextSpeaker = view.actors.find((actor) => actor.location === "alive" && !spoken.has(String(actor.id)));
		if (nextSpeaker === void 0) throw new Error("standard Werewolf player presentation found no remaining discussion speaker");
		return nextSpeaker.id === human.id ? guide(`第 ${discussion} 天 · 公开发言`, "轮到你发言", [], {
			placeholder: "输入发言内容",
			submitLabel: "发言",
			maxLength: 500,
			submission: {
				kind: "command",
				prefix: `/roleplay-action ${String(view.revision)} discussion-speak`
			}
		}, "active", "每名存活玩家本轮发言一次，也可选择“过”") : guide(`第 ${discussion} 天 · 公开发言`, human.location === "alive" ? `${seatLabel(nextSpeaker.id)}先发言` : "你已经出局，可以旁观本轮发言。", [coordinatedAction("discussion-continue", human.location !== "alive" ? "听其他玩家发言" : spoken.has(String(human.id)) ? "开始后续发言" : "开始发言", view.revision, "primary", { automatic: true })], void 0, "active", human.location === "alive" ? spoken.has(String(human.id)) ? "其他玩家按座位顺序发言" : "轮到你时，输入框会自动出现" : `下一位：${seatLabel(nextSpeaker.id)}`);
	}
	const exileVote = roundAt$1(location, "exile-vote");
	if (exileVote !== void 0) {
		if (human.location !== "alive") return guide(`第 ${exileVote} 天 · 放逐投票`, "你已经出局，可以旁观本轮投票。", [coordinatedAction("exile-vote-continue", "查看投票结果", view.revision, "primary", { automatic: true })]);
		const candidates = view.actors.filter((actor) => (actor.location === "alive" || actor.location === "revealed-idiot") && actor.id !== human.id).map((actor) => actor.id);
		firstSeat(candidates, "exile vote");
		return guide(`第 ${exileVote} 天 · 放逐投票`, "选择一名玩家放逐，或弃票", [...candidates.map((candidate) => coordinatedAction(`exile-vote-${String(candidate)}`, `放逐 ${seatLabel(candidate)}`, view.revision, "secondary", { actorId: candidate })), coordinatedAction("exile-vote-abstain", "弃票", view.revision)], void 0, "active", "投票提交后不可更改");
	}
	const exilePk = roundAt$1(location, "exile-pk");
	if (exilePk !== void 0) {
		const candidates = view.scene.participantIds;
		const labels = seatList(candidates);
		firstSeat(candidates, "exile runoff");
		const humanCanVote = human.location === "alive" && !candidates.includes(human.id);
		return guide(`第 ${exilePk} 天 · 放逐平票重投`, !humanCanVote ? human.location === "alive" ? "你是平票候选人，本轮不参与投票。" : "你已经出局，可以旁观本轮重投。" : "在平票候选人中选择一人，或弃票", !humanCanVote ? [coordinatedAction("exile-runoff-continue", human.location === "alive" ? "等待重投结果" : "查看重投结果", view.revision, "primary", { automatic: true })] : [...candidates.map((candidate) => coordinatedAction(`exile-runoff-${String(candidate)}`, `放逐 ${seatLabel(candidate)}`, view.revision, "secondary", { actorId: candidate })), coordinatedAction("exile-runoff-abstain", "弃票", view.revision)], void 0, "active", humanCanVote ? `候选人：${labels}；投票提交后不可更改` : void 0);
	}
	if (location === "game-over-good" || location === "game-over-wolves") return guide("游戏结束", "这局已经结束。新建一局即可再次游玩。", [], void 0, "complete");
	throw new Error(`standard Werewolf player presentation does not support scene ${JSON.stringify(location)}`);
}
function visibleFactText(view, id, text, humanActorId) {
	if (id === `${humanActorId}-role`) return `你的身份：${standardWerewolfRoleLabel(standardWerewolfRoleIn(view, humanActorId))}。`;
	if (id === `${humanActorId}-alignment`) return `你的阵营：${standardWerewolfAlignmentIn(view, humanActorId) === "wolf" ? "狼人" : "好人"}阵营。`;
	if (id === "standard-good-victory") return "好人阵营赢得了本局游戏。";
	if (id === "standard-wolf-victory") return "狼人阵营通过屠边赢得了本局游戏。";
	const roleMatch = /^(seat-\d+)-role$/u.exec(id);
	if (roleMatch?.[1] !== void 0) {
		const actorId = asRoleplayActorId(roleMatch[1]);
		if (!SEATS.includes(actorId)) return text;
		const role = standardWerewolfRoleLabel(standardWerewolfRoleIn(view, actorId));
		return `${seatLabel(actorId)}的身份：${role}。`;
	}
	const alignmentMatch = /^(seat-\d+)-alignment$/u.exec(id);
	if (alignmentMatch?.[1] !== void 0) {
		const actorId = asRoleplayActorId(alignmentMatch[1]);
		if (!SEATS.includes(actorId)) return text;
		return `${seatLabel(actorId)}的阵营：${standardWerewolfAlignmentIn(view, actorId) === "wolf" ? "狼人" : "好人"}阵营。`;
	}
	return text;
}
function isActorKnowledgeFact(id) {
	return /^seat-\d+-(?:role|alignment)$/u.test(id);
}
function visibleActorDetail(view, actorId, humanActorId) {
	if (view.facts.some((fact) => String(fact.id) === `${String(actorId)}-role`)) {
		const role = standardWerewolfRoleIn(view, actorId);
		if (actorId !== humanActorId && role === "wolf" && standardWerewolfRoleIn(view, humanActorId) === "wolf") return "队友";
		return standardWerewolfRoleLabel(role);
	}
	if (!view.facts.some((fact) => String(fact.id) === `${String(actorId)}-alignment`) || actorId === humanActorId) return void 0;
	return `查验：${standardWerewolfAlignmentIn(view, actorId) === "wolf" ? "狼人" : "好人"}阵营`;
}
function privateNotice(view, humanActorId) {
	if (standardWerewolfRoleIn(view, humanActorId) !== "seer") return void 0;
	const inspection = view.choices.findLast((choice) => /^night:\d+:seer:inspect:seat-\d+$/u.test(String(choice.id)));
	if (inspection === void 0) return void 0;
	const targetId = String(inspection.id).split(":").at(-1);
	if (targetId === void 0) throw new Error("standard Werewolf Seer inspection lacks its target");
	const factId = `${targetId}-alignment`;
	const fact = view.facts.find((candidate) => String(candidate.id) === factId);
	if (fact === void 0) throw new Error("standard Werewolf Seer inspection lacks its revealed alignment");
	return {
		title: "查验结果",
		text: visibleFactText(view, factId, fact.text, humanActorId)
	};
}
/**
* Produce the complete scenario-owned player surface from one safe view.
* @param view - observer-safe standard Werewolf view for the human player.
* @returns Chinese phase, roster, facts, shortcuts, and optional freeform input.
*/
function presentStandardWerewolfPlayerSurface(view) {
	const human = assertHumanView(view);
	const current = standardWerewolfGuide(view);
	const sheriff = currentVisibleSheriff(view);
	const roleConfirmed = standardWerewolfRoleConfirmed(view, human.id);
	const notice = view.revision === 0 && !roleConfirmed && view.scene.location === "night-1" ? {
		title: `你的身份 · ${standardWerewolfRoleLabel(standardWerewolfRoleIn(view, human.id))}`,
		text: roleIntroduction(view, human.id)
	} : privateNotice(view, human.id);
	return {
		kind: asRoleplaySurfaceKind("standard-werewolf"),
		locale: "zh-CN",
		title: "十二人狼人杀",
		phase: current.phase,
		guidance: current.nextAction,
		...current.nextActionDetail === void 0 ? {} : { guidanceDetail: current.nextActionDetail },
		status: current.status,
		actors: view.actors.map((actor) => {
			const living = actor.location === "alive" || actor.location === "revealed-idiot";
			const knownDetail = visibleActorDetail(view, actor.id, human.id);
			const selfDetail = knownDetail ?? standardWerewolfRoleLabel(standardWerewolfRoleIn(view, human.id));
			const badges = [
				...actor.id === human.id ? ["你"] : [],
				...actor.id === sheriff ? ["警长"] : [],
				...actor.location === "revealed-idiot" ? ["白痴已翻牌"] : []
			];
			return {
				id: surfaceActorId(actor.id),
				label: seatLabel(actor.id),
				state: living ? "active" : "inactive",
				detail: actor.id === human.id ? living ? selfDetail : `已出局 · ${selfDetail}` : actor.location === "revealed-idiot" ? "存活 · 白痴已翻牌" : living ? knownDetail ?? "存活" : knownDetail === void 0 ? "已出局" : `已出局 · ${knownDetail}`,
				...badges.length === 0 ? {} : { badges }
			};
		}),
		facts: view.facts.filter((fact) => !isActorKnowledgeFact(String(fact.id))).map((fact) => ({
			id: asRoleplaySurfaceFactId(String(fact.id)),
			text: visibleFactText(view, String(fact.id), fact.text, human.id)
		})),
		...notice === void 0 ? {} : { notice },
		records: publicRecords(view),
		actions: current.actions,
		...current.input === void 0 ? {} : { input: current.input }
	};
}
/** Standard Werewolf presenter registered by the Web profile plugin. */
const STANDARD_WEREWOLF_PRESENTER = {
	name: "standard-werewolf",
	matches: (view) => STANDARD_WEREWOLF_HUMAN_SEATS.some((actorId) => view.observerId === observerOf(actorId)) && view.actors.length === SEATS.length && SEATS.every((seat) => view.actors.some((actor) => actor.id === seat)),
	present: presentStandardWerewolfPlayerSurface,
	narration: (before, after, text) => roundAt$1(before.scene.location, "night") !== void 0 && before.scene.location === after.scene.location ? null : text,
	progress: presentStandardWerewolfProgress,
	review: presentStandardWerewolfReview
};
//#endregion
//#region src/werewolf/werewolf-resolvers.ts
/** Resolver adapters that expose the standard Werewolf referee through roleplay commits. */
/** Resolver name for the player's private pre-game role acknowledgement. */
const STANDARD_CONFIRM_ROLE = asRoleplayResolverName("standard_confirm_role");
/** Resolver name for one private wolf proposal before pack confirmation. */
const STANDARD_WOLF_PROPOSE = asRoleplayResolverName("standard_wolf_propose");
/** Resolver name for one private wolf target. */
const STANDARD_WOLF_KILL = asRoleplayResolverName("standard_wolf_kill");
/** Resolver name for one private Witch decision. */
const STANDARD_WITCH_ACT = asRoleplayResolverName("standard_witch_act");
/** Resolver name for one private Seer inspection. */
const STANDARD_SEER_INSPECT = asRoleplayResolverName("standard_seer_inspect");
/** Resolver name for one complete, atomically settled night. */
const STANDARD_RESOLVE_NIGHT = asRoleplayResolverName("standard_resolve_night");
/** Resolver name for entering the Sheriff election. */
const STANDARD_STAND_SHERIFF = asRoleplayResolverName("standard_stand_sheriff");
/** Resolver name for closing a first-day registration with no candidates. */
const STANDARD_CLOSE_SHERIFF_REGISTRATION = asRoleplayResolverName("standard_close_sheriff_registration");
/** Resolver name for a Sheriff-election ballot. */
const STANDARD_SHERIFF_VOTE = asRoleplayResolverName("standard_sheriff_vote");
/** Resolver name for one public daytime statement. */
const STANDARD_SPEAK = asRoleplayResolverName("standard_speak");
/** Resolver name for one exile ballot. */
const STANDARD_EXILE_VOTE = asRoleplayResolverName("standard_exile_vote");
/** Resolver name for a dead Sheriff's badge transfer or destruction. */
const STANDARD_TRANSFER_SHERIFF = asRoleplayResolverName("standard_transfer_sheriff");
/** Resolver name for the eligible dead Hunter's shot. */
const STANDARD_HUNTER_SHOOT = asRoleplayResolverName("standard_hunter_shoot");
/** Resolver name for a living wolf revealing and ending the current day. */
const STANDARD_WOLF_EXPLODE = asRoleplayResolverName("standard_wolf_explode");
function textArgument(args, key) {
	const value = args[key];
	if (typeof value !== "string") throw new Error(`${key} must be a string`);
	return value;
}
function optionalTextArgument(args, key) {
	const value = args[key];
	if (value !== void 0 && typeof value !== "string") throw new Error(`${key} must be a string when supplied`);
	return value;
}
function boundedPublicStatement(value, key, allowBlank) {
	if (value.length > 500) throw new Error(`${key} exceeds the standard Werewolf statement length limit`);
	const trimmed = value.trim();
	if (!allowBlank && trimmed.length === 0) throw new Error(`${key} must be non-blank`);
	return trimmed;
}
function isLiving(world, actorId) {
	return world.actors.some((actor) => actor.id === actorId && (actor.location === "alive" || actor.location === "revealed-idiot"));
}
function canVote(world, actorId) {
	return world.actors.some((actor) => actor.id === actorId && actor.location === "alive");
}
function assertLiving(world, actorId, label) {
	if (!isLiving(world, actorId)) throw new Error(`${label} must be living`);
}
function choiceIds(world, prefix) {
	return world.choices.map((choice) => String(choice.id)).filter((id) => id.startsWith(prefix));
}
function choiceTarget(choiceId) {
	return asRoleplayActorId(choiceId.slice(choiceId.lastIndexOf(":") + 1));
}
function roundAt(world, phase) {
	const match = new RegExp(`^${phase}-(\\d+)$`).exec(world.scene.location);
	if (match?.[1] === void 0) throw new Error(`standard Werewolf action requires ${phase}, got ${world.scene.location}`);
	return Number(match[1]);
}
function sameScene(left, right) {
	return left.location === right.location && left.participantIds.length === right.participantIds.length && left.participantIds.every((actorId, index) => actorId === right.participantIds[index]);
}
function addedObservers(before, after) {
	if (before.kind === "public" || after.kind === "public") return [];
	return after.observerIds.filter((observerId) => !before.observerIds.includes(observerId));
}
function transitionEvents(before, after) {
	const events = [];
	for (const actor of after.actors) {
		const previous = before.actors.find((candidate) => candidate.id === actor.id);
		if (previous !== void 0 && previous.location !== actor.location) events.push({
			kind: "actor/move",
			actorId: actor.id,
			location: actor.location
		});
	}
	for (const fact of after.facts) {
		const previous = before.facts.find((candidate) => candidate.id === fact.id);
		if (previous === void 0) continue;
		const observerIds = addedObservers(previous.visibility, fact.visibility);
		if (observerIds.length > 0) events.push({
			kind: "fact/reveal",
			factId: fact.id,
			observerIds
		});
	}
	const previousChoiceIds = new Set(before.choices.map((choice) => choice.id));
	for (const choice of after.choices) {
		if (previousChoiceIds.has(choice.id)) continue;
		events.push({
			kind: "choice/record",
			choiceId: choice.id,
			text: choice.text,
			visibility: choice.visibility
		});
	}
	if (!sameScene(before.scene, after.scene)) events.push({
		kind: "scene/advance",
		location: after.scene.location,
		participantIds: after.scene.participantIds
	});
	if (events.length === 0) throw new Error("standard Werewolf action produced no state transition");
	return events;
}
function attempt(world, operation) {
	try {
		return {
			kind: "accepted",
			events: transitionEvents(world, operation())
		};
	} catch (error) {
		return {
			kind: "rejected",
			reason: error instanceof Error ? error.message : "standard Werewolf action failed"
		};
	}
}
function recordChoice(world, choiceId, text, visibility) {
	return applyRoleplayWorldEvents(world, [{
		kind: "choice/record",
		choiceId: asRoleplayChoiceId(choiceId),
		text,
		visibility
	}]);
}
function withoutChoices(world, prefix) {
	return {
		...world,
		choices: world.choices.filter((choice) => !String(choice.id).startsWith(prefix))
	};
}
function normalWitchActionCount(world, round) {
	return choiceIds(world, `night:${round}:witch:`).length;
}
function witchAction(world, actorId, args) {
	const round = roundAt(world, "night");
	const witchId = standardWerewolfActorWithRole(world, "witch");
	if (actorId !== witchId) throw new Error(`${actorId} is not the Witch`);
	assertLiving(world, actorId, "Witch");
	if (normalWitchActionCount(world, round) > 0) throw new Error(`night ${round} already has a Witch action`);
	const wolfTargetId = asRoleplayActorId(textArgument(args, "wolf_target_id"));
	assertLiving(world, wolfTargetId, "wolf target");
	const killIds = choiceIds(world, `night:${round}:wolf-kill:`);
	if (killIds.length > 1 || killIds[0] !== void 0 && choiceTarget(killIds[0]) !== wolfTargetId) throw new Error("the Witch action does not match the selected wolf target");
	const action = textArgument(args, "action");
	if (action === "save") {
		if (choiceIds(world, "night:").some((id) => id.includes(":witch:save:"))) throw new Error("the Witch antidote is already spent");
		if (wolfTargetId === witchId && round !== 1) throw new Error("the Witch may self-save only during night 1");
		return recordChoice(world, `night:${round}:witch:save:${wolfTargetId}`, `The Witch used the antidote on ${wolfTargetId}.`, {
			kind: "observers",
			observerIds: [observerOf(witchId)]
		});
	}
	if (action === "poison") {
		const poisonTarget = optionalTextArgument(args, "poison_target_id");
		if (poisonTarget === void 0) throw new Error("the Witch poison requires a target");
		const poisonTargetId = asRoleplayActorId(poisonTarget);
		assertLiving(world, poisonTargetId, "poison target");
		if (poisonTargetId === witchId) throw new Error("the Witch cannot poison herself");
		if (choiceIds(world, "night:").some((id) => id.includes(":witch:poison:"))) throw new Error("the Witch poison is already spent");
		return recordChoice(world, `night:${round}:witch:poison:${poisonTargetId}`, `The Witch poisoned ${poisonTargetId}.`, {
			kind: "observers",
			observerIds: [observerOf(witchId)]
		});
	}
	if (action !== "pass") throw new Error(`unknown Witch action ${JSON.stringify(action)}`);
	return recordChoice(world, `night:${round}:witch:pass`, "The Witch used no potion.", {
		kind: "observers",
		observerIds: [observerOf(witchId)]
	});
}
function nightReady(world, round) {
	const witchId = standardWerewolfActorWithRole(world, "witch");
	const seerId = standardWerewolfActorWithRole(world, "seer");
	if (choiceIds(world, `night:${round}:wolf-kill:`).length !== 1) return false;
	if (isLiving(world, witchId) && normalWitchActionCount(world, round) !== 1) return false;
	return !isLiving(world, seerId) || choiceIds(world, `night:${round}:seer:`).length === 1;
}
function settleNightIfReady(world, round) {
	return nightReady(world, round) ? resolveNight(world) : world;
}
/**
* Apply a complete night plan without exposing any partial phase transition.
* @param world - canonical world at a standard Werewolf night.
* @param wolfId - living wolf used for resolver attribution after the pack agrees.
* @param args - complete decisions for every living night role.
* @returns the dawn world after every decision and death is resolved.
*/
function resolveStandardWerewolfNight(world, wolfId, args) {
	const witchId = standardWerewolfActorWithRole(world, "witch");
	const seerId = standardWerewolfActorWithRole(world, "seer");
	let draft = wolfKill(world, wolfId, args.wolf_target_id);
	if (isLiving(world, witchId)) {
		if (args.witch_action === void 0) throw new Error("a living Witch requires one night action");
		switch (args.witch_action) {
			case "save":
				if (args.witch_poison_target_id !== void 0) throw new Error("a Witch save cannot also name a poison target");
				draft = witchAct(draft, witchId, { save: true });
				break;
			case "poison":
				if (args.witch_poison_target_id === void 0) throw new Error("a Witch poison action requires a target");
				draft = witchAct(draft, witchId, {
					save: false,
					poisonTargetId: args.witch_poison_target_id
				});
				break;
			case "pass":
				if (args.witch_poison_target_id !== void 0) throw new Error("a Witch pass cannot name a poison target");
				draft = witchAct(draft, witchId, { save: false });
				break;
		}
	} else if (args.witch_action !== void 0 || args.witch_poison_target_id !== void 0) throw new Error("a dead Witch has no night action");
	if (isLiving(world, seerId)) {
		if (args.seer_target_id === void 0) throw new Error("a living Seer requires one inspection");
		draft = seerInspect(draft, seerId, args.seer_target_id);
	} else if (args.seer_target_id !== void 0) throw new Error("a dead Seer has no night action");
	return resolveNight(draft);
}
function candidatesFromChoices(world) {
	return choiceIds(world, "sheriff:candidate:").map(choiceTarget);
}
function ballotFromChoice(prefix, choiceId) {
	const [voter, target] = choiceId.slice(prefix.length + 1).split(":");
	if (voter === void 0 || target === void 0) throw new Error("malformed standard Werewolf ballot");
	return {
		voterId: asRoleplayActorId(voter),
		...target === "abstain" ? {} : { targetId: asRoleplayActorId(target) }
	};
}
/** Ordered trusted resolvers comprising the standard Werewolf application. */
const STANDARD_WEREWOLF_RESOLVERS = [
	{
		name: STANDARD_CONFIRM_ROLE,
		version: "1",
		applicationOnly: true,
		description: "Acknowledge the acting player's private role before the first standard Werewolf night.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {}
		},
		resolve({ world, actorId }) {
			return attempt(world, () => confirmStandardWerewolfRole(world, actorId));
		}
	},
	{
		name: STANDARD_WOLF_PROPOSE,
		version: "1",
		applicationOnly: true,
		description: "Record one living wolf's private proposal before the pack confirms a shared target.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} },
			required: ["target_id"]
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => recordWolfProposal(world, actorId, asRoleplayActorId(textArgument(args, "target_id"))));
		}
	},
	{
		name: STANDARD_WOLF_KILL,
		version: "1",
		description: "Select one living victim during the current standard Werewolf night.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} }
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const round = roundAt(world, "night");
				return settleNightIfReady(wolfKill(world, actorId, asRoleplayActorId(textArgument(args, "target_id"))), round);
			});
		}
	},
	{
		name: STANDARD_WITCH_ACT,
		version: "1",
		description: "Save, poison, or pass once during the current standard Werewolf night.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {
				action: {
					type: "string",
					enum: [
						"save",
						"poison",
						"pass"
					]
				},
				wolf_target_id: {
					type: "string",
					enum: SEATS
				},
				poison_target_id: {
					type: "string",
					enum: SEATS
				}
			},
			required: ["action", "wolf_target_id"]
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const round = roundAt(world, "night");
				return settleNightIfReady(witchAction(world, actorId, args), round);
			});
		}
	},
	{
		name: STANDARD_SEER_INSPECT,
		version: "1",
		description: "Inspect one living seat and resolve dawn after every required night action.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} },
			required: ["target_id"]
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const round = roundAt(world, "night");
				return settleNightIfReady(seerInspect(world, actorId, asRoleplayActorId(textArgument(args, "target_id"))), round);
			});
		}
	},
	{
		name: STANDARD_RESOLVE_NIGHT,
		version: "1",
		description: "Atomically settle every required private decision for the current standard Werewolf night.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {
				wolf_target_id: {
					type: "string",
					enum: SEATS
				},
				witch_action: {
					type: "string",
					enum: [
						"save",
						"poison",
						"pass"
					]
				},
				witch_poison_target_id: {
					type: "string",
					enum: SEATS
				},
				seer_target_id: {
					type: "string",
					enum: SEATS
				}
			},
			required: ["wolf_target_id"]
		},
		resolve({ world, actorId }, args) {
			const witchAction = optionalTextArgument(args, "witch_action");
			const witchPoisonTarget = optionalTextArgument(args, "witch_poison_target_id");
			const seerTarget = optionalTextArgument(args, "seer_target_id");
			return attempt(world, () => resolveStandardWerewolfNight(world, actorId, {
				wolf_target_id: asRoleplayActorId(textArgument(args, "wolf_target_id")),
				...witchAction === void 0 ? {} : { witch_action: witchAction },
				...witchPoisonTarget === void 0 ? {} : { witch_poison_target_id: asRoleplayActorId(witchPoisonTarget) },
				...seerTarget === void 0 ? {} : { seer_target_id: asRoleplayActorId(seerTarget) }
			}));
		}
	},
	{
		name: STANDARD_STAND_SHERIFF,
		version: "3",
		description: "Stand as a public Sheriff candidate with an optional campaign statement.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { statement: { type: "string" } }
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				roundAt(world, "sheriff-election");
				assertLiving(world, actorId, "Sheriff candidate");
				const supplied = optionalTextArgument(args, "statement");
				const statement = supplied === void 0 ? void 0 : boundedPublicStatement(supplied, "statement", true);
				return recordChoice(world, `sheriff:candidate:${actorId}`, statement === void 0 || statement.length === 0 ? `${actorId} stood for Sheriff.` : `${actorId} stood for Sheriff: ${statement}`, { kind: "public" });
			});
		}
	},
	{
		name: STANDARD_CLOSE_SHERIFF_REGISTRATION,
		version: "2",
		description: "Resolve first-day Sheriff registration when at most one player stands.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {}
		},
		resolve({ world, actorId }) {
			return attempt(world, () => {
				assertLiving(world, actorId, "registration closer");
				return closeSheriffRegistration(world);
			});
		}
	},
	{
		name: STANDARD_SHERIFF_VOTE,
		version: "2",
		description: "Cast or abstain from one Sheriff ballot and resolve after every eligible vote.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} }
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const isPk = world.scene.location.startsWith("sheriff-pk-");
				const round = roundAt(world, isPk ? "sheriff-pk" : "sheriff-election");
				const candidates = isPk ? [...world.scene.participantIds] : candidatesFromChoices(world);
				if (candidates.length === 0) throw new Error("the Sheriff election has no candidates");
				if (!canVote(world, actorId) || candidates.includes(actorId)) throw new Error(`${actorId} is not eligible to vote for Sheriff`);
				const target = optionalTextArgument(args, "target_id");
				const targetId = target === void 0 ? void 0 : asRoleplayActorId(target);
				if (targetId !== void 0 && !candidates.includes(targetId)) throw new Error("the Sheriff ballot must name a candidate");
				const prefix = isPk ? `sheriff-pk:${round}` : `sheriff-election:${round}`;
				if (choiceIds(world, `${prefix}:${actorId}:`).length > 0) throw new Error(`${actorId} already voted for Sheriff`);
				const recorded = recordChoice(world, `${prefix}:${actorId}:${targetId ?? "abstain"}`, targetId === void 0 ? `${actorId} abstained.` : `${actorId} voted for ${targetId}.`, { kind: "public" });
				const ballotIds = choiceIds(recorded, `${prefix}:`);
				const expected = recorded.actors.filter((actor) => actor.location === "alive" && !candidates.includes(actor.id)).length;
				if (ballotIds.length !== expected) return recorded;
				const ballots = ballotIds.map((choiceId) => ballotFromChoice(prefix, choiceId));
				const base = withoutChoices(recorded, `${prefix}:`);
				return isPk ? resolveSheriffPk(base, ballots) : electSheriff(base, candidates, ballots);
			});
		}
	},
	{
		name: STANDARD_SPEAK,
		version: "2",
		description: "Record one public statement and open voting after every living seat speaks.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { statement: { type: "string" } },
			required: ["statement"]
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const round = roundAt(world, "discussion");
				assertLiving(world, actorId, "speaker");
				const prefix = `day:${round}:speech:`;
				if (world.choices.some((choice) => choice.id === `${prefix}${actorId}`)) throw new Error(`${actorId} already spoke during day ${round}`);
				const statement = boundedPublicStatement(textArgument(args, "statement"), "statement", false);
				const recorded = recordChoice(world, `${prefix}${actorId}`, `${actorId}: ${statement}`, { kind: "public" });
				const speechIds = choiceIds(recorded, prefix);
				if (speechIds.length !== livingSeats(recorded).length) return recorded;
				const statements = new Map(speechIds.map((choiceId) => {
					const speakerId = asRoleplayActorId(choiceId.slice(prefix.length));
					const choice = recorded.choices.find((candidate) => candidate.id === choiceId);
					if (choice === void 0) throw new Error(`recorded speech ${choiceId} is missing`);
					return [speakerId, choice.text.slice(`${speakerId}: `.length)];
				}));
				return recordDaySpeeches(withoutChoices(recorded, prefix), statements);
			});
		}
	},
	{
		name: STANDARD_EXILE_VOTE,
		version: "2",
		description: "Cast one exile ballot and resolve the vote after every eligible seat votes.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} }
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				const isPk = world.scene.location.startsWith("exile-pk-");
				const round = roundAt(world, isPk ? "exile-pk" : "exile-vote");
				const candidates = isPk ? [...world.scene.participantIds] : [];
				if (!canVote(world, actorId) || candidates.includes(actorId)) throw new Error(`${actorId} is not eligible to vote for exile`);
				const target = optionalTextArgument(args, "target_id");
				const targetId = target === void 0 ? void 0 : asRoleplayActorId(target);
				if (targetId !== void 0) assertLiving(world, targetId, "exile target");
				if (targetId !== void 0 && isPk && !candidates.includes(targetId)) throw new Error("an exile PK ballot must name a tied candidate");
				const prefix = `day:${round}:${isPk ? "pk-vote" : "exile-vote"}`;
				if (choiceIds(world, `${prefix}:${actorId}:`).length > 0) throw new Error(`${actorId} already voted for exile`);
				const recorded = recordChoice(world, `${prefix}:${actorId}:${targetId ?? "abstain"}`, targetId === void 0 ? `${actorId} abstained.` : `${actorId} voted for ${targetId}.`, { kind: "public" });
				const ballotIds = choiceIds(recorded, `${prefix}:`);
				const expected = recorded.actors.filter((actor) => actor.location === "alive" && !candidates.includes(actor.id)).length;
				if (ballotIds.length !== expected) return recorded;
				const ballots = ballotIds.map((choiceId) => ballotFromChoice(prefix, choiceId));
				return resolveExile(withoutChoices(recorded, `${prefix}:`), ballots);
			});
		}
	},
	{
		name: STANDARD_TRANSFER_SHERIFF,
		version: "1",
		description: "Transfer or destroy the badge owned by the acting dead Sheriff.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} }
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => {
				if (sheriffBadgeHolder(world) !== actorId || isLiving(world, actorId)) throw new Error(`${actorId} is not the dead Sheriff awaiting a badge decision`);
				const target = optionalTextArgument(args, "target_id");
				return transferSheriff(world, target === void 0 ? void 0 : asRoleplayActorId(target));
			});
		}
	},
	{
		name: STANDARD_HUNTER_SHOOT,
		version: "2",
		description: "Let the dead Hunter shoot one living seat when the current scene permits it.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: { target_id: {
				type: "string",
				enum: SEATS
			} },
			required: ["target_id"]
		},
		resolve({ world, actorId }, args) {
			return attempt(world, () => hunterShoot(world, actorId, asRoleplayActorId(textArgument(args, "target_id"))));
		}
	},
	{
		name: STANDARD_WOLF_EXPLODE,
		version: "1",
		description: "Reveal one living wolf and end the current standard Werewolf day.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {}
		},
		resolve({ world, actorId }) {
			return attempt(world, () => wolfExplode(world, actorId));
		}
	}
];
//#endregion
//#region src/index.ts
/** Cordis plugin identity. */
const name = "dsh-roleplay-portable-spike";
/** Base Host services required by the bundled runtime. */
const inject = ["systemPrompt", "tools"];
/**
* Install the generic Roleplay runtime and standard Werewolf presentation data.
* This probe deliberately does not create, resume, or convert any Agent.
* @param ctx - settled Web Host context.
*/
async function apply(ctx) {
	await ctx.plugin(RoleplayService);
	const roleplay = ctx.get("roleplay");
	if (roleplay === void 0) throw new Error("portable Roleplay probe loaded without its bundled runtime");
	for (const resolver of STANDARD_WEREWOLF_RESOLVERS) ctx.effect(() => roleplay.registerResolver(resolver));
	ctx.effect(() => roleplay.registerPresenter(STANDARD_WEREWOLF_PRESENTER));
}
//#endregion
export { apply, inject, name };
