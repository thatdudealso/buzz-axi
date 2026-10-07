import { AxiError } from "./errors.js";

function flagEqualsPrefix(flag: string): string {
  return `${flag}=`;
}

/** Get a flag's value from --flag value or --flag=value without modifying args. */
export function getFlag(args: string[], name: string): string | undefined {
  const equalsPrefix = flagEqualsPrefix(name);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === name) {
      if (i + 1 >= args.length) return undefined;
      return args[i + 1];
    }
    if (arg.startsWith(equalsPrefix)) {
      return arg.slice(equalsPrefix.length);
    }
  }
  return undefined;
}

/** Get a flag's value and remove it from args. */
export function takeFlag(args: string[], flag: string): string | undefined {
  const equalsPrefix = flagEqualsPrefix(flag);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === flag) {
      const val = args[i + 1];
      args.splice(i, 2);
      return val;
    }
    if (arg.startsWith(equalsPrefix)) {
      const val = arg.slice(equalsPrefix.length);
      args.splice(i, 1);
      return val;
    }
  }
  return undefined;
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function takeBoolFlag(args: string[], flag: string): boolean {
  const idx = args.indexOf(flag);
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

function requireFlagValue(value: string, flag: string): string {
  if (value.trim() === "") {
    throw new AxiError(`${flag} requires a value`, "VALIDATION_ERROR");
  }
  return value;
}

function collectAllFlags(
  args: string[],
  flag: string,
  consume: boolean,
): string[] {
  const result: string[] = [];
  const equalsPrefix = flagEqualsPrefix(flag);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === flag) {
      result.push(requireFlagValue(args[i + 1] ?? "", flag));
      if (consume) args.splice(i, 2);
      else i += 2;
    } else if (arg.startsWith(equalsPrefix)) {
      result.push(requireFlagValue(arg.slice(equalsPrefix.length), flag));
      if (consume) args.splice(i, 1);
      else i++;
    } else {
      i++;
    }
  }
  return result;
}

export function getAllFlags(args: string[], flag: string): string[] {
  return collectAllFlags(args, flag, false);
}

export function takeAllFlags(args: string[], flag: string): string[] {
  return collectAllFlags(args, flag, true);
}

export function pushRepeated(
  out: string[],
  flag: string,
  values: string[],
): void {
  for (const value of values) out.push(flag, value);
}

export function getPositional(
  args: string[],
  startIndex = 0,
): string | undefined {
  for (let i = startIndex; i < args.length; i++) {
    if (!args[i].startsWith("-")) return args[i];
  }
  return undefined;
}

export function takePositional(args: string[]): string | undefined {
  const idx = args.findIndex((a) => !a.startsWith("-"));
  if (idx === -1) return undefined;
  const [value] = args.splice(idx, 1);
  return value;
}

/**
 * Reject unknown flags. Always allows `--help`.
 * `known` is the set of allowed flag names (e.g. `--channel`, `--limit`).
 */
export function rejectUnknownFlags(
  args: string[],
  known: readonly string[],
  commandLabel: string,
): void {
  const knownSet = new Set(known);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") continue;
    if (!arg.startsWith("-")) continue;

    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (name === "--") break;

    if (!knownSet.has(name)) {
      const valid = [...known].join(", ");
      throw new AxiError(
        `unknown flag ${name} for \`${commandLabel}\``,
        "VALIDATION_ERROR",
        [
          `valid flags for \`${commandLabel}\`: ${valid || "(none)"} (--help always allowed)`,
        ],
      );
    }

    // Skip the value token for space-separated forms when the next arg is not a flag.
    if (
      !arg.includes("=") &&
      i + 1 < args.length &&
      !args[i + 1].startsWith("-")
    ) {
      i++;
    }
  }
}

/** Credentials must never appear as CLI flags. */
export function rejectCredentialFlags(args: string[]): void {
  for (const arg of args) {
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (name === "--private-key" || name === "--private_key" || name === "-k") {
      throw new AxiError(
        "Credentials are environment-only — do not pass private keys as flags",
        "VALIDATION_ERROR",
        [
          "Set BUZZ_PRIVATE_KEY in the environment",
          "Run `buzz-axi doctor` to verify setup",
        ],
      );
    }
  }
}
