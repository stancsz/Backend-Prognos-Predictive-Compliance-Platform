/**
 * E2E test that uploads a file then polls the worker /health endpoint
 * until the evidence row is indexed.
 *
 * Usage:
 *   node test/worker_health_e2e.js
 *
 * Environment:
 *   API_URL (default: http://localhost:4000)
 *   WORKER_URL (default: http://localhost:4001)
 *   DATABASE_URL (default: postgresql://devuser:devpass@localhost:5432/plts_dev)
 */

const fetch = global.fetch || require('node-fetch');
const { Client } = require('pg');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:4001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://devuser:devpass@localhost:5432/plts_dev';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollWorkerForIndex(uploadId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${WORKER_URL}/health`);
      if (res.ok) {
        const body = await res.json();
        if (body && body.lastIndexedAt) {
          // Verify DB row is indexed
          const client = new Client({ connectionString: DATABASE_URL });
          await client.connect();
          const q = 'SELECT status, checksum, indexed_at FROM evidence WHERE id = $1';
          const r = await client.query(q, [uploadId]);
          await client.end();
          if (r.rows.length > 0 && r.rows[0].status === 'indexed') {
            return { ok: true, row: r.rows[0], worker: body };
          }
        }
      }
    } catch (err) {
      // ignore transient errors
    }
    await sleep(1000);
  }
  return { ok: false };
}

(async () => {
  try {
    console.log('Worker-health E2E: Starting upload flow against', API_URL);

    // 1) Request presigned upload URL
    const filename = 'e2e-worker-test.txt';
    const projectId = 'e2e-worker';
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
    console.log('Worker-health E2E: Received uploadId=', uploadId, 'objectKey=', objectKey);

    // 2) PUT a small payload to the presigned URL
    const payload = Buffer.from('Hello from worker-health e2e test\n');
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: payload
    });

    if (!(putRes.status === 200 || putRes.status === 201 || putRes.status === 204)) {
      const body = await putRes.text().catch(() => '<no body>');
      throw new Error(`PUT to presigned URL failed: ${putRes.status} ${putRes.statusText} - ${body}`);
    }
    console.log('Worker-health E2E: Uploaded payload, status=', putRes.status);

    // 3) Poll worker /health and DB until indexed (up to 60s)
    console.log('Worker-health E2E: Polling worker /health for indexing (timeout 60s)...');
    const result = await pollWorkerForIndex(uploadId, 60000);

    if (!result.ok) {
      console.error('Worker-health E2E: timed out waiting for indexing');
      process.exit(2);
    }

    console.log('Worker-health E2E: Indexed row:', result.row);
    console.log('Worker-health E2E: Worker health payload:', result.worker);
    console.log('Worker-health E2E: SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Worker-health E2E: ERROR', err);
    process.exit(1);
  }
})();
