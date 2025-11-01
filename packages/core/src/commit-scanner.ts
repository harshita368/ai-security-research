import type { Analyzer, RepositoryRef, VulnerabilityFinding } from "./index";
import { execFileSync } from "node:child_process";

export type Hunk = { start: number; count: number };
export type FileHunks = Map<string, Hunk[]>;

function parseAddedHunks(diffText: string): FileHunks {
  const map: FileHunks = new Map();
  let currentFile: string | null = null;
  const lines = diffText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      if (!map.has(currentFile)) map.set(currentFile, []);
      continue;
    }
    if (line.startsWith("@@ ")) {
      // Example: @@ -12,0 +13,5 @@
      const m = /@@ [^+]*\+(\d+)(?:,(\d+))? /.exec(line);
      if (m && currentFile) {
        const start = parseInt(m[1], 10);
        const count = parseInt(m[2] ?? "1", 10);
        const arr = map.get(currentFile)!;
        arr.push({ start, count });
      }
    }
  }
  return map;
}

function diffAddedLines(repoPath: string, base: string, head: string): FileHunks {
  const out = execFileSync("git", ["diff", `${base}..${head}`, "-U0", "--no-color"], {
    cwd: repoPath,
    encoding: "utf8",
  });
  return parseAddedHunks(out);
}

function isInChangedHunks(file: string, line: number, map: FileHunks) {
  const hunks = map.get(file);
  if (!hunks) return false;
  for (const h of hunks) {
    if (line >= h.start && line < h.start + h.count) return true;
  }
  return false;
}

export async function scanCommitDiff(
  repo: RepositoryRef,
  base: string,
  head: string,
  analyzers: Analyzer[],
): Promise<VulnerabilityFinding[]> {
  const map = diffAddedLines(repo.localPath, base, head);
  const results = await Promise.all(
    analyzers.map((a) => a.analyze(repo, { description: "", securityObjectives: [], attackSurfaces: [], technologies: [] })),
  );
  const all = results.flat();
  return all.filter((f) => isInChangedHunks(f.file, f.lineStart, map));
}

export default scanCommitDiff;