import express from "express";
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client as PgClient } from "pg";

const app = express();
app.use(express.json());

function log(level: string, message: string, meta?: any) {
  const entry = Object.assign({ ts: new Date().toISOString(), level, message }, meta || {});
  console.log(JSON.stringify(entry));
}

function hexDump(s: string | undefined) {
  try {
    return Buffer.from((s || "")).toString("hex");
  } catch (e) {
    return "";
  }
}

 // Robust sanitizer: remove Unicode separators and control chars, strip BOM/NBSP/zero-width, then trim ASCII whitespace.
 // This handles NBSP, BOM, zero-width spaces, and other invisible bytes that String.prototype.trim() may not remove.
 function sanitizeEnv(value: any): string {
   if (value == null) return "";
   const s = String(value);
   // Explicitly remove common invisible characters (BOM, NBSP, zero-widths) plus any Unicode separators / control chars.
   // Keep the `u` flag so \p classes work.
   const removeRe = /[\uFEFF\u00A0\u200B\u200C\u200D\u2060\p{Z}\p{C}]+/gu;
   let cleaned = s.replace(removeRe, "");
   // Finally remove any remaining ASCII whitespace at ends (space, tab, CR, LF).
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
const REGION = sanitizeEnv(process.env.AWS_REGION || "us-west-2");
const METADATA_FILE = path.join(__dirname, "../data/evidence.jsonl");

 // Sanitize AWS / Postgres envs early to avoid trailing-space/newline issues
const AWS_ENDPOINT = sanitizeEnv(process.env.AWS_ENDPOINT || "");
const AWS_ACCESS_KEY_ID = sanitizeEnv(process.env.AWS_ACCESS_KEY_ID || "");
const AWS_SECRET_ACCESS_KEY = sanitizeEnv(process.env.AWS_SECRET_ACCESS_KEY || "");

// Postgres client (optional). If DATABASE_URL is set, we persist metadata to Postgres.
// If not set, we fall back to append-only JSONL file (existing PoC).
let pg: PgClient | null = null;
const DATABASE_URL = (function() {
  const force = sanitizeEnv(process.env.FORCE_DB_URL || "");
  if (force) return force;
  return sanitizeEnv(process.env.DATABASE_URL || "");
})();

// STARTUP DEBUG: hex dumps to detect invisible whitespace/newlines in env values
console.log("STARTUP DEBUG: S3_BUCKET hex:", hexDump(S3_BUCKET));
console.log("STARTUP DEBUG: DATABASE_URL hex:", hexDump(DATABASE_URL));
console.log("STARTUP DEBUG: S3_BUCKET raw:", JSON.stringify(S3_BUCKET));
console.log("STARTUP DEBUG: DATABASE_URL raw:", JSON.stringify(DATABASE_URL));

async function initPostgres() {
  if (!DATABASE_URL) return;
  pg = new PgClient({ connectionString: DATABASE_URL });
  await pg.connect();
  // Ensure table exists (simple migration - replace with real migrations later)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT,
      object_key TEXT NOT NULL,
      content_type TEXT,
      uploader TEXT,
      status TEXT,
      checksum TEXT,
      extracted_text TEXT,
      indexed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
  console.log("Postgres initialized and evidence table ensured");
}

function persistMetadataJsonl(obj: any) {
  fs.mkdirSync(path.dirname(METADATA_FILE), { recursive: true });
  fs.appendFileSync(METADATA_FILE, JSON.stringify(obj) + "\n", { encoding: "utf8" });
}

async function persistMetadata(obj: any) {
  if (pg) {
    const q = `
      INSERT INTO evidence (
        id, project_id, filename, object_key, content_type, uploader, status, checksum, extracted_text, indexed_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
      ON CONFLICT (id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        filename = EXCLUDED.filename,
        object_key = EXCLUDED.object_key,
        content_type = EXCLUDED.content_type,
        uploader = EXCLUDED.uploader,
        status = EXCLUDED.status,
        checksum = EXCLUDED.checksum,
        extracted_text = EXCLUDED.extracted_text,
        indexed_at = EXCLUDED.indexed_at;
    `;
    const vals = [
      obj.id,
      obj.projectId,
      obj.filename || null,
      obj.objectKey,
      obj.contentType || null,
      obj.uploader || null,
      obj.status || null,
      obj.checksum || null,
      obj.extracted_text || null,
      obj.indexed_at ? new Date(obj.indexed_at) : null
    ];
    await pg.query(q, vals);
    return;
  }
  // fallback
  persistMetadataJsonl(obj);
}

function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
}

// s3 client (uses environment credentials or local endpoint via AWS_ENDPOINT)
const s3Credentials = (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
} : (AWS_ENDPOINT ? {
  // default local MinIO dev creds (override via env in real setups)
  accessKeyId: AWS_ACCESS_KEY_ID || 'minioadmin',
  secretAccessKey: AWS_SECRET_ACCESS_KEY || 'minioadmin'
} : undefined);

const s3 = new S3Client({
  region: REGION,
  endpoint: AWS_ENDPOINT || undefined, // optional (for MinIO/dev)
  credentials: s3Credentials as any,
  forcePathStyle: !!AWS_ENDPOINT,
  maxAttempts: 3
});

async function ensureBucket() {
  // Only attempt to manage buckets in local/dev S3 (AWS_ENDPOINT) or when explicitly permitted.
  if (!AWS_ENDPOINT) {
    return;
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Bucket exists: ${S3_BUCKET}`);
  } catch (err: any) {
    console.warn(`Bucket ${S3_BUCKET} not found or HEAD failed, attempting to create:`, err?.message || err);
    try {
      await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
      console.log(`Created bucket ${S3_BUCKET}`);
    } catch (createErr) {
      console.error(`Failed to create bucket ${S3_BUCKET}:`, createErr);
      throw createErr;
    }
  }
}

app.post("/uploads", async (req, res) => {
  try {
    const { filename, projectId, contentType } = req.body;
    if (!filename || !projectId) {
      return res.status(400).json({ error: "filename and projectId are required" });
    }

    const uploadId = generateId();
    const objectKey = `evidence/${projectId}/${uploadId}/${filename}`;

    // Build presigned PUT URL
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream"
    });

    let url: string;
    try {
      url = await getSignedUrl(s3, putCommand, { expiresIn: 900 }); // 15 minutes
    } catch (s3Err: any) {
      console.error("s3 presign error:", s3Err);
      return res.status(500).json({ error: "s3_error" });
    }

    // Persist metadata record (checksum will be computed by worker after upload)
    const metadata = {
      id: uploadId,
      projectId,
      filename,
      objectKey,
      contentType: contentType || null,
      uploader: req.headers["x-user-email"] || null,
      status: "uploaded_pending",
      createdAt: new Date().toISOString()
    };

    try {
      await persistMetadata(metadata);
    } catch (dbErr) {
      console.error("persistMetadata failed:", dbErr);
      // do not block user from uploading; log and continue with JSONL fallback
      try { persistMetadataJsonl(metadata); } catch (e) { console.error("jsonl fallback failed", e); }
    }

    res.json({ uploadId, url, objectKey });
  } catch (err: any) {
    console.error("upload error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", db: !!pg }));

app.get("/ready", async (_req, res) => {
  const dbOk = !!pg;
  let s3Ok = true;
  try {
    if (AWS_ENDPOINT) {
      await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    }
  } catch (err) {
    s3Ok = false;
    log('warn', 's3 readiness check failed', { error: err && (err as any).message });
  }
  const ready = dbOk && s3Ok;
  res.json({ ready, db: dbOk, s3: s3Ok, bucket: S3_BUCKET });
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await ensureBucket();
  } catch (err) {
    console.warn("ensureBucket failed, continuing to start server:", err);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server (uploads) listening on ${PORT}`);
  });
}

initPostgres()
  .then(() => startServer())
  .catch((e) => {
    console.error("Failed to initialize Postgres, starting server with JSONL fallback:", e);
    startServer();
  });
