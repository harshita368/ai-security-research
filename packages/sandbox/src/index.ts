import type { ValidationResult, VulnerabilityFinding } from "@agent/core";
import { readFileSync } from "node:fs";

export interface Sandbox {
  run(command: string, args?: string[], opts?: { cwd?: string; timeoutMs?: number }): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
}

export class NoopSandbox implements Sandbox {
  async run(command: string, _args: string[] = [], _opts?: { cwd?: string; timeoutMs?: number }) {
    return { exitCode: 0, stdout: `ran:${command}`, stderr: "" };
  }
}

export async function validateFinding(repoRoot: string, finding: VulnerabilityFinding): Promise<ValidationResult> {
  try {
    const filePath = `${repoRoot}/${finding.file}`;
    const text = readFileSync(filePath, "utf8");
    const line = text.split(/\r?\n/)[finding.lineStart - 1] ?? "";
    const matched = Boolean(line && line.includes(finding.evidence ?? ""));
    return { findingId: finding.id, status: matched ? "confirmed" : "invalid" };
  } catch (e) {
    return { findingId: finding.id, status: "inconclusive", details: String(e) };
  }
}