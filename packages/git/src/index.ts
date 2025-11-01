import { spawnSync } from "node:child_process";

export function git(repoPath: string, args: string[]) {
  const res = spawnSync("git", args, { cwd: repoPath, encoding: "utf8" });
  return { code: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

export interface Hunk { start: number; count: number }
export type FileHunks = Map<string, Hunk[]>;

export function parseUnifiedDiffForAddedLines(diff: string): FileHunks {
  const files = new Map<string, Hunk[]>();
  let current: string | null = null;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      current = line.slice("+++ b/".length);
      if (!files.has(current)) files.set(current, []);
      continue;
    }
    const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (m && current) {
      const start = parseInt(m[1], 10);
      const count = m[2] ? parseInt(m[2], 10) : 1;
      files.get(current)!.push({ start, count });
    }
  }
  return files;
}

export function diffAddedLines(repoPath: string, base: string, head: string): FileHunks {
  const { stdout, code, stderr } = git(repoPath, ["diff", "--unified=0", `${base}..${head}`]);
  if (code !== 0) throw new Error(`git diff failed: ${stderr}`);
  return parseUnifiedDiffForAddedLines(stdout);
}