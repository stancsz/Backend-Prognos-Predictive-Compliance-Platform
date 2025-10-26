import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Client as PgClient } from "pg";
import crypto from "crypto";
import stream from "stream";
import { promisify } from "util";
import http from "http";

const pipeline = promisify(stream.pipeline);

/*
  TODO (align -> AGENT/TODO.md & packages/worker/TODO.md)
  - Worker responsibilities for MVP:
    - Poll unprocessed evidence and download from S3
    - Extract text (PDF/plain-text), compute checksum, deduplicate by checksum
    - Provide simple rule-based control suggestion (keyword matching against framework controls)
    - Persist extracted_text, checksum, status, indexed_at to Postgres or JSONL fallback
    - Support idempotency and safe retries (use evidence id + checksum)
    - Expose a dry-run mode and simple HTTP hooks for infra/demo-runner to observe progress
  - Ensure worker updates these metadata fields used by API summarization:
    - status, checksum, extracted_text, indexed_at
  - Keep processing logic simple for MVP (rule-based suggestions), wire to packages/api/data/soc2.jsonl
  - See packages/worker/TODO.md for implementation checklist and test expectations
*/

function log(level: string, message: string, meta?: any) {
  const entry = Object.assign({ ts: new Date().toISOString(), level, message }, meta || {});
  console.log(JSON.stringify(entry));
}

 // Robust sanitizer: remove Unicode separators and control chars, strip BOM/NBSP/zero-width, then trim ASCII whitespace.
 function sanitizeEnv(value: any): string {
   if (value == null) return "";
   const s = String(value);
   const removeRe = /[\p{Z}\p{C}]+/gu;
   let cleaned = s.replace(removeRe, "");
   // Finally remove any remaining ASCII whitespace at ends (space, tab, CR, LF).
   cleaned = cleaned.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
   return cleaned;
 }

 // Sanitize all process.env early to guard against wrapper-injected invisible/trailing bytes.
 Object.keys(process.env).forEach((k) => {
   try {
     process.env[k] = sanitizeEnv(process.env[k]);
   } catch (e) {
     console.error('env sanitize failed for', k, e);
   }
 });

const S3_BUCKET = sanitizeEnv(process.env.S3_BUCKET || "local-minio-bucket");
const REGION = (process.env.AWS_REGION || "us-west-2").toString().trim();
const POLL_INTERVAL_MS = parseInt((process.env.WORKER_POLL_MS || "5000").toString().trim(), 10);
const BATCH_SIZE = parseInt((process.env.WORKER_BATCH_SIZE || "5").toString().trim(), 10);
const WORKER_PORT = parseInt((process.env.WORKER_PORT || "4001").toString().trim(), 10);

const AWS_ENDPOINT = (process.env.AWS_ENDPOINT || "").toString().trim();
const AWS_ACCESS_KEY_ID = (process.env.AWS_ACCESS_KEY_ID || "").toString().trim();
const AWS_SECRET_ACCESS_KEY = (process.env.AWS_SECRET_ACCESS_KEY || "").toString().trim();
let lastIndexedAt: string | null = null;

let pg: PgClient | null = null;

async function initPostgres() {
  const DATABASE_URL = (process.env.DATABASE_URL || process.env.FORCE_DB_URL || "").toString().trim();
  if (!DATABASE_URL) {
    console.warn("No DATABASE_URL provided - worker will not run DB tasks.");
    return;
  }

  // Redact password for safe logging (avoid leaking secrets)
  function redactDatabaseUrl(u: string) {
    try {
      const m = u.match(/^(.*:\/\/)([^:@]+)(:([^@]+))?(@.*)$/);
      if (!m) return u;
      const prefix = m[1];
      const user = m[2];
      const hasPass = !!m[4];
      const suffix = m[5];
      return hasPass ? `${prefix}${user}:*****${suffix}` : `${prefix}${user}${suffix}`;
    } catch (e) {
      return u;
    }
  }

  console.log("Worker: resolved DATABASE_URL=", redactDatabaseUrl(DATABASE_URL));
  pg = new PgClient({ connectionString: DATABASE_URL });
  await pg.connect();
  console.log("Worker: connected to Postgres");
}

function s3Client() {
  const s3Credentials = (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : (AWS_ENDPOINT ? {
    accessKeyId: AWS_ACCESS_KEY_ID || "minioadmin",
    secretAccessKey: AWS_SECRET_ACCESS_KEY || "minioadmin"
  } : undefined);

  return new S3Client({
    region: REGION,
    endpoint: AWS_ENDPOINT || undefined,
    credentials: s3Credentials as any,
    forcePathStyle: !!AWS_ENDPOINT,
    maxAttempts: 3
  });
}

async function streamToBuffer(readable: any): Promise<Buffer> {
  if (!readable) return Buffer.alloc(0);
  if (Buffer.isBuffer(readable)) return readable;
  if (typeof readable === "string") return Buffer.from(readable);

  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    readable.on?.("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    readable.on?.("end", () => resolve(Buffer.concat(chunks)));
    readable.on?.("error", (err: any) => reject(err));
  });
}

async function downloadObject(s3: ReturnType<typeof s3Client>, bucket: string, key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await s3.send(cmd);
  const body: any = res.Body;
  return await streamToBuffer(body);
}

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function tryPdfExtract(buffer: Buffer): Promise<string | null> {
  try {
    // dynamic import - optional dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return (data && data.text) ? String(data.text) : null;
  } catch (err) {
    console.debug("pdf-parse unavailable or failed:", (err && (err as any).message) || err);
    return null;
  }
}

async function extractText(buffer: Buffer, contentType?: string | null): Promise<string | null> {
  if (contentType && contentType.toLowerCase().includes("pdf")) {
    const t = await tryPdfExtract(buffer);
    if (t) return t;
  }

  try {
    const text = buffer.toString("utf8");
    const printableRatio = (text.replace(/\s/g, "").length) / (buffer.length || 1);
    if (printableRatio < 0.2 && text.length > 0) {
      return null;
    }
    return text.length > 200000 ? text.slice(0, 200000) : text;
  } catch (err) {
    console.debug("utf8 extraction failed:", (err && (err as any).message) || err);
    return null;
  }
}

