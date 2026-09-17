# @mholtzscher/pi-github-tools

Pi extension: GitHub pull-request workflow commands.

- `/pr [--watch]` — commit the working tree and open a PR against the default branch (body follows the visual-pr template: one-sentence Why, 1-3 note bullets, visual change outline)
- `/pr --describe` (`--update`, `--refresh`) — rewrite the current PR description with the visual-pr template without committing
- `/pr-comments` — fetch and validate unresolved inline review threads on the current PR
- `/pr-comments-fix` — fix agreed-valid threads (reacts 👍/👎, resolves fixed threads)
- `/pr-actions` — wait for checks on the current PR and report failures
- `/pr-review` — pick an open PR and open it in Plannotator code review

Requires the [`gh`](https://cli.github.com/) CLI (authenticated) and, for `/pr-review`, the Plannotator pi extension.

Add `"npm:@mholtzscher/pi-github-tools"` to the `packages` array in `~/.pi/agent/settings.json`.
