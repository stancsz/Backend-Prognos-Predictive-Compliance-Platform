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

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// Prefer FORCE_DB_URL, otherwise fall back to the known local-dev Postgres (devuser/devpass/plts_dev).
// This avoids relying on possibly-corrupted global envs that were observed during Windows runs.
const CLEAN_DATABASE_URL = (process.env.FORCE_DB_URL && typeof process.env.FORCE_DB_URL === 'string' && process.env.FORCE_DB_URL.trim())
  ? process.env.FORCE_DB_URL.trim()
  : 'postgres://devuser:devpass@localhost:5432/plts_dev';

// Diagnostic: print the resolved DB URL (trimmed)
function hexDump(s) { try { return Buffer.from(s || '').toString('hex').slice(0, 200); } catch (e) { return ''; } }
console.log('TEST DEBUG: resolved DATABASE_URL=', CLEAN_DATABASE_URL);
if (CLEAN_DATABASE_URL.match(/\s/)) {
  console.error('TEST DEBUG: DATABASE_URL contains whitespace characters; hex:', hexDump(CLEAN_DATABASE_URL));
}
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
    // include projectId required by the API
    body: JSON.stringify({ filename, projectId: 'e2e-project' }),
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
  const client = new Client({ connectionString: CLEAN_DATABASE_URL });
  await client.connect();
  try {
    console.log('1) Presign & concurrent upload - two uploads of same content started in parallel');

    // Create presign URLs for two uploads
    const [p1, p2] = await Promise.all([presignUpload('sample.txt'), presignUpload('sample.txt')]);

    // Start both PUTs concurrently to exercise worker concurrency/idempotency
    await Promise.all([putObject(p1.url, PAYLOAD_PATH), putObject(p2.url, PAYLOAD_PATH)]);
    console.log('Both PUTs complete, waiting for worker to index both...');

    // Wait for both objectKeys to be indexed (with individual timeouts)
    const [firstIndexed, secondIndexed] = await Promise.all([
      waitForIndexed(client, p1.objectKey, 60000),
      waitForIndexed(client, p2.objectKey, 60000),
    ]);

    console.log('first indexed:', firstIndexed);
    console.log('second indexed:', secondIndexed);

    if (!firstIndexed.checksum || !secondIndexed.checksum) {
      throw new Error('Missing checksum on one of the indexed rows');
    }
    if (firstIndexed.checksum !== secondIndexed.checksum) {
      throw new Error(`Checksum mismatch: ${firstIndexed.checksum} !== ${secondIndexed.checksum}`);
    }

    // Additionally validate that indexed rows are present and that checksums match across recent rows
    const rows = await getEvidenceRows(client, 20);
    const matching = rows.filter(r => r.checksum === firstIndexed.checksum);
    if (matching.length < 2) {
      console.warn('Warning: fewer than 2 evidence rows share the same checksum; inspect recent rows for dedupe behavior.');
    }

    console.log('SUCCESS: concurrent uploads indexed with identical checksum (worker deterministic).');
    console.log('Recent evidence rows (for debug):');
    rows.forEach((r) => console.log(JSON.stringify(r)));

    process.exit(0);
  } catch (err) {
    console.error('E2E failed:', err && err.message ? err.message : err);
    // Dump latest evidence rows for investigation
    try {
      const rows = await getEvidenceRows(client, 50);
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
