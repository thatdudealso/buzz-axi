import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { buzzRaw } from "../buzz.js";
import {
  collapseHome,
  profilesPath,
  trustedPath,
  type BuzzContext,
} from "../context.js";
import { encodeObject, renderHelp, renderOutput } from "../toon.js";
import { loadTrusted } from "../trust.js";

export const DOCTOR_HELP = `usage: buzz-axi doctor
Check local buzz-axi / buzz-cli readiness (never prints secrets).

examples:
  buzz-axi doctor
`;

export async function doctorCommand(
  _args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  const home = homedir();
  const checks: Array<Record<string, unknown>> = [];

  // buzz on PATH
  let buzzInstalled = false;
  try {
    const result = await buzzRaw(["--help"], ctx);
    if (result.exitCode === 0 || result.stdout.includes("Buzz CLI")) {
      buzzInstalled = true;
    }
  } catch {
    // leave buzzInstalled false
  }
  checks.push({
    name: "buzz_cli",
    status: buzzInstalled ? "ok" : "missing",
    detail: buzzInstalled
      ? "buzz is on PATH"
      : "install buzz-cli and ensure `buzz` is on PATH",
  });

  const keySet = Boolean(process.env["BUZZ_PRIVATE_KEY"]);
  checks.push({
    name: "BUZZ_PRIVATE_KEY",
    status: keySet ? "set" : "missing",
    detail: keySet
      ? "present in environment (value not shown)"
      : "set BUZZ_PRIVATE_KEY (hex or nsec) in the environment",
  });

  const relay =
    ctx?.relay || process.env["BUZZ_RELAY_URL"] || "http://localhost:3000";
  checks.push({
    name: "BUZZ_RELAY_URL",
    status: "ok",
    detail: relay,
    source: ctx?.source ?? (process.env["BUZZ_RELAY_URL"] ? "env" : "default"),
  });

  const trustFile = trustedPath(home);
  const trustExists = existsSync(trustFile);
  const trusted = trustExists ? loadTrusted(home) : { entries: [] };
  checks.push({
    name: "trusted_toml",
    status: trustExists ? "ok" : "absent",
    detail: `${collapseHome(trustFile)} (${trusted.entries.length} pinned)`,
  });

  const profiles = profilesPath(home);
  checks.push({
    name: "profiles_toml",
    status: existsSync(profiles) ? "ok" : "absent",
    detail: collapseHome(profiles),
  });

  // Optional relay probe — only when key is set
  if (buzzInstalled && keySet) {
    try {
      const probe = await buzzRaw(["users", "get"], ctx);
      checks.push({
        name: "relay_probe",
        status: probe.exitCode === 0 ? "ok" : "error",
        detail:
          probe.exitCode === 0
            ? "users get succeeded"
            : "users get failed (see buzz-axi whoami)",
      });
    } catch (e) {
      checks.push({
        name: "relay_probe",
        status: "error",
        detail: e instanceof Error ? e.message : "probe failed",
      });
    }
  } else {
    checks.push({
      name: "relay_probe",
      status: "skipped",
      detail: "requires buzz_cli + BUZZ_PRIVATE_KEY",
    });
  }

  const ok = checks.every(
    (c) => c.status === "ok" || c.status === "absent" || c.status === "skipped",
  );

  return renderOutput([
    encodeObject({ doctor: { ready: ok, checks } }),
    renderHelp([
      "Run `buzz-axi whoami` once credentials are set",
      "Run `buzz-axi trust list` to inspect the allowlist",
      "Pin authors with `buzz-axi trust pin <npub> --confirm`",
    ]),
  ]);
}
