import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzRaw: vi.fn(),
  buzzJson: vi.fn(),
  buzzExec: vi.fn(),
  buzzExecWithStdin: vi.fn(),
  buzzMediaToFile: vi.fn(),
}));

import { buzzRaw } from "../../src/buzz.js";
import { doctorCommand } from "../../src/commands/doctor.js";

describe("doctorCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["BUZZ_PRIVATE_KEY"];
  });

  it("never echoes private key material", async () => {
    process.env["BUZZ_PRIVATE_KEY"] = "nsec1supersecretvalue";
    vi.mocked(buzzRaw).mockResolvedValue({
      stdout: "Buzz CLI",
      stderr: "",
      exitCode: 0,
    });
    const out = await doctorCommand([]);
    expect(out).toContain("BUZZ_PRIVATE_KEY");
    expect(out).toContain("present in environment");
    expect(out).not.toContain("nsec1supersecretvalue");
    expect(out).not.toContain("supersecret");
  });
});
