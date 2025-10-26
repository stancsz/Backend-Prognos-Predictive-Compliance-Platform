import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import request from "supertest";
import { createApp } from "../../src/app";

const tmpPrefix = `prognos-integ-${Date.now()}`;
const tmpDir = path.join(os.tmpdir(), tmpPrefix);

describe("integration: uploads → mappings → summary (JSONL fallback)", function () {
  this.timeout(20_000);

  const projectId = `proj-${Date.now().toString(36)}`;
  let app: any;
  let uploadId: string | null = null;

  before(async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Use JSONL fallback by not providing PG or S3 clients.
    app = createApp({ dataDir: tmpDir, pg: null, s3: null, s3Bucket: "local-minio-bucket" });
  });

  after(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  it("POST /uploads should return upload metadata and persist to evidence.jsonl", async () => {
    const res = await request(app)
      .post("/uploads")
      .send({ filename: "sample.txt", projectId, contentType: "text/plain" })
      .expect(200);

    assert.ok(res.body.uploadId, "uploadId expected");
    assert.ok(res.body.objectKey, "objectKey expected");
    uploadId = res.body.uploadId;

    // Verify evidence.jsonl contains the record
    const evidenceFile = path.join(tmpDir, "evidence.jsonl");
    const raw = fs.readFileSync(evidenceFile, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    const found = lines.find((r: any) => r.id === uploadId && r.projectId === projectId);
    assert.ok(found, "evidence.jsonl should contain the uploaded metadata");
  });

  it("POST /mappings should persist mapping to mappings.jsonl", async () => {
    assert.ok(uploadId, "previous uploadId required");

    const res = await request(app)
      .post("/mappings")
      .set("x-user-email", "tester@example.com")
      .send({ projectId, evidenceId: uploadId, controlId: "ctrl-1", notes: "test mapping" })
      .expect(200);

    assert.ok(res.body.mappingId, "mappingId expected");

    const mappingsFile = path.join(tmpDir, "mappings.jsonl");
    const raw = fs.readFileSync(mappingsFile, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    const found = lines.find((m: any) => m.id === res.body.mappingId && m.projectId === projectId);
    assert.ok(found, "mappings.jsonl should contain the mapping");
  });

  it("GET /projects/:id/summary should reflect evidence and mapping counts", async () => {
    const res = await request(app).get(`/projects/${projectId}/summary`).expect(200);
    const body = res.body;
    assert.strictEqual(body.projectId, projectId);
    assert.ok(body.totalEvidence >= 1, "totalEvidence should be at least 1");
    assert.ok(body.mappingsCount >= 1, "mappingsCount should be at least 1");
    assert.ok(typeof body.controlsTotal === "number", "controlsTotal should be numeric");
    assert.ok(typeof body.controlsCovered === "number", "controlsCovered should be numeric");
  });
});
