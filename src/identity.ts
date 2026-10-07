import { takeFlag } from "./args.js";
import { buzzJson } from "./buzz.js";
import type { BuzzContext } from "./context.js";
import { AxiError } from "./errors.js";
import { hexToNpub, normalizePubkey } from "./npub.js";

export interface Identity {
  pubkeyHex: string;
  npub: string;
  displayName?: string;
}

interface UserRecord {
  pubkey?: string;
  display_name?: string;
  name?: string;
  [key: string]: unknown;
}

/** Resolve the authenticated identity via buzz-cli (no local key derivation). */
export async function resolveSelf(ctx?: BuzzContext): Promise<Identity> {
  if (!process.env["BUZZ_PRIVATE_KEY"]) {
    throw new AxiError("BUZZ_PRIVATE_KEY is not set", "AUTH_REQUIRED", [
      "Set BUZZ_PRIVATE_KEY in the environment",
      "Run `buzz-axi doctor`",
    ]);
  }

  const data = await buzzJson<UserRecord | UserRecord[]>(["users", "get"], ctx);
  const user = Array.isArray(data) ? data[0] : data;
  if (!user?.pubkey) {
    throw new AxiError(
      "Could not resolve current identity from buzz users get",
      "AUTH_REQUIRED",
      ["Verify BUZZ_PRIVATE_KEY and BUZZ_RELAY_URL", "Run `buzz-axi doctor`"],
    );
  }
  const pubkeyHex = normalizePubkey(user.pubkey);
  return {
    pubkeyHex,
    npub: hexToNpub(pubkeyHex),
    displayName:
      (typeof user.display_name === "string" && user.display_name) ||
      (typeof user.name === "string" && user.name) ||
      undefined,
  };
}

/**
 * Mutations require `--as <npub|hex>` matching the loaded identity.
 * Consumes `--as` from args.
 */
export async function requireAsMatch(
  args: string[],
  ctx?: BuzzContext,
): Promise<{ as: string; identity: Identity }> {
  const asRaw = takeFlag(args, "--as");
  if (!asRaw) {
    throw new AxiError(
      "Mutations require --as <npub|hex> matching the loaded identity",
      "AS_REQUIRED",
      [
        "Add --as <your-npub> to the command",
        "Run `buzz-axi whoami` to see the current identity",
      ],
    );
  }

  let asHex: string;
  try {
    asHex = normalizePubkey(asRaw);
  } catch (e) {
    throw e instanceof AxiError
      ? e
      : new AxiError(`Invalid --as value`, "VALIDATION_ERROR");
  }

  const identity = await resolveSelf(ctx);
  if (asHex !== identity.pubkeyHex) {
    throw new AxiError(
      `--as does not match the loaded BUZZ_PRIVATE_KEY identity`,
      "AS_MISMATCH",
      [
        `Loaded identity npub: ${identity.npub}`,
        "Run `buzz-axi whoami` and pass that npub as --as",
      ],
    );
  }

  return { as: asRaw, identity };
}
