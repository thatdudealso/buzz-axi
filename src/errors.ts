import { AxiError, exitCodeForError } from "axi-sdk-js";

export type ErrorCode =
  | "NOT_FOUND"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "RELAY_ERROR"
  | "NETWORK_ERROR"
  | "DELIVERY_UNKNOWN"
  | "KEY_ERROR"
  | "CONFLICT"
  | "BUZZ_NOT_INSTALLED"
  | "AS_REQUIRED"
  | "AS_MISMATCH"
  | "UNKNOWN";

/** Nine upstream buzz-cli stderr categories from error.rs::print_error. */
export type BuzzCategory =
  | "user_error"
  | "not_found"
  | "network_error"
  | "relay_error"
  | "delivery_unknown"
  | "auth_error"
  | "key_error"
  | "conflict"
  | "error";

export { AxiError, exitCodeForError };

export class BuzzAxiError extends AxiError {
  readonly retryable: boolean;
  readonly buzzCategory: BuzzCategory | "unknown";

  constructor(
    message: string,
    code: string,
    opts?: {
      suggestions?: string[];
      retryable?: boolean;
      buzzCategory?: BuzzCategory | "unknown";
    },
  ) {
    super(message, code, opts?.suggestions ?? []);
    this.name = "BuzzAxiError";
    this.retryable = opts?.retryable ?? false;
    this.buzzCategory = opts?.buzzCategory ?? "unknown";
  }
}

interface BuzzStderrJson {
  error?: string;
  message?: string;
  retryable?: boolean;
}

/**
 * Mutations must never be blindly retried from exit code alone.
 * Even when retryable:true, reactions add is non-idempotent (duplicate kind:7).
 */
export function shouldAutoRetryMutation(
  error: unknown,
  commandPath: string[] = [],
): boolean {
  void error;
  void commandPath;
  // Policy: never auto-retry mutating buzz-cli commands.
  // reactions add is explicitly non-idempotent even when retryable:true.
  return false;
}

export function isReactionsAddPath(commandPath: string[]): boolean {
  return (
    commandPath[0] === "reactions" &&
    (commandPath[1] === "add" || commandPath.includes("add"))
  );
}

