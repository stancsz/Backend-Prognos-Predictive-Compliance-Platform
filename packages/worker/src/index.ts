import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Client as PgClient } from "pg";
import crypto from "crypto";
import stream from "stream";
import { promisify } from "util";

const pipeline = promisify(stream.pipeline);

const S3_BUCKET = process.env.S3_BUCKET || "local-minio-bucket";
const REGION = process.env.AWS_REGION || "us-west-2";
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_MS || "5000", 10);
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH_SIZE || "5", 10);

let pg: PgClient | null = null;

async function initPostgres() {
  const DATABASE_URL = process.env.DATABASE_URL || "";
  if (!DATABASE_URL) {
    console.warn("No DATABASE_URL provided - worker will not run DB tasks.");
    return;
  }
  pg = new PgClient({ connectionString: DATABASE_URL });
  await pg.connect();
  console.log("Worker: connected to Postgres");
}

function s3Client() {
  const s3Credentials = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : (process.env.AWS_ENDPOINT ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
  } : undefined);

  return new S3Client({
    region: REGION,
    endpoint: process.env.AWS_ENDPOINT || undefined,
    credentials: s3Credentials as any,
    forcePathStyle: !!process.env.AWS_ENDPOINT,
    maxAttempts: 3
  });
}

async function streamToBuffer(readable: any): Promise<Buffer> {
  // readable may be a stream.Readable or Uint8Array / Buffer
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
  // res.Body can be a stream.Readable in Node
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
    console.debug("pdf-parse unavailable or failed:", err?.message || err);
    return null;
  }
}

async function extractText(buffer: Buffer, contentType?: string | null): Promise<string | null> {
  if (contentType && contentType.toLowerCase().includes("pdf")) {
    const t = await tryPdfExtract(buffer);
    if (t) return t;
  }

  // best-effort: treat as utf-8 text, but cap the size
  try {
    const text = buffer.toString("utf8");
    // if the result is mostly binary, skip returning full text (basic heuristic)
    const printableRatio = (text.replace(/\s/g, "").length) / (buffer.length || 1);
    if (printableRatio < 0.2 && text.length > 0) {
      // likely binary -> return null to avoid storing garbage
      return null;
    }
    // cap extracted text to reasonable size
    return text.length > 200000 ? text.slice(0, 200000) : text;
  } catch (err) {
    console.debug("utf8 extraction failed:", err?.message || err);
    return null;
  }
}

async function processBatch() {
  if (!pg) {
    // nothing to do if no DB
    return;
  }

  const s3 = s3Client();

  const q = `SELECT id, project_id, filename, object_key, content_type FROM evidence WHERE status = 'uploaded_pending' ORDER BY created_at ASC LIMIT $1`;
  let rows: any[] = [];
  try {
    const res = await pg.query(q, [BATCH_SIZE]);
    rows = res.rows || [];
  } catch (err) {
    console.error("Worker: failed to query evidence rows:", err);
    return;
  }

  if (rows.length === 0) {
    // nothing to do
    return;
  }

  console.log(\`Worker: processing \${rows.length} evidence items\`);

  for (const row of rows) {
    const id = row.id;
    const objectKey = row.object_key || row.objectKey || row.objectKey;
    const contentType = row.content_type || row.contentType || null;

    if (!objectKey) {
      console.warn("Worker: skipping row with no object_key", id);
      continue;
    }

    try {
      const buf = await downloadObject(s3, S3_BUCKET, objectKey);
      const checksum = sha256Hex(buf);
      const extracted_text = await extractText(buf, contentType);

      const updateQ = `UPDATE evidence SET checksum = $1, extracted_text = $2, status = $3, indexed_at = now() WHERE id = $4`;
      const vals = [checksum, extracted_text, "indexed", id];
      await pg.query(updateQ, vals);

      console.log(\`Worker: indexed id=\${id} checksum=\${checksum.substring(0,8)}...\`);
    } catch (err) {
      console.error(\`Worker: failed processing id=\${id}:\`, err?.message || err);
      try {
        await pg.query(`UPDATE evidence SET status = $1 WHERE id = $2`, ["index_error", id]);
      } catch (uerr) {
        console.error("Worker: failed to mark index_error:", uerr);
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

process.on("SIGINT", async () => {
  console.log("Worker: SIGINT received, shutting down");
  running = false;
  try { await pg?.end(); } catch (e) { /* ignore */ }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Worker: SIGTERM received, shutting down");
  running = false;
  try { await pg?.end(); } catch (e) { /* ignore */ }
  process.exit(0);
});

mainLoop().catch((e) => {
  console.error("Worker: fatal error:", e);
  process.exit(1);
});
