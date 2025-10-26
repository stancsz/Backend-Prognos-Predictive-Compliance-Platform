import { Client as PgClient } from "pg";
import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

export async function createPgClientFromEnv(): Promise<PgClient> {
  const DATABASE_URL = process.env.DATABASE_URL || "postgres://devuser:devpass@localhost:5432/plts_dev";
  const pg = new PgClient({ connectionString: DATABASE_URL });
  await pg.connect();
  return pg;
}

export function createS3ClientFromEnv(): S3Client {
  const AWS_ENDPOINT = process.env.AWS_ENDPOINT || "http://localhost:9000";
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "minioadmin";
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "minioadmin";
  return new S3Client({
    region: process.env.AWS_REGION || "us-west-2",
    endpoint: AWS_ENDPOINT,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    },
    forcePathStyle: true,
    maxAttempts: 3
  });
}

export async function ensureBucket(s3: S3Client, bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (e) {
      // best-effort
    }
  }
}

export async function clearDbTables(pg: PgClient) {
  try {
    await pg.query("CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, project_id TEXT, filename TEXT, object_key TEXT, content_type TEXT, uploader TEXT, status TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT now());");
    await pg.query("CREATE TABLE IF NOT EXISTS mappings (id TEXT PRIMARY KEY, project_id TEXT, evidence_id TEXT, control_id TEXT, notes TEXT, created_by TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT now());");
    await pg.query("TRUNCATE TABLE mappings, evidence;");
  } catch (e) {
    // ignore
  }
}
