'use strict';

// javascript
// infra/scripts/write_env_hex.js
// Writes UTF-8 hex dumps of selected environment variables to %TEMP%
// so you can inspect exact bytes the shell will pass to child processes.

const fs = require('fs');
const os = require('os');
const path = require('path');

function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

const TMP = process.env.TEMP || os.tmpdir();
const items = [
  { name: 'FORCE_DB_URL', val: process.env.FORCE_DB_URL || '' },
  { name: 'DATABASE_URL', val: process.env.DATABASE_URL || '' },
  { name: 'S3_BUCKET', val: process.env.S3_BUCKET || '' },
  { name: 'AWS_ENDPOINT', val: process.env.AWS_ENDPOINT || '' },
];

items.forEach(it => {
  const bytes = Buffer.from(it.val, 'utf8');
  const outPath = path.join(TMP, `ci_api_env_${it.name}_hex.txt`);
  fs.writeFileSync(outPath, toHex(bytes), { encoding: 'ascii' });
  console.log(`wrote ${outPath}`);
});
