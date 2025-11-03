export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface ThreatModel {
  description: string;
  securityObjectives: string[];
  attackSurfaces: string[];
  technologies: string[];
}

export interface RepositoryRef {
  localPath: string;
  defaultBranch?: string;
}

export interface VulnerabilityFinding {
  id: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  evidence?: string;
}

export interface ValidationResult {
  findingId: string;
  status: "confirmed" | "invalid" | "inconclusive";
  details?: string;
}

export interface PatchProposal {
  findingId: string;
  diffPatch: string; // unified diff
  rationale: string;
}

export interface AgentConfig {
  repoPath: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  sandbox?: "docker" | "noop";
}

export interface Analyzer {
  name: string;
  analyze: (repo: RepositoryRef, threatModel: ThreatModel) => Promise<VulnerabilityFinding[]>;
}

export const newId = (() => {
  let i = 0;
  return (prefix = "id") => `${prefix}-${Date.now()}-${++i}`;
})();

export { Agent } from "./agent";
export { scanCommitDiff } from "./commit-scanner";