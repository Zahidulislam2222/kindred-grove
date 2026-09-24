'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '../..');
const gitleaks = process.env.GITLEAKS_BIN || 'gitleaks';
const syntheticMarker = 'KG_TEST_MARKER_000000000000';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed: ${result.stderr}`);
}

function makeSyntheticRepository() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kindred-grove-gitleaks-'));
  const repo = path.join(tempRoot, 'repo');
  fs.mkdirSync(repo);

  const config = fs.readFileSync(path.join(repositoryRoot, '.gitleaks.toml'), 'utf8');
  const syntheticConfig = `${config}\n[[rules]]\nid = "synthetic-regression-only"\ndescription = "Detect an unmistakable test marker"\nregex = '''KG_TEST_MARKER_[A-Z0-9]{12}'''\nkeywords = ["KG_TEST_MARKER_"]\n`;
  const configPath = path.join(tempRoot, 'gitleaks-synthetic.toml');
  fs.writeFileSync(configPath, syntheticConfig);

  const files = [
    'assets/example.js',
    'blocks/example.liquid',
    'docs/SECURITY.md',
    'scripts/seed-dev-store.mjs',
    'scripts/wholesale-draft-order-worker.js',
    'tests/a11y/axe.spec.ts',
    'tests/security/example.test.cjs',
    'package-lock.json',
    '.env.example',
    '.env',
    '.env.local',
    '.env.stage.local',
    '.env.production',
    'CREDENTIALS.md',
    'nested/.env',
    'nested/CREDENTIALS.md',
  ];

  for (const relativePath of files) {
    const target = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `fixture=${syntheticMarker}\n`);
  }

  run('git', ['init', '--quiet'], repo);
  run('git', ['config', 'user.name', 'Synthetic Gitleaks Test'], repo);
  run('git', ['config', 'user.email', 'gitleaks-test@example.invalid'], repo);
  run('git', ['add', '--force', '--all'], repo);
  run('git', ['commit', '--quiet', '-m', 'synthetic scanner fixture'], repo);

  return { tempRoot, repo, configPath };
}

function scanSyntheticRepository(repo, configPath) {
  const result = spawnSync(gitleaks, [
    'git',
    '--config', configPath,
    '--report-format', 'json',
    '--report-path', '-',
    '--no-banner',
    '--no-color',
    '--redact=100',
    repo,
  ], { encoding: 'utf8', windowsHide: true });

  if (result.error) throw result.error;
  assert.ok([0, 1].includes(result.status), `Gitleaks failed: ${result.stderr}`);
  const findings = JSON.parse(result.stdout || '[]');
  return {
    exitCode: result.status,
    findings: findings.map((finding) => ({
      file: finding.File.replaceAll('\\', '/'),
      rule: finding.RuleID,
    })),
  };
}

test('Gitleaks scans shipping source, docs, tests and .env.example, with only exact root credential-file exclusions', (t) => {
  const fixture = makeSyntheticRepository();
  t.after(() => fs.rmSync(fixture.tempRoot, { recursive: true, force: true }));

  const result = scanSyntheticRepository(fixture.repo, fixture.configPath);
  const files = result.findings.map((finding) => finding.file).sort();

  assert.equal(result.exitCode, 1);
  assert.deepEqual(files, [
    '.env.example',
    '.env.production',
    'assets/example.js',
    'blocks/example.liquid',
    'docs/SECURITY.md',
    'nested/.env',
    'nested/CREDENTIALS.md',
    'scripts/seed-dev-store.mjs',
    'scripts/wholesale-draft-order-worker.js',
    'tests/a11y/axe.spec.ts',
    'tests/security/example.test.cjs',
  ]);
  assert.ok(result.findings.every((finding) => finding.rule === 'synthetic-regression-only'));
});
