'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const workflowDir = path.join(root, '.github/workflows');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const workflowFiles = fs.readdirSync(workflowDir).filter((name) => name.endsWith('.yml'));

function runNode(args, env = process.env) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('every external workflow action is pinned to a full SHA with a release comment', () => {
  for (const file of workflowFiles) {
    const source = read(path.join('.github/workflows', file));
    assert.doesNotMatch(source, /@latest\b/i, `${file} must not use mutable latest refs`);
    for (const line of source.split(/\r?\n/).filter((entry) => /^\s*uses:\s*/.test(entry))) {
      const match = line.match(/^\s*uses:\s*([^\s#]+)\s+#\s+(v\S+)\s*$/);
      assert.ok(match, `${file} action ref needs a full SHA and nearby version comment: ${line.trim()}`);
      const actionRef = match[1].split('@')[1];
      assert.match(actionRef, /^[a-f0-9]{40}$/i, `${file} action is not immutably pinned`);
    }
  }
});

test('central toolchain manifest is exact and workflows read it', () => {
  const manifest = JSON.parse(read('scripts/config/toolchain.json'));
  const versions = [manifest.node, manifest.shopifyCli, manifest.semgrep, manifest.gitleaks?.version];
  assert.ok(versions.every((version) => /^\d+\.\d+\.\d+$/.test(version)), 'toolchain versions must be exact semantic versions');
  assert.match(manifest.gitleaks.linuxX64Sha256, /^[a-f0-9]{64}$/);

  const output = runNode(['scripts/ci/toolchain.cjs']);
  assert.equal(output.status, 0, output.stderr);
  const emitted = Object.fromEntries(output.stdout.trim().split(/\r?\n/).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  assert.deepEqual({
    node: emitted.node,
    shopify_cli: emitted.shopify_cli,
    semgrep: emitted.semgrep,
    gitleaks_version: emitted.gitleaks_version,
  }, {
    node: manifest.node,
    shopify_cli: manifest.shopifyCli,
    semgrep: manifest.semgrep,
    gitleaks_version: manifest.gitleaks.version,
  }, 'toolchain helper must emit the manifest values');
  assert.ok(workflowFiles.every((file) => {
    const source = read(path.join('.github/workflows', file));
    return !source.includes('setup-node') || source.includes('scripts/ci/toolchain.cjs');
  }), 'workflows using setup-node must use the central toolchain manifest');
});

test('manual Shopify workflows fail closed on missing required configuration without echoing values', () => {
  const fakeValue = 'synthetic-ci-only-value';
  const result = runNode(['scripts/ci/require-env.cjs', 'CI_TEST_REQUIRED'], {
    ...process.env,
    CI_TEST_REQUIRED: '',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CI_TEST_REQUIRED/);
  assert.equal(result.stderr.includes(fakeValue), false);

  for (const file of ['e2e.yml', 'accessibility.yml', 'visual-regression.yml', 'lighthouse-ci.yml', 'deploy-dev.yml', 'deploy-staging.yml']) {
    const source = read(path.join('.github/workflows', file));
    assert.match(source, /scripts\/ci\/require-env\.cjs/, `${file} must fail preflight when required configuration is absent`);
    assert.doesNotMatch(source, /skip=true|skipped — secrets not provisioned/i, `${file} must not report missing credentials as a green skip`);
  }
});

test('CI harnesses use npm ci, CLI is exact, and no workflow exposes CLI token as an argument', () => {
  for (const file of workflowFiles) {
    const source = read(path.join('.github/workflows', file));
    assert.doesNotMatch(source, /\bshopify\s+[^\n]*--password\b/i, `${file} must pass the token only by supported environment variable`);
    for (const install of source.matchAll(/\bnpm\s+install\b[^\n]*/g)) {
      assert.match(install[0], /npm install --global "@shopify\/cli@\$\{SHOPIFY_CLI_VERSION\}"/, `${file} may only globally install the exact central Shopify CLI version`);
    }
  }

  for (const file of ['e2e.yml', 'accessibility.yml', 'visual-regression.yml']) {
    assert.match(read(path.join('.github/workflows', file)), /npm ci --no-audit --no-fund/);
  }
  for (const file of ['e2e.yml', 'accessibility.yml', 'visual-regression.yml']) {
    const source = read(path.join('.github/workflows', file));
    assert.match(source, /SHOPIFY_STORE="\$SHOPIFY_FLAG_STORE" node scripts\/ci\/read-theme-preview\.cjs/);
    assert.match(source, /SHOPIFY_STORE: \$\{\{ secrets\.SHOPIFY_STORE \}\}/);
  }
  for (const file of ['e2e.yml', 'accessibility.yml', 'visual-regression.yml']) {
    assert.match(read(path.join('.github/workflows', file)), /shopify theme delete --theme "\$THEME_ID" --force/);
  }
  assert.doesNotMatch(read('.github/workflows/ci-security.yml'), /\$\{\{\s*secrets\./);
  assert.match(read('.github/workflows/ci-security.yml'), /semgrep==\$\{SEMGREP_VERSION\}.*--error.*p\/security-audit.*--metrics=off/s);
  assert.match(read('.github/workflows/ci-security.yml'), /node --test tests\/security\/\*\.test\.cjs/);
  assert.match(read('.github/workflows/gitleaks.yml'), /fetch-depth:\s*0/);
});

test('all theme release workflows require manual target selection and fail closed pending drift/parity gate', () => {
  for (const file of ['deploy-dev.yml', 'deploy-staging.yml', 'deploy-production.yml']) {
    const source = read(path.join('.github/workflows', file));
    assert.match(source, /^on:\n\s+workflow_dispatch:/m, `${file} must be manually triggered`);
    assert.match(source, /inputs:\n\s+target:/, `${file} must require an explicit target`);
    assert.doesNotMatch(source, /^\s+(?:push|pull_request):/m, `${file} must not auto-deploy from a branch event`);
    assert.doesNotMatch(source, /shopify\s+theme\s+push|--allow-live|--publish\b/i, `${file} must not currently write or publish a theme`);
    assert.match(source, /block-theme-deploy\.cjs/, `${file} must fail closed until the parity release gate exists`);
  }
});

test('Percy and Lighthouse integrations are optional manual runs, outside required offline checks', () => {
  for (const file of ['visual-regression.yml', 'lighthouse-ci.yml']) {
    const source = read(path.join('.github/workflows', file));
    assert.match(source, /^on:\n\s+workflow_dispatch:/m);
    assert.doesNotMatch(source, /^\s+(?:pull_request|push|schedule):/m);
    assert.doesNotMatch(source, /required_status_checks|branch-protection/i);
  }
  const ci = read('.github/workflows/ci-security.yml');
  assert.doesNotMatch(ci, /percy|lighthouse|shopify\/lighthouse/i);
  const branchSample = JSON.parse(read('.github/branch-protection.json'));
  assert.equal(branchSample.sample_only, true);
  assert.equal(branchSample.not_applied_to_remote, true);
  assert.deepEqual(branchSample.settings.required_status_checks.contexts, [
    'CI / Security and config regression',
    'Theme Check / Liquid linting',
    'Gitleaks / Full-history secret scan',
  ]);
});

test('Shopify preview output helper validates URLs and does not print raw JSON', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kg-theme-preview-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const inputPath = path.join(tempDir, 'result.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    theme: { id: 123, preview_url: 'https://store.myshopify.com/?preview_theme_id=123' },
  }));
  const storeEnv = { ...process.env, SHOPIFY_STORE: 'store.myshopify.com' };
  const valid = runNode(['scripts/ci/read-theme-preview.cjs', inputPath], storeEnv);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /^base_url=https:\/\/store\.myshopify\.com$/m);
  assert.match(valid.stdout, /^theme_id=123$/m);
  assert.doesNotMatch(valid.stdout, /"theme"|"preview_url"/);

  fs.writeFileSync(inputPath, JSON.stringify({
    theme: { id: 123, preview_url: 'https://attacker.example/?preview_theme_id=123' },
  }));
  const wrongHost = runNode(['scripts/ci/read-theme-preview.cjs', inputPath], storeEnv);
  assert.notEqual(wrongHost.status, 0);
  assert.match(wrongHost.stderr, /does not match SHOPIFY_STORE/);

  for (const previewUrl of [
    'https://store.myshopify.com/?preview_theme_id=999',
    'https://store.myshopify.com/',
    'https://store.myshopify.com/?preview_theme_id=123&preview_theme_id=123',
  ]) {
    fs.writeFileSync(inputPath, JSON.stringify({ theme: { id: 123, preview_url: previewUrl } }));
    const mismatchedId = runNode(['scripts/ci/read-theme-preview.cjs', inputPath], storeEnv);
    assert.notEqual(mismatchedId.status, 0);
    assert.match(mismatchedId.stderr, /does not match its theme ID/);
  }

  fs.writeFileSync(inputPath, JSON.stringify({
    theme: { id: 123, preview_url: 'https://user:pass@store.myshopify.com/?preview_theme_id=123' },
  }));
  const invalid = runNode(['scripts/ci/read-theme-preview.cjs', inputPath], storeEnv);
  assert.notEqual(invalid.status, 0);
  assert.doesNotMatch(invalid.stderr, /user:pass/);
});

test('testing documentation states the actual local and remote CI boundaries', () => {
  const docs = read('docs/TESTING.md');
  assert.match(docs, /passed hosted \[Security and config regression\]/i);
  assert.match(docs, /no status contexts are configured as required/i);
  assert.match(docs, /No hosted browser or deployment run was invoked/i);
  assert.match(docs, /production writes are disabled/i);
  assert.doesNotMatch(docs, /Every pull request .* pushes a fresh preview/i);
});
