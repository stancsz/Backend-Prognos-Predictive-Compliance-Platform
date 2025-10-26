#!/usr/bin/env node
'use strict';

try {
  // This file intentionally loads and runs the test file which throws on failure.
  require('./sanitize_env.test.js');
  console.log('All sanitizeEnv tests passed');
  process.exit(0);
} catch (err) {
  console.error('sanitizeEnv tests failed:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(2);
}
