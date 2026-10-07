import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hexToNpub } from "../src/npub.js";
import {
  confirmPin,
  isTrustedPubkey,
  loadTrusted,
  previewPin,
  unpin,
} from "../src/trust.js";
import { TEST_PUBKEY_HEX } from "./helpers.js";

describe("trust allowlist", () => {
  let home: string;

  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
  });

  function freshHome(): string {
    home = mkdtempSync(join(tmpdir(), "buzz-axi-trust-"));
    return home;
  }

  it("previews pin without writing", () => {
    const h = freshHome();
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    const preview = previewPin(npub, "alice", h);
    expect(preview.alreadyTrusted).toBe(false);
    expect(loadTrusted(h).entries).toHaveLength(0);
  });

  it("writes only with confirmPin", () => {
    const h = freshHome();
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    confirmPin(npub, "alice", h);
    expect(isTrustedPubkey(TEST_PUBKEY_HEX, h)).toBe(true);
    expect(loadTrusted(h).entries[0].note).toBe("alice");
  });

  it("unpin removes entry", () => {
    const h = freshHome();
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    confirmPin(npub, undefined, h);
    unpin(npub, h);
    expect(isTrustedPubkey(npub, h)).toBe(false);
  });
});
