const { Client } = require('pg');

(async function() {
  const conn = process.env.FORCE_DB_URL || process.env.DATABASE_URL || 'postgres://devuser:devpass@localhost:5432/plts_dev';
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    const res = await client.query('SELECT id, status, object_key, checksum, created_at, indexed_at FROM evidence ORDER BY created_at DESC LIMIT 20');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('query failed:', e && e.message ? e.message : e);
    process.exit(2);
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
