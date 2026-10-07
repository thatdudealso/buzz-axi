import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { configDir, collapseHome, trustedPath } from "./context.js";
import { AxiError } from "./errors.js";
import { hexToNpub, normalizePubkey } from "./npub.js";

export interface TrustedEntry {
  npub: string;
  pubkeyHex: string;
  note?: string;
  pinnedAt?: string;
}

export interface TrustedFile {
  npubs: string[];
  entries: TrustedEntry[];
}

interface TrustedToml {
  npubs?: string[];
  trusted?: Array<{ npub?: string; note?: string; pinned_at?: string }>;
}

export function loadTrusted(home = homedir()): TrustedFile {
  const path = trustedPath(home);
  if (!existsSync(path)) {
    return { npubs: [], entries: [] };
  }
  const parsed = parseToml(readFileSync(path, "utf8")) as TrustedToml;
  const byHex = new Map<string, TrustedEntry>();

  for (const npub of parsed.npubs ?? []) {
    try {
      const hex = normalizePubkey(npub);
      if (!byHex.has(hex)) {
        byHex.set(hex, { npub: hexToNpub(hex), pubkeyHex: hex });
      }
    } catch {
      // skip invalid entries rather than failing all reads
    }
  }

  // `trusted` rows win for note/pinned_at metadata
  for (const row of parsed.trusted ?? []) {
    if (!row.npub) continue;
    try {
      const hex = normalizePubkey(row.npub);
      byHex.set(hex, {
        npub: hexToNpub(hex),
        pubkeyHex: hex,
        note: row.note,
        pinnedAt: row.pinned_at,
      });
    } catch {
      // skip
    }
  }

  const entries = [...byHex.values()];

  return {
    npubs: entries.map((e) => e.npub),
    entries,
  };
}

export function isTrustedPubkey(pubkey: string, home = homedir()): boolean {
  try {
    const hex = normalizePubkey(pubkey);
    return loadTrusted(home).entries.some((e) => e.pubkeyHex === hex);
  } catch {
    return false;
  }
}

export function saveTrusted(file: TrustedFile, home = homedir()): void {
  const dir = configDir(home);
  mkdirSync(dir, { recursive: true });
  const doc: TrustedToml = {
    npubs: file.entries.map((e) => e.npub),
    trusted: file.entries.map((e) => ({
      npub: e.npub,
      ...(e.note ? { note: e.note } : {}),
      ...(e.pinnedAt ? { pinned_at: e.pinnedAt } : {}),
    })),
  };
  writeFileSync(trustedPath(home), stringifyToml(doc) + "\n", "utf8");
}

export function previewPin(
  npubOrHex: string,
  note: string | undefined,
  home = homedir(),
): {
  npub: string;
  pubkeyHex: string;
  alreadyTrusted: boolean;
  path: string;
  note?: string;
} {
  const hex = normalizePubkey(npubOrHex);
  const npub = hexToNpub(hex);
  const current = loadTrusted(home);
  return {
    npub,
    pubkeyHex: hex,
    alreadyTrusted: current.entries.some((e) => e.pubkeyHex === hex),
    path: collapseHome(trustedPath(home), home),
    note,
  };
}

export function confirmPin(
  npubOrHex: string,
  note: string | undefined,
  home = homedir(),
): TrustedEntry {
  const preview = previewPin(npubOrHex, note, home);
  const current = loadTrusted(home);
  if (preview.alreadyTrusted) {
    return current.entries.find((e) => e.pubkeyHex === preview.pubkeyHex)!;
  }
  const entry: TrustedEntry = {
    npub: preview.npub,
    pubkeyHex: preview.pubkeyHex,
    note,
    pinnedAt: new Date().toISOString(),
  };
  current.entries.push(entry);
  saveTrusted(current, home);
  return entry;
}

export function unpin(
  npubOrHex: string,
  home = homedir(),
): { removed: boolean; npub: string } {
  const hex = normalizePubkey(npubOrHex);
  const current = loadTrusted(home);
  const before = current.entries.length;
  current.entries = current.entries.filter((e) => e.pubkeyHex !== hex);
  if (current.entries.length === before) {
    throw new AxiError(
      `${hexToNpub(hex)} is not in the trust allowlist`,
      "NOT_FOUND",
      ["Run `buzz-axi trust list`"],
    );
  }
  saveTrusted(current, home);
  return { removed: true, npub: hexToNpub(hex) };
}
