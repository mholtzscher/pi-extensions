# @mholtzscher/pi-opencode-usage

Pi extension: shows remaining opencode.ai quota (rolling / weekly / monthly)
in the status bar (refreshed on session start and when the agent settles).

Falls back to `OPENCODE_API_KEY` when no `opencode-go` model auth is found.

Add `"npm:@mholtzscher/pi-opencode-usage"` to the `packages` array in
`~/.pi/agent/settings.json`.
