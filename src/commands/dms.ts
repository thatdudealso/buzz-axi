import { getAllFlags, getFlag, takeFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import { formatCountLine } from "../format.js";
import { requireAsMatch } from "../identity.js";
import { trustSummary, withProvenanceList } from "../provenance.js";
import {
  encodeObject,
  field,
  relativeTime,
  renderEmpty,
  renderHelp,
  renderList,
  renderOutput,
} from "../toon.js";

export const DMS_HELP = `usage: buzz-axi dms <subcommand>
List and manage direct messages.

read:
  list [--limit N]

write (require --as):
  open --pubkey <hex> [--pubkey <hex>...] --as <npub>
  add-member --dm <id> --pubkey <hex> --as <npub>
  hide --dm <id> --as <npub>

examples:
  buzz-axi dms list
  buzz-axi dms open --pubkey <hex> --as <npub>
`;

export function dmsCommand(args: string[], ctx?: BuzzContext): Promise<string> {
  return dispatchSubcommands(
    args,
    "dms",
    [
      {
        name: "list",
        knownFlags: ["--limit"],
        run: async (rest) => {
          const buzzArgs = ["dms", "list"];
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : [], {
            authorKey: "pubkey",
          });
          if (items.length === 0) {
            return renderOutput([
              renderEmpty("dms", "DM conversations"),
              renderHelp([
                "Run `buzz-axi dms open --pubkey <hex> --as <npub>` to start one",
              ]),
            ]);
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("dms", items, [
              field("dm_id", "id"),
              field("pubkey", "peer"),
              field("trust"),
              relativeTime("created_at", "created"),
            ]),
          ]);
        },
      },
      {
        name: "open",
        knownFlags: ["--as", "--pubkey"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const pubkeys = getAllFlags(rest, "--pubkey");
          if (pubkeys.length === 0) {
            throw new AxiError(
              "--pubkey is required (1–8)",
              "VALIDATION_ERROR",
            );
          }
          const buzzArgs = ["dms", "open"];
          for (const pk of pubkeys) buzzArgs.push("--pubkey", pk);
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return renderOutput([
            encodeObject({ dm_open: result }),
            renderHelp(["Run `buzz-axi dms list` to see conversations"]),
          ]);
        },
      },
      {
        name: "add-member",
        knownFlags: ["--as", "--dm", "--pubkey"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const dm = takeFlag(rest, "--dm");
          const pubkey = takeFlag(rest, "--pubkey");
          if (!dm || !pubkey) {
            throw new AxiError(
              "--dm and --pubkey are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["dms", "add-member", "--dm", dm, "--pubkey", pubkey],
            ctx,
          );
          return encodeObject({ dm_add_member: result });
        },
      },
      {
        name: "hide",
        knownFlags: ["--as", "--dm"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const dm = takeFlag(rest, "--dm");
          if (!dm) {
            throw new AxiError("--dm is required", "VALIDATION_ERROR");
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["dms", "hide", "--dm", dm],
            ctx,
          );
          return encodeObject({ dm_hide: result });
        },
      },
    ],
    DMS_HELP,
  );
}
