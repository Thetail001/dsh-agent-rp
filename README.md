# DSH Agent RP preview

This private preview adds a `角色会话` Agent Preset. The top-level Agent is the character: ordinary chat starts immediately, without a narrator, coordinator, start command, or Character subagent.

The profile bundle installs its managed `agent-rp` preset under `$DSH_HOME/.agent-presets` and selects it for new Sessions. That preset contains no workspace context, coding persona, shell, filesystem, Skills, goals, plans, or delegation tools. Its model-facing tools import a character card and retain explicit memories.

The character row configures `characterName`, `persona`, `scenario`, and the initial `relationship`. Each field is normalized and must contain text. The bundled preset describes an original character until the Session imports a card. To customize that fallback, copy the preset to a new id in DSH, edit that copy's `agent.cordis.yml`, and select the copy; the installer refuses to overwrite local edits under the managed `agent-rp` id.

## Import SillyTavern content

Start a `角色会话`, attach one Character Card PNG or JSON file to an ordinary message, and ask the character to import it. The current top-level Agent becomes that character, sends the card's selected greeting, and keeps the import through Session restart and resume. A message with several recognized cards can name the intended attachment and greeting; greeting zero is `first_mes`, followed by `alternate_greetings`.

Character Card V1, V2, and V3 are accepted as standalone JSON or JSON embedded in PNG `tEXt` metadata. When a PNG contains both `ccv3` and `chara`, `ccv3` wins. The importer retains the complete parsed JSON, including unknown fields and extension namespaces, in the native successful tool result metadata. The original PNG or JSON bytes remain a Session attachment for restart, ZIP export, and later migration; standalone JSON never enters model content.

The supported character lorebook subset covers enabled and constant entries, primary and secondary keywords, selective matching, case sensitivity, scan depth, insertion order, before/after-character placement, priority, and token budget. See [the compatibility reference](docs/sillytavern-compatibility.md) for exact degradation behavior and format sources.

Attach an exported SillyTavern World Info JSON to the same conversation and ask to import the world info, lorebook, or 世界书. Its enabled literal-key entries join the active character lore for that Session, remain active after restart, and retain the original JSON attachment for ZIP export. Multiple books can remain active together; importing the same attachment again replaces its prior parsed value.

## Memory contract

The scoped `remember` tool stores confirmed cross-turn information in its native successful `tool/call` and `tool/result` Session events. Kinds distinguish facts, promises, relationship changes, preferences, and shared events. Ordinary chat, temporary emotion, speculation, and duplicate information stay out of memory.

Each record points to the exact direct `remember` tool call that created it. Corrections append a new record with `supersedes`; history remains auditable while only active records enter later model context. Memory is Session-local and survives the same persistence, resume, and fork paths as the conversation log. This preview intentionally uses no vector database, automatic extraction pass, or subagent.

## Build and install

Authenticate npm for the private `@deepseek-ai` registry, then run:

```powershell
pnpm install
pnpm run test:focused
pnpm run typecheck
pnpm run build
```

Install the checkout into a Web profile and start the matching release:

```powershell
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh plugin --profile web add .
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh --profile web --port 3091
```

Start a new Session after installation. The preset selector shows `角色会话`, and the ordinary Chat UI opens directly into the character conversation.

## Limitations

- Character import accepts PNG and standalone JSON, and independent SillyTavern World Info JSON is active in the Session. CHARX and SillyTavern JSONL chat files remain migration gaps.
- Memory selection is model-initiated and explicit; there is no semantic retrieval or automatic forgetting policy.
- Multi-character scenes, multiplayer, and a custom RP UI are outside this milestone.
- rc.2 does not expose package-owned preset roots, so the Host row installs the bundled preset into the user preset directory. Removing the profile bundle leaves that managed directory behind; without the package its composition is unavailable but other Sessions are unaffected.

This preview remains private because no public redistribution license has been selected.