export function mapBuzzError(stderr: string, exitCode: number): BuzzAxiError {
  const parsed = tryParseStderr(stderr);
  const category = (parsed?.error ?? "") as BuzzCategory | "";
  const detail = redactSecrets(parsed?.message ?? firstErrorLine(stderr));
  // Only the JSON boolean is authoritative — never invent retryability from exit code.
  const retryable = parsed?.retryable === true;

  switch (category) {
    case "auth_error":
      return new BuzzAxiError(
        detail || "Buzz auth required — set BUZZ_PRIVATE_KEY",
        "AUTH_REQUIRED",
        {
          retryable,
          buzzCategory: category,
          suggestions: [
            "Set BUZZ_PRIVATE_KEY in the environment (hex or nsec)",
            "Optionally set BUZZ_RELAY_URL for a non-default relay",
            "Run `buzz-axi doctor` to check the local setup",
          ],
        },
      );
    case "key_error":
      return new BuzzAxiError(
        detail || "Invalid BUZZ_PRIVATE_KEY",
        "KEY_ERROR",
        {
          retryable,
          buzzCategory: category,
          suggestions: [
            "Set a valid hex or nsec BUZZ_PRIVATE_KEY in the environment",
            "Never pass private keys as flags",
          ],
        },
      );
    case "network_error":
      return new BuzzAxiError(detail || "Network error", "NETWORK_ERROR", {
        retryable,
        buzzCategory: category,
        suggestions: [
          "Check connectivity and BUZZ_RELAY_URL",
          "Do not blind-retry mutations; check retryable on the error object",
        ],
      });
    case "relay_error":
      return new BuzzAxiError(detail || "Relay error", "RELAY_ERROR", {
        retryable,
        buzzCategory: category,
        suggestions: [
          "Check BUZZ_RELAY_URL and relay availability",
          "Run `buzz-axi doctor`",
        ],
      });
    case "delivery_unknown":
      return new BuzzAxiError(
        detail || "Delivery unknown — request may have landed",
        "DELIVERY_UNKNOWN",
        {
          retryable: false, // upstream hard-codes false; never blind-retry
          buzzCategory: category,
          suggestions: [
            "Re-read state before retrying — blind re-run can duplicate mutations",
          ],
        },
      );
    case "conflict":
      return new BuzzAxiError(
        detail || "Write conflict — value was superseded",
        "CONFLICT",
        {
          retryable,
          buzzCategory: category,
          suggestions: ["Re-read the current state, then retry the mutation"],
        },
      );
    case "not_found":
      return new BuzzAxiError(detail || "Not found", "NOT_FOUND", {
        retryable,
        buzzCategory: category,
      });
    case "user_error":
      return new BuzzAxiError(detail || "Invalid input", "VALIDATION_ERROR", {
        retryable,
        buzzCategory: category,
      });
    case "error":
      return new BuzzAxiError(
        detail || `buzz exited with code ${exitCode}`,
        "UNKNOWN",
        {
          retryable,
          buzzCategory: category,
        },
      );
    default:
      break;
  }

  // Fallbacks when JSON category is missing (still prefer parsed.retryable).
  if (exitCode === 3) {
    return new BuzzAxiError(
      detail || "Buzz auth required — set BUZZ_PRIVATE_KEY",
      "AUTH_REQUIRED",
      { retryable, buzzCategory: "unknown" },
    );
  }
  if (exitCode === 5 || /write conflict/i.test(detail)) {
    return new BuzzAxiError(
      detail || "Write conflict — value was superseded",
      "CONFLICT",
      { retryable, buzzCategory: "unknown" },
    );
  }
  if (exitCode === 2) {
    return new BuzzAxiError(detail || "Relay/network error", "RELAY_ERROR", {
      retryable,
      buzzCategory: "unknown",
      suggestions: [
        "Check BUZZ_RELAY_URL",
        "Retry only when error.retryable is true, and never for reactions add",
      ],
    });
  }
  if (exitCode === 1 || /not found/i.test(detail)) {
    const code = /not found/i.test(detail) ? "NOT_FOUND" : "VALIDATION_ERROR";
    return new BuzzAxiError(
      detail || `buzz exited with code ${exitCode}`,
      code,
      { retryable, buzzCategory: "unknown" },
    );
  }

  return new BuzzAxiError(
    detail || `buzz exited with code ${exitCode}`,
    "UNKNOWN",
    { retryable, buzzCategory: "unknown" },
  );
}

export function buzzNotInstalledError(): BuzzAxiError {
  return new BuzzAxiError(
    "buzz CLI is not installed — see https://github.com/block/buzz",
    "BUZZ_NOT_INSTALLED",
    {
      retryable: false,
      suggestions: [
        "Install buzz-cli and ensure `buzz` is on PATH",
        "Run `buzz-axi doctor`",
      ],
    },
  );
}

/** Never echo private keys or nsec values in errors. */
export function redactSecrets(text: string): string {
  return text
    .replace(/nsec1[a-z0-9]+/gi, "nsec1[REDACTED]")
    .replace(/BUZZ_PRIVATE_KEY[=:\s]+\S+/gi, "BUZZ_PRIVATE_KEY=[REDACTED]")
    .replace(/--private-key(=|\s+)\S+/gi, "--private-key=[REDACTED]");
}

export function tryParseStderr(stderr: string): BuzzStderrJson | null {
  const trimmed = stderr.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed) as BuzzStderrJson;
  } catch {
    return null;
  }
}

function firstErrorLine(stderr: string): string {
  return stderr.trim().split("\n")[0] ?? "";
}

/** True when buzz rejected an unsupported --def flag (safe to try --file once). */
export function isUnsupportedDefError(error: unknown): boolean {
  if (!(error instanceof AxiError)) return false;
  if (error.code !== "VALIDATION_ERROR") return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("--def") ||
    msg.includes("unexpected argument") ||
    msg.includes("unrecognized")
  );
}
