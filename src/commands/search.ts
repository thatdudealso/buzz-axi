import { getFlag } from "../args.js";
import { rejectCredentialFlags, rejectUnknownFlags } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
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

export const SEARCH_HELP = `usage: buzz-axi search --query <text> [--author <pubkey>] [--channel <uuid>] [--limit N]
Full-text message search (pass-through to buzz messages search).

examples:
  buzz-axi search --query "deploy"
  buzz-axi search --query "bug" --channel <uuid>
`;

export async function searchCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  rejectCredentialFlags(args);
  if (args[0] === "--help" || args[0] === "-h") return SEARCH_HELP.trimEnd();
  rejectUnknownFlags(
    args,
    ["--query", "--author", "--channel", "--limit"],
    "search",
  );

  const query = getFlag(args, "--query");
  if (!query) {
    throw new AxiError("--query is required", "VALIDATION_ERROR", [
      'buzz-axi search --query "..."',
    ]);
  }

  const buzzArgs = ["messages", "search", "--query", query];
  for (const f of ["--author", "--channel", "--limit"] as const) {
    const v = getFlag(args, f);
    if (v) buzzArgs.push(f, v);
  }

  const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
  const items = withProvenanceList(Array.isArray(data) ? data : []);
  if (items.length === 0) {
    return renderEmpty("results", `results for "${query}"`);
  }
  return renderOutput([
    formatCountLine({ count: items.length }),
    encodeObject({ trust: trustSummary(items) }),
    renderList("results", items, [
      field("id"),
      field("pubkey", "author"),
      field("trust"),
      truncate("content", "content", 200),
      relativeTime("created_at", "created"),
    ]),
    renderHelp(["Run `buzz-axi messages thread --id <id>` for the thread"]),
  ]);
}
