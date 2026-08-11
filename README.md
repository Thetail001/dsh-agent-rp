# DSH Roleplay portable preview

This private internal-testing repository packages the Roleplay Host runtime, a complete twelve-player single-player Werewolf benchmark, and its Chinese browser UI as one portable `.dsh-plugin`. Installation and runtime do not resolve unpublished DSH packages.

On a Web Host that provides the application Agent-setup registry, the Host entry registers one complete standard Werewolf setup. A fresh Session receives its random role layout, human seat, observer binding, scoped persona, coordinator, and Roleplay tools before the Session or Agent is published. Headless compositions load the generic runtime but do not create a scenario.

The single-player benchmark is ready for internal testing. It supports random human seats and roles, complete night and day phases, Sheriff election, public discussion, voting, special-role actions, victory resolution, and a developer-facing endgame review. Model dialogue remains experimental, and multiplayer is outside this preview.

## Delivery route

The installable package lives at [`.dsh-plugin`](.dsh-plugin). Its manifest declares `dsh.entry` and `dsh.client`; `dsh-plugin-prepare` validates the committed Host and browser bundles during repository installation. DSH supplies that exact-version preparation command, so the package neither installs a private preparation dependency nor rebuilds against a user's machine.

Development builds run from the repository root after `pnpm install` and require `DSH_SOURCE_ROOT` to name the matching DSH source checkout, for example `$env:DSH_SOURCE_ROOT = 'D:\dsh-snapshot-20260810-integration'` followed by `pnpm run build`. The build resolver embeds the required DSH and Cordis implementation into `lib/index.js`; only Node built-ins remain as Host imports. The browser bundle keeps React as a Host-provided module. Development dependencies stay outside `.dsh-plugin`, so cold installation prepares the committed bundles without installing a compiler.

## Local acceptance evidence

- The prepared package must install from an exact Git source with no registry lookup for `@deepseek-ai/*` packages.
- The installed Host entry and browser bundle must load, unload, and load again from a fresh DSH home.
- Headless startup must activate the Host entry without waiting for Web-only services.
- Packaging acceptance is keyless; interactive benchmark acceptance uses the configured model provider and sets `DSH_TELEMETRY_DISABLED=1`.
- Every living werewolf retains one equal ballot. An invalid or expired Character ballot uses that seat's replay-stable fallback; an expired final ballot retains the seat's recorded proposal, so one Character cannot strand the night or promote the human seat into a pack leader.
- The assembled browser application completes a full match through automatic spectator play, special-role resolution, victory detection, and endgame review without a blocking command failure.
- Packaged files must contain no local path, credential name or value, telemetry value, distribution fingerprint, or private transcript content.

## Distribution status

- This preview may be shared only through the private `dsh-external` internal-testing organization.
- No public redistribution license has been selected for this extracted package. It remains `private: true` and version `0.0.0` until that decision is explicit.

## Future multiplayer hardening

For local single-player Roleplay, the observer projection is a spoiler-safe presentation boundary rather than an adversarial security boundary: the Roleplay view presents observer-safe state, while the owner may intentionally inspect canonical or Character transcripts. [dsh-external/issues#501](https://github.com/dsh-external/issues/issues/501) becomes relevant if untrusted multiplayer clients or remote hosting later require server-enforced secrecy; it does not block local play or usability testing.
