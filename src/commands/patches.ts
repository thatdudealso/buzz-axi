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

export const PATCHES_HELP = `usage: buzz-axi patches <subcommand>
NIP-34 git patches.

read:
  list --repo <id> [--owner <pubkey>] [--limit N]
  get --id <event-id> [--full]

write (require --as):
  send --repo <id> --file <patch> --as <npub>
  status --id <event-id> --status open|merged|closed|draft --as <npub>
`;

export function patchesCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "patches",
    [
      {
        name: "list",
        knownFlags: ["--repo", "--owner", "--limit"],
        run: async (rest) => {
          const repo = getFlag(rest, "--repo");
          if (!repo) {
            throw new AxiError("--repo is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["patches", "list", "--repo", repo];
          const owner = getFlag(rest, "--owner");
          if (owner) buzzArgs.push("--owner", owner);
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("patches", "patches for this repo");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("patches", items, [
              field("id"),
              field("pubkey", "author"),
              field("trust"),
              truncate("content", "content", 120),
              relativeTime("created_at", "created"),
            ]),
            renderHelp([
              "Run `buzz-axi patches get --id <id>` for the full patch",
            ]),
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
            ["patches", "get", "--id", id],
            ctx,
          );
          const marked = withProvenanceList([
            (data ?? {}) as Record<string, unknown>,
          ])[0];
          const full = hasFlag(rest, "--full");
          return renderDetail("patch", marked, [
            field("id"),
            field("pubkey", "author"),
            field("trust"),
            full ? field("content") : truncate("content", "content", 800),
            relativeTime("created_at", "created"),
          ]);
        },
      },
      {
        name: "send",
        knownFlags: ["--as", "--repo", "--file", "--owner"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const repo = takeFlag(rest, "--repo");
          const file = takeFlag(rest, "--file");
          if (!repo || !file) {
            throw new AxiError(
              "--repo and --file are required",
              "VALIDATION_ERROR",
            );
          }
          const buzzArgs = ["patches", "send", "--repo", repo, "--file", file];
          const owner = takeFlag(rest, "--owner");
          if (owner) buzzArgs.push("--owner", owner);
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return encodeObject({ patch_send: result });
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
            ["patches", "status", "--id", id, "--status", status],
            ctx,
          );
          return encodeObject({ patch_status: result });
        },
      },
    ],
    PATCHES_HELP,
  );
}
