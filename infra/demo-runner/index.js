const fetch = require('node-fetch');
const fs = require('fs');
const { Client } = require('pg');

const API_URL = process.env.API_URL || 'http://api:4000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://devuser:devpass@postgres:5432/plts_dev';
const SAMPLE_PATH = './sample.txt';
const TIMEOUT_MS = 120000;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForApiReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${API_URL}/ready`);
      if (r.ok) {
        const j = await r.json();
        if (j.ready) return true;
      }
    } catch (e) {
      // ignore
    }
    await sleep(1000);
  }
  throw new Error('API not ready after timeout');
}

async function main() {
  console.log('Demo: waiting for API ready...');
  await waitForApiReady();

  console.log('Demo: requesting presign URL...');
  const body = { filename: 'sample.txt', projectId: 'demo', contentType: 'text/plain' };
  const r = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

  if (!r.ok) {
    console.error('presign failed', r.status, await r.text());
    process.exit(2);
  }

  const j = await r.json();
  const { uploadId, url, objectKey } = j;
  console.log('Demo: got presign', { uploadId, objectKey });

  console.log('Demo: uploading sample file to presigned URL...');
  const fileBuffer = fs.readFileSync(SAMPLE_PATH);
  const putRes = await fetch(url, { method: 'PUT', body: fileBuffer, headers: { 'Content-Type': 'text/plain' } });
  if (!putRes.ok) {
    console.error('PUT to presigned URL failed', putRes.status, await putRes.text());
    process.exit(3);
  }
  console.log('Demo: upload complete, polling database for indexing...');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    const res = await client.query('SELECT status, checksum, indexed_at FROM evidence WHERE id = $1', [uploadId]);
    if (res && res.rows && res.rows[0]) {
      const row = res.rows[0];
      console.log('Demo: row:', row);
      if (row.status === 'indexed') {
        console.log('Demo: SUCCESS - indexed', { checksum: row.checksum, indexed_at: row.indexed_at });
        await client.end();
        process.exit(0);
      }
    }
    await sleep(2000);
  }

  console.error('Demo: timeout waiting for indexing');
  await client.end();
  process.exit(4);
}

main().catch((e) => {
  console.error('Demo runner error', e && e.message ? e.message : e);
  process.exit(1);
});
