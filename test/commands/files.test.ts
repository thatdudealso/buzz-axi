import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzJson: vi.fn(),
  buzzMediaToFile: vi.fn(),
  buzzExec: vi.fn(),
  buzzRaw: vi.fn(),
  buzzExecWithStdin: vi.fn(),
}));

vi.mock("../../src/identity.js", () => ({
  requireAsMatch: vi.fn(async (args: string[]) => {
    const idx = args.indexOf("--as");
    if (idx !== -1) args.splice(idx, 2);
    return {
      as: "npub1",
      identity: { pubkeyHex: "aa".repeat(32), npub: "npub1" },
    };
  }),
  resolveSelf: vi.fn(),
}));

import { buzzMediaToFile } from "../../src/buzz.js";
import { filesCommand } from "../../src/commands/files.js";

describe("filesCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects media without --output", async () => {
    await expect(filesCommand(["media", "abc123"])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(buzzMediaToFile).not.toHaveBeenCalled();
  });

  it("downloads with --output", async () => {
    vi.mocked(buzzMediaToFile).mockResolvedValue({
      stdout: "",
      stderr: "",
      exitCode: 0,
    });
    const out = await filesCommand([
      "media",
      "abc123",
      "--output",
      "/tmp/x.bin",
    ]);
    expect(out).toContain("written");
    expect(buzzMediaToFile).toHaveBeenCalledWith(
      "abc123",
      "/tmp/x.bin",
      undefined,
    );
  });
});
