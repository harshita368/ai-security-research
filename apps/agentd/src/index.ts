#!/usr/bin/env node
import { Agent, scanCommitDiff } from "@agent/core";
import SecretAnalyzer from "@agent/analyzers-secret";
import { runPipeline } from "@agent/orchestrator";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const cmd = args[0] || "help";
  const opts: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      opts[k] = v ?? String(args[++i] ?? "");
    }
  }
  return { cmd, opts };
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv);
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log("Usage: agentd <analyze|scan|scan-commit|pipeline> --repo <path> [--base <ref> --head <ref>] [--strategy auto|redact|llm]");
    process.exit(0);
  }
  const repo = opts["repo"];
  if (!repo) {
    console.error("--repo <path> required");
    process.exit(2);
  }
  const agent = new Agent([SecretAnalyzer]);
  if (cmd === "analyze") {
    const tm = await agent.threatModel({ localPath: repo });
    console.log(JSON.stringify(tm, null, 2));
    return;
  }
  if (cmd === "scan") {
    const findings = await agent.scan({ localPath: repo });
    console.log(JSON.stringify(findings, null, 2));
    return;
  }
  if (cmd === "scan-commit") {
    const base = opts["base"];
    const head = opts["head"] || "HEAD";
    if (!base) {
      console.error("--base <git ref/sha> required for scan-commit");
      process.exit(2);
    }
    const findings = await scanCommitDiff({ localPath: repo }, base, head, [SecretAnalyzer]);
    console.log(JSON.stringify(findings, null, 2));
    return;
  }
  if (cmd === "pipeline") {
    const strategy = (opts["strategy"] as any) || "auto";
    const llmEndpoint = process.env.AGENT_LLM_ENDPOINT;
    const llmApiKey = process.env.AGENT_LLM_API_KEY;
    const out = await runPipeline({ repoPath: repo, analyzers: [SecretAnalyzer], strategy, llmEndpoint, llmApiKey });
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});