#!/usr/bin/env node
/**
 * create_minio_bucket.js
 * Idempotent helper to ensure an S3 bucket exists (useful for CI / docker-compose).
 * Safe to run repeatedly.
 */

const { S3Client, HeadBucketCommand, CreateBucketCommand } = require("@aws-sdk/client-s3");

function sanitizeEnv(v) {
  if (v == null) return "";
  const s = String(v);
  return s.replace(/[\p{Z}\p{C}]+/gu, "").replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
}

function createS3ClientFromEnv() {
  const AWS_ENDPOINT = sanitizeEnv(process.env.AWS_ENDPOINT || "");
  const REGION = sanitizeEnv(process.env.AWS_REGION || "us-west-2");
  const AWS_ACCESS_KEY_ID = sanitizeEnv(process.env.AWS_ACCESS_KEY_ID || "");
  const AWS_SECRET_ACCESS_KEY = sanitizeEnv(process.env.AWS_SECRET_ACCESS_KEY || "");

  if (!AWS_ENDPOINT && !AWS_ACCESS_KEY_ID) {
    return null;
  }

  const creds = (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : {
    accessKeyId: AWS_ACCESS_KEY_ID || "minioadmin",
    secretAccessKey: AWS_SECRET_ACCESS_KEY || "minioadmin"
  };

  return new S3Client({
    region: REGION,
    endpoint: AWS_ENDPOINT || undefined,
    credentials: creds,
    forcePathStyle: !!AWS_ENDPOINT,
    maxAttempts: 3
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureBucketExists(s3, bucket, attempts = 5) {
  if (!s3) {
    console.log("No S3 client configured; skipping bucket ensure.");
    return;
  }
  let attempt = 0;
  while (attempt < attempts) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log("Bucket exists:", bucket);
      return;
    } catch (err) {
      // If not found, try to create
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log("Created bucket:", bucket);
        return;
      } catch (createErr) {
        const msg = (createErr && createErr.name) ? `${createErr.name}: ${createErr.message}` : String(createErr);
        console.warn(`Attempt ${attempt + 1} failed to ensure bucket (${bucket}):`, msg);
      }
    }
    attempt += 1;
    const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
    await sleep(backoff);
  }
  throw new Error(`Failed to ensure bucket exists after ${attempts} attempts: ${bucket}`);
}

async function run() {
  try {
    const S3_BUCKET = sanitizeEnv(process.env.S3_BUCKET || "local-minio-bucket");
    const s3 = createS3ClientFromEnv();
    if (!s3) {
      console.log("S3 environment not configured; nothing to do.");
      process.exit(0);
    }
    await ensureBucketExists(s3, S3_BUCKET, 5);
    console.log("Bucket ensured:", S3_BUCKET);
    process.exit(0);
  } catch (err) {
    console.error("create_minio_bucket failed:", err);
    process.exit(2);
  }
}

run();
