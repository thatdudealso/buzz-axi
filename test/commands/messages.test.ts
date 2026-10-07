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
    if (idx === -1) {
      const { AxiError } = await import("../../src/errors.js");
      throw new AxiError("need --as", "AS_REQUIRED");
    }
    args.splice(idx, 2);
    return {
      as: "npub1test",
      identity: {
        pubkeyHex: "aa".repeat(32),
        npub: "npub1test",
      },
    };
  }),
  resolveSelf: vi.fn(),
}));

import { buzzJson } from "../../src/buzz.js";
import { messagesCommand } from "../../src/commands/messages.js";

const mockedBuzzJson = vi.mocked(buzzJson);

describe("messagesCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists messages with trust envelope", async () => {
    mockedBuzzJson.mockResolvedValue([
      {
        id: "e1",
        pubkey: "bb".repeat(32),
        content: "hello",
        created_at: 1_700_000_000,
      },
    ]);
    const out = await messagesCommand(["get", "--channel", "c1"]);
    expect(out).toContain("messages");
    expect(out).toContain("trust");
    expect(out).toContain("untrusted");
    expect(mockedBuzzJson).toHaveBeenCalledWith(
      expect.arrayContaining(["messages", "get", "--channel", "c1"]),
      undefined,
    );
  });

  it("does not pass kinds unless requested", async () => {
    mockedBuzzJson.mockResolvedValue([]);
    await messagesCommand(["get", "--channel", "c1"]);
    const args = mockedBuzzJson.mock.calls[0][0];
    expect(args).not.toContain("--kinds");
    expect(args).not.toContain("--kind");
  });

  it("requires --as on send", async () => {
    await expect(
      messagesCommand(["send", "--channel", "c1", "--content", "hi"]),
    ).rejects.toMatchObject({ code: "AS_REQUIRED" });
  });

  it("send with --as forwards to buzz", async () => {
    mockedBuzzJson.mockResolvedValue({ event_id: "e1", accepted: true });
    const out = await messagesCommand([
      "send",
      "--channel",
      "c1",
      "--content",
      "hi",
      "--as",
      "npub1test",
    ]);
    expect(out).toContain("message_send");
    expect(mockedBuzzJson).toHaveBeenCalled();
  });

  it("honors --full on thread", async () => {
    const long = "z".repeat(400);
    mockedBuzzJson.mockResolvedValue([
      {
        id: "e1",
        pubkey: "bb".repeat(32),
        content: long,
        created_at: 1_700_000_000,
      },
    ]);
    const truncated = await messagesCommand(["thread", "--id", "e1"]);
    expect(truncated).toContain("truncated");
    const full = await messagesCommand(["thread", "--id", "e1", "--full"]);
    expect(full).not.toContain("truncated");
    expect(full).toContain(long);
  });
});
