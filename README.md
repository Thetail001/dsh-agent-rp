# DSH Agent RP

Turn a SillyTavern character and its chat history into a native DSH `角色会话`.

## What works

- Character Card V1/V2/V3 import from PNG or JSON, including alternate greetings.
- SillyTavern JSONL chat import, either alone or together with its character card.
- Character lorebooks and standalone World Info JSON with the supported matching rules.
- Character-owned display regex, lightweight HTML interfaces, and MVU state restoration.
- A focused roleplay shell with character information, persistent status, editable action suggestions, and explicit long-term memories.
- Imported attachments and lossless source metadata remain available for restart and later migration.

The character is the top-level Agent. Roleplay starts in the ordinary conversation instead of creating a narrator, coordinator, or Character subagent.

## Install

Authenticate npm for the private `@deepseek-ai` packages, then clone this repository and run:

```powershell
pnpm install
pnpm run build
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh plugin --profile web add .
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh --profile web
```

Start a new conversation, choose `角色会话`, and attach either:

- one Character Card PNG/JSON;
- one SillyTavern chat JSONL; or
- the matching card and JSONL together for a complete migration.

The import creates a new roleplay conversation and never modifies the source file or source conversation.

## Current boundary

This milestone targets single-character SillyTavern migration and lightweight card interfaces. It does not yet provide group chat, multiplayer, or full compatibility with heavy independent frontends. Executable card HTML runs in a sandboxed, network-disabled iframe without same-origin access.

See [SillyTavern compatibility](docs/sillytavern-compatibility.md) for format details and deliberate degradation behavior.
