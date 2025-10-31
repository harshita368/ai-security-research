import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecretAnalyzer } from "./index";

describe("SecretAnalyzer", () => {
  it("finds simple API_KEY assignment", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-sec-"));
    try {
      writeFileSync(join(dir, "config.env"), "API_KEY=abcd1234xyz\n");
      const findings = await SecretAnalyzer.analyze({ localPath: dir }, { description: "", securityObjectives: [], attackSurfaces: [], technologies: [] });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toContain("secret");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});