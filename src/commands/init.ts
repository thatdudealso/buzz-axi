import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { takeFlag } from "../args.js";
import { buzzExec } from "../buzz.js";
import { configDir, type BuzzContext } from "../context.js";
import { dispatchSubcommands } from "../dispatch.js";
import { AxiError } from "../errors.js";
import { encodeObject, renderHelp, renderOutput } from "../toon.js";

export const INIT_HELP = `usage: buzz-axi init <subcommand>
Batteries-included local presets (no relay writes).

subcommands:
  config                         Create ~/.config/buzz-axi/{trusted,profiles}.toml stubs
  workflow --template <name> [--out <path>]
  pack --template <name> [--out <dir>]
  presets                        List available templates

examples:
  buzz-axi init config
  buzz-axi init workflow --template notify --out ./workflow.yaml
  buzz-axi init pack --template researcher --out ./packs/researcher
`;

function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "..", ".."), join(here, "..", "..", "..")];
  for (const c of candidates) {
    if (existsSync(join(c, "package.json"))) return c;
  }
  return join(here, "..", "..");
}

function templatesDir(): string {
  return join(packageRoot(), "templates");
}

function packsRoot(): string {
  return join(packageRoot(), "packs");
}

export function initCommand(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  void ctx;
  return dispatchSubcommands(
    args,
    "init",
    [
      {
        name: "config",
        knownFlags: [],
        run: async () => {
          const dir = configDir();
          mkdirSync(dir, { recursive: true });
          const trusted = join(dir, "trusted.toml");
          const profiles = join(dir, "profiles.toml");
          const created: string[] = [];
          if (!existsSync(trusted)) {
            writeFileSync(
              trusted,
              `# Trusted npub allowlist for buzz-axi content reads\nnpubs = []\n`,
              "utf8",
            );
            created.push("trusted.toml");
          }
          if (!existsSync(profiles)) {
            writeFileSync(
              profiles,
              `# Named profiles select ONE relay (never fan-out)\n# [profiles.dev]\n# relay = "http://localhost:3000"\n`,
              "utf8",
            );
            created.push("profiles.toml");
          }
          return renderOutput([
            encodeObject({
              init_config: {
                dir: "~/.config/buzz-axi",
                created,
                status: created.length ? "created" : "already_exists",
              },
            }),
            renderHelp([
              "Run `buzz-axi trust pin <npub> --confirm` to add authors",
              "Set BUZZ_AXI_PROFILE or pass --profile to select a relay",
            ]),
          ]);
        },
      },
      {
        name: "presets",
        knownFlags: [],
        run: async () => {
          return encodeObject({
            presets: {
              workflows: listNames(join(templatesDir(), "workflows")),
              packs: listNames(packsRoot()),
            },
          });
        },
      },
      {
        name: "workflow",
        knownFlags: ["--template", "--out"],
        run: async (rest) => {
          const template = takeFlag(rest, "--template");
          const out =
            takeFlag(rest, "--out") ?? `./${template ?? "workflow"}.yaml`;
          if (!template) {
            throw new AxiError("--template is required", "VALIDATION_ERROR", [
              "Run `buzz-axi init presets`",
            ]);
          }
          const src = join(templatesDir(), "workflows", `${template}.yaml`);
          if (!existsSync(src)) {
            throw new AxiError(
              `Unknown workflow template: ${template}`,
              "NOT_FOUND",
              ["Run `buzz-axi init presets`"],
            );
          }
          mkdirSync(dirname(out), { recursive: true });
          copyFileSync(src, out);
          return renderOutput([
            encodeObject({
              init_workflow: { template, out, status: "written" },
            }),
            renderHelp([
              `Run \`buzz-axi workflows create --channel <uuid> --file ${out} --as <npub>\``,
            ]),
          ]);
        },
      },
      {
        name: "pack",
        knownFlags: ["--template", "--out"],
        run: async (rest) => {
          const template = takeFlag(rest, "--template");
          const out =
            takeFlag(rest, "--out") ?? `./packs/${template ?? "persona"}`;
          if (!template) {
            throw new AxiError("--template is required", "VALIDATION_ERROR", [
              "Run `buzz-axi init presets`",
            ]);
          }
          const src = join(packsRoot(), template);
          if (!existsSync(src)) {
            throw new AxiError(
              `Unknown pack template: ${template}`,
              "NOT_FOUND",
              ["Run `buzz-axi init presets`"],
            );
          }
          mkdirSync(out, { recursive: true });
          copyTree(src, out);
          let validation: string;
          try {
            await buzzExec(["pack", "validate", out]);
            validation = "ok";
          } catch {
            validation = "buzz_pack_unavailable_or_failed";
          }
          return renderOutput([
            encodeObject({
              init_pack: { template, out, status: "written", validation },
            }),
            renderHelp([
              `Run \`buzz-axi pack inspect ${out}\` for metadata`,
              `Run \`buzz-axi pack validate ${out}\` to re-check`,
            ]),
          ]);
        },
      },
    ],
    INIT_HELP,
  );
}

function listNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name;
      return name.replace(/\.yaml$/, "");
    });
}

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) copyTree(from, to);
    else copyFileSync(from, to);
  }
}
