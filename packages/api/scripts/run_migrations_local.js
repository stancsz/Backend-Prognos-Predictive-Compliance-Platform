#!/usr/bin/env node
/**
 * Simple migration runner for local/CI use.
 * - Applies infra/migrations/*.sql in lexicographic order to the DATABASE_URL (or FORCE_DB_URL).
 * - Idempotent if migrations are written to be safe (CREATE TABLE IF NOT EXISTS).
 *
 * Usage:
 *   DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev node packages/api/scripts/run_migrations_local.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const migrationsDir = path.join(__dirname, '..', '..', 'infra', 'migrations');
  const databaseUrl = process.env.FORCE_DB_URL || process.env.DATABASE_URL || 'postgres://devuser:devpass@localhost:5432/plts_dev';

  console.log('MIGRATIONS: using DATABASE_URL=', databaseUrl.replace(/:[^:]+@/, ':*****@'));

  if (!fs.existsSync(migrationsDir)) {
    console.warn('MIGRATIONS: no migrations directory found at', migrationsDir);
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('MIGRATIONS: no .sql files to apply');
    process.exit(0);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    for (const file of files) {
      const full = path.join(migrationsDir, file);
      console.log('MIGRATIONS: applying', file);
      const sql = fs.readFileSync(full, { encoding: 'utf8' });
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('MIGRATIONS: applied', file);
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('MIGRATIONS: failed to apply', file, e && e.message ? e.message : e);
        process.exitCode = 2;
        throw e;
      }
    }
    console.log('MIGRATIONS: complete');
    await client.end();
  } catch (err) {
    console.error('MIGRATIONS: fatal', err && err.message ? err.message : err);
    try { await client.end(); } catch (_) {}
    process.exit(2);
  }
}

main();
