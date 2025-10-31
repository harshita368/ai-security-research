import type { ValidationResult } from "@agent/core";

export interface Sandbox {
  run(command: string, args?: string[], opts?: { cwd?: string; timeoutMs?: number }): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
}

export class NoopSandbox implements Sandbox {
  async run(command: string, _args: string[] = [], _opts?: { cwd?: string; timeoutMs?: number }) {
    return { exitCode: 0, stdout: `ran:${command}`, stderr: "" };
  }
}

export async function validateFinding(): Promise<ValidationResult> {
  return { findingId: "unknown", status: "inconclusive" };
}