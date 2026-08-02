import { getFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
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

export const AUDIT_HELP = `usage: buzz-axi audit <subcommand>
Read-only moderation / attribution views.

Excluded (never exposed): ban, unban, timeout, untimeout, resolve
(resolve --action ban|timeout|kick|delete is a destructive backdoor).

subcommands:
  reports [--status <status>] [--limit N]
  restricted [--limit N]
  trail [--limit N]          (buzz moderation audit)

examples:
  buzz-axi audit reports
  buzz-axi audit trail --limit 20
`;

/** Destructive / hard-excluded moderation entry points. */
export const EXCLUDED_MODERATION = [
  "ban",
  "unban",
  "timeout",
  "untimeout",
  "resolve",
] as const;

export function rejectExcludedModeration(args: string[]): void {
  const sub = args[0];
  if (!sub || sub.startsWith("-")) return;
  if ((EXCLUDED_MODERATION as readonly string[]).includes(sub)) {
    throw new AxiError(
      `audit ${sub} is excluded — destructive moderation is not available via buzz-axi`,
      "VALIDATION_ERROR",
      [
        "Use `buzz-axi audit reports|restricted|trail` for read-only views",
        "ban/timeout/kick/delete via resolve are hard-excluded (CLI contract audit §6.2)",
      ],
    );
  }
}

export function auditCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  rejectExcludedModeration(args);
  return dispatchSubcommands(
    args,
    "audit",
    [
      {
        name: "reports",
        knownFlags: ["--status", "--limit"],
        run: async (rest) => {
          const buzzArgs = ["moderation", "reports"];
          const status = getFlag(rest, "--status");
          const limit = getFlag(rest, "--limit");
          if (status) buzzArgs.push("--status", status);
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("reports", "reports in the moderation queue");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("reports", items, [
              field("id"),
              field("pubkey", "author"),
              field("trust"),
              field("status"),
              truncate("content", "content", 160),
              relativeTime("created_at", "created"),
            ]),
            renderHelp([
              "Destructive moderation (ban/timeout/resolve) is not exposed by buzz-axi",
            ]),
          ]);
        },
      },
      {
        name: "restricted",
        knownFlags: ["--limit"],
        run: async (rest) => {
          const buzzArgs = ["moderation", "restricted"];
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("restricted", "currently restricted members");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            renderList("restricted", items, [
              field("pubkey"),
              field("trust"),
              field("restriction"),
              relativeTime("created_at", "created"),
            ]),
          ]);
        },
      },
      {
        name: "trail",
        knownFlags: ["--limit"],
        run: async (rest) => {
          const buzzArgs = ["moderation", "audit"];
          const limit = getFlag(rest, "--limit");
          if (limit) buzzArgs.push("--limit", limit);
          const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
          const items = withProvenanceList(Array.isArray(data) ? data : []);
          if (items.length === 0) {
            return renderEmpty("audit", "audit trail events");
          }
          return renderOutput([
            formatCountLine({ count: items.length }),
            encodeObject({ trust: trustSummary(items) }),
            renderList("audit", items, [
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
    AUDIT_HELP,
  );
}
