import http from "node:http";
import { handlePullRequest, PullRequestPayload } from "./pr-handler";
import { createHmac, timingSafeEqual as tEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!TOKEN) console.warn("GITHUB_TOKEN/GH_TOKEN not set; gh CLI must be authenticated separately.");

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  try {
    const raw = await readRawBody(req);
    const event = req.headers["x-github-event"] as string | undefined;
    const sig = (req.headers["x-hub-signature-256"] as string | undefined) ?? null;
    if (!verifySignature(SECRET, sig, raw)) {
      res.statusCode = 401;
      res.end("invalid signature");
      return;
    }
    if (event !== "pull_request") {
      res.statusCode = 200;
      res.end("ignored");
      return;
    }
    const payload = JSON.parse(raw) as PullRequestPayload;
    const result = await handlePullRequest(payload, console.log);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, commentPreview: result.commentBody.slice(0, 2000) }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end(String(e?.message || e));
  }
});

function readRawBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`GitHub webhook server listening on :${PORT}/webhook`);
});

function verifySignature(sigKey: string | undefined, signature256: string | null, rawBody: string): boolean {
  if (!sigKey) return true;
  if (!signature256) return false;
  const digest = createHmac("sha256", sigKey).update(rawBody).digest("hex");
  const expected = `sha256=${digest}`;
  const a = Buffer.from(signature256);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return tEqual(a, b);
}
