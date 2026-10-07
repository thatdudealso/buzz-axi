import { takePositional } from "../args.js";
import { buzzExec } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import { encodeObject, renderOutput } from "../toon.js";

export const PACK_HELP = `usage: buzz-axi pack <subcommand> <path>
Local persona-pack helpers (shells out to buzz pack; no relay).

subcommands:
  validate <path>
  inspect <path>

examples:
  buzz-axi pack validate ./packs/researcher
  buzz-axi pack inspect ./packs/researcher
`;

export function packCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "pack",
    [
      {
        name: "validate",
        knownFlags: [],
        run: async (rest) => {
          const path = takePositional(rest);
          if (!path) {
            throw new AxiError(
              "pack validate requires <path>",
              "VALIDATION_ERROR",
            );
          }
          const stdout = await buzzExec(["pack", "validate", path], ctx);
          return renderOutput([
            encodeObject({ pack_validate: { path, status: "ok" } }),
            stdout.trim() ? `detail: ${JSON.stringify(stdout.trim())}` : "",
          ]);
        },
      },
      {
        name: "inspect",
        knownFlags: [],
        run: async (rest) => {
          const path = takePositional(rest);
          if (!path) {
            throw new AxiError(
              "pack inspect requires <path>",
              "VALIDATION_ERROR",
            );
          }
          const stdout = await buzzExec(["pack", "inspect", path], ctx);
          return renderOutput([
            encodeObject({ pack_inspect: { path } }),
            stdout.trim() ? `detail: ${JSON.stringify(stdout.trim())}` : "",
          ]);
        },
      },
    ],
    PACK_HELP,
  );
}
