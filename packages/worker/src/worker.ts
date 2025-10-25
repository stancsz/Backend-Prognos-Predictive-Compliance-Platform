import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pdfParse from "pdf-parse";

const DATA_FILE = path.join(__dirname, "../data/evidence.jsonl");
const METADATA_PATH = path.join(__dirname, "../data");
if (!fs.existsSync(METADATA_PATH)) fs.mkdirSync(METADATA_PATH, { recursive: true });

// simple S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-west-2",
  endpoint: process.env.AWS_ENDPOINT || undefined,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined,
  forcePathStyle: !!process.env.AWS_ENDPOINT
});

async function downloadObject(bucket: string, key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await s3.send(cmd);
  const stream = resp.Body as any;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function computeChecksum(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

async function processPending() {
  const lines = fs.readFileSync(DATA_FILE, "utf8").trim().split("\\n");
  const records = lines.map((l) => JSON.parse(l));
  for (const rec of records) {
    if (rec.status !== "uploaded_pending") continue;
    try {
      console.log("Processing", rec.objectKey);
      const buf = await downloadObject(process.env.S3_BUCKET || "local-minio-bucket", rec.objectKey);
      const checksum = computeChecksum(buf);
      const text = await extractTextFromPdf(buf).catch(() => "");
      rec.checksum = checksum;
      rec.extracted_text = text;
      rec.indexed_at = new Date().toISOString();
      rec.status = "indexed";
      // write back atomically
      const updated = records.map((r) => JSON.stringify(r)).join("\\n") + "\\n";
      fs.writeFileSync(DATA_FILE, updated, { encoding: "utf8" });
      console.log("Processed", rec.id);
    } catch (err) {
      console.error("worker error", err);
    }
  }
}

setInterval(() => {
  processPending().catch((e) => console.error(e));
}, 5000);

console.log("Worker started, polling data file");
