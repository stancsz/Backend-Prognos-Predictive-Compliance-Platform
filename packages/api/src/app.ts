import express from "express";
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client as PgClient } from "pg";

/**
 * Lightweight, clean app scaffold for the Prognos API.
 * - Exports createApp to obtain an Express app wired with routes.
 * - Keeps persistence pluggable: Postgres client optional; falls back to JSONL files.
 *
 * This file is intended as the first step of a refactor. The legacy `index.ts` can be
 * replaced to import startServer from here once verified.
 */

export type Resources = {
  pg?: PgClient | null;
  s3?: S3Client | null;
  s3Bucket?: string;
  dataDir?: string;
};

const DEFAULT_DATA_DIR = path.join(__dirname, "../data");

function sanitizeEnv(value: any): string {
  if (value == null) return "";
  const s = String(value);
  const removeRe = /[\p{Z}\p{C}]+/gu;
  let cleaned = s.replace(removeRe, "");
  cleaned = cleaned.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
  return cleaned;
}

function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
}

function hexDump(s: string | undefined) {
  try {
    return Buffer.from((s || "")).toString("hex");
  } catch (e) {
    return "";
  }
}

function loadFrameworks(dataDir: string) {
  const FRAMEWORKS_FILE = path.join(dataDir, "soc2.jsonl");
  try {
    if (!fs.existsSync(FRAMEWORKS_FILE)) return [];
    const raw = fs.readFileSync(FRAMEWORKS_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.map((l) => JSON.parse(l));
  } catch (e) {
    console.error("failed to load frameworks:", e);
    return [];
  }
}

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function appendJsonl(filename: string, obj: any) {
  try {
    ensureDir(path.dirname(filename));
    fs.appendFileSync(filename, JSON.stringify(obj) + "\n", { encoding: "utf8" });
  } catch (e) {
    console.error("appendJsonl failed:", e);
  }
}

export function createApp(resources?: Partial<Resources>) {
  const dataDir = resources?.dataDir || DEFAULT_DATA_DIR;
  const pg = resources?.pg ?? null;
  const s3 = resources?.s3 ?? null;
  const S3_BUCKET = resources?.s3Bucket || sanitizeEnv(process.env.S3_BUCKET || "local-minio-bucket");

  const app = express();
  app.use(express.json());

  // dev auth middleware (permissive)
  app.use((req: any, _res: any, next: any) => {
    const token = req.headers["x-dev-token"] || req.headers["x-user-email"];
    if (!token) {
      req.user = null;
    } else {
      req.user = { id: String(token) };
    }
    next();
  });

  // health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", db: !!pg });
  });

  // readiness
  app.get("/ready", async (_req, res) => {
    const dbOk = !!pg;
    let s3Ok = true;
    try {
      if (s3) {
        await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
      }
    } catch (err) {
      s3Ok = false;
    }
    const ready = dbOk && s3Ok;
    res.json({ ready, db: dbOk, s3: s3Ok, bucket: S3_BUCKET });
  });

  // frameworks listing and controls
  app.get("/frameworks", (_req, res) => {
    const frameworks = loadFrameworks(dataDir).map((f: any) => ({
      id: f.id,
      name: f.name,
      version: f.version,
      description: f.description
    }));
    res.json({ frameworks });
  });

  app.get("/frameworks/:id/controls", (req, res) => {
    const id = String(req.params.id || "");
    const frameworks = loadFrameworks(dataDir);
    const fw = frameworks.find((f: any) => f.id === id);
    if (!fw) return res.status(404).json({ error: "framework_not_found" });
    return res.json({ controls: fw.controls || [] });
  });

  // uploads: returns presigned PUT url
  app.post("/uploads", async (req, res) => {
    try {
      const { filename, projectId, contentType } = req.body || {};
      if (!filename || !projectId) {
        return res.status(400).json({ error: "filename and projectId are required" });
      }

      const uploadId = generateId();
      const objectKey = `evidence/${projectId}/${uploadId}/${filename}`;

      if (!s3) {
        // no S3 client configured; still return metadata for local flow
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
        const METADATA_FILE = path.join(dataDir, "evidence.jsonl");
        appendJsonl(METADATA_FILE, metadata);
        return res.json({ uploadId, url: null, objectKey });
      }

      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: objectKey,
        ContentType: contentType || "application/octet-stream"
      });

      let url: string;
      try {
        url = await getSignedUrl(s3, putCommand, { expiresIn: 900 });
      } catch (s3Err: any) {
        console.error("s3 presign error:", s3Err);
        return res.status(500).json({ error: "s3_error" });
      }

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
        if (pg) {
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
          await pg.query(
            `INSERT INTO evidence (id, project_id, filename, object_key, content_type, uploader, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7, now())
             ON CONFLICT (id) DO UPDATE SET project_id = EXCLUDED.project_id;`,
            [metadata.id, metadata.projectId, metadata.filename, metadata.objectKey, metadata.contentType, metadata.uploader, metadata.status]
          );
        } else {
          const METADATA_FILE = path.join(dataDir, "evidence.jsonl");
          appendJsonl(METADATA_FILE, metadata);
        }
      } catch (dbErr) {
        console.error("persistMetadata failed:", dbErr);
        const METADATA_FILE = path.join(dataDir, "evidence.jsonl");
        appendJsonl(METADATA_FILE, metadata);
      }

      res.json({ uploadId, url, objectKey });
    } catch (err: any) {
      console.error("upload error:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // mappings: lightweight persistence (Postgres preferred, else JSONL)
  app.post("/mappings", async (req: any, res) => {
    try {
      const { projectId, evidenceId, controlId, notes } = req.body || {};
      if (!projectId || !evidenceId || !controlId) {
        return res.status(400).json({ error: "projectId, evidenceId, controlId are required" });
      }

      const mapping = {
        id: generateId(),
        projectId,
        evidenceId,
        controlId,
        notes: notes || null,
        createdBy: req.user && req.user.id ? req.user.id : null,
        createdAt: new Date().toISOString()
      };

      try {
        if (pg) {
          await pg.query(`
            CREATE TABLE IF NOT EXISTS mappings (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL,
              evidence_id TEXT NOT NULL,
              control_id TEXT NOT NULL,
              notes TEXT,
              created_by TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
          `);
          await pg.query(
            `INSERT INTO mappings (id, project_id, evidence_id, control_id, notes, created_by, created_at)
             VALUES ($1,$2,$3,$4,$5,$6, now())`,
            [mapping.id, mapping.projectId, mapping.evidenceId, mapping.controlId, mapping.notes, mapping.createdBy]
          );
        } else {
          const MAPPINGS_FILE = path.join(dataDir, "mappings.jsonl");
          appendJsonl(MAPPINGS_FILE, mapping);
        }
      } catch (pgErr) {
        console.error("persist mapping failed, falling back to JSONL:", pgErr);
        const MAPPINGS_FILE = path.join(dataDir, "mappings.jsonl");
        appendJsonl(MAPPINGS_FILE, mapping);
      }

      return res.json({ mappingId: mapping.id, createdAt: mapping.createdAt });
    } catch (err: any) {
      console.error("POST /mappings error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // project summary (counts)
  app.get("/projects/:id/summary", async (req, res) => {
    const projectId = String(req.params.id || "");
    if (!projectId) return res.status(400).json({ error: "project_id_required" });

    try {
      let totalEvidence = 0;
      let indexedEvidence = 0;
      let mappingsCount = 0;

      const frameworks = loadFrameworks(dataDir);
      const controlsTotal = frameworks.reduce((acc: number, f: any) => acc + (Array.isArray(f.controls) ? f.controls.length : 0), 0);

      if (pg) {
        try {
          const te = await pg.query("SELECT count(1) as c FROM evidence WHERE project_id = $1", [projectId]);
          totalEvidence = parseInt(String(te.rows?.[0]?.c || "0"), 10);
          const ie = await pg.query("SELECT count(1) as c FROM evidence WHERE project_id = $1 AND status = $2", [projectId, "indexed"]);
          indexedEvidence = parseInt(String(ie.rows?.[0]?.c || "0"), 10);
        } catch (e) {
          totalEvidence = 0;
          indexedEvidence = 0;
        }
      } else {
        try {
          const METADATA_FILE = path.join(dataDir, "evidence.jsonl");
          if (fs.existsSync(METADATA_FILE)) {
            const raw = fs.readFileSync(METADATA_FILE, "utf8");
            const lines = raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
            const projectRows = lines.filter((r: any) => r.projectId === projectId);
            totalEvidence = projectRows.length;
            indexedEvidence = projectRows.filter((r: any) => r.status === "indexed").length;
          }
        } catch (e) {
          // ignore
        }
      }

      if (pg) {
        try {
          const mq = await pg.query("SELECT count(1) as c FROM mappings WHERE project_id = $1", [projectId]);
          mappingsCount = parseInt(String(mq.rows?.[0]?.c || "0"), 10);
        } catch (e) {
          mappingsCount = 0;
        }
      } else {
        try {
          const MAPPINGS_FILE = path.join(dataDir, "mappings.jsonl");
          if (fs.existsSync(MAPPINGS_FILE)) {
            const raw = fs.readFileSync(MAPPINGS_FILE, "utf8");
            const lines = raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
            mappingsCount = lines.filter((m: any) => m.projectId === projectId).length;
          }
        } catch (e) {
          // ignore
        }
      }

      let controlsCovered = 0;
      try {
        let mappedControls: string[] = [];
        if (pg) {
          try {
            const rc = await pg.query("SELECT DISTINCT control_id FROM mappings WHERE project_id = $1", [projectId]);
            mappedControls = rc.rows.map((r: any) => r.control_id);
          } catch (e) {
            mappedControls = [];
          }
        } else {
          const MAPPINGS_FILE = path.join(dataDir, "mappings.jsonl");
          if (fs.existsSync(MAPPINGS_FILE)) {
            const raw = fs.readFileSync(MAPPINGS_FILE, "utf8");
            const lines = raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
            mappedControls = lines.filter((m: any) => m.projectId === projectId).map((m: any) => m.controlId);
          }
        }
        controlsCovered = Array.from(new Set(mappedControls)).length;
      } catch (e) {
        controlsCovered = 0;
      }

      return res.json({
        projectId,
        totalEvidence,
        indexedEvidence,
        mappingsCount,
        controlsTotal,
        controlsCovered,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("GET /projects/:id/summary error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}

/**
 * Helper to create a minimal S3 client for local dev if AWS_ENDPOINT is provided.
 * Credentials are optional - MinIO default creds will be used if none provided.
 */
export function createS3ClientFromEnv(): S3Client | null {
  const AWS_ENDPOINT = sanitizeEnv(process.env.AWS_ENDPOINT || "");
  const REGION = sanitizeEnv(process.env.AWS_REGION || "us-west-2");
  const AWS_ACCESS_KEY_ID = sanitizeEnv(process.env.AWS_ACCESS_KEY_ID || "");
  const AWS_SECRET_ACCESS_KEY = sanitizeEnv(process.env.AWS_SECRET_ACCESS_KEY || "");

  if (!AWS_ENDPOINT && !AWS_ACCESS_KEY_ID) {
    return null;
  }

  const s3Credentials = (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : {
    accessKeyId: AWS_ACCESS_KEY_ID || "minioadmin",
    secretAccessKey: AWS_SECRET_ACCESS_KEY || "minioadmin"
  };

  return new S3Client({
    region: REGION,
    endpoint: AWS_ENDPOINT || undefined,
    credentials: s3Credentials as any,
    forcePathStyle: !!AWS_ENDPOINT,
    maxAttempts: 3
  });
}

/**
 * Optional start helper for quick local runs. This does not replace the legacy index.ts yet,
 * but can be used to run the new scaffold during the refactor.
 */
export async function startServer(opts?: { port?: number; dataDir?: string; databaseUrl?: string; s3Bucket?: string; }) {
  const port = opts?.port || Number(process.env.PORT) || 4000;
  const dataDir = opts?.dataDir || DEFAULT_DATA_DIR;
  const DATABASE_URL = opts?.databaseUrl || sanitizeEnv(process.env.DATABASE_URL || "");
  const s3Bucket = opts?.s3Bucket || sanitizeEnv(process.env.S3_BUCKET || "local-minio-bucket");

  let pg: PgClient | null = null;
  if (DATABASE_URL) {
    pg = new PgClient({ connectionString: DATABASE_URL });
    await pg.connect();
    console.log("Connected to Postgres");
  }

  const s3 = createS3ClientFromEnv();

  const app = createApp({ pg, s3, s3Bucket, dataDir });

  if (s3) {
    // ensure bucket exists in dev
    try {
      await s3.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    } catch (err) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: s3Bucket }));
        console.log("Created S3 bucket:", s3Bucket);
      } catch (createErr) {
        console.warn("Failed to create bucket:", createErr);
      }
    }
  }

  app.listen(port, () => {
    console.log(`Prognos API listening on ${port}`);
  });

  return { app, pg, s3 };
}
