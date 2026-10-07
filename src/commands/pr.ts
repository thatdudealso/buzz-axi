import { getFlag, hasFlag, takeFlag } from "../args.js";
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
  renderDetail,
  renderEmpty,
  renderHelp,
  renderList,
  renderOutput,
  truncate,
} from "../toon.js";

export const PR_HELP = `usage: buzz-axi pr <subcommand>
NIP-34 pull requests.

read:
  list --repo <id> [--owner <pubkey>] [--limit N]
  get --id <event-id>

write (require --as <npub|hex>):
  open --repo <id> ... --as <npub|hex>
  update --id <event-id> ... --as <npub|hex>
  status --id <event-id> --status open|merged|closed|draft --as <npub|hex>
`;

export function prCommand(args: string[], ctx?: BuzzContext): Promise<string> {
  return dispatchSubcommands(
    args,
    "pr",
    [
      {
        name: "list",
        knownFlags: ["--repo", "--owner", "--limit"],
        run: async (rest) => {
          const repo = getFlag(rest, "--repo");
          if (!repo) {
            throw new AxiError("--repo is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["pr", "list", "--repo", repo];
          const owner = getFlag(rest, "--owner");
          if (owner) buzzArgs.push("--owner", owner);
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("prs", "pull requests for this repo");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("prs", items, [
              field("id"),
              field("pubkey", "author"),
              field("trust"),
              truncate("content", "title", 120),
              relativeTime("created_at", "created"),
            ]),
            renderHelp(["Run `buzz-axi pr get --id <id>` for details"]),
          ]);
        },
      },
      {
        name: "get",
        knownFlags: ["--id", "--full"],
        run: async (rest) => {
          const id = getFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const data = await buzzJson<Record<string, unknown>>(
            ["pr", "get", "--id", id],
            ctx,
          );
          const marked = withProvenanceList([
            (data ?? {}) as Record<string, unknown>,
          ])[0];
          const full = hasFlag(rest, "--full");
          return renderDetail("pr", marked, [
            field("id"),
            field("pubkey", "author"),
            field("trust"),
            full ? field("content") : truncate("content", "content", 800),
            relativeTime("created_at", "created"),
          ]);
        },
      },
      {
        name: "open",
        knownFlags: ["--as", "--repo", "--owner", "--content", "--file"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const repo = takeFlag(rest, "--repo");
          if (!repo) {
            throw new AxiError("--repo is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["pr", "open", "--repo", repo, ...rest];
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return encodeObject({ pr_open: result });
        },
      },
      {
        name: "update",
        knownFlags: ["--as", "--id", "--content", "--file"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["pr", "update", "--id", id, ...rest],
            ctx,
          );
          return encodeObject({ pr_update: result });
        },
      },
      {
        name: "status",
        knownFlags: ["--as", "--id", "--status"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          const status = takeFlag(rest, "--status");
          if (!id || !status) {
            throw new AxiError(
              "--id and --status are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["pr", "status", "--id", id, "--status", status],
            ctx,
          );
          return encodeObject({ pr_status: result });
        },
      },
    ],
    PR_HELP,
  );
}
