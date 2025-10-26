/* Node.js
  E2E: worker_idempotency_e2e.js
  Purpose:
    - Upload the same file content twice (two separate uploads).
    - Verify both evidence rows are processed (status='indexed').
    - Verify both rows produce the same checksum (worker deterministic).
  Usage:
    DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
    AWS_ENDPOINT=http://localhost:9000 \
    AWS_ACCESS_KEY_ID=minioadmin \
    AWS_SECRET_ACCESS_KEY=minioadmin \
    S3_BUCKET=test-bucket \
    node packages/api/test/worker_idempotency_e2e.js
*/
const fetch = require('node-fetch');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const S3_BUCKET = process.env.S3_BUCKET || 'test-bucket';
const PAYLOAD_PATH = path.resolve(__dirname, 'fixtures', 'sample.txt');

// Ensure fixture exists (create simple file if missing)
if (!fs.existsSync(path.dirname(PAYLOAD_PATH))) {
  fs.mkdirSync(path.dirname(PAYLOAD_PATH), { recursive: true });
}
if (!fs.existsSync(PAYLOAD_PATH)) {
  fs.writeFileSync(PAYLOAD_PATH, 'idempotency-test-payload\n');
}

async function presignUpload(filename = 'sample.txt') {
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) throw new Error(`presign failed: ${res.status} ${await res.text()}`);
  return res.json(); // { uploadId, objectKey, url }
}

async function putObject(url, filePath) {
  const data = fs.readFileSync(filePath);
  const res = await fetch(url, { method: 'PUT', body: data });
  if (!res.ok) throw new Error(`PUT failed: ${res.status} ${await res.text()}`);
  return true;
}

async function getEvidenceRows(client, limit = 5) {
  const r = await client.query('SELECT id, status, checksum, object_key, created_at, indexed_at FROM evidence ORDER BY created_at DESC LIMIT $1', [limit]);
  return r.rows;
}

async function waitForIndexed(client, objectKey, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await client.query('SELECT id, status, checksum, indexed_at FROM evidence WHERE object_key = $1 ORDER BY created_at DESC', [objectKey]);
    if (r.rowCount > 0 && r.rows[0].status === 'indexed') return r.rows[0];
    await new Promise((r2) => setTimeout(r2, 1000));
  }
  throw new Error(`Timed out waiting for objectKey=${objectKey} to become indexed`);
}

(async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    console.log('1) Presign & upload - first upload');
    const p1 = await presignUpload('sample.txt');
    await putObject(p1.url, PAYLOAD_PATH);
    console.log('first upload PUT complete, waiting for worker to index...');
    const firstIndexed = await waitForIndexed(client, p1.objectKey, 60000);
    console.log('first indexed:', firstIndexed);

    console.log('2) Presign & upload - second upload (same content)');
    const p2 = await presignUpload('sample.txt');
    await putObject(p2.url, PAYLOAD_PATH);
    console.log('second upload PUT complete, waiting for worker to index...');
    const secondIndexed = await waitForIndexed(client, p2.objectKey, 60000);
    console.log('second indexed:', secondIndexed);

    if (!firstIndexed.checksum || !secondIndexed.checksum) {
      throw new Error('Missing checksum on one of the indexed rows');
    }
    if (firstIndexed.checksum !== secondIndexed.checksum) {
      throw new Error(`Checksum mismatch: ${firstIndexed.checksum} !== ${secondIndexed.checksum}`);
    }

    console.log('SUCCESS: both uploads indexed with identical checksum (worker deterministic).');
    // Print the two evidence rows for diagnostics
    const rows = await getEvidenceRows(client, 10);
    console.log('Recent evidence rows (for debug):');
    rows.forEach((r) => console.log(JSON.stringify(r)));

    process.exit(0);
  } catch (err) {
    console.error('E2E failed:', err && err.message ? err.message : err);
    // Dump latest evidence rows for investigation
    try {
      const rows = await getEvidenceRows(client, 20);
      console.error('Recent evidence rows:');
      rows.forEach((r) => console.error(JSON.stringify(r)));
    } catch (e) {
      // ignore
    }
    process.exit(1);
  } finally {
    await client.end();
  }
})();
