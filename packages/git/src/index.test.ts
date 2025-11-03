import { describe, it, expect } from "vitest";
import { parseUnifiedDiffForAddedLines } from "./index";

describe("parseUnifiedDiffForAddedLines", () => {
  it("parses added line hunks", () => {
    const diff = `diff --git a/a.txt b/a.txt\nindex e69de29..4b825dc 100644\n--- a/a.txt\n+++ b/a.txt\n@@ -0,0 +1,3 @@\n+one\n+two\n+three\n`;
    const m = parseUnifiedDiffForAddedLines(diff);
    const hunks = m.get("a.txt")!;
    expect(hunks[0]).toEqual({ start: 1, count: 3 });
  });
});