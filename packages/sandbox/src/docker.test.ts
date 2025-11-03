import { describe, it, expect, vi, beforeEach } from "vitest";

describe("dockerAvailable", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns false when docker --version throws", async () => {
    vi.doMock("node:child_process", () => ({
      execFileSync: () => {
        throw new Error("not found");
      },
      spawn: () => ({
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (_: string, cb: (code: number) => void) => cb(0),
        kill: () => {},
      }),
    }));
    const { dockerAvailable } = await import("./docker");
    expect(dockerAvailable()).toBe(false);
  });

  it("returns true when docker --version works", async () => {
    vi.doMock("node:child_process", () => ({
      execFileSync: () => Buffer.from("Docker version 26"),
      spawn: () => ({
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (_: string, cb: (code: number) => void) => cb(0),
        kill: () => {},
      }),
    }));
    const { dockerAvailable } = await import("./docker");
    expect(dockerAvailable()).toBe(true);
  });
});
