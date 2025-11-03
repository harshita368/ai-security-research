import type { Sandbox } from "./index";
import { execFileSync, spawn } from "node:child_process";

export function dockerAvailable(): boolean {
  try {
    execFileSync("docker", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export class DockerSandbox implements Sandbox {
  constructor(private image: string = "node:20-bullseye") {}

  run(command: string, args: string[] = [], opts?: { cwd?: string; timeoutMs?: number }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const cwd = opts?.cwd ?? process.cwd();
    const cmd = [command, ...args].map(escapeArg).join(" ");
    const dockerArgs = [
      "run",
      "--rm",
      "-v",
      `${cwd}:/repo:rw`,
      "-w",
      "/repo",
      this.image,
      "bash",
      "-lc",
      cmd,
    ];
    return new Promise((resolve) => {
      const child = spawn("docker", dockerArgs, { stdio: ["ignore", "pipe", "pipe"] });
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

function escapeArg(s: string): string {
  if (/^[A-Za-z0-9_/:.=+-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
