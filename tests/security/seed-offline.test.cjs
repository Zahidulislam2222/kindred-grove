const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const scriptPath = path.resolve('scripts/seed-dev-store.mjs');
const dataPath = path.resolve('scripts/data/legacy-demo-products.json');
const source = fs.readFileSync(scriptPath, 'utf8');

function run(args = []) {
  const env = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    SHOPIFY_STORE: 'reserved.invalid',
    ADMIN_API_TOKEN: 'test-key',
  };
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    env,
    timeout: 5000,
  });
}

test('default command validates preserved legacy entries and remains a no-change plan', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Offline plan only: validated 2 legacy reference entries/);
  assert.match(result.stdout, /No Shopify changes are planned/);
  assert.doesNotMatch(result.stdout + result.stderr, /reserved\.invalid|test-key/);
});

test('--apply fails closed before reading the fixed catalog', () => {
  const result = run(['--apply']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked: --apply is disabled/);
  assert.match(result.stderr, /native Shopify Admin\/GraphQL migration workflow/);
  assert.doesNotMatch(result.stdout + result.stderr, /reserved\.invalid|test-key/);
});

test('pure validator rejects malformed and falsely active catalog objects', async () => {
  const { validateCatalog } = await import(pathToFileURL(scriptPath).href);
  assert.throws(() => validateCatalog('{ invalid json'), /JSON object/);
  assert.throws(() => validateCatalog({ status: 'active', products: [] }), /legacy-unverified-not-for-active-seeding/);
  const valid = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const duplicated = structuredClone(valid);
  duplicated.products[1].handle = duplicated.products[0].handle;
  assert.throws(() => validateCatalog(duplicated), /duplicates a handle/);
});

test('unknown, path, UNC, device, and traversal arguments are rejected before file access', () => {
  const unknown = run(['--force']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Unknown argument/);

  const pathInputs = [
    '--data',
    '..\\..\\outside.json',
    '\\\\?\\UNC\\host\\share\\outside.json',
    '\\\\.\\pipe\\outside',
    '//host/share/outside.json',
  ];
  for (const input of pathInputs) {
    const result = run([input]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown argument/);
    assert.doesNotMatch(result.stdout + result.stderr, /host|outside\.json|reserved\.invalid|test-key/i);
  }

  const repeated = run(['--apply', '--apply']);
  assert.equal(repeated.status, 2);
  assert.match(repeated.stderr, /may only be supplied once/);
});

test('writer source has no credential, transport, or Shopify endpoint access', async () => {
  assert.doesNotMatch(source, /process\.env|SHOPIFY_STORE|ADMIN_API_TOKEN/);
  assert.doesNotMatch(source, /\bfetch\s*\(|https?\.request|node:https|node:http|admin\/api/i);
  assert.doesNotMatch(source, /--data|dataPath/);
  const legacy = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert.equal(legacy.status, 'legacy-unverified-not-for-active-seeding');
  assert.match(legacy.notice, /unverified/i);
  assert.equal(legacy.products.length, 2);
  const stats = fs.lstatSync(dataPath);
  assert.equal(stats.isSymbolicLink(), false);
  assert.equal(stats.nlink, 1);
  const { MAX_CATALOG_BYTES, validateCatalogMetadata } = await import(pathToFileURL(scriptPath).href);
  assert.ok(stats.size <= MAX_CATALOG_BYTES);

  const stat = ({ link = false, directory = false, file = false, nlink = 1, size = 100 } = {}) => ({
    isSymbolicLink: () => link,
    isDirectory: () => directory,
    isFile: () => file,
    nlink,
    size,
  });
  assert.doesNotThrow(() => validateCatalogMetadata(stat({ directory: true }), stat({ directory: true }), stat({ file: true })));
  assert.throws(() => validateCatalogMetadata(stat({ link: true }), stat({ directory: true }), stat({ file: true })), /symlinks/);
  assert.throws(() => validateCatalogMetadata(stat({ directory: true }), stat({ link: true }), stat({ file: true })), /symlinks/);
  assert.throws(() => validateCatalogMetadata(stat({ directory: true }), stat({ directory: true }), stat({ file: true, nlink: 2 })), /regular repository file/);
  assert.throws(() => validateCatalogMetadata(stat({ directory: true }), stat({ directory: true }), stat({ file: true, size: MAX_CATALOG_BYTES + 1 })), /size limit/);
});
