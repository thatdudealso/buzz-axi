import { getFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { formatCountLine } from "../format.js";
import { trustSummary, withProvenanceList } from "../provenance.js";
import {
  encodeObject,
  field,
  relativeTime,
  renderEmpty,
  renderHelp,
  renderList,
  renderOutput,
  truncate,
} from "../toon.js";

export const AGENTS_HELP = `usage: buzz-axi agents archived [--limit N]
Read-only NIP-IA archive snapshot. Draft/archive/unarchive mutations are out of scope.

examples:
  buzz-axi agents archived
`;

export function agentsCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "agents",
    [
      {
        name: "archived",
        knownFlags: ["--limit"],
        run: async (rest) => {
          const buzzArgs = ["agents", "archived"];
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderOutput([
              renderEmpty("agents", "archived agents in the snapshot"),
              renderHelp([
                "Agent draft/archive writes require Buzz Desktop owner review and are not exposed here",
              ]),
            ]);
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("agents", items, [
              field("id"),
              field("pubkey", "author"),
              field("trust"),
              truncate("content", "content", 160),
              relativeTime("created_at", "created"),
            ]),
          ]);
        },
      },
    ],
    AGENTS_HELP,
  );
}
