import { takeBoolFlag, takeFlag, takePositional } from "../args.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import {
  encodeObject,
  renderHelp,
  renderList,
  renderOutput,
  field,
} from "../toon.js";
import { confirmPin, loadTrusted, previewPin, unpin } from "../trust.js";

export const TRUST_HELP = `usage: buzz-axi trust <subcommand>
Manage the trusted-npub allowlist at ~/.config/buzz-axi/trusted.toml.

subcommands:
  list                         Show pinned npubs
  pin <npub> [--note <text>]   Preview a pin (add --confirm to write)
  unpin <npub> --confirm       Remove a pinned npub

examples:
  buzz-axi trust list
  buzz-axi trust pin npub1...
  buzz-axi trust pin npub1... --confirm
  buzz-axi trust unpin npub1... --confirm
`;

export async function trustCommand(args: string[]): Promise<string> {
  return dispatchSubcommands(
    args,
    "trust",
    [
      {
        name: "list",
        knownFlags: [],
        run: async () => {
          const file = loadTrusted();
          if (file.entries.length === 0) {
            return renderOutput([
              "trusted: 0 pinned npubs in ~/.config/buzz-axi/trusted.toml",
              renderHelp([
                "Run `buzz-axi trust pin <npub>` to preview",
                "Run `buzz-axi trust pin <npub> --confirm` to write",
              ]),
            ]);
          }
          return renderOutput([
            renderList(
              "trusted",
              file.entries.map((e) => ({
                npub: e.npub,
                note: e.note ?? "",
                pinned_at: e.pinnedAt ?? "",
              })),
              [field("npub"), field("note"), field("pinned_at")],
            ),
          ]);
        },
      },
      {
        name: "pin",
        knownFlags: ["--note", "--confirm"],
        run: async (rest) => {
          const confirm = takeBoolFlag(rest, "--confirm");
          const note = takeFlag(rest, "--note");
          const target = takePositional(rest);
          if (!target) {
            throw new AxiError(
              "trust pin requires <npub>",
              "VALIDATION_ERROR",
              ["Run `buzz-axi trust pin <npub>`", "Add --confirm to write"],
            );
          }
          if (rest.length > 0) {
            throw new AxiError(
              `Unexpected arguments: ${rest.join(" ")}`,
              "VALIDATION_ERROR",
            );
          }

          if (!confirm) {
            const preview = previewPin(target, note);
            return renderOutput([
              encodeObject({
                trust_pin_preview: {
                  npub: preview.npub,
                  pubkey: preview.pubkeyHex,
                  note: preview.note ?? null,
                  already_trusted: preview.alreadyTrusted,
                  path: preview.path,
                  would_change: !preview.alreadyTrusted,
                },
              }),
              renderHelp([
                `Run \`buzz-axi trust pin ${preview.npub} --confirm\` to write the allowlist`,
              ]),
            ]);
          }

          const entry = confirmPin(target, note);
          return renderOutput([
            encodeObject({
              trust_pin: {
                npub: entry.npub,
                note: entry.note ?? null,
                status: "pinned",
              },
            }),
          ]);
        },
      },
      {
        name: "unpin",
        knownFlags: ["--confirm"],
        run: async (rest) => {
          const confirm = takeBoolFlag(rest, "--confirm");
          const target = takePositional(rest);
          if (!target) {
            throw new AxiError(
              "trust unpin requires <npub>",
              "VALIDATION_ERROR",
            );
          }
          if (!confirm) {
            throw new AxiError(
              "trust unpin requires --confirm",
              "VALIDATION_ERROR",
              [`Run \`buzz-axi trust unpin ${target} --confirm\``],
            );
          }
          const result = unpin(target);
          return renderOutput([
            encodeObject({
              trust_unpin: { npub: result.npub, status: "removed" },
            }),
          ]);
        },
      },
    ],
    TRUST_HELP,
  );
}
