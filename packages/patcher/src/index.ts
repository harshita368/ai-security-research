import { readFileSync } from "node:fs";
import { PatchProposal, VulnerabilityFinding } from "@agent/core";

export interface LLMClient {
  generate(input: string): Promise<string>;
}

export class HttpLLM implements LLMClient {
  constructor(private endpoint: string, private apiKey?: string) {}
  async generate(input: string): Promise<string> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ prompt: input }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data: any = await res.json();
    const text = typeof data === "string" ? data : data?.text ?? data?.output ?? "";
    return String(text);
  }
}

export function proposeRedactionPatch(repoRoot: string, finding: VulnerabilityFinding): PatchProposal {
  const filePath = `${repoRoot}/${finding.file}`;
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const startIdx = Math.max(0, finding.lineStart - 1);
  const endIdx = Math.max(startIdx, finding.lineEnd - 1);
  const original = lines.slice(startIdx, endIdx + 1).join("\n");
  const redacted = original.replace(/([A-Za-z0-9_\-]{8,})/g, "<redacted>");
  const patch = [
    `--- a/${finding.file}`,
    `+++ b/${finding.file}`,
    `@@ -${finding.lineStart},${finding.lineEnd - finding.lineStart + 1} +${finding.lineStart},${finding.lineEnd - finding.lineStart + 1} @@`,
    `-${original}`,
    `+${redacted}`,
  ].join("\n");
  return {
    findingId: finding.id,
    diffPatch: patch,
    rationale: "Redact potential secret value with placeholder.",
  };
}