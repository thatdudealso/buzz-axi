import { describe, expect, it } from "vitest";
import { createSkillMarkdown, extractCommandsBlock } from "../src/skill.js";
import { TOP_HELP } from "../src/cli-meta.js";

describe("skill", () => {
  it("embeds commands from TOP_HELP", () => {
    const block = extractCommandsBlock();
    expect(block).toContain("commands[");
    expect(TOP_HELP).toContain(block.split("\n")[0]);
  });

  it("uses npx invocations and omits live state", () => {
    const md = createSkillMarkdown();
    expect(md).toContain("npx -y buzz-axi");
    expect(md).toContain("name: buzz-axi");
    expect(md).not.toContain("open mentions right now");
  });
});
