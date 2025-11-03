# Agentic Security Researcher (Aardvark-style)

Monorepo implementing an autonomous security agent pipeline:

- Analysis → Threat Model
- Commit Scanning (diff-aware)
- Validation Sandbox (noop placeholder)
- Patching (LLM endpoint or rule-based redaction)
- CLI `agentd`

## Quick start

```
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Run analysis:

```
bun run --filter @agent/agentd build
node apps/agentd/dist/index.js analyze --repo /path/to/repo
node apps/agentd/dist/index.js scan --repo /path/to/repo
node apps/agentd/dist/index.js scan-commit --repo /path/to/repo --base main --head HEAD
```

Configure your own LLM endpoint for patching via environment variables (used by `@agent/patcher`):

```
export AGENT_LLM_ENDPOINT="https://your-llm-endpoint"
export AGENT_LLM_API_KEY="..."
```

## Packages

- `@agent/core` – types, agent orchestrator, commit diff scanner
- `@agent/analyzers-secret` – simple secret pattern detector
- `@agent/sandbox` – interface and a noop sandbox
- `@agent/patcher` – HTTP LLM client and redaction patch
- `@agent/git` – git utilities and unified diff parsing
- `@agent/agentd` – CLI

## Notes

- GitHub App/PR integration can be added once a remote URL and token are supplied.
- Docker-based sandbox can replace `NoopSandbox` in production.