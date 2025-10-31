import { Analyzer, RepositoryRef, VulnerabilityFinding } from "./index";
import { diffAddedLines, FileHunks } from "@agent/git";

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
  // Run full analysis then filter to changed lines
  const results = await Promise.all(
    analyzers.map((a) => a.analyze(repo, { description: "", securityObjectives: [], attackSurfaces: [], technologies: [] })),
  );
  const all = results.flat();
  return all.filter((f) => isInChangedHunks(f.file, f.lineStart, map));
}