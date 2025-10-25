/**
 * Simple E2E runner for the uploads flow.
 * - POST /uploads to get a presigned PUT URL
 * - PUT a small payload to the presigned URL
 * - Verify the metadata record exists in Postgres
 *
 * Usage:
 *   node test/upload_e2e.js
 * Environment:
 *   API_URL (default: http://localhost:4000)
 *   DATABASE_URL (default: postgresql://devuser:devpass@localhost:5432/plts_dev)
 */

const fetch = global.fetch || require('node-fetch');
const { Client } = require('pg');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://devuser:devpass@localhost:5432/plts_dev';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    console.log('E2E: Starting upload flow against', API_URL);

    // 1) Request presigned upload URL
    const filename = 'e2e-test.txt';
    const projectId = 'e2e-project';
    const contentType = 'text/plain';

    const postRes = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, projectId, contentType })
    });

    if (!postRes.ok) {
      const body = await postRes.text();
      throw new Error(`POST /uploads failed: ${postRes.status} ${postRes.statusText} - ${body}`);
    }

    const { uploadId, url, objectKey } = await postRes.json();
    console.log('E2E: Received uploadId=', uploadId, 'objectKey=', objectKey);

    // 2) PUT a small payload to the presigned URL
    const payload = Buffer.from('Hello from e2e test\n');
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: payload
    });

    if (!(putRes.status === 200 || putRes.status === 201 || putRes.status === 204)) {
      const body = await putRes.text().catch(() => '<no body>');
      throw new Error(`PUT to presigned URL failed: ${putRes.status} ${putRes.statusText} - ${body}`);
    }
    console.log('E2E: Uploaded payload to presigned URL, status=', putRes.status);

    // 3) Wait briefly for worker to pick up (PoC) — allow Postgres write to be visible
    await sleep(1000);

    // 4) Verify metadata exists in Postgres
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const q = 'SELECT id, project_id, filename, object_key, status, checksum, created_at FROM evidence WHERE id = $1';
    const res = await client.query(q, [uploadId]);

    if (res.rows.length === 0) {
      console.error('E2E: No metadata record found in Postgres for id=', uploadId);
      await client.end();
      process.exit(2);
    }

    console.log('E2E: Metadata record found:', res.rows[0]);
    await client.end();

    console.log('E2E: SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('E2E: ERROR', err);
    process.exit(1);
  }
})();
