import type { BuzzContext } from "../context.js";
import { resolveSelf } from "../identity.js";
import { encodeObject, renderHelp, renderOutput } from "../toon.js";

export const WHOAMI_HELP = `usage: buzz-axi whoami
Show the identity derived from BUZZ_PRIVATE_KEY (via buzz users get).
Never prints the private key.

examples:
  buzz-axi whoami
`;

export async function whoamiCommand(
  _args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  const identity = await resolveSelf(ctx);
  return renderOutput([
    encodeObject({
      whoami: {
        npub: identity.npub,
        pubkey: identity.pubkeyHex,
        display_name: identity.displayName ?? null,
        relay:
          ctx?.relay ??
          process.env["BUZZ_RELAY_URL"] ??
          "http://localhost:3000",
      },
    }),
    renderHelp([
      "Pass this npub as --as on every mutation",
      "Run `buzz-axi` for the home dashboard",
    ]),
  ]);
}
