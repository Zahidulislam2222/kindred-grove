const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
function readCommentPrefixedJson(path) {
  return JSON.parse(read(path).replace(/^\s*\/\*[\s\S]*?\*\//, ''));
}

test('demo mode is default-on in schema and explicitly true in the local theme settings', () => {
  const schema = JSON.parse(read('config/settings_schema.json'));
  const demoSetting = schema.flatMap((group) => group.settings || []).find((setting) => setting.id === 'demo_mode');
  assert.ok(demoSetting);
  assert.equal(demoSetting.default, true);
  assert.equal(readCommentPrefixedJson('config/settings_data.json').current.demo_mode, true);
  assert.match(read('layout/theme.liquid'), /data-demo-mode="\{\{ settings\.demo_mode \}\}"/);
});

test('demo notice and sample prices are localized and the theme warns against personal/payment data', () => {
  const en = readCommentPrefixedJson('locales/en.default.json');
  const ar = readCommentPrefixedJson('locales/ar.json');
  for (const locale of [en, ar]) {
    assert.ok(locale.demo.notice_title);
    assert.ok(locale.demo.notice_body);
    assert.ok(locale.demo.sample_price);
    assert.ok(locale.demo.checkout_disabled);
    assert.ok(locale.demo.newsletter_disabled);
    assert.ok(locale.demo.contact_disabled);
    assert.ok(locale.demo.personal_flows_disabled);
  }
  assert.match(en.demo.notice_body, /personal or payment details/i);
  assert.match(read('layout/theme.liquid'), /render 'demo-notice'/);
  assert.match(read('snippets/demo-notice.liquid'), /settings\.demo_mode/);
  for (const key of ['demo-sample-price', 'demo-checkout-disabled']) assert.match(read('layout/theme.liquid'), new RegExp(`data-${key}=`));
});

test('theme checkout controls and built-in contact/newsletter forms are disabled in demo mode', () => {
  const drawer = read('blocks/cart-drawer.liquid');
  const cartPage = read('sections/main-cart.liquid');
  const footer = read('sections/grove-footer.liquid');
  const legacyFooter = read('sections/footer.liquid');
  const newsletter = read('blocks/newsletter.liquid');
  const wholesale = read('blocks/wholesale-form.liquid');
  assert.match(drawer, /if settings\.demo_mode[\s\S]*?data-demo-checkout disabled[\s\S]*?else[\s\S]*?form action="\{\{ routes\.cart_url \}\}"/);
  assert.match(cartPage, /if settings\.demo_mode[\s\S]*?data-demo-checkout disabled[\s\S]*?else[\s\S]*?name="checkout"/);
  assert.match(footer, /if settings\.demo_mode[\s\S]*?demo\.newsletter_disabled[\s\S]*?else[\s\S]*?form 'customer'/);
  assert.match(legacyFooter, /if settings\.demo_mode[\s\S]*?demo\.newsletter_disabled[\s\S]*?else[\s\S]*?form 'contact'/);
  assert.match(newsletter, /if settings\.demo_mode[\s\S]*?demo\.newsletter_disabled[\s\S]*?else[\s\S]*?form 'contact'/);
  assert.match(wholesale, /if settings\.demo_mode[\s\S]*?demo\.contact_disabled[\s\S]*?else[\s\S]*?form 'contact'/);
  assert.match(read('docs/DEMO-SAFETY.md'), /direct Shopify checkout URL/i);
});

test('demo mode removes cart-note inputs, article comments, and theme customer-data flows', () => {
  const cart = read('sections/main-cart.liquid');
  const giftNote = read('blocks/cart-gift-note.liquid');
  const article = read('sections/main-article.liquid');
  assert.match(cart, /if settings\.demo_mode[\s\S]*demo\.personal_flows_disabled[\s\S]*else[\s\S]*name="note"/);
  assert.match(giftNote, /if settings\.demo_mode[\s\S]*demo\.personal_flows_disabled[\s\S]*else[\s\S]*data-kg-cart-note/);
  assert.match(article, /if settings\.demo_mode[\s\S]*demo\.personal_flows_disabled[\s\S]*else[\s\S]*form 'new_comment'/);

  const customerTemplates = [
    'templates/customers/register.liquid', 'templates/customers/addresses.liquid',
    'templates/customers/account.liquid', 'templates/customers/order.liquid',
    'templates/customers/login.liquid', 'templates/customers/activate_account.liquid',
    'templates/customers/reset_password.liquid'
  ];
  for (const path of customerTemplates) {
    const source = read(path);
    assert.match(source, /if settings\.demo_mode[\s\S]*demo\.personal_flows_disabled[\s\S]*else/);
  }
  assert.match(read('templates/customers/account.liquid'), /else[\s\S]*customer\.orders/);
  assert.match(read('templates/customers/addresses.liquid'), /else[\s\S]*form 'customer_address'/);
});

test('Klaviyo forwarding and stale Sentry/RUM settings are removed from the theme boundary', () => {
  const sources = [
    'config/settings_schema.json', 'blocks/newsletter.liquid', 'assets/newsletter.js',
    'layout/theme.liquid'
  ].map(read).join('\n');
  assert.doesNotMatch(sources, /klaviyo|sentry_dsn|rum_sample_rate|web-vitals/i);
  assert.doesNotMatch(sources, /a\.klaviyo\.com|js\.sentry-cdn\.com|unpkg\.com\/web-vitals/i);
});

test('Grove footer uses Shopify native localization and privacy preferences, without writing consent', () => {
  const footer = read('sections/grove-footer.liquid');
  const bridge = read('assets/privacy-preferences.js');
  assert.match(footer, /localization\.available_countries\.size > 1/);
  assert.match(footer, /form 'localization'/);
  assert.match(footer, /name="country_code"/);
  assert.match(footer, /data-kg-open-privacy-preferences/);
  assert.match(bridge, /window\.privacyBanner\.showPreferences\(\)/);
  assert.doesNotMatch(bridge, /setTrackingConsent|fetch\s*\(/);
});

test('sample claims and theme JSON-LD are suppressed in demo mode; breadcrumb data values use JSON encoding', () => {
  const product = read('sections/main-product.liquid');
  const footer = read('sections/footer.liquid');
  const cards = read('snippets/product-card.liquid');
  const css = read('assets/demo-safety.css');
  assert.match(product, /show_trust_strip and settings\.demo_mode != true/);
  assert.match(footer, /show_trust_badges and settings\.demo_mode != true/);
  assert.match(cards, /product-card__flag--sale/);
  assert.match(css, /body\.kg-demo-mode \.trust-badge/);
  assert.match(css, /body\.kg-demo-mode \.product-card__price-compare/);
  const schemaEmitters = [
    'snippets/schema-organization.liquid', 'snippets/schema-product.liquid',
    'snippets/schema-article.liquid', 'snippets/schema-faq.liquid',
    'snippets/schema-recipe.liquid', 'snippets/schema-breadcrumb.liquid'
  ];
  for (const path of schemaEmitters) {
    const source = read(path);
    assert.match(source, /unless settings\.demo_mode/);
    assert.match(source, /<script type="application\/ld\+json">/);
  }
  const breadcrumb = read('snippets/schema-breadcrumb.liquid');
  assert.match(breadcrumb, /echo collection\.title \| json/);
  assert.match(breadcrumb, /echo product\.title \| json/);
  assert.doesNotMatch(breadcrumb, /append: (?:collection|product|page|article)\.title \| json/);

  const hostileName = 'Olive "Reserve" \\ blend';
  const hostileUrl = 'https://store.example.test/products/item?x="</script>';
  const fragment = `{"name":${JSON.stringify(hostileName)},"item":${JSON.stringify(hostileUrl)}}`;
  assert.deepEqual(JSON.parse(fragment), { name: hostileName, item: hostileUrl });
  assert.doesNotMatch(read('snippets/breadcrumbs.liquid'), /application\/ld\+json/);
});

test('claim-bearing blocks are server-guarded in demo mode and FAQ serialization is delimiter-safe', () => {
  for (const path of [
    'blocks/product-faq.liquid', 'blocks/certifications.liquid',
    'blocks/reviews-carousel.liquid', 'blocks/values-strip.liquid'
  ]) {
    const source = read(path);
    assert.match(source, /unless settings\.demo_mode/);
    assert.match(source, /\{% schema %\}/);
  }

  const faq = read('blocks/product-faq.liquid');
  assert.match(faq, /unless settings\.demo_mode[\s\S]*?application\/ld\+json[\s\S]*?endunless/);
  assert.match(faq, /for i in \(1\.\.6\)/);
  assert.doesNotMatch(faq, /qa_list|split: '\|\|'|split: ';;'/);
  assert.match(faq, /answer \| escape \| newline_to_br/);
  assert.ok(faq.includes("question | json | replace: '</', '<\\/'"));
  assert.ok(faq.includes("answer | json | replace: '</', '<\\/'"));
  assert.match(faq, /KgFaqHeading-\{\{ block\.id \}\}/);
  assert.doesNotMatch(faq, /id="KgFaqHeading"/);
  assert.match(faq, /\"id\": \"q_3\", \"label\": \"Question\"/);
  assert.doesNotMatch(faq, /Every Kindred Grove product is independently halal-certified/);
});

test('media provenance lists the actual local export sources and marks license evidence unverified', () => {
  const provenance = read('docs/MEDIA-PROVENANCE.md');
  for (const asset of ['grove-hero.webp', 'grove-hero-mobile.webp', 'grove-table.webp', 'grove-pour.webp', 'grove-oil.webp', 'grove-dates.webp', 'grove-journey.mp4']) {
    assert.ok(provenance.includes(asset));
  }
  assert.match(provenance, /Unverified/);
  assert.match(provenance, /does not claim that media is AI-generated, original, stock, or licensed/i);
  assert.match(read('docs/DEMO-SAFETY.md'), /Shopify-hosted customer account and checkout surfaces may bypass theme rendering/i);
});
