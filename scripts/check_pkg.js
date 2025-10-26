const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'packages', 'api', 'package.json');

try {
  const b = fs.readFileSync(p);
  console.log('path:', p);
  console.log('len:', b.length);
  console.log('first-bytes-raw:', b.slice(0, 12).toString());
  console.log('first-bytes-hex :', b.slice(0, 12).toString('hex'));
  try {
    const obj = JSON.parse(b.toString());
    console.log('parse-ok: true, name:', obj.name || '(no name)');
  } catch (e) {
    console.error('parse-ok: false, error:', e.message);
  }
} catch (err) {
  console.error('error reading file:', err.message);
  process.exit(1);
}
