'use strict';

const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve(__dirname, '../config/toolchain.json');
const toolchain = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function requireVersion(value, name) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Invalid ${name} version in scripts/config/toolchain.json.`);
  }
}

requireVersion(toolchain.node, 'Node');
requireVersion(toolchain.shopifyCli, 'Shopify CLI');
requireVersion(toolchain.semgrep, 'Semgrep');
requireVersion(toolchain.gitleaks?.version, 'Gitleaks');
if (!/^[a-f0-9]{64}$/.test(toolchain.gitleaks?.linuxX64Sha256 || '')) {
  throw new Error('Invalid Gitleaks Linux x64 SHA-256 in scripts/config/toolchain.json.');
}

process.stdout.write(`node=${toolchain.node}\n`);
process.stdout.write(`shopify_cli=${toolchain.shopifyCli}\n`);
process.stdout.write(`semgrep=${toolchain.semgrep}\n`);
process.stdout.write(`gitleaks_version=${toolchain.gitleaks.version}\n`);
process.stdout.write(`gitleaks_sha256=${toolchain.gitleaks.linuxX64Sha256}\n`);
