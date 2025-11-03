import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyUnifiedDiff, proposeRedactionPatch } from "./index";
import type { VulnerabilityFinding } from "@agent/core";

describe("applyUnifiedDiff", () => {
  it("applies a single-hunk replacement", () => {
    const root = mkdtempSync(join(tmpdir(), "patch-"));
    const file = "src/a.txt";
    const full = join(root, file);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(full, ["one", "secretTOKENvalue", "three"].join("\n"));
    const finding: VulnerabilityFinding = {
      id: "f1",
      file,
      lineStart: 2,
      lineEnd: 2,
      ruleId: "secret/regex",
      severity: "HIGH",
      title: "Hardcoded secret",
      description: "",
      evidence: "secretTOKENvalue",
    };
    const proposal = proposeRedactionPatch(root, finding);
    applyUnifiedDiff(root, proposal.diffPatch);
    const text = readFileSync(full, "utf8");
    expect(text).toContain("<redacted>");
    expect(text.split(/\r?\n/)[1]).toBe("<redacted>");
  });
});
