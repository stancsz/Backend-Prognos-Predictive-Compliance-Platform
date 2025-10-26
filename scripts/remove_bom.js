const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'packages', 'api', 'package.json');

try {
  const b = fs.readFileSync(p);
  const first = b.slice(0, 8).toString('hex');
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
    fs.writeFileSync(p, b.slice(3));
    console.log('BOM removed');
  } else {
    console.log('No BOM found');
  }
  const after = fs.readFileSync(p).slice(0, 8).toString('hex');
  console.log('first-bytes-before (hex):', first);
  console.log('first-bytes-after  (hex):', after);
} catch (err) {
  console.error('error processing file:', err);
  process.exit(1);
}
