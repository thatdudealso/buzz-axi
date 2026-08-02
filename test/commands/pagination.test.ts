import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/buzz.js", () => ({
  buzzJson: vi.fn(),
}));

import { buzzJson } from "../../src/buzz.js";
import { issuesCommand } from "../../src/commands/issues.js";
import { patchesCommand } from "../../src/commands/patches.js";
import { prCommand } from "../../src/commands/pr.js";

describe("repository list pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buzzJson).mockResolvedValue([]);
  });

  it.each([
    [
      "issues",
      issuesCommand,
      ["issues", "list", "--repo", "repo", "--limit", "10"],
    ],
    [
      "patches",
      patchesCommand,
      ["patches", "list", "--repo", "repo", "--limit", "10"],
    ],
    ["pr", prCommand, ["pr", "list", "--repo", "repo", "--limit", "10"]],
  ] as const)(
    "forwards --limit for %s",
    async (_name, command, expectedArgs) => {
      await command(["list", "--repo", "repo", "--limit", "10"]);
      expect(vi.mocked(buzzJson)).toHaveBeenCalledWith(expectedArgs, undefined);
    },
  );
});
