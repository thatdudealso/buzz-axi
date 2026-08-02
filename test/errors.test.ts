import { describe, expect, it } from "vitest";
import {
  BuzzAxiError,
  isReactionsAddPath,
  isUnsupportedDefError,
  mapBuzzError,
  redactSecrets,
  shouldAutoRetryMutation,
} from "../src/errors.js";
import { AxiError } from "../src/errors.js";

describe("errors", () => {
  it("maps all nine buzz categories with retryable from JSON only", () => {
    const cases: Array<[string, string, boolean, string]> = [
      ["auth_error", "AUTH_REQUIRED", false, "no key"],
      ["key_error", "KEY_ERROR", false, "bad key"],
      ["user_error", "VALIDATION_ERROR", false, "bad arg"],
      ["not_found", "NOT_FOUND", false, "missing"],
      ["network_error", "NETWORK_ERROR", true, "timeout"],
      ["relay_error", "RELAY_ERROR", true, "502"],
      ["delivery_unknown", "DELIVERY_UNKNOWN", false, "maybe landed"],
      ["conflict", "CONFLICT", false, "superseded"],
      ["error", "UNKNOWN", false, "other"],
    ];
    for (const [category, code, retryable, message] of cases) {
      const err = mapBuzzError(
        JSON.stringify({ error: category, message, retryable }),
        1,
      );
      expect(err).toBeInstanceOf(BuzzAxiError);
      expect(err.code).toBe(code);
      expect(err.retryable).toBe(retryable);
      expect(err.buzzCategory).toBe(category);
    }
  });

  it("uses exact audit fixture strings", () => {
    const auth = mapBuzzError(
      JSON.stringify({
        error: "auth_error",
        message:
          "auth error: BUZZ_PRIVATE_KEY is required (use --private-key or set env var)",
        retryable: false,
      }),
      3,
    );
    expect(auth.code).toBe("AUTH_REQUIRED");
    expect(auth.retryable).toBe(false);

    const key = mapBuzzError(
      JSON.stringify({
        error: "key_error",
        message: "key error: invalid BUZZ_PRIVATE_KEY: Invalid secret key",
        retryable: false,
      }),
      3,
    );
    expect(key.code).toBe("KEY_ERROR");

    const user = mapBuzzError(
      JSON.stringify({
        error: "user_error",
        message: "invalid UUID: not-a-uuid",
        retryable: false,
      }),
      1,
    );
    expect(user.code).toBe("VALIDATION_ERROR");
  });

  it("never auto-retries mutations; reactions add is non-idempotent", () => {
    const retryableNet = mapBuzzError(
      JSON.stringify({
        error: "network_error",
        message: "timeout",
        retryable: true,
      }),
      2,
    );
    expect(retryableNet.retryable).toBe(true);
    expect(shouldAutoRetryMutation(retryableNet, ["reactions", "add"])).toBe(
      false,
    );
    expect(shouldAutoRetryMutation(retryableNet, ["messages", "send"])).toBe(
      false,
    );
    expect(isReactionsAddPath(["reactions", "add"])).toBe(true);
  });

  it("delivery_unknown is never retryable even if JSON lies", () => {
    const err = mapBuzzError(
      JSON.stringify({
        error: "delivery_unknown",
        message: "lost",
        retryable: true,
      }),
      2,
    );
    expect(err.retryable).toBe(false);
  });

  it("detects unsupported --def validation errors only", () => {
    expect(
      isUnsupportedDefError(
        new AxiError("unexpected argument '--def' found", "VALIDATION_ERROR"),
      ),
    ).toBe(true);
    expect(
      isUnsupportedDefError(new AxiError("relay down", "RELAY_ERROR")),
    ).toBe(false);
  });

  it("redacts nsec values", () => {
    expect(redactSecrets("got nsec1abcxyzdef")).toContain("[REDACTED]");
    expect(redactSecrets("got nsec1abcxyzdef")).not.toContain("abcxyzdef");
  });
});
