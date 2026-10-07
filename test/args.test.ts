import { describe, expect, it } from "vitest";
import {
  rejectCredentialFlags,
  rejectUnknownFlags,
  takeFlag,
} from "../src/args.js";
import { AxiError } from "../src/errors.js";

describe("args", () => {
  it("rejects private-key flags", () => {
    expect(() => rejectCredentialFlags(["--private-key", "nsec1x"])).toThrow(
      AxiError,
    );
    expect(() => rejectCredentialFlags(["--private-key=nsec1x"])).toThrow(
      /environment-only/,
    );
  });

  it("rejects unknown flags by name", () => {
    expect(() =>
      rejectUnknownFlags(["--stat", "closed"], ["--state"], "list"),
    ).toThrow(/unknown flag --stat/);
  });

  it("takeFlag supports equals form", () => {
    const args = ["--channel=abc", "--limit", "5"];
    expect(takeFlag(args, "--channel")).toBe("abc");
    expect(takeFlag(args, "--limit")).toBe("5");
    expect(args).toEqual([]);
  });
});
