# @mholtzscher/pi-spec-tools

Pi extension: `specs/` picker commands for spec-driven workflows.

- `/create-spec` — capture a new idea in a text box and draft a spec via grill-with-docs and spec-planner
- `/implement-spec` — pick a spec and implement it end-to-end (branch, PR, green checks)
- `/implement-spec-stacked` — same, as a stack of PRs via `gh stack`
- `/scrub-spec` — refine a spec for cohesiveness and brevity
- `/simplify-spec` — propose a much simpler solution with 80% of the benefits (no file edits)
- `/spec-annotate` — annotate a spec with Plannotator
- `/scrub-spec-bg` — scrub a spec in a background subagent

Add `"npm:@mholtzscher/pi-spec-tools"` to the `packages` array in `~/.pi/agent/settings.json`.
