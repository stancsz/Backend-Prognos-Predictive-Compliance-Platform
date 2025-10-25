import express from "express";
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client as PgClient } from "pg";

const app = express();
app.use(express.json());

const S3_BUCKET = process.env.S3_BUCKET || "local-minio-bucket";
const REGION = process.env.AWS_REGION || "us-west-2";
const METADATA_FILE = path.join(__dirname, "../data/evidence.jsonl");

// Postgres client (optional). If DATABASE_URL is set, we persist metadata to Postgres.
// If not set, we fall back to append-only JSONL file (existing PoC).
let pg: PgClient | null = null;
const DATABASE_URL = process.env.DATABASE_URL || "";

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
const s3Credentials = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
} : (process.env.AWS_ENDPOINT ? {
  // default local MinIO dev creds (override via env in real setups)
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
} : undefined);

const s3 = new S3Client({
  region: REGION,
  endpoint: process.env.AWS_ENDPOINT, // optional (for MinIO/dev)
  credentials: s3Credentials as any,
  forcePathStyle: !!process.env.AWS_ENDPOINT,
  maxAttempts: 3
});

async function ensureBucket() {
  // Only attempt to manage buckets in local/dev S3 (AWS_ENDPOINT) or when explicitly permitted.
  if (!process.env.AWS_ENDPOINT) {
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
