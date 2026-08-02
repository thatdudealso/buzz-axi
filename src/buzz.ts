import { execFile } from "node:child_process";
import type { BuzzContext } from "./context.js";
import { AxiError, buzzNotInstalledError, mapBuzzError } from "./errors.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const BUZZ_BIN = process.env["BUZZ_AXI_BUZZ_BIN"] || "buzz";

function toExecResult(
  resolve: (result: ExecResult) => void,
): (error: Error | null, stdout: string, stderr: string) => void {
  return (error, stdout, stderr) => {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      resolve({ stdout: "", stderr: "ENOENT", exitCode: 127 });
      return;
    }
    const exitCode = error
      ? ((error as Error & { code?: string | number }).code ?? 1)
      : 0;
    resolve({
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: typeof exitCode === "number" ? exitCode : 1,
    });
  };
}

function buildEnv(ctx?: BuzzContext): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // Never put keys into argv. Ensure child sees env-only credentials.
  if (ctx?.relay) {
    env["BUZZ_RELAY_URL"] = ctx.relay;
  }
  // Strip accidental argv-style leakage helpers; never invent a key.
  return env;
}

function buildArgs(args: string[], ctx?: BuzzContext): string[] {
  // Global --format must come before the subcommand for buzz-cli.
  const out = ["--format", "json"];
  if (ctx?.relay) {
    out.push("--relay", ctx.relay);
  }
  out.push(...args);
  return out;
}

function run(args: string[], ctx?: BuzzContext): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      BUZZ_BIN,
      args,
      { maxBuffer: MAX_BUFFER_BYTES, env: buildEnv(ctx) },
      toExecResult(resolve),
    );
  });
}

function runWithStdin(
  args: string[],
  input: string,
  ctx?: BuzzContext,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = execFile(
      BUZZ_BIN,
      args,
      { maxBuffer: MAX_BUFFER_BYTES, env: buildEnv(ctx) },
      toExecResult(resolve),
    );
    child.stdin?.end(input);
  });
}

function assertOk(result: ExecResult): void {
  if (result.stderr === "ENOENT") throw buzzNotInstalledError();
  if (result.exitCode !== 0) throw mapBuzzError(result.stderr, result.exitCode);
}

/** Execute buzz and return parsed JSON. */
export async function buzzJson<T = unknown>(
  args: string[],
  ctx?: BuzzContext,
): Promise<T> {
  const result = await run(buildArgs(args, ctx), ctx);
  assertOk(result);
  const trimmed = result.stdout.trim();
  if (trimmed === "") {
    return null as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new AxiError(
      `Unexpected buzz output: ${trimmed.slice(0, 200)}`,
      "UNKNOWN",
    );
  }
}

/**
 * Execute buzz and return raw stdout (for non-JSON commands like pack).
 * Omits `--format json` so local text-output commands keep their contract.
 */
export async function buzzExec(
  args: string[],
  ctx?: BuzzContext,
): Promise<string> {
  const out: string[] = [];
  if (ctx?.relay) out.push("--relay", ctx.relay);
  out.push(...args);
  const result = await run(out, ctx);
  assertOk(result);
  return result.stdout;
}

/** Execute buzz without throwing on non-zero (used by doctor). */
export async function buzzRaw(
  args: string[],
  ctx?: BuzzContext,
): Promise<ExecResult> {
  const result = await run(buildArgs(args, ctx), ctx);
  if (result.stderr === "ENOENT") throw buzzNotInstalledError();
  return result;
}

/** Execute buzz writing input to stdin. */
export async function buzzExecWithStdin(
  args: string[],
  input: string,
  ctx?: BuzzContext,
): Promise<string> {
  const result = await runWithStdin(buildArgs(args, ctx), input, ctx);
  assertOk(result);
  return result.stdout;
}

/**
 * Binary-safe media download. Never routes stdout through TOON.
 * Requires an explicit filesystem --output path (not '-' / omitted).
 */
export async function buzzMediaToFile(
  input: string,
  outputPath: string,
  ctx?: BuzzContext,
): Promise<ExecResult> {
  if (!outputPath || outputPath === "-") {
    throw new AxiError(
      "media get requires --output <path> — raw binary must not go to TOON stdout",
      "VALIDATION_ERROR",
      ["Run `buzz-axi files media <url-or-hash> --output ./file.bin`"],
    );
  }
  const result = await run(
    buildArgs(["media", "get", input, "--output", outputPath], ctx),
    ctx,
  );
  assertOk(result);
  return result;
}
