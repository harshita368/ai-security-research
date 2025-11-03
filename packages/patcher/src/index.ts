import { readFileSync, writeFileSync } from "node:fs";
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
  const originalLines = lines.slice(startIdx, endIdx + 1);
  const redactedLines = originalLines.map((ln) => ln.replace(/([A-Za-z0-9_\-]{8,})/g, "<redacted>"));
  const oldCount = originalLines.length;
  const newCount = redactedLines.length;
  const hunk = [`@@ -${finding.lineStart},${oldCount} +${finding.lineStart},${newCount} @@`];
  for (const ln of originalLines) hunk.push(`-${ln}`);
  for (const ln of redactedLines) hunk.push(`+${ln}`);
  const patch = [`--- a/${finding.file}`, `+++ b/${finding.file}`, ...hunk].join("\n");
  return {
    findingId: finding.id,
    diffPatch: patch,
    rationale: "Redact potential secret value with placeholder.",
  };
}

export async function proposePatch(
  repoRoot: string,
  finding: VulnerabilityFinding,
  strategy: "auto" | "redact" | "llm" = "auto",
  llm?: LLMClient,
): Promise<PatchProposal> {
  const strat = strategy === "auto" ? (finding.ruleId.includes("secret") ? "redact" : "llm") : strategy;
  if (strat === "redact") return proposeRedactionPatch(repoRoot, finding);
  if (!llm) throw new Error("LLM client required for llm strategy");
  const instruction = `You are a security patching assistant. Propose a unified diff patch for file ${finding.file} addressing: ${finding.title} at lines ${finding.lineStart}-${finding.lineEnd}. Keep changes minimal and safe.`;
  const diffText = await llm.generate(instruction);
  return { findingId: finding.id, diffPatch: diffText, rationale: "LLM-generated patch" };
}

export function applyUnifiedDiff(repoRoot: string, diffText: string): { files: string[] } {
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  let file: string | null = null;
  let minus: string[] = [];
  let plus: string[] = [];
  const changed: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("--- a/")) {
      // reset state
      file = l.slice(6);
      minus = [];
      plus = [];
      continue;
    }
    if (l.startsWith("+++ b/")) {
      // just a marker; real name already captured
      continue;
    }
    if (l.startsWith("@@ ")) {
      // start of hunk; reset buffers
      minus = [];
      plus = [];
      continue;
    }
    if (l.startsWith("-")) {
      minus.push(l.slice(1));
      continue;
    }
    if (l.startsWith("+")) {
      plus.push(l.slice(1));
      continue;
    }
    // ignore context lines and others
  }
  if (!file) throw new Error("No file target in diff");
  const path = `${repoRoot}/${file}`;
  const content = readFileSync(path, "utf8");
  const fileLines = content.split(/\r?\n/);
  // naive replace: find the first occurrence of minus sequence and replace with plus sequence
  const idx = indexOfSlice(fileLines, minus);
  if (idx < 0) throw new Error("Hunk does not match file contents");
  const newLines = [...fileLines.slice(0, idx), ...plus, ...fileLines.slice(idx + minus.length)];
  writeFileSync(path, newLines.join("\n"));
  changed.push(file);
  return { files: changed };
}

function indexOfSlice(hay: string[], needle: string[]): number {
  if (needle.length === 0) return 0;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}