# DSH Agent RP preview

This private preview adds a `角色会话` Agent Preset. The top-level Agent is the character: ordinary chat starts immediately, without a narrator, coordinator, start command, or Character subagent.

The profile bundle installs its managed `agent-rp` preset under `$DSH_HOME/.agent-presets` and selects it for new Sessions. That preset contains no workspace context, coding persona, shell, filesystem, Skills, goals, plans, or delegation tools. Its only model-facing tool is `remember`.

The character row configures `characterName`, `persona`, `scenario`, and the initial `relationship`. Each field is normalized and must contain text. The bundled preset describes an original test character. To customize it, copy the preset to a new id in DSH, edit that copy's `agent.cordis.yml`, and select the copy; the installer refuses to overwrite local edits under the managed `agent-rp` id.

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

Start a new Session after installation. The preset selector shows `角色会话`, and the ordinary Chat UI opens directly into the character conversation. The generic `remember` tool card is the only new in-conversation surface in this milestone.

## Limitations

- The bundled preset contains one character; additional characters require copied presets.
- Memory selection is model-initiated and explicit; there is no semantic retrieval or automatic forgetting policy.
- SillyTavern character-card import, multi-character scenes, multiplayer, and custom RP UI are outside this milestone.
- rc.2 does not expose package-owned preset roots, so the Host row installs the bundled preset into the user preset directory. Removing the profile bundle leaves that managed directory behind; without the package its composition is unavailable but other Sessions are unaffected.

This preview remains private because no public redistribution license has been selected.
