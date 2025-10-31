#!/usr/bin/env node
import { Agent } from "@agent/core";
import SecretAnalyzer from "@agent/analyzers-secret";

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
    console.log("Usage: agentd <analyze|scan> --repo <path>");
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
  console.error(`Unknown command: ${cmd}`);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});