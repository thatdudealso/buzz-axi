import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzJson: vi.fn(),
  buzzExec: vi.fn(),
  buzzRaw: vi.fn(),
  buzzExecWithStdin: vi.fn(),
  buzzMediaToFile: vi.fn(),
}));

import { buzzJson } from "../../src/buzz.js";
import { homeCommand } from "../../src/commands/home.js";

describe("homeCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buzzJson).mockResolvedValue([]);
  });

  it("includes bin, description, and next-step help", async () => {
    const out = await homeCommand([]);
    expect(out).toContain("description:");
    expect(out).toContain("channels");
    expect(out).toContain("mentions");
    expect(out).toContain("help[");
  });

  it("tolerates buzz failures", async () => {
    vi.mocked(buzzJson).mockRejectedValue(new Error("down"));
    const out = await homeCommand([]);
    expect(out).toContain("0 member channels");
  });
});
