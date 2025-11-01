import { Agent, Analyzer, RepositoryRef, VulnerabilityFinding } from "@agent/core";
import { NoopSandbox, validateFinding } from "@agent/sandbox";
import { HttpLLM, proposePatch } from "@agent/patcher";

export interface PipelineOptions {
  repoPath: string;
  analyzers: Analyzer[];
  strategy?: "auto" | "redact" | "llm";
  llmEndpoint?: string;
  llmApiKey?: string;
}

export interface PipelineOutput {
  finding: VulnerabilityFinding;
  validationStatus: "confirmed" | "invalid" | "inconclusive";
  patch?: { diff: string; rationale: string };
}

export async function runPipeline(opts: PipelineOptions): Promise<PipelineOutput[]> {
  const repo: RepositoryRef = { localPath: opts.repoPath };
  const agent = new Agent(opts.analyzers);
  const findings = await agent.scan(repo);

  const outputs: PipelineOutput[] = [];
  const llm = opts.llmEndpoint ? new HttpLLM(opts.llmEndpoint, opts.llmApiKey) : undefined;
  new NoopSandbox(); // placeholder instantiation
  for (const f of findings) {
    const v = await validateFinding(opts.repoPath, f);
    if (v.status === "confirmed") {
      const p = await proposePatch(opts.repoPath, f, opts.strategy ?? "auto", llm);
      outputs.push({ finding: f, validationStatus: v.status, patch: { diff: p.diffPatch, rationale: p.rationale } });
    } else {
      outputs.push({ finding: f, validationStatus: v.status });
    }
  }
  return outputs;
}

export default runPipeline;