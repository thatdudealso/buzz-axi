import { getFlag, hasFlag, takeFlag } from "../args.js";
import { buzzExecWithStdin, buzzJson } from "../buzz.js";
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
  truncate,
} from "../toon.js";

export const MESSAGES_HELP = `usage: buzz-axi messages <subcommand>
Read and send channel messages. Kind filters are pass-through only — upstream defaults apply when omitted.

read:
  get --channel <uuid> [--limit N] [--before T] [--since T] [--kinds k1,k2] [--full]
  thread --id <event-id> [--depth-limit N] [--full]
  search --query <text> [--author <pubkey>] [--channel <uuid>] [--limit N]

write (require --as):
  send --channel <uuid> --content <text|--content -> --as <npub> [--reply-to <id>]
  edit --id <event-id> --content <text> --as <npub>
  delete --id <event-id> --as <npub>

examples:
  buzz-axi messages get --channel <uuid>
  buzz-axi messages thread --id <event-id>
`;

const msgSchema = [
  field("id"),
  field("pubkey", "author"),
  field("trust"),
  truncate("content", "content", 200),
  relativeTime("created_at", "created"),
];

export function messagesCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "messages",
    [
      {
        name: "get",
        knownFlags: [
          "--channel",
          "--limit",
          "--before",
          "--since",
          "--kinds",
          "--kind",
          "--full",
        ],
        run: async (rest) => {
          const channel = getFlag(rest, "--channel");
          if (!channel) {
            throw new AxiError("--channel is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["messages", "get", "--channel", channel];
          for (const f of [
            "--limit",
            "--before",
            "--since",
            "--kinds",
            "--kind",
          ] as const) {
            const v = getFlag(rest, f);
            if (v) buzzArgs.push(f === "--kind" ? "--kinds" : f, v);
          }
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("messages", "messages in this channel");
          }
          const full = hasFlag(rest, "--full");
          const schema = full
            ? [
                field("id"),
                field("pubkey", "author"),
                field("trust"),
                field("content"),
                relativeTime("created_at", "created"),
              ]
            : msgSchema;
          const limit = getFlag(rest, "--limit");
          return renderOutput([
            formatCountLine({
              count: items.length,
              limit: limit ? Number(limit) : undefined,
            }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("messages", items, schema),
            renderHelp([
              "Run `buzz-axi messages thread --id <id>` for replies",
              "Run `buzz-axi messages get --channel <uuid> --full` for full bodies",
            ]),
          ]);
        },
      },
      {
        name: "thread",
        knownFlags: ["--id", "--depth-limit", "--full"],
        run: async (rest) => {
          const id = getFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["messages", "thread", "--id", id];
          const depth = getFlag(rest, "--depth-limit");
          if (depth) buzzArgs.push("--depth-limit", depth);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("thread", "messages in this thread");
          }
          const full = hasFlag(rest, "--full");
          const schema = full
            ? [
                field("id"),
                field("pubkey", "author"),
                field("trust"),
                field("content"),
                relativeTime("created_at", "created"),
              ]
            : msgSchema;
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("thread", items, schema),
          ]);
        },
      },
      {
        name: "search",
        knownFlags: ["--query", "--author", "--channel", "--limit"],
        run: async (rest) => {
          const query = getFlag(rest, "--query");
          if (!query) {
            throw new AxiError("--query is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["messages", "search", "--query", query];
          for (const f of ["--author", "--channel", "--limit"] as const) {
            const v = getFlag(rest, f);
            if (v) buzzArgs.push(f, v);
          }
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("messages", `messages matching "${query}"`);
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("messages", items, msgSchema),
          ]);
        },
      },
      {
        name: "send",
        knownFlags: [
          "--as",
          "--channel",
          "--content",
          "--reply-to",
          "--broadcast",
        ],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const channel = takeFlag(rest, "--channel");
          const content = takeFlag(rest, "--content");
          const replyTo = takeFlag(rest, "--reply-to");
          const broadcast = hasFlag(rest, "--broadcast");
          if (broadcast) {
            const idx = rest.indexOf("--broadcast");
            if (idx !== -1) rest.splice(idx, 1);
          }
          if (!channel || content === undefined) {
            throw new AxiError(
              "--channel and --content are required",
              "VALIDATION_ERROR",
            );
          }
          const buzzArgs = ["messages", "send", "--channel", channel];
          if (replyTo) buzzArgs.push("--reply-to", replyTo);
          if (broadcast) buzzArgs.push("--broadcast");

          let result: Record<string, unknown>;
          if (content === "-") {
            const stdin = await readStdinOrThrow("message content");
            buzzArgs.push("--content", "-");
            const raw = await buzzExecWithStdin(buzzArgs, stdin, ctx);
            result = JSON.parse(raw) as Record<string, unknown>;
          } else {
            buzzArgs.push("--content", content);
            result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          }
          return renderOutput([
            encodeObject({ message_send: result }),
            renderHelp([
              "Run `buzz-axi messages get --channel <uuid>` to verify",
            ]),
          ]);
        },
      },
      {
        name: "edit",
        knownFlags: ["--as", "--id", "--content"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          const content = takeFlag(rest, "--content");
          if (!id || content === undefined) {
            throw new AxiError(
              "--id and --content are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["messages", "edit", "--id", id, "--content", content],
            ctx,
          );
          return encodeObject({ message_edit: result });
        },
      },
      {
        name: "delete",
        knownFlags: ["--as", "--id"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["messages", "delete", "--id", id],
            ctx,
          );
          // Idempotent: treat already-deleted as success if upstream says so.
          return encodeObject({ message_delete: result });
        },
      },
    ],
    MESSAGES_HELP,
  );
}

async function readStdinOrThrow(label: string): Promise<string> {
  if (process.stdin.isTTY) {
    throw new AxiError(
      `${label}: stdin is a TTY — pipe content or pass --content <text>`,
      "VALIDATION_ERROR",
    );
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
