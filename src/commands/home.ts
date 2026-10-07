import { buzzJson } from "../buzz.js";
import { collapseHome, type BuzzContext } from "../context.js";
import { trustSummary, withProvenanceList } from "../provenance.js";
import { loadTrusted } from "../trust.js";
import { DESCRIPTION } from "../cli-meta.js";
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
import { realpathSync } from "node:fs";

export const HOME_HELP = "";

export async function homeCommand(
  _args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  const blocks: string[] = [];

  blocks.push(
    encodeObject({
      bin: collapseHome(resolveBinPath()),
      description: DESCRIPTION,
      relay:
        ctx?.relay ?? process.env["BUZZ_RELAY_URL"] ?? "http://localhost:3000",
    }),
  );

  const trusted = loadTrusted();
  blocks.push(
    encodeObject({
      trust_allowlist: {
        pinned: trusted.entries.length,
        path: "~/.config/buzz-axi/trusted.toml",
      },
    }),
  );

  const [channels, mentions] = await Promise.all([
    buzzJson<Record<string, unknown>[]>(
      ["channels", "list", "--member", "--limit", "5"],
      ctx,
    ).catch(() => [] as Record<string, unknown>[]),
    buzzJson<Record<string, unknown>[]>(
      ["feed", "get", "--types", "mentions", "--limit", "5"],
      ctx,
    ).catch(() => [] as Record<string, unknown>[]),
  ]);

  const channelItems = withProvenanceList(
    Array.isArray(channels) ? channels : [],
  );
  const mentionItems = withProvenanceList(
    Array.isArray(mentions) ? mentions : [],
  );

  blocks.push(
    channelItems.length
      ? renderList("channels", channelItems, [
          field("channel_id", "id"),
          field("name"),
          field("trust"),
          relativeTime("created_at", "created"),
        ])
      : renderEmpty("channels", "member channels"),
  );

  blocks.push(
    mentionItems.length
      ? renderOutput([
          encodeObject({ trust: trustSummary(mentionItems) }),
          renderList("mentions", mentionItems, [
            field("id"),
            field("pubkey", "author"),
            field("trust"),
            truncate("content", "content", 120),
          ]),
        ])
      : renderEmpty("mentions", "recent mentions"),
  );

  const hints: string[] = [
    "Run `buzz-axi channels list` for more channels",
    "Run `buzz-axi mentions` for the full mention feed",
    "Run `buzz-axi doctor` to verify credentials and trust setup",
    "Run `buzz-axi whoami` for the current npub (use with --as on writes)",
  ];
  if (trusted.entries.length === 0) {
    hints.push(
      "Run `buzz-axi trust pin <npub> --confirm` to start the allowlist",
    );
  }

  blocks.push(renderHelp(hints));
  return renderOutput(blocks);
}

function resolveBinPath(): string {
  try {
    return realpathSync(process.argv[1] ?? "buzz-axi");
  } catch {
    return process.argv[1] ?? "buzz-axi";
  }
}
