import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzJson: vi.fn(),
  buzzExec: vi.fn(),
  buzzRaw: vi.fn(),
  buzzExecWithStdin: vi.fn(),
  buzzMediaToFile: vi.fn(),
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

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn(() => "name: test\n"),
  };
});

import { buzzJson } from "../../src/buzz.js";
import { workflowsCommand } from "../../src/commands/workflows.js";
import { AxiError } from "../../src/errors.js";

describe("workflowsCommand create retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to --file only on unsupported --def", async () => {
    vi.mocked(buzzJson)
      .mockRejectedValueOnce(
        new AxiError("unexpected argument '--def' found", "VALIDATION_ERROR"),
      )
      .mockResolvedValueOnce({ workflow_id: "w1", accepted: true });

    const out = await workflowsCommand([
      "create",
      "--channel",
      "c1",
      "--file",
      "./wf.yaml",
      "--as",
      "npub1",
    ]);
    expect(out).toContain("workflow_create");
    expect(vi.mocked(buzzJson)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(buzzJson).mock.calls[1][0]).toContain("--file");
  });

  it("does not fall back on relay/network errors", async () => {
    vi.mocked(buzzJson).mockRejectedValueOnce(
      new AxiError("relay timeout", "RELAY_ERROR"),
    );
    await expect(
      workflowsCommand([
        "create",
        "--channel",
        "c1",
        "--file",
        "./wf.yaml",
        "--as",
        "npub1",
      ]),
    ).rejects.toMatchObject({ code: "RELAY_ERROR" });
    expect(vi.mocked(buzzJson)).toHaveBeenCalledTimes(1);
  });

  it("honors --full on get", async () => {
    const long = "y".repeat(900);
    vi.mocked(buzzJson).mockResolvedValue({
      workflow_id: "w1",
      pubkey: "bb".repeat(32),
      content: long,
      created_at: 1,
    });
    const truncated = await workflowsCommand(["get", "--id", "w1"]);
    expect(truncated).toContain("truncated");
    const full = await workflowsCommand(["get", "--id", "w1", "--full"]);
    expect(full).not.toContain("truncated");
    expect(full).toContain(long);
  });
});
