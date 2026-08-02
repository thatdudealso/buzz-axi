import { getFlag } from "../args.js";
import { buzzJson } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { rejectCredentialFlags, rejectUnknownFlags } from "../args.js";
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

export const MENTIONS_HELP = `usage: buzz-axi mentions [--limit N] [--since T]
Read mention feed entries (maps to buzz feed get --types mentions).

examples:
  buzz-axi mentions
  buzz-axi mentions --limit 20
`;

export async function mentionsCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  rejectCredentialFlags(args);
  if (args[0] === "--help" || args[0] === "-h") return MENTIONS_HELP.trimEnd();
  rejectUnknownFlags(args, ["--limit", "--since"], "mentions");

  const buzzArgs = ["feed", "get", "--types", "mentions"];
  const limit = getFlag(args, "--limit");
  const since = getFlag(args, "--since");
  if (limit) buzzArgs.push("--limit", limit);
  if (since) buzzArgs.push("--since", since);

  const data = await buzzJson<Record<string, unknown>[]>(buzzArgs, ctx);
  const items = withProvenanceList(Array.isArray(data) ? data : []);
  if (items.length === 0) {
    return renderOutput([
      renderEmpty("mentions", "mentions in the feed"),
      renderHelp(["Run `buzz-axi messages search --query @you` as a fallback"]),
    ]);
  }
  return renderOutput([
    formatCountLine({
      count: items.length,
      limit: limit ? Number(limit) : undefined,
    }),
    encodeObject({ trust: trustSummary(items) }),
    renderList("mentions", items, [
      field("id"),
      field("pubkey", "author"),
      field("trust"),
      truncate("content", "content", 200),
      relativeTime("created_at", "created"),
    ]),
    renderHelp(["Run `buzz-axi messages thread --id <id>` for context"]),
  ]);
}
