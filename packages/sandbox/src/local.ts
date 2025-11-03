import type { Sandbox } from "./index";
import { spawn } from "node:child_process";

export class LocalSandbox implements Sandbox {
  run(command: string, args: string[] = [], opts?: { cwd?: string; timeoutMs?: number }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const cwd = opts?.cwd ?? process.cwd();
    return new Promise((resolve) => {
      const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
      const chunksOut: Buffer[] = [];
      const chunksErr: Buffer[] = [];
      if (opts?.timeoutMs) {
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {}
        }, opts.timeoutMs);
      }
      child.stdout.on("data", (c) => chunksOut.push(Buffer.from(c)));
      child.stderr.on("data", (c) => chunksErr.push(Buffer.from(c)));
      child.on("close", (code) => {
        resolve({ exitCode: code ?? -1, stdout: Buffer.concat(chunksOut).toString("utf8"), stderr: Buffer.concat(chunksErr).toString("utf8") });
      });
    });
  }
}
