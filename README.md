# Portable Roleplay repository Plugin

This private repository tests one delivery property: one `.dsh-plugin` package can carry the Roleplay Host runtime, standard Werewolf coordinator and presenter, and Chinese browser UI without resolving unpublished DSH packages at installation or runtime.

On a Web Host that provides the application Agent-setup registry, the Host entry registers one complete standard Werewolf setup. A fresh Session receives its random role layout, human seat, observer binding, scoped persona, coordinator, and Roleplay tools before the Session or Agent is published. Headless compositions load the generic runtime but do not create a scenario.

Do not publish this package until the remaining release blockers below are resolved.

## Delivery route

The installable package lives at [`.dsh-plugin`](.dsh-plugin). Its manifest declares `dsh.entry` and `dsh.client`; `dsh-plugin-prepare` validates the committed Host and browser bundles during repository installation. DSH supplies that exact-version preparation command, so the package neither installs a private preparation dependency nor rebuilds against a user's machine.

Development builds run from the repository root after `pnpm install` and require `DSH_SOURCE_ROOT` to name the matching DSH source checkout, for example `$env:DSH_SOURCE_ROOT = 'D:\dsh-snapshot-20260810-integration'` followed by `pnpm run build`. The build resolver embeds the required DSH and Cordis implementation into `lib/index.js`; only Node built-ins remain as Host imports. The browser bundle keeps React as a Host-provided module. Development dependencies stay outside `.dsh-plugin`, so cold installation prepares the committed bundles without installing a compiler.

## Local acceptance evidence

- The prepared package must install from an exact Git source with no registry lookup for `@deepseek-ai/*` packages.
- The installed Host entry and browser bundle must load, unload, and load again from a fresh DSH home.
- Headless startup must activate the Host entry without waiting for Web-only services.
- Acceptance runs set `DSH_TELEMETRY_DISABLED=1` and do not call a real model API.
- Packaged files must contain no local path, credential name or value, telemetry value, distribution fingerprint, or private transcript content.

## Release blockers

- [dsh-external/issues#501](https://github.com/dsh-external/issues/issues/501): a projection-only application cannot prevent the browser from retrieving canonical parent or Character transcripts. Hosts advertising internal child-session visibility receive that stronger boundary automatically; the current target snapshot does not yet advertise it.
- No redistribution license has been selected for this extracted package. It remains `private: true` and version `0.0.0` until that decision is explicit.