async function processBatch() {
  if (!pg) return;

  // Atomically claim rows for processing using a transaction + SELECT ... FOR UPDATE SKIP LOCKED
  let claimedRows: any[] = [];
  try {
    await pg.query("BEGIN");
    const selectRes = await pg.query(
      "SELECT id, project_id, filename, object_key, content_type FROM evidence WHERE status = $1 ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED",
      ["uploaded_pending", BATCH_SIZE]
    );
    claimedRows = selectRes.rows || [];

    if (claimedRows.length === 0) {
      await pg.query("COMMIT");
      return;
    }

    const ids = claimedRows.map((r: any) => r.id);
    // mark as processing so other workers won't pick them up
    await pg.query("UPDATE evidence SET status = $1 WHERE id = ANY($2::text[])", ["processing", ids]);
    await pg.query("COMMIT");
  } catch (err) {
    console.error("Worker: failed to claim rows for processing:", err);
    try { await pg.query("ROLLBACK"); } catch (_) { /* ignore */ }
    return;
  }

  if (claimedRows.length === 0) return;

  const s3 = s3Client();
  console.log(`Worker: claimed ${claimedRows.length} evidence items for processing`);

  // download with retry/backoff
  async function downloadWithRetry(key: string, attempts = 3): Promise<Buffer> {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await downloadObject(s3, S3_BUCKET, key);
      } catch (e) {
        lastErr = e;
        const backoffMs = 500 * Math.pow(2, i);
        log('warn', 's3 download failed, retrying', { key, attempt: i + 1, err: (e && (e as any).message) || e, backoffMs });
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
    throw lastErr;
  }

  for (const row of claimedRows) {
    const id = row.id;
    const objectKey = row.object_key || row.objectKey;
    const contentType = row.content_type || row.contentType || null;

    if (!objectKey) {
      log('warn', 'Worker: skipping row with no object_key', { id });
      try {
        await pg.query("UPDATE evidence SET status = $1 WHERE id = $2", ["index_error", id]);
      } catch (uerr) {
        log('error', 'Worker: failed to mark index_error for missing object_key', { id, err: (uerr && (uerr as any).message) || uerr });
      }
      continue;
    }

    try {
      const buf = await downloadWithRetry(objectKey, 3);
      const checksum = sha256Hex(buf);

      // Extract text (may be expensive). Try extraction, but prefer reusing existing extracted_text
      // from another already-indexed row with the same checksum to avoid duplicated work.
      let extracted_text = await extractText(buf, contentType);

      try {
        const existing = await pg.query(
          "SELECT id, extracted_text FROM evidence WHERE checksum = $1 AND status = $2 LIMIT 1",
          [checksum, "indexed"]
        );
        if (existing && existing.rowCount && existing.rowCount > 0 && existing.rows[0] && existing.rows[0].extracted_text) {
          // Reuse previously extracted text for identical content to ensure idempotent processing.
          extracted_text = existing.rows[0].extracted_text;
          log('info', 'Worker: dedupe - reused extracted_text from existing checksum', { id, checksum: checksum.substring(0, 8), existing_id: existing.rows[0].id ?? null });
        }
      } catch (derr) {
        log('warn', 'Worker: dedupe check failed', { id, checksum: checksum.substring(0, 8), err: (derr && (derr as any).message) || derr });
      }

      const updateQ = "UPDATE evidence SET checksum = $1, extracted_text = $2, status = $3, indexed_at = now() WHERE id = $4";
      const vals = [checksum, extracted_text, "indexed", id];
      await pg.query(updateQ, vals);

      log('info', 'Worker: indexed evidence', { id, checksum: checksum.substring(0, 8) });
      lastIndexedAt = new Date().toISOString();
    } catch (err) {
      log('error', 'Worker: failed processing evidence', { id, err: (err && (err as any).message) || err });
      try {
        await pg.query("UPDATE evidence SET status = $1 WHERE id = $2", ["index_error", id]);
      } catch (uerr) {
        log('error', 'Worker: failed to mark index_error', { id, err: (uerr && (uerr as any).message) || uerr });
      }
    }
  }
}

let running = true;

async function mainLoop() {
  await initPostgres();
  console.log("Worker: starting main loop, poll interval", POLL_INTERVAL_MS, "ms");
  while (running) {
    try {
      await processBatch();
    } catch (err) {
      console.error("Worker: loop error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Lightweight health/readiness HTTP server for local dev and CI readiness checks.
// Exposes:
// - GET /health  -> basic liveness { status: 'ok' }
// - GET /ready   -> readiness with DB connectivity and lastIndexedAt
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.url === "/ready") {
    (async () => {
      let dbOk = false;
      try {
        if (pg) {
          await pg.query("SELECT 1");
          dbOk = true;
        }
      } catch (e) {
        dbOk = false;
      }

      const ready = dbOk;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ready, db: dbOk, lastIndexedAt }));
    })();
    return;
  }

  res.statusCode = 404;
  res.end("not found");
});

server.listen(WORKER_PORT, () => {
  console.log("Worker: health server listening on", WORKER_PORT);
});

process.on("SIGINT", async () => {
  console.log("Worker: SIGINT received, shutting down");
  running = false;
  try { await pg?.end(); } catch (e) { /* ignore */ }
  try { server.close(); } catch (e) { /* ignore */ }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Worker: SIGTERM received, shutting down");
  running = false;
  try { await pg?.end(); } catch (e) { /* ignore */ }
  try { server.close(); } catch (e) { /* ignore */ }
  process.exit(0);
});

mainLoop().catch((e) => {
  console.error("Worker: fatal error:", e);
  try { server.close(); } catch (_) {}
  process.exit(1);
});
