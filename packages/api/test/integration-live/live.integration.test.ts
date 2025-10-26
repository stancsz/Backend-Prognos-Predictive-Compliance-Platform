import assert from "assert";
import os from "os";
import path from "path";
import fs from "fs";
import request from "supertest";
import { createApp } from "../../src/app";
import { createPgClientFromEnv, createS3ClientFromEnv, ensureBucket, clearDbTables } from "../helpers/live-helpers";

describe("live-integration: uploads → mappings → summary (Postgres + MinIO)", function () {
  this.timeout(120_000);

  const projectId = `live-proj-${Date.now().toString(36)}`;
  const tmpDir = path.join(os.tmpdir(), `prognos-live-${Date.now()}`);
  let pg: any;
  let s3: any;
  let app: any;

  before(async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Create real clients from env (docker-compose will expose services on localhost)
    pg = await createPgClientFromEnv();
    s3 = createS3ClientFromEnv();

    // Ensure bucket exists
    await ensureBucket(s3, process.env.S3_BUCKET || "local-minio-bucket");

    // Clean DB tables
    await clearDbTables(pg);

    app = createApp({ pg, s3, s3Bucket: process.env.S3_BUCKET || "local-minio-bucket", dataDir: tmpDir });
  });

  after(async () => {
    try {
      // best-effort cleanup
      await pg.end();
    } catch (e) {
      // ignore
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  });

  it("POST /uploads returns presigned url and persists metadata in Postgres", async () => {
    const res = await request(app)
      .post("/uploads")
      .send({ filename: "live-sample.txt", projectId, contentType: "text/plain" })
      .expect(200);

    assert.ok(res.body.uploadId, "uploadId expected");
    assert.ok(res.body.objectKey, "objectKey expected");

    // Verify row in Postgres
    const r = await pg.query("SELECT id, project_id, object_key FROM evidence WHERE id = $1", [res.body.uploadId]);
    assert.strictEqual(r.rowCount, 1, "evidence row should exist in Postgres");
    assert.strictEqual(r.rows[0].project_id, projectId);
  });

  it("POST /mappings persists mapping to Postgres", async () => {
    // create an upload to map
    const up = await request(app)
      .post("/uploads")
      .send({ filename: "live-sample-2.txt", projectId, contentType: "text/plain" })
      .expect(200);
    const evidenceId = up.body.uploadId;

    const res = await request(app)
      .post("/mappings")
      .set("x-user-email", "live-tester@example.com")
      .send({ projectId, evidenceId, controlId: "ctrl-live-1", notes: "live mapping" })
      .expect(200);

    assert.ok(res.body.mappingId, "mappingId expected");

    const mq = await pg.query("SELECT id, project_id, control_id FROM mappings WHERE id = $1", [res.body.mappingId]);
    assert.strictEqual(mq.rowCount, 1, "mapping row should exist in Postgres");
    assert.strictEqual(mq.rows[0].project_id, projectId);
  });

  it("GET /projects/:id/summary reflects DB state", async () => {
    const res = await request(app).get(`/projects/${projectId}/summary`).expect(200);
    const body = res.body;
    assert.strictEqual(body.projectId, projectId);
    assert.ok(body.totalEvidence >= 1, "totalEvidence should be at least 1");
    assert.ok(body.mappingsCount >= 1, "mappingsCount should be at least 1");
  });
});
