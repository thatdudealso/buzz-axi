import { describe, expect, it } from "vitest";
import {
  field,
  renderEmpty,
  renderError,
  renderHelp,
  renderList,
  truncate,
} from "../src/toon.js";

describe("toon", () => {
  it("renders lists and help", () => {
    const out = renderList(
      "channels",
      [{ channel_id: "c1", name: "general" }],
      [field("channel_id", "id"), field("name")],
    );
    expect(out).toContain("channels");
    expect(out).toContain("general");
    expect(renderHelp(["next"])).toContain("help[1]");
    expect(renderEmpty("channels", "channels found")).toContain("0 channels");
  });

  it("truncates long fields", () => {
    const long = "x".repeat(600);
    const out = renderList(
      "messages",
      [{ content: long }],
      [truncate("content", "content", 50)],
    );
    expect(out).toContain("truncated");
    expect(out).toContain("600");
  });

  it("renders structured errors", () => {
    const out = renderError("boom", "VALIDATION_ERROR", ["fix it"]);
    expect(out).toContain("error:");
    expect(out).toContain("VALIDATION_ERROR");
    expect(out).toContain("fix it");
  });
});
