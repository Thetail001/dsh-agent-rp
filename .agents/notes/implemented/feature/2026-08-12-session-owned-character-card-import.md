# Agent Note: Session-owned Character Card import

Status: implemented

## Problem

SillyTavern characters arrive as portable cards, but creating a coordinator or Character subagent around an import changes the expected one-character conversation and separates the imported identity from the Session that owns its history. Import also needs to preserve unknown card data without executing untrusted extensions.

## Decision

Agent RP imports a Character Card into the current top-level Agent rather than creating a coordinator or Character subagent. The successful native `import_character_card` tool result stores a short model projection and lossless replayable metadata; the Session's last valid import selects the dynamic persona on every request and after restart.

The importer preserves the complete parsed JSON but executes only named text semantics. V3 regex lore, decorators, recursion, remote assets, scripts, and extension behavior remain inert and are reported as degradations. This separates migration fidelity from authority to execute untrusted card content.

PNG transport follows the public Character Card convention: base64 UTF-8 JSON in `tEXt`, with `ccv3` preferred over `chara`. Standalone `.json` cards use the Host's plugin-consumed file path: recognition sees only safe metadata, admitted bytes remain outside model content, and the importer decodes and validates them after durable storage. The parser is implemented independently from public specifications and observable formats; it does not copy SillyTavern's AGPL implementation.

## Consequences

Ordinary Chat remains the migration entry point: an attached PNG or JSON file plus an import request switches the same Agent and Session. The source user event, selected attachment index, transport, and attachment id are validated during replay, so a detached tool result cannot silently claim another file. Unknown JSON and extension namespaces remain available for later export.

The first compatibility layer covers V1/V2/V3 PNG and standalone JSON cards, greetings, character prompt fields, and a deterministic literal-key lorebook subset. CHARX files, independent lorebooks, SillyTavern JSONL chats, swipes, and batch conversion remain separate migration layers.

## Verification contract

Focused tests cover all three card generations, standalone JSON recognition, unknown-field preservation, dual-chunk V3 precedence, malformed transport and schema rejection, safe lorebook activation and budgeting, disabled V3 behavior, native result replay, selected greetings, and transport-specific source binding. Typecheck and the built package smoke validate the shipped profile path.

## Alternatives considered

One Preset per imported card would expose DSH composition concepts before a newcomer can talk to a character and would not preserve a card switch in the conversation that caused it. A custom Session event would make the plugin own a second persistence protocol; native tool metadata already provides replay, UI presentation, and provenance. Executing every imported extension would improve superficial compatibility while granting untrusted cards undocumented authority, so preservation and execution remain separate.
