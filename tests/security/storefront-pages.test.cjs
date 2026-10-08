const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file).replace(/^\s*\/\*[\s\S]*?\*\//,''));

test('every configured navigation page has maintained, nonempty content and a unique safe handle', () => {
  const pages = json('content/storefront-pages.json').pages;
  const settings = json('config/settings_data.json').current;
  const handles = new Set();
  for (const page of pages) {
    assert.match(page.handle,/^[a-z][a-z0-9-]+$/);
    assert.ok(!handles.has(page.handle)); handles.add(page.handle);
    assert.ok(page.title && page.body.length > 80);
    assert.doesNotMatch(page.body,/<script|on\w+\s*=|javascript:|\b(?:demo|sample|placeholder|coming soon)\b/i);
    assert.doesNotMatch(page.body,/https?:\/\/|gid:\/\/shopify|[A-Z]:\\/);
    if (page.templateSuffix) assert.ok(fs.existsSync(`templates/page.${page.templateSuffix}.json`));
  }
  for (const [key,value] of Object.entries(settings)) if (key.startsWith('storefront_') && key.endsWith('_page')) assert.ok(handles.has(value),key);
  assert.equal(settings.demo_mode,false);
  assert.equal(JSON.parse(settings.feature_flags_json).some(f=>f.name==='pantry_quiz'),false,
    'The public discovery page must not be bucketed off, including by a stale assignment.');
});

test('page navigation uses native objects, guarded page pickers and active-page semantics', () => {
  const links = read('snippets/grove-page-links.liquid');
  assert.match(links,/routes\.all_products_collection_url/);
  assert.match(links,/destination != blank/);
  assert.match(links,/destination\.url/);
  assert.match(links,/aria-current="page"/);
  assert.doesNotMatch(links,/href="\/pages\/|https?:\/\//);
  assert.match(read('sections/grove-header.liquid'),/render 'grove-page-links'/);
  assert.match(read('sections/grove-footer.liquid'),/render 'grove-page-links', extended: true/);
});

test('customer forms and search render with native Shopify contracts and escaped visitor input', () => {
  const page = read('sections/grove-page.liquid');
  assert.match(page,/form 'contact'/);
  assert.match(page,/type="email" name="contact\[email\]"/);
  assert.match(page,/form\.email \| escape/);
  assert.match(page,/form\.body \| escape/);
  const search = read('templates/search.liquid');
  assert.match(search,/search\.terms \| escape/);
  assert.match(search,/paginate search\.results by 12/);
  assert.match(search,/render 'grove-card'/);
  assert.match(read('templates/password.liquid'),/form 'storefront_password'/);
  assert.match(read('layout/password.liquid'),/content_for_header/);
});
