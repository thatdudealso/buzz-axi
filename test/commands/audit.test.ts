import { describe, expect, it } from "vitest";
import {
  AUDIT_HELP,
  auditCommand,
  rejectExcludedModeration,
} from "../../src/commands/audit.js";

describe("auditCommand exclusions", () => {
  it("rejects resolve and other destructive moderation entry points", async () => {
    for (const sub of [
      "resolve",
      "ban",
      "timeout",
      "unban",
      "untimeout",
    ] as const) {
      expect(() => rejectExcludedModeration([sub])).toThrow(/excluded/);
      await expect(
        Promise.resolve().then(() => auditCommand([sub])),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });

  it("documents resolve exclusion in help", () => {
    expect(AUDIT_HELP).toContain("resolve");
    expect(AUDIT_HELP).toMatch(/ban|timeout|kick|delete/);
  });
});
