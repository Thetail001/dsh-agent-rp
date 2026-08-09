# Portable Roleplay delivery probe

This private local package tests one delivery property only: a single DSH profile bundle can carry the original Roleplay Host runtime, standard Werewolf presenter, and Chinese browser UI without installing three linked workspace packages.

It intentionally provides no Agent creation or conversion entry. Do not publish or treat it as a playable plugin until the Web Host provides both pre-publication application setup and projection-only transcript protection.

## Delivery route

This package is an official profile bundle: `package.json#dsh.bundle.patch` inserts its Host row and `package.json#dshClient` exposes the browser half. Install or remove it with `dsh plugin --profile web add <package>` and `dsh plugin --profile web remove @dsh-external/dsh-roleplay-portable-spike`.

The repository `.dsh-plugin` format is complementary rather than a replacement. It carries trusted Host entries, Skills, and MCP servers, but does not carry this package's browser client entry.

## Local acceptance evidence

- The self-contained build emits one 328,752-byte Host bundle plus a 70,280-byte client bundle and its source map.
- `pnpm pack --dry-run` contains only `cordis.patch.yml`, the three built files, `package.json`, and this README.
- An isolated latest-snapshot profile completed install, cold boot, remove, reinstall, and a second cold boot. Both boots served the root page and client bundle with HTTP 200 and produced an empty Host error log.
- The packaged files contain no local username, credential variable name, instrumentation toggle, distribution fingerprint, or private transcript content.

## Release blockers

- [dsh-external/issues#500](https://github.com/dsh-external/issues/issues/500): an external Web application cannot finish scenario setup before publishing a newly created Agent.
- [dsh-external/issues#501](https://github.com/dsh-external/issues/issues/501): a projection-only application cannot prevent the browser from retrieving the canonical Session transcript.
- No redistribution license has been selected for this extracted package. It remains `private: true` and version `0.0.0` until that decision is explicit.
