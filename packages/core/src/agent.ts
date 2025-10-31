import { Analyzer, RepositoryRef, ThreatModel, VulnerabilityFinding } from "./index";

export class Agent {
  constructor(private analyzers: Analyzer[]) {}

  async threatModel(repo: RepositoryRef): Promise<ThreatModel> {
    return {
      description: "Auto-generated",
      securityObjectives: ["confidentiality", "integrity", "availability"],
      attackSurfaces: ["code", "config", "deps"],
      technologies: [],
    };
  }

  async scan(repo: RepositoryRef): Promise<VulnerabilityFinding[]> {
    const tm = await this.threatModel(repo);
    const results = await Promise.all(this.analyzers.map((a) => a.analyze(repo, tm)));
    return results.flat();
  }
}

export default Agent;