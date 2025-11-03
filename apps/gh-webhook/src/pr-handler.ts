import SecretAnalyzer from "@agent/analyzers-secret";
import { scanCommitDiff, VulnerabilityFinding } from "@agent/core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
  };
  repository: { full_name: string };
}

export function formatFindings(findings: VulnerabilityFinding[]): string {
  if (!findings.length) return "✅ No issues detected in changed lines.";
  const lines = findings.map((f) => {
    const sev = (f.severity ?? "info").toUpperCase();
    return `- ${sev}: ${f.title} at ${f.file}:${f.lineStart}${f.evidence ? ` — ${f.evidence}` : ""}`;
  });
  return [
    `🔎 Agentic scan results (${findings.length} finding${findings.length === 1 ? "" : "s"}):`,
    "",
    ...lines,
  ].join("\n");
}

export async function handlePullRequest(
  payload: PullRequestPayload,
  log: (s: string) => void = () => {},
): Promise<{ commentBody: string }> {
  const action = payload.action;
  if (!["opened", "reopened", "synchronize", "ready_for_review"].includes(action)) {
    return { commentBody: "Ignoring PR action." };
  }
  const { number } = payload;
  const { head, base } = payload.pull_request;
  const fullName = payload.repository.full_name;
  const tmpRoot = mkdtempSync(join(tmpdir(), "agent-gh-"));
  try {
    runGh(tmpRoot, ["repo", "clone", fullName, ".", "--", "--depth", "1", "--no-tags"]);
    runGit(tmpRoot, ["fetch", "origin", head.sha, base.sha, "--depth", "1"]);
    runGit(tmpRoot, ["checkout", head.sha]);

    const findings = await scanCommitDiff({ localPath: tmpRoot }, base.sha, head.sha, [SecretAnalyzer]);
    const body = formatFindings(findings);
    await postIssueComment(fullName, number, body);
    return { commentBody: body };
  } finally {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function postIssueComment(fullName: string, number: number, body: string) {
  execFileSync(
    "gh",
    [
      "api",
      "-X",
      "POST",
      "-H",
      "Accept: application/vnd.github+json",
      `repos/${fullName}/issues/${number}/comments`,
      "-f",
      `body=${body}`,
    ],
    { stdio: "ignore" },
  );
}

function runGit(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function runGh(cwd: string, args: string[]) {
  execFileSync("gh", args, { cwd, stdio: "ignore" });
}