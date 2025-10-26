#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const tmp = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
const files = [
  'ci_api_env_FORCE_DB_URL_hex.txt',
  'ci_api_env_DATABASE_URL_hex.txt',
  'ci_api_env_S3_BUCKET_hex.txt',
  'ci_api_env_AWS_ENDPOINT_hex.txt',
];

let failed = false;

/**
 * Validator: reads hex dump files written by infra/scripts/write_env_hex.js,
 * decodes to UTF-8 and asserts there are NO Unicode Separator (Z) or Other/Control (C)
 * category characters present. This mirrors sanitizeEnv and ensures CI fails fast
 * when wrappers inject invisible/trailing/control bytes.
 */
for (const fname of files) {
  const full = path.join(tmp, fname);
  if (!fs.existsSync(full)) {
    console.warn(`MISSING: ${full}`);
    // treat missing file as warning but not fatal so CI can surface missing artifact separately
    continue;
  }

  const raw = fs.readFileSync(full, 'utf8').trim();
  const hex = raw.replace(/\s+/g, '');
  if (!hex) {
    console.error(`EMPTY_HEX: ${full}`);
    failed = true;
    continue;
  }

  let decoded;
  try {
    decoded = Buffer.from(hex, 'hex').toString('utf8');
  } catch (err) {
    console.error(`INVALID_HEX: ${full} -> ${String(err.message || err)}`);
    failed = true;
    continue;
  }

  // Unicode property escape: Separator (Z) and Other/Control (C) classes
  const badRe = /[\p{Z}\p{C}]+/u;
  const m = badRe.exec(decoded);
  if (m) {
    const cp = m[0].codePointAt(0);
    console.error(`BAD_BYTES in ${fname}: matched codepoint U+${cp.toString(16).toUpperCase()}`);
    console.error(`Decoded string (visible): "${decoded}"`);
    console.error(`Decoded hex: ${Buffer.from(decoded, 'utf8').toString('hex')}`);
    failed = true;
  } else {
    console.log(`OK: ${fname} => "${decoded}"`);
  }
}

if (failed) {
  console.error('ENV HEX VALIDATION: FAILED');
  process.exit(2);
} else {
  console.log('ENV HEX VALIDATION: PASSED');
  process.exit(0);
}
