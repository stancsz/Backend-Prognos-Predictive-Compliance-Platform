#!/usr/bin/env node
/**
 * ensure_schema.js
 * Simple migration helper that ensures required tables exist.
 * Safe to run repeatedly (uses CREATE TABLE IF NOT EXISTS).
 */

const { Client } = require("pg");

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL || "";
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set. Exiting.");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log("Connected to Postgres, ensuring schema...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT,
        object_key TEXT NOT NULL,
        content_type TEXT,
        uploader TEXT,
        status TEXT,
        checksum TEXT,
        extracted_text TEXT,
        indexed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mappings (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        evidence_id TEXT NOT NULL,
        control_id TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    console.log("Schema ensured successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to ensure schema:", err);
    process.exit(2);
  } finally {
    try { await client.end(); } catch (e) {}
  }
}

run();
