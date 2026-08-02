import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hexToNpub } from "../../src/npub.js";
import { TEST_PUBKEY_HEX } from "../helpers.js";

describe("trustCommand", () => {
  let home: string;
  let trustCommand: typeof import("../../src/commands/trust.js").trustCommand;

  beforeEach(async () => {
    home = mkdtempSync(join(tmpdir(), "buzz-axi-trustcmd-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    ({ trustCommand } = await import("../../src/commands/trust.js"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(home, { recursive: true, force: true });
  });

  it("previews pin without --confirm", async () => {
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    const out = await trustCommand(["pin", npub]);
    expect(out).toContain("trust_pin_preview");
    expect(out).toContain("--confirm");
    const list = await trustCommand(["list"]);
    expect(list).toContain("0 pinned");
  });

  it("pins with --confirm", async () => {
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    const out = await trustCommand(["pin", npub, "--confirm", "--note", "a"]);
    expect(out).toContain("pinned");
    const list = await trustCommand(["list"]);
    expect(list).toContain(npub);
  });
});
