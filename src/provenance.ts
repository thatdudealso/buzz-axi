import { homedir } from "node:os";
import { isTrustedPubkey } from "./trust.js";

export type TrustStatus = "trusted" | "untrusted" | "unknown";

export interface ProvenanceEnvelope {
  trust: TrustStatus;
  author: string | null;
}

/**
 * Mark a content-bearing record with verified trust status from the allowlist.
 * Applied on every content read path.
 */
export function withProvenance<T extends Record<string, unknown>>(
  item: T,
  opts?: { authorKey?: string; home?: string },
): T & ProvenanceEnvelope {
  const authorKey = opts?.authorKey ?? "pubkey";
  const home = opts?.home ?? homedir();
  const authorRaw = item[authorKey];
  const author = typeof authorRaw === "string" ? authorRaw : null;

  let trust: TrustStatus = "unknown";
  if (author) {
    trust = isTrustedPubkey(author, home) ? "trusted" : "untrusted";
  }

  return {
    ...item,
    trust,
    author,
  };
}

export function withProvenanceList<T extends Record<string, unknown>>(
  items: T[],
  opts?: { authorKey?: string; home?: string },
): Array<T & ProvenanceEnvelope> {
  return items.map((item) => withProvenance(item, opts));
}

export function trustSummary(items: Array<{ trust?: TrustStatus }>): {
  trusted: number;
  untrusted: number;
  unknown: number;
} {
  let trusted = 0;
  let untrusted = 0;
  let unknown = 0;
  for (const item of items) {
    if (item.trust === "trusted") trusted++;
    else if (item.trust === "untrusted") untrusted++;
    else unknown++;
  }
  return { trusted, untrusted, unknown };
}
