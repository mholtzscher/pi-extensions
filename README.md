# pi-extensions

Personal [pi coding-agent](https://github.com/badlogic/pi-mono) extensions,
published as npm packages under `@mholtzscher`.

| Package | Extension |
|---|---|
| `@mholtzscher/pi-extensions` | **bundle** — all five below in one install |
| `@mholtzscher/pi-exit` | `exit` command + Vim-style `:q` handler |
| `@mholtzscher/pi-github-tools` | `/pr`, `/pr-comments`, `/pr-comments-fix`, `/pr-actions`, `/pr-review` |
| `@mholtzscher/pi-spec-tools` | `/implement-spec`, `/implement-spec-stacked`, `/scrub-spec`, `/spec-annotate`, `/scrub-spec-bg` |
| `@mholtzscher/pi-codex-usage` | ChatGPT Codex weekly usage status meter |
| `@mholtzscher/pi-opencode-usage` | opencode.ai usage status meter |

## Install

Add to `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:@mholtzscher/pi-extensions"
  ]
}
```

Or pick extensions individually:

```json
{
  "packages": [
    "npm:@mholtzscher/pi-exit",
    "npm:@mholtzscher/pi-github-tools",
    "npm:@mholtzscher/pi-spec-tools",
    "npm:@mholtzscher/pi-codex-usage",
    "npm:@mholtzscher/pi-opencode-usage"
  ]
}
```

## Develop

```sh
npm install
npm run check
```

## Publish

Requires `npm login` as `mholtzscher` (scoped packages are public via
per-package `publishConfig`).

```sh
# smoke test first
npm pack --dry-run -w @mholtzscher/pi-exit
npm publish -w @mholtzscher/pi-exit --provenance

# then the rest (the bundle has no dependencies, so order doesn't matter;
# its files are synced from packages/pi-*/index.ts by its `prepack` script)
for p in pi-github-tools pi-spec-tools pi-codex-usage pi-opencode-usage pi-extensions; do
  npm publish -w @mholtzscher/$p --provenance
done
```

## Releasing (release-please)

Releases are automated with [release-please](https://github.com/googleapis/release-please)
(`release-please-config.json` + `.release-please-manifest.json`).

- **Commit convention matters.** Use Conventional Commits: `feat:` bumps minor,
  `fix:` bumps patch (pre-1.0 defaults). `chore:`/`docs:` alone trigger no release.
- **Editing flow.** Edit `packages/pi-*/index.ts`, then run
  `npm run sync -w @mholtzscher/pi-extensions` so the bundle picks up the change
  (CI fails if the bundle is stale — the bundle's files are committed copies so
  release-please versions the bundle too).
- **Release PR.** Pushing to `main` makes release-please open or update a single
  release PR with version bumps + CHANGELOG entries per changed package. Merging
  it creates one tag + GitHub release per package (`pi-exit-v0.2.0`, …).
- **npm publish.** The `publish` workflow fires on each GitHub release, resolves
  the workspace from the tag, and runs
  `npm publish -w @mholtzscher/<name> --provenance --access public`.

One-time setup (per package — one package, one trust relationship):

1. **First publish needs a token.** Unlike PyPI's pending publishers, npm
   requires the package to exist before you can attach a trusted publisher.
   Publish `0.1.0` once with a token — easiest is locally:
   `npm login && npm publish -w @mholtzscher/pi-exit --provenance --access public`
   (repeat for each of the six packages, or script the loop from the README).
   Afterwards the token can be revoked; it is never stored in GitHub.
2. **Attach the trusted publisher.** For each package: npmjs.com → package →
   Settings → Trusted Publisher → GitHub Actions, with user `mholtzscher`,
   repository `pi-extensions`, workflow filename `publish.yml` — and allow the
   `npm publish` action (new configurations default to stage-only).
3. **(Optional, recommended) lock the door.** Package Settings → Publishing
   access → "Require two-factor authentication and disallow tokens". OIDC
   publishes keep working; token publishes stop entirely.
4. Push this repo to GitHub; release-please opens its first release PR after
   the first `feat:`/`fix:` commit lands on `main`.
