import { bech32 } from "@scure/base";
import { AxiError } from "./errors.js";

const HEX64 = /^[0-9a-f]{64}$/i;
const NPUB_HRP = "npub";

/** Decode npub1… or accept 64-char hex. Returns lowercase hex pubkey. */
export function normalizePubkey(value: string): string {
  const trimmed = value.trim();
  if (HEX64.test(trimmed)) return trimmed.toLowerCase();

  if (!trimmed.toLowerCase().startsWith("npub1")) {
    throw new AxiError(
      `Invalid pubkey "${trimmed}" — expected npub1… or 64-char hex`,
      "VALIDATION_ERROR",
    );
  }

  try {
    const { prefix, bytes } = bech32.decodeToBytes(trimmed);
    if (prefix !== NPUB_HRP) {
      throw new AxiError(
        `Expected npub prefix, got "${prefix}"`,
        "VALIDATION_ERROR",
      );
    }
    if (bytes.length !== 32) {
      throw new AxiError(
        `Invalid npub payload length ${bytes.length}`,
        "VALIDATION_ERROR",
      );
    }
    return Buffer.from(bytes).toString("hex");
  } catch (e) {
    if (e instanceof AxiError) throw e;
    throw new AxiError(`Invalid npub bech32: ${trimmed}`, "VALIDATION_ERROR");
  }
}

export function isNpubOrHex(value: string): boolean {
  try {
    normalizePubkey(value);
    return true;
  } catch {
    return false;
  }
}

/** Encode 32-byte hex pubkey as npub1… */
export function hexToNpub(hex: string): string {
  if (!HEX64.test(hex)) {
    throw new AxiError(`Invalid hex pubkey: ${hex}`, "VALIDATION_ERROR");
  }
  return bech32.encodeFromBytes(
    NPUB_HRP,
    Buffer.from(hex.toLowerCase(), "hex"),
  );
}
