# @mholtzscher/pi-extensions

All mholtzscher pi extensions in one install:

- `exit` command + Vim-style `:q` handler
- `/pr`, `/pr-comments`, `/pr-comments-fix`, `/pr-actions`, `/pr-review` (requires [`gh`](https://cli.github.com/))
- `/implement-spec`, `/implement-spec-stacked`, `/scrub-spec`, `/spec-annotate`, `/scrub-spec-bg`
- ChatGPT Codex weekly usage status meter
- opencode.ai usage status meter

Add `"npm:@mholtzscher/pi-extensions"` to the `packages` array in
`~/.pi/agent/settings.json`.

Prefer picking extensions individually? Install the granular packages
instead: `@mholtzscher/pi-exit`, `@mholtzscher/pi-github-tools`,
`@mholtzscher/pi-spec-tools`, `@mholtzscher/pi-codex-usage`,
`@mholtzscher/pi-opencode-usage`.
