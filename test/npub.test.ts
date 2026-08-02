import { describe, expect, it } from "vitest";
import { hexToNpub, normalizePubkey } from "../src/npub.js";
import { TEST_PUBKEY_HEX } from "./helpers.js";

describe("npub", () => {
  it("round-trips hex through npub", () => {
    const npub = hexToNpub(TEST_PUBKEY_HEX);
    expect(npub.startsWith("npub1")).toBe(true);
    expect(normalizePubkey(npub)).toBe(TEST_PUBKEY_HEX);
  });

  it("accepts hex directly", () => {
    expect(normalizePubkey(TEST_PUBKEY_HEX.toUpperCase())).toBe(
      TEST_PUBKEY_HEX,
    );
  });

  it("rejects garbage", () => {
    expect(() => normalizePubkey("not-a-key")).toThrow(/Invalid pubkey/);
  });
});
