'use strict';
const assert = require('assert');

/**
 * sanitizeEnv(value): Mirrors sanitizer added to API/worker.
 * - Removes Unicode Separator (Z) and Other (C) classes (covers NBSP, BOM, zero-width, control chars)
 * - Trims ASCII whitespace (space, tab, CR, LF)
 */
function sanitizeEnv(value) {
  if (value == null) return '';
  const s = String(value);
  // remove Unicode Z (separators) and C (control/other) characters
  const removeRe = /[\p{Z}\p{C}]+/gu;
  let cleaned = s.replace(removeRe, '');
  // trim ASCII whitespace
  cleaned = cleaned.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
  return cleaned;
}

// Test vectors
const vectors = [
  {
    name: 'plain string unchanged',
    input: 'postgres://devuser:devpass@localhost:5432/plts_dev',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'leading BOM (U+FEFF)',
    input: '\uFEFFpostgres://devuser:devpass@localhost:5432/plts_dev',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'embedded zero-width space (U+200B)',
    input: 'postgres://devuser:\u200Bdevpass@localhost:5432/plts_dev',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'NBSP (U+00A0) and trailing ASCII space',
    input: 'postgres://devuser:devpass@localhost:5432/plts_dev\u00A0 ',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'control characters (NUL, SOH) inside string',
    input: 'postgres://devuser:\x00devpass\x01@localhost:5432/plts_dev',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'CRLF and surrounding ASCII whitespace',
    input: '\r\n  postgres://devuser:devpass@localhost:5432/plts_dev  \r\n',
    expected: 'postgres://devuser:devpass@localhost:5432/plts_dev',
  },
  {
    name: 'S3 bucket with invisible separators and spaces',
    input: '\u200Blocal\u00A0-minio-\u200Dbucket ',
    expected: 'local-minio-bucket',
  },
];

// Run tests
for (const v of vectors) {
  const out = sanitizeEnv(v.input);
  try {
    assert.strictEqual(out, v.expected);
    console.log(`PASS: ${v.name}`);
  } catch (err) {
    console.error(`FAIL: ${v.name}`);
    console.error('  input (escaped):', escapeForDebug(v.input));
    console.error('  expected:', v.expected);
    console.error('  actual  :', out);
    throw err;
  }
}

function escapeForDebug(s) {
  // show hex bytes for non-printables to ease forensics
  const buf = Buffer.from(String(s), 'utf8');
  return buf.toString('hex').match(/.{1,2}/g).join(' ');
}

module.exports = { sanitizeEnv };
