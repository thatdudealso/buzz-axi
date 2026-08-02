import { getFlag, hasFlag, takeFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import { formatCountLine } from "../format.js";
import { requireAsMatch } from "../identity.js";
import { withProvenanceList, trustSummary } from "../provenance.js";
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

export const CHANNELS_HELP = `usage: buzz-axi channels <subcommand>
List, inspect, and manage Buzz channels.

read:
  list [--visibility open|private] [--member] [--limit N]
  get --channel <uuid>
  search --query <text> [--exact] [--include-archived] [--limit N]
  members --channel <uuid>

write (require --as <npub|hex>):
  create --name <name> --type <type> --visibility <vis> --as <npub|hex>
  join|leave|archive|unarchive --channel <uuid> --as <npub|hex>
  topic|purpose --channel <uuid> --text <text> --as <npub|hex>

examples:
  buzz-axi channels list --member
  buzz-axi channels get --channel <uuid>
`;

const listSchema = [
  field("channel_id", "id"),
  field("name"),
  field("visibility"),
  relativeTime("created_at", "created"),
  field("trust"),
];

export function channelsCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "channels",
    [
      {
        name: "list",
        knownFlags: ["--visibility", "--member", "--limit"],
        run: async (rest) => {
          const buzzArgs = ["channels", "list"];
          const visibility = getFlag(rest, "--visibility");
          if (visibility) buzzArgs.push("--visibility", visibility);
          if (hasFlag(rest, "--member")) buzzArgs.push("--member");
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);

          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderOutput([
              renderEmpty("channels", "channels found"),
              renderHelp([
                "Run `buzz-axi channels create --name ... --as <npub|hex>`",
              ]),
            ]);
          }
          const summary = trustSummary(items);
          return renderOutput([
            formatCountLine({
              count: items.length,
              limit: limit ? Number(limit) : 500,
            }),
            encodeObject({ trust: summary }),
            renderList("channels", items, listSchema),
            renderHelp([
              "Run `buzz-axi channels get --channel <id>` for details",
              "Run `buzz-axi messages get --channel <id>` to read messages",
            ]),
          ]);
        },
      },
      {
        name: "get",
        knownFlags: ["--channel", "--full"],
        run: async (rest) => {
          const channel = getFlag(rest, "--channel");
          if (!channel) {
            throw new AxiError("--channel is required", "VALIDATION_ERROR", [
              "buzz-axi channels get --channel <uuid>",
            ]);
          }
          const data = await buzzJson<Record<string, unknown>>(
            ["channels", "get", "--channel", channel],
            ctx,
          );
          const marked = withProvenanceList([
            (data ?? {}) as Record<string, unknown>,
          ])[0];
          const full = hasFlag(rest, "--full");
          return renderOutput([
            renderDetail("channel", marked, [
              field("channel_id", "id"),
              field("name"),
              field("visibility"),
              field("trust"),
              field("author"),
              full
                ? field("description")
                : truncate("description", "description", 500),
              relativeTime("created_at", "created"),
            ]),
          ]);
        },
      },
      {
        name: "search",
        knownFlags: ["--query", "--exact", "--include-archived", "--limit"],
        run: async (rest) => {
          const query = getFlag(rest, "--query");
          if (!query) {
            throw new AxiError("--query is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["channels", "search", "--query", query];
          if (hasFlag(rest, "--exact")) buzzArgs.push("--exact");
          if (hasFlag(rest, "--include-archived")) {
            buzzArgs.push("--include-archived");
          }
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("channels", `channels matching "${query}"`);
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            renderList("channels", items, listSchema),
          ]);
        },
      },
      {
        name: "members",
        knownFlags: ["--channel"],
        run: async (rest) => {
          const channel = getFlag(rest, "--channel");
          if (!channel) {
            throw new AxiError("--channel is required", "VALIDATION_ERROR");
          }
          const data = await buzzJson<Record<string, unknown>[]>(
            ["channels", "members", "--channel", channel],
            ctx,
          );
          const items = withProvenanceList(Array.isArray(data) ? data : [], {
            authorKey: "pubkey",
          });
          if (items.length === 0) {
            return renderEmpty("members", "members in this channel");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("members", items, [
              field("pubkey", "pubkey"),
              field("display_name", "name"),
              field("trust"),
            ]),
          ]);
        },
      },
      {
        name: "create",
        knownFlags: [
          "--as",
          "--name",
          "--type",
          "--visibility",
          "--description",
          "--template",
        ],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const name = takeFlag(rest, "--name");
          const type = takeFlag(rest, "--type");
          const visibility = takeFlag(rest, "--visibility");
          const description = takeFlag(rest, "--description");
          const template = takeFlag(rest, "--template");
          const buzzArgs = ["channels", "create"];
          if (template) buzzArgs.push("--template", template);
          if (name) buzzArgs.push("--name", name);
          if (type) buzzArgs.push("--type", type);
          if (visibility) buzzArgs.push("--visibility", visibility);
          if (description) buzzArgs.push("--description", description);
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return renderOutput([
            encodeObject({ channel_create: result as Record<string, unknown> }),
            renderHelp([
              "Run `buzz-axi channels get --channel <id>` to verify",
            ]),
          ]);
        },
      },
      ...(["join", "leave", "archive", "unarchive"] as const).map((action) => ({
        name: action,
        knownFlags: ["--as", "--channel"],
        mutating: true,
        run: async (rest: string[]) => {
          await requireAsMatch(rest, ctx);
          const channel = takeFlag(rest, "--channel");
          if (!channel) {
            throw new AxiError("--channel is required", "VALIDATION_ERROR");
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["channels", action, "--channel", channel],
            ctx,
          );
          return encodeObject({
            [`channel_${action}`]: result as Record<string, unknown>,
          });
        },
      })),
      {
        name: "topic",
        knownFlags: ["--as", "--channel", "--text"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const channel = takeFlag(rest, "--channel");
          const text = takeFlag(rest, "--text");
          if (!channel || !text) {
            throw new AxiError(
              "--channel and --text are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["channels", "topic", "--channel", channel, "--text", text],
            ctx,
          );
          return encodeObject({
            channel_topic: result as Record<string, unknown>,
          });
        },
      },
      {
        name: "purpose",
        knownFlags: ["--as", "--channel", "--text"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const channel = takeFlag(rest, "--channel");
          const text = takeFlag(rest, "--text");
          if (!channel || !text) {
            throw new AxiError(
              "--channel and --text are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["channels", "purpose", "--channel", channel, "--text", text],
            ctx,
          );
          return encodeObject({
            channel_purpose: result as Record<string, unknown>,
          });
        },
      },
    ],
    CHANNELS_HELP,
  );
}
