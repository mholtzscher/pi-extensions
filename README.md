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

Bump with `npm version patch|minor|major -w @mholtzscher/<name>` per package.
