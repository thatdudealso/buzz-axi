import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { requireAsMatch } from "../src/identity.js";
import { hexToNpub } from "../src/npub.js";
import {
  mockExecFileResult,
  mockedExecFile,
  TEST_PUBKEY_HEX,
} from "./helpers.js";

describe("requireAsMatch", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
    process.env["BUZZ_PRIVATE_KEY"] = "test-key-not-printed";
  });

  it("requires --as", async () => {
    await expect(requireAsMatch([])).rejects.toMatchObject({
      code: "AS_REQUIRED",
    });
  });

  it("accepts matching npub", async () => {
    mockExecFileResult(
      null,
      JSON.stringify([{ pubkey: TEST_PUBKEY_HEX, display_name: "me" }]),
      "",
    );
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    const result = await requireAsMatch(["--as", npub, "--channel", "c"]);
    expect(result.identity.pubkeyHex).toBe(TEST_PUBKEY_HEX);
    expect(result.identity.npub).toBe(npub);
  });

  it("rejects mismatched --as", async () => {
    mockExecFileResult(null, JSON.stringify([{ pubkey: TEST_PUBKEY_HEX }]), "");
    const other =
      "0000000000000000000000000000000000000000000000000000000000000001";
    await expect(requireAsMatch(["--as", other])).rejects.toMatchObject({
      code: "AS_MISMATCH",
    });
  });
});
