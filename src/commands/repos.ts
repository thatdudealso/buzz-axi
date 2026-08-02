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
  renderDetail,
  renderEmpty,
  renderHelp,
  renderList,
  renderOutput,
  truncate,
} from "../toon.js";

export const REPOS_HELP = `usage: buzz-axi repos <subcommand>
NIP-34 repository announcements (read + guarded writes).

read:
  list [--limit N]
  get --id <repo-id> [--owner <pubkey>]
  protect list --id <repo-id>

write (require --as):
  create --id <id> [--name <name>] [--clone <url>]... --as <npub>
  protect set|remove ... --as <npub>

examples:
  buzz-axi repos list
  buzz-axi repos create --id my-repo --clone <url> --as <npub>
`;

export function reposCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "repos",
    [
      {
        name: "list",
        knownFlags: ["--limit"],
        run: async (rest) => {
          const buzzArgs = ["repos", "list"];
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("repos", "repository announcements");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("repos", items, [
              field("id", "id"),
              field("name"),
              field("pubkey", "owner"),
              field("trust"),
              relativeTime("created_at", "created"),
            ]),
            renderHelp(["Run `buzz-axi repos get --id <id>` for details"]),
          ]);
        },
      },
      {
        name: "get",
        knownFlags: ["--id", "--owner"],
        run: async (rest) => {
          const id = getFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["repos", "get", "--id", id];
          const owner = getFlag(rest, "--owner");
          if (owner) buzzArgs.push("--owner", owner);
          const data = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          const marked = withProvenanceList([
            (data ?? {}) as Record<string, unknown>,
          ])[0];
          return renderDetail("repo", marked, [
            field("id"),
            field("name"),
            field("pubkey", "owner"),
            field("trust"),
            truncate("description", "description", 400),
            field("clone"),
          ]);
        },
      },
      {
        name: "create",
        knownFlags: [
          "--as",
          "--id",
          "--name",
          "--description",
          "--clone",
          "--web",
          "--nostr-relay",
        ],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["repos", "create", "--id", id];
          for (const f of ["--name", "--description", "--web"] as const) {
            const v = takeFlag(rest, f);
            if (v) buzzArgs.push(f, v);
          }
          for (const clone of getAllFlags(rest, "--clone")) {
            buzzArgs.push("--clone", clone);
          }
          // consume --clone from rest via getAllFlags already read; strip them
          while (takeFlag(rest, "--clone")) {
            /* drained */
          }
          for (const relay of getAllFlags(rest, "--nostr-relay")) {
            buzzArgs.push("--nostr-relay", relay);
          }
          while (takeFlag(rest, "--nostr-relay")) {
            /* drained */
          }

          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          const hints = [
            "Run `buzz-axi repos get --id <id>` to verify the announcement",
            "Ensure --clone points at <relay>/git/<your-pubkey>/<id> so git clone/fetch/push work",
          ];
          return renderOutput([
            encodeObject({ repo_create: result }),
            renderHelp(hints),
          ]);
        },
      },
      {
        name: "protect",
        knownFlags: [
          "--as",
          "--id",
          "--ref",
          "--push",
          "--no-force-push",
          "--no-delete",
          "--require-patch",
        ],
        run: async (rest) => {
          const action = rest[0];
          if (!action || action.startsWith("-")) {
            throw new AxiError(
              "repos protect requires list|set|remove",
              "VALIDATION_ERROR",
            );
          }
          const sub = rest.slice(1);
          if (action === "list") {
            const id = getFlag(sub, "--id");
            if (!id) {
              throw new AxiError("--id is required", "VALIDATION_ERROR");
            }
            const data = await buzzJson<Record<string, unknown>>(
              ["repos", "protect", "list", "--id", id],
              ctx,
            );
            return encodeObject({
              repo_protect: data as Record<string, unknown>,
            });
          }
          await requireAsMatch(sub, ctx);
          const id = takeFlag(sub, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["repos", "protect", action, "--id", id, ...sub];
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return encodeObject({
            [`repo_protect_${action}`]: result,
          });
        },
      },
    ],
    REPOS_HELP,
  );
}
