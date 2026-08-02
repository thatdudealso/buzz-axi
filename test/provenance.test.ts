import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hexToNpub } from "../src/npub.js";
import { withProvenance, withProvenanceList } from "../src/provenance.js";
import { confirmPin } from "../src/trust.js";
import { TEST_PUBKEY_HEX } from "./helpers.js";

describe("provenance", () => {
  let home: string;
  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
  });

  it("marks trusted and untrusted authors", () => {
    home = mkdtempSync(join(tmpdir(), "buzz-axi-prov-"));
    confirmPin(hexToNpub(TEST_PUBKEY_HEX), undefined, home);
    const other =
      "0000000000000000000000000000000000000000000000000000000000000001";
    const items = withProvenanceList(
      [
        { id: "1", pubkey: TEST_PUBKEY_HEX, content: "hi" },
        { id: "2", pubkey: other, content: "yo" },
      ],
      { home },
    );
    expect(items[0].trust).toBe("trusted");
    expect(items[1].trust).toBe("untrusted");
    expect(withProvenance({ id: "3" }, { home }).trust).toBe("unknown");
  });
});
