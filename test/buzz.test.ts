import { beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { buzzJson, buzzMediaToFile } from "../src/buzz.js";
import { AxiError } from "../src/errors.js";
import {
  mockExecFileEnoent,
  mockExecFileResult,
  mockedExecFile,
} from "./helpers.js";

describe("buzzJson", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("parses JSON and prefixes --format json", async () => {
    mockExecFileResult(null, '[{"channel_id":"c1"}]', "");
    const result = await buzzJson(["channels", "list"]);
    expect(result).toEqual([{ channel_id: "c1" }]);
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args.slice(0, 2)).toEqual(["--format", "json"]);
    expect(args).toContain("channels");
  });

  it("passes --relay before the subcommand", async () => {
    mockExecFileResult(null, "[]", "");
    await buzzJson(["channels", "list"], {
      relay: "http://relay.example",
      source: "flag",
    });
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args.indexOf("--relay")).toBeLessThan(args.indexOf("channels"));
    expect(args).toContain("http://relay.example");
  });

  it("never puts private-key in argv", async () => {
    mockExecFileResult(null, "[]", "");
    process.env["BUZZ_PRIVATE_KEY"] = "nsec1test";
    await buzzJson(["users", "get"]);
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args.join(" ")).not.toMatch(/private-key|nsec1test/);
    delete process.env["BUZZ_PRIVATE_KEY"];
  });

  it("maps auth errors", async () => {
    const error = Object.assign(new Error("exit"), { code: 3 });
    mockExecFileResult(
      error,
      "",
      JSON.stringify({
        error: "auth_error",
        message: "BUZZ_PRIVATE_KEY is required",
      }),
    );
    await expect(buzzJson(["users", "get"])).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
  });

  it("throws when buzz is missing", async () => {
    mockExecFileEnoent();
    await expect(buzzJson(["channels", "list"])).rejects.toMatchObject({
      code: "BUZZ_NOT_INSTALLED",
    });
  });
});

describe("buzzMediaToFile", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("rejects stdout/binary TOON path", async () => {
    await expect(buzzMediaToFile("abc", "-")).rejects.toBeInstanceOf(AxiError);
    await expect(buzzMediaToFile("abc", "")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("writes to --output path via buzz", async () => {
    mockExecFileResult(null, "", "");
    await buzzMediaToFile("deadbeef", "/tmp/out.bin");
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("media");
    expect(args).toContain("--output");
    expect(args).toContain("/tmp/out.bin");
  });
});

void execFile;
