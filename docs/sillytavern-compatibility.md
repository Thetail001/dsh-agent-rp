# SillyTavern migration compatibility

This reference defines what the Agent RP importer preserves and what it executes. Imported data is untrusted content: preservation supports later export and migration, while execution is restricted to explicitly supported text semantics.

## Character cards

| Input | Import | Runtime behavior |
|---|---:|---|
| Character Card V1 JSON fields in PNG `chara` metadata | Yes | Identity, description, personality, scenario, examples, and `first_mes` |
| Character Card V2 in PNG `chara` metadata | Yes | V1 behavior, alternate greetings, character system prompt, post-history instructions, and character lorebook |
| Character Card V3 in PNG `ccv3` metadata | Yes | V2 behavior, nickname, and V3 lorebook fields in the safe subset |
| PNG containing both `ccv3` and `chara` | Yes | `ccv3` takes precedence |
| Unknown card fields and `extensions` values | Yes | Preserved without entering the prompt unless a supported field owns the behavior |
| Future V3 minor versions | Degraded | Imported and preserved; the result reports that future behavior may be inactive |
| Standalone JSON, CHARX, or independent lorebook files | Not yet | Planned for the batch migration entry point |

Card `system_prompt` replaces the fallback identity instruction when non-empty and supports `{{original}}`. `post_history_instructions` is appended after the Agent RP behavioral contract. `{{char}}`, `<char>`, and `<bot>` resolve to the V3 nickname when present, otherwise the card name.

## Character lorebooks

Enabled entries support constant activation, literal primary keys, selective secondary keys, case sensitivity, scan depth, insertion order, `before_char` and `after_char` placement, priority, and token budget. Each active entry enters the prompt once.

V3 regex keys, recursive scanning, and decorated content are retained but never executed. The import result lists each disabled capability. Token budgeting uses a deterministic local estimate; it does not claim byte-for-byte parity with a SillyTavern model tokenizer.

## Security and degradation

The importer never executes card scripts, regex replacement scripts, lorebook regular expressions, decorators, or extension code. Remote and data-URL assets are neither fetched nor decoded. Asset records, group-only greetings, and unknown extensions remain in the preserved raw card.

## Public format sources

The implementation is independent and follows public interoperability formats rather than copying SillyTavern implementation code:

- [Character Card V2 specification](https://github.com/malfoyslastname/character-card-spec-v2), reviewed at `8083fb388615ccbce768e97cbbd49d2b3214632c`
- [Character Card V3 specification](https://github.com/kwaroran/character-card-spec-v3), reviewed at `f3a86af019fbd99f788f7a1155f399655b34ab35`
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) observable PNG and chat formats, reviewed at `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8`

PNG chunk extraction uses the MIT-licensed `png-chunks-extract` and `png-chunk-text` packages. No SillyTavern AGPL source is included.
