'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const publicPaths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {cwd: root, encoding: 'utf8'})
  .split('\0').filter(Boolean);
const docs = [...new Set(publicPaths.filter((name) => name.endsWith('.md') && fs.existsSync(path.join(root, name))))];
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('all public Markdown file links resolve without private recovery dependencies', () => {
  const failures = [];
  for (const name of docs) {
    const content = read(name).replace(/```[\s\S]*?```/g, '');
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const destination = match[1].replace(/^<|>$/g, '');
      const target = destination.split(/[#?]/)[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const resolved = path.resolve(root, path.dirname(name), decodeURIComponent(target));
      const relative = path.relative(root, resolved).replaceAll('\\', '/');
      if (!fs.existsSync(resolved) || /^(?:memory|my-project-view)(?:\/|$)|^(?:CREDENTIALS|PROJECT-DOSSIER|PROJECT_PLAN)\.md$/.test(relative)) {
        failures.push(`${name}: ${target}`);
      } else if (destination.includes('#') && resolved.endsWith('.md')) {
        const anchor = decodeURIComponent(destination.split('#')[1]);
        const headings = [...fs.readFileSync(resolved, 'utf8').matchAll(/^#{1,6} (.+)$/gm)]
          .map(item => item[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replaceAll(' ', '-'));
        if (!headings.includes(anchor)) failures.push(`${name}: ${destination}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('current public landing documentation identifies storefront password and future objectives', () => {
  for (const name of ['README.md', 'docs/README.md', 'docs/ROADMAP.md', 'docs/PROJECT-REQUIREMENTS.md']) {
    assert.match(read(name), /password/i, name);
    assert.match(read(name), /1M\+|1,000,000/i, name);
    assert.match(read(name), /99%/, name);
  }
  assert.match(read('docs/STOREFRONT-ACCESS.md'), /administrator.*password/i);
  assert.match(read('docs/STOREFRONT-ACCESS.md'), /cannot.*real transactions/i);
});

test('public project prose excludes retired product framing', () => {
  const forbidden = /\bdemo(?:s)?\b|\bmock website\b|\bsample storefront\b|\bscaffold(?:ing|ed)?\b|\bplaceholder project\b/i;
  for (const name of docs) {
    const prose = read(name).replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
    assert.equal(forbidden.test(prose), false, name);
  }
});

test('current backend and privacy documents match native enabled forms and inactive worker', () => {
  assert.match(read('docs/BACKEND.md'), /Shopify.*managed backend/i);
  assert.match(read('docs/BACKEND.md'), /HTTP\s?410/);
  assert.match(read('docs/PRIVACY.md'), /forms are currently enabled/i);
  assert.match(read('docs/STOREFRONT-ACCESS.md'), /Shopify-hosted customer account and checkout surfaces may bypass theme rendering/);
});
