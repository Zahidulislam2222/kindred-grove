'use strict';

const names = process.argv.slice(2);
if (names.length === 0) {
  process.stderr.write('CI preflight needs at least one environment variable name.\n');
  process.exitCode = 2;
} else {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    process.stderr.write(`CI preflight missing required configuration: ${missing.join(', ')}.\n`);
    process.exitCode = 1;
  }
}
