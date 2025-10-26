#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  (() => {
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || '5432';
    const user = process.env.POSTGRES_USER || 'postgres';
    const password = process.env.POSTGRES_PASSWORD || '';
    const db = process.env.POSTGRES_DB || 'postgres';
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
  })();

(async () => {
  try {
    console.log('Connecting to database:', databaseUrl.startsWith('postgresql://') ? 'postgresql://<REDACTED>' : databaseUrl);
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    const migrationsDir = path.resolve(__dirname, '../../../infra/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error('Migrations directory not found:', migrationsDir);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in', migrationsDir);
      await client.end();
      process.exit(0);
    }

    for (const file of files) {
      const full = path.join(migrationsDir, file);
      console.log('Applying migration:', file);
      const sql = fs.readFileSync(full, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Applied:', file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying migration:', file, err.message || err);
        throw err;
      }
    }

    await client.end();
    console.log('All migrations applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
