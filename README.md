# DSH Roleplay portable preview

This private internal-testing package adds a Chinese Roleplay surface and a complete twelve-player Werewolf benchmark to a DSH Web profile. It targets `@deepseek-ai/dsh@0.0.1-rc.2` and uses the profile bundle format; the removed `.dsh-plugin` repository format is not supported.

Every top-level Session created in a profile that enables this bundle becomes a new Werewolf game. Subagent Sessions remain Character workers and are never initialized as separate games. A resumed game keeps its recorded observer and seed, while a fresh game receives a shuffled role layout and human seat before its first turn starts.

The Web profile opens new top-level Sessions directly on the Roleplay view. Creating a game does not require a start phrase or spend a model turn.

The benchmark supports night and day phases, Sheriff election, sequential public discussion, voting, special-role actions, victory resolution, and a developer-facing endgame review. Model dialogue remains experimental. Multiplayer is outside this preview.

## Build and install

Authenticate npm for the private `@deepseek-ai` registry, then install dependencies and build the two package entries:

```powershell
pnpm install
pnpm run build
```

The repository disables pnpm peer auto-installation. DSH packages declare their surrounding Host services as peers, and the target Web profile supplies those services; installing a second peer graph into this bundle would give development a different module identity from production.

Install this checkout into an isolated Web profile and start the matching DSH release:

```powershell
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh plugin --profile web add .
npx -p @deepseek-ai/dsh@0.0.1-rc.2 dsh --profile web --port 3091
```

The package manifest contributes `cordis.patch.yml` and the browser client entry. DSH supplies its own runtime packages; the Host bundle contains only Roleplay-owned code and public third-party dependencies.

The rc.2 runtime exports its persistence event vocabulary but does not yet provide a downstream registration service. While this bundle is active, it registers the required `rp/*` and `werewolf/*` records with that vocabulary; it does not mark identity, world state, or Character memory as ignorable data.

## Acceptance evidence

- `pnpm run test:focused` covers equal wolf ballots and the public-speech move contract.
- `pnpm run build` must leave only DSH and Node imports in `lib/index.js`; it must not embed a DSH checkout.
- `pnpm pack --dry-run` must list only the manifest, patch, README, and built Host/browser entries.
- A fresh isolated profile must load, unload, and reload the bundle, then create a playable game without a blocking command failure.
- Packaged files must contain no local path, credential name or value, telemetry value, distribution fingerprint, private transcript, or verbatim research corpus line.

## Distribution status

This preview may be shared only through the private `dsh-external` internal-testing organization. No public redistribution license has been selected, so the package remains `private: true` and version `0.0.0`.

For local single-player Roleplay, observer projection prevents accidental spoilers in the normal UI; it is not an adversarial security boundary. Server-enforced secrecy becomes relevant only for a future untrusted multiplayer deployment.
