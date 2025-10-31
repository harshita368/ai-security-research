import { Analyzer, RepositoryRef, ThreatModel, VulnerabilityFinding, newId } from "@agent/core";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, acc: string[] = [], ignore: Set<string> = new Set(["node_modules", ".git", "dist"])): string[] {
  for (const e of readdirSync(dir)) {
    if (ignore.has(e)) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc, ignore);
    else acc.push(p);
  }
  return acc;
}

const patterns: { id: string; re: RegExp; title: string }[] = [
  { id: "secret.envvar", re: /(API_KEY|SECRET|TOKEN|PASSWORD)\s*[:=]\s*[^\s'"\n]+/i, title: "Potential secret in env-style assignment" },
  { id: "pem.private", re: /-----BEGIN (RSA|EC|DSA)? ?PRIVATE KEY-----/, title: "Private key material" },
  { id: "aws.key", re: /AKIA[0-9A-Z]{16}/, title: "AWS Access Key ID format" },
];

export const SecretAnalyzer: Analyzer = {
  name: "secret-analyzer",
  async analyze(repo: RepositoryRef, _tm: ThreatModel): Promise<VulnerabilityFinding[]> {
    const files = walk(repo.localPath);
    const findings: VulnerabilityFinding[] = [];
    for (const abs of files) {
      const rel = abs.replace(repo.localPath.replace(/\/$/, ""), "").replace(/^\//, "");
      const text = readFileSync(abs, "utf8");
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const p of patterns) {
          if (p.re.test(line)) {
            findings.push({
              id: newId("finding"),
              file: rel,
              lineStart: i + 1,
              lineEnd: i + 1,
              ruleId: p.id,
              severity: "HIGH",
              title: p.title,
              description: `Pattern ${p.id} matched`,
              evidence: line.trim(),
            });
          }
        }
      }
    }
    return findings;
  },
};

export default SecretAnalyzer;