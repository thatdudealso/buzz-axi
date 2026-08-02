import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzJson: vi.fn(),
  buzzExec: vi.fn(),
  buzzRaw: vi.fn(),
  buzzExecWithStdin: vi.fn(),
  buzzMediaToFile: vi.fn(),
}));

import { buzzJson } from "../../src/buzz.js";
import { channelsCommand } from "../../src/commands/channels.js";

describe("channelsCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state", async () => {
    vi.mocked(buzzJson).mockResolvedValue([]);
    const out = await channelsCommand(["list"]);
    expect(out).toContain("0 channels");
  });

  it("lists channels with trust summary", async () => {
    vi.mocked(buzzJson).mockResolvedValue([
      {
        channel_id: "c1",
        name: "general",
        visibility: "open",
        created_at: 1_700_000_000,
        pubkey: "cc".repeat(32),
      },
    ]);
    const out = await channelsCommand(["list", "--member"]);
    expect(out).toContain("general");
    expect(out).toContain("trust");
    expect(vi.mocked(buzzJson).mock.calls[0][0]).toContain("--member");
  });

  it("rejects unknown flags", async () => {
    await expect(channelsCommand(["list", "--nope"])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
