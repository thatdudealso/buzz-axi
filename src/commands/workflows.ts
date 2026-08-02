import { getFlag, hasFlag, takeFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError, isUnsupportedDefError } from "../errors.js";
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
import { readFileSync } from "node:fs";

export const WORKFLOWS_HELP = `usage: buzz-axi workflows <subcommand>
Create, trigger, and manage Buzz workflows.

read:
  list --channel <uuid>
  get --id <workflow-id>
  runs --id <workflow-id>

write (require --as):
  create --channel <uuid> --file <yaml> --as <npub>
  update --id <id> --file <yaml> --as <npub>
  delete --id <id> --as <npub>
  trigger --id <id> [--inputs <json>] --as <npub>
  approve --token <uuid> [--approved true|false] [--note <text>] --as <npub>

Approve is noninteractive and reversible (re-run with --approved false).

examples:
  buzz-axi workflows list --channel <uuid>
  buzz-axi workflows approve --token <uuid> --as <npub>
`;

export function workflowsCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "workflows",
    [
      {
        name: "list",
        knownFlags: ["--channel"],
        run: async (rest) => {
          const channel = getFlag(rest, "--channel");
          if (!channel) {
            throw new AxiError("--channel is required", "VALIDATION_ERROR");
          }
          const data = await buzzJson<Record<string, unknown>[]>(
            ["workflows", "list", "--channel", channel],
            ctx,
          );
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderOutput([
              renderEmpty("workflows", "workflows in this channel"),
              renderHelp([
                "Run `buzz-axi init workflow --template notify` for a starter YAML",
                "Run `buzz-axi workflows create --channel <uuid> --file <yaml> --as <npub>`",
              ]),
            ]);
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("workflows", items, [
              field("workflow_id", "id"),
              field("pubkey", "author"),
              field("trust"),
              truncate("content", "content", 120),
              relativeTime("created_at", "created"),
            ]),
            renderHelp([
              "Run `buzz-axi workflows get --id <id>` for details",
              "Run `buzz-axi workflows runs --id <id>` for run history",
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
          const full = hasFlag(rest, "--full");
          const data = await buzzJson<Record<string, unknown>>(
            ["workflows", "get", "--id", id],
            ctx,
          );
          const marked = withProvenanceList([
            (data ?? {}) as Record<string, unknown>,
          ])[0];
          return renderDetail("workflow", marked, [
            field("workflow_id", "id"),
            field("pubkey", "author"),
            field("trust"),
            full ? field("content") : truncate("content", "content", 800),
            relativeTime("created_at", "created"),
          ]);
        },
      },
      {
        name: "runs",
        knownFlags: ["--id"],
        run: async (rest) => {
          const id = getFlag(rest, "--id");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const data = await buzzJson<Record<string, unknown>[]>(
            ["workflows", "runs", "--id", id],
            ctx,
          );
          const items = Array.isArray(data) ? data : [];
          if (items.length === 0) {
            return renderEmpty("runs", "runs for this workflow");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            renderList("runs", items, [
              field("run_id", "id"),
              field("status"),
              relativeTime("created_at", "created"),
            ]),
          ]);
        },
      },
      {
        name: "create",
        knownFlags: ["--as", "--channel", "--file"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const channel = takeFlag(rest, "--channel");
          const file = takeFlag(rest, "--file");
          if (!channel || !file) {
            throw new AxiError(
              "--channel and --file are required",
              "VALIDATION_ERROR",
            );
          }
          const yaml = readFileSync(file, "utf8");
          let result: Record<string, unknown>;
          try {
            result = await buzzJson<Record<string, unknown>>(
              ["workflows", "create", "--channel", channel, "--def", yaml],
              ctx,
            );
          } catch (error) {
            // Only retry with --file when --def is confirmed unsupported.
            // Other failures (including accepted-but-parse-error) must not
            // create a duplicate workflow.
            if (!isUnsupportedDefError(error)) throw error;
            result = await buzzJson<Record<string, unknown>>(
              ["workflows", "create", "--channel", channel, "--file", file],
              ctx,
            );
          }
          return renderOutput([
            encodeObject({ workflow_create: result }),
            renderHelp(["Run `buzz-axi workflows list --channel <uuid>`"]),
          ]);
        },
      },
      {
        name: "update",
        knownFlags: ["--as", "--id", "--file"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          const file = takeFlag(rest, "--file");
          if (!id || !file) {
            throw new AxiError(
              "--id and --file are required",
              "VALIDATION_ERROR",
            );
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["workflows", "update", "--id", id, "--file", file],
            ctx,
          );
          return encodeObject({ workflow_update: result });
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
            ["workflows", "delete", "--id", id],
            ctx,
          );
          return encodeObject({ workflow_delete: result });
        },
      },
      {
        name: "trigger",
        knownFlags: ["--as", "--id", "--inputs"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const id = takeFlag(rest, "--id");
          const inputs = takeFlag(rest, "--inputs");
          if (!id) {
            throw new AxiError("--id is required", "VALIDATION_ERROR");
          }
          const buzzArgs = ["workflows", "trigger", "--id", id];
          if (inputs) buzzArgs.push("--inputs", inputs);
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return encodeObject({ workflow_trigger: result });
        },
      },
      {
        name: "approve",
        knownFlags: ["--as", "--token", "--approved", "--note"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const token = takeFlag(rest, "--token");
          if (!token) {
            throw new AxiError("--token is required", "VALIDATION_ERROR");
          }
          const approved = takeFlag(rest, "--approved") ?? "true";
          const note = takeFlag(rest, "--note");
          const buzzArgs = [
            "workflows",
            "approve",
            "--token",
            token,
            "--approved",
            approved,
          ];
          if (note) buzzArgs.push("--note", note);
          const result = await buzzJson<Record<string, unknown>>(buzzArgs, ctx);
          return renderOutput([
            encodeObject({ workflow_approve: result }),
            renderHelp(["Reversible: re-run with --approved false to deny"]),
          ]);
        },
      },
    ],
    WORKFLOWS_HELP,
  );
}
