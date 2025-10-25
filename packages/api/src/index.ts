import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const S3_BUCKET = process.env.S3_BUCKET || "local-minio-bucket";
const REGION = process.env.AWS_REGION || "us-west-2";

// s3 client (uses environment credentials or local endpoint via AWS_ENDPOINT)
const s3 = new S3Client({
  region: REGION,
  endpoint: process.env.AWS_ENDPOINT, // optional (for MinIO/dev)
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined,
  forcePathStyle: !!process.env.AWS_ENDPOINT
});

// Simple file-based metadata store (append-only JSONL) for initial implementation.
// Replace with a proper DB in production (Postgres).
const METADATA_FILE = path.join(__dirname, "../data/evidence.jsonl");

function persistMetadata(obj: any) {
  fs.appendFileSync(METADATA_FILE, JSON.stringify(obj) + "\\n", { encoding: "utf8" });
}

function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
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

    const url = await getSignedUrl(s3, putCommand, { expiresIn: 900 }); // 15 minutes

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

    persistMetadata(metadata);

    res.json({ uploadId, url, objectKey });
  } catch (err: any) {
    console.error("upload error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server (uploads) listening on ${PORT}`);
});
