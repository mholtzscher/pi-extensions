/**
 * Exit extension.
 *
 * Registers an `exit` command and intercepts Vim-style `:q` input so pi can
 * shut down cleanly through either path.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const shutdown = (ctx: { shutdown: () => void }) => {
  ctx.shutdown();
};

export default function piExit(pi: ExtensionAPI) {
  pi.registerCommand("exit", {
    description: "Exit pi cleanly",
    // pi types command handlers as Promise<void>, but shutdown is synchronous.
    // oxlint-disable-next-line require-await
    handler: async (_args, ctx) => {
      shutdown(ctx);
    },
  });

  pi.on("input", (event, ctx) => {
    if (event.text.trim() === ":q") {
      shutdown(ctx);
      return { action: "handled" as const };
    }

    return { action: "continue" as const };
  });
}
