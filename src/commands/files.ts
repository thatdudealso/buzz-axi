import { getFlag, takeFlag, takePositional } from "../args.js";
import { buzzJson, buzzMediaToFile } from "../buzz.js";
import type { BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import { requireAsMatch } from "../identity.js";
import { encodeObject, renderHelp, renderOutput } from "../toon.js";

export const FILES_HELP = `usage: buzz-axi files <subcommand>
Upload metadata and media downloads. Binary media never dumps into TOON stdout.

subcommands:
  upload --file <path> --as <npub>     Upload via buzz upload file; returns descriptor
  media <url-or-hash> --output <path>  Download bytes to a file (required)

examples:
  buzz-axi files upload --file ./shot.png --as <npub>
  buzz-axi files media <sha256> --output ./shot.png
`;

export function filesCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  return dispatchSubcommands(
    args,
    "files",
    [
      {
        name: "upload",
        knownFlags: ["--as", "--file"],
        mutating: true,
        run: async (rest) => {
          await requireAsMatch(rest, ctx);
          const file = takeFlag(rest, "--file");
          if (!file) {
            throw new AxiError("--file is required", "VALIDATION_ERROR");
          }
          const result = await buzzJson<Record<string, unknown>>(
            ["upload", "file", "--file", file],
            ctx,
          );
          return renderOutput([
            encodeObject({
              upload: {
                url: (result as { url?: string }).url ?? null,
                sha256: (result as { sha256?: string }).sha256 ?? null,
                size: (result as { size?: number }).size ?? null,
                type: (result as { type?: string }).type ?? null,
              },
            }),
            renderHelp([
              "Run `buzz-axi files media <sha256> --output <path>` to download",
            ]),
          ]);
        },
      },
      {
        name: "media",
        knownFlags: ["--output", "-o"],
        run: async (rest) => {
          const output =
            takeFlag(rest, "--output") ?? takeFlag(rest, "-o") ?? undefined;
          const input = takePositional(rest);
          if (!input) {
            throw new AxiError(
              "files media requires <url-or-hash>",
              "VALIDATION_ERROR",
            );
          }
          if (!output || output === "-") {
            throw new AxiError(
              "files media requires --output <path> — raw binary must not go to TOON stdout",
              "VALIDATION_ERROR",
              [`buzz-axi files media ${input} --output ./file.bin`],
            );
          }
          await buzzMediaToFile(input, output, ctx);
          return renderOutput([
            encodeObject({
              media: {
                input,
                output,
                status: "written",
              },
            }),
          ]);
        },
      },
      {
        name: "meta",
        knownFlags: ["--url", "--sha256"],
        run: async (rest) => {
          // Metadata-only view: surface descriptor fields without fetching bytes.
          const url = getFlag(rest, "--url");
          const sha = getFlag(rest, "--sha256");
          if (!url && !sha) {
            throw new AxiError(
              "--url or --sha256 is required",
              "VALIDATION_ERROR",
            );
          }
          return encodeObject({
            file_meta: {
              url: url ?? null,
              sha256: sha ?? null,
              note: "Binary content is fetched only via files media --output",
            },
          });
        },
      },
    ],
    FILES_HELP,
  );
}
