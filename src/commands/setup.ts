import { AxiError, installSessionStartHooks } from "axi-sdk-js";
import { renderHelp, renderOutput } from "../toon.js";

export const SETUP_HELP = `usage: buzz-axi setup hooks
Install or repair agent SessionStart hooks for buzz-axi ambient context
(Claude Code, Codex, OpenCode).

examples:
  buzz-axi setup hooks
`;

export async function setupCommand(args: string[]): Promise<string> {
  if (args.length !== 1 || args[0] !== "hooks") {
    throw new AxiError("Unknown setup action", "VALIDATION_ERROR", [
      "Run `buzz-axi setup hooks`",
    ]);
  }

  installSessionStartHooks({
    marker: "buzz-axi-session-start",
    binaryNames: ["buzz-axi"],
    distEntrypoints: ["dist/bin/buzz-axi.js"],
  });

  return renderOutput([
    "hooks:\n  status: installed\n  integrations: Claude Code, Codex, OpenCode",
    renderHelp([
      "Restart your agent session to receive buzz-axi ambient context",
      "Optionally install the skill: `npx skills add thatdudealso/buzz-axi --skill buzz-axi`",
    ]),
  ]);
}
