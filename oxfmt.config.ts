import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // release-please writes these files on every release PR; formatting them here
  // would fail CI on content that is regenerated from GitHub's own template.
  ignorePatterns: [...(ultracite.ignorePatterns ?? []), "**/CHANGELOG.md"],
});
