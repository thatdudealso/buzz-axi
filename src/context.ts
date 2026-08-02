import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { AxiError } from "./errors.js";

export interface BuzzContext {
  /** Single relay URL for this invocation (never a list). */
  relay?: string;
  profile?: string;
  source?: "flag" | "env" | "profile" | "default";
}

export function configDir(home = homedir()): string {
  return join(home, ".config", "buzz-axi");
}

export function profilesPath(home = homedir()): string {
  return join(configDir(home), "profiles.toml");
}

export function trustedPath(home = homedir()): string {
  return join(configDir(home), "trusted.toml");
}

interface ProfilesFile {
  profiles?: Record<string, { relay?: string }>;
}

export function loadProfileRelay(name: string, home = homedir()): string {
  const path = profilesPath(home);
  if (!existsSync(path)) {
    throw new AxiError(
      `Profile "${name}" not found — no profiles.toml at ${collapseHome(path)}`,
      "NOT_FOUND",
      [
        `Create ${collapseHome(path)} with [profiles.${name}] relay = "https://..."`,
      ],
    );
  }
  const parsed = parseToml(readFileSync(path, "utf8")) as ProfilesFile;
  const entry = parsed.profiles?.[name];
  if (!entry?.relay) {
    throw new AxiError(`Profile "${name}" missing relay`, "VALIDATION_ERROR", [
      `Add relay under [profiles.${name}] in ${collapseHome(path)}`,
    ]);
  }
  return entry.relay;
}

/**
 * Resolve a single relay for this invocation.
 * Priority: explicit --relay > --profile/BUZZ_AXI_PROFILE > BUZZ_RELAY_URL > default.
 * Profiles never fan out — one name maps to one relay.
 */
export function resolveContext(opts: {
  relayFlag?: string;
  profileFlag?: string;
  home?: string;
}): BuzzContext {
  const home = opts.home ?? homedir();
  if (opts.relayFlag) {
    return { relay: opts.relayFlag, source: "flag" };
  }
  const profile =
    opts.profileFlag || process.env["BUZZ_AXI_PROFILE"] || undefined;
  if (profile) {
    return {
      relay: loadProfileRelay(profile, home),
      profile,
      source: "profile",
    };
  }
  if (process.env["BUZZ_RELAY_URL"]) {
    return { relay: process.env["BUZZ_RELAY_URL"], source: "env" };
  }
  return { source: "default" };
}

export function collapseHome(path: string, home = homedir()): string {
  if (path.startsWith(home)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
}
