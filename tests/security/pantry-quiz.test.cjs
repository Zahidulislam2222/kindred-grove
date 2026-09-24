'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('assets/pantry-quiz.js', 'utf8');

const questions = [
  { label: 'Cook style', options: ['Everyday', 'Hosting', 'Quick', 'Assemble', 'Other'] },
  { label: 'Heat', options: ['Mild', 'Balanced'] },
  { label: 'Sweet or savory', options: ['Sweet', 'Savory'] },
  { label: 'Diet', options: ['Halal', 'Vegan'] },
  { label: 'Household', options: ['One', 'Two'] },
];
const personas = ['Everyday', 'Entertainer', 'Explorer', 'Minimalist'].map((name) => ({
  name,
  slug: name.toLowerCase(),
  description: `${name} description`,
  collection: name === 'Everyday' ? 'everyday-pantry' : '',
  image: '',
}));
const scoring = { thresholds: [0.25, 0.5, 0.75] };
const quizPolicy = {
  questionCount: 5, personaCount: 4, questionJsonMaxChars: 12000, personaJsonMaxChars: 12000,
  scoringJsonMaxChars: 512, questionLabelMaxLength: 160, optionLabelMaxLength: 160,
  optionCountMin: 2, optionCountMax: 9, personaNameMaxLength: 100,
  personaDescriptionMaxLength: 500, personaImageUrlMaxLength: 2048,
};

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  removeEventListener(type, listener) {
    const existing = this.listeners.get(type) || [];
    this.listeners.set(type, existing.filter((candidate) => candidate !== listener));
  }
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener({ ...event, type, currentTarget: this });
  }
  count(type) { return (this.listeners.get(type) || []).length; }
}

class FakeStage extends FakeTarget {
  constructor() {
    super();
    this.childNodes = [];
    this.style = {};
  }
  set innerHTML(value) {
    this.html = value;
    this.childNodes = value ? [{}] : [];
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  replaceChildren() { this.html = ''; this.childNodes = []; }
  closest() { return null; }
}

class FakeControl extends FakeTarget {
  constructor() { super(); this.disabled = true; this.textContent = ''; }
  click() { this.dispatch('click'); }
}

class FakeQuiz extends FakeTarget {
  constructor(config = {}) {
    super();
    this.isConnected = true;
    this.attrs = {
      'data-flag-name': 'pantry_quiz',
      'data-next-label': 'Next',
      'data-submit-label': 'See my pantry',
      'data-result-label': 'Your pantry persona',
      'data-shop-label': 'Shop your pantry',
      'data-restart-label': 'Retake the quiz',
      'data-invalid-message': 'Quiz data is unavailable.',
      'data-browse-label': 'Browse all products',
      'data-fallback-url': 'https://shop.example.test/ar/collections/all',
    };
    this.nodes = {
      '[data-kg-quiz-shell]': { hidden: false },
      '[data-kg-quiz-stage]': new FakeStage(),
      '[data-kg-quiz-progress]': { style: {}, closest: () => null },
      '[data-kg-quiz-prev]': new FakeControl(),
      '[data-kg-quiz-next]': new FakeControl(),
    };
    this.templates = {
      '[data-kg-quiz-config]': { dataset: { config: JSON.stringify(quizPolicy) } },
      '[data-kg-quiz-questions]': { dataset: { json: JSON.stringify(config.questions ?? questions) } },
      '[data-kg-quiz-personas]': { dataset: { json: JSON.stringify(config.personas ?? personas) } },
      '[data-kg-quiz-scoring]': { dataset: { json: JSON.stringify(config.scoring ?? scoring) } },
    };
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  querySelector(selector) {
    return this.nodes[selector] || this.templates[selector] || null;
  }
}

function makeHarness({ config, client = true, privacy = true, featureFlags = false } = {}) {
  let Component;
  const windowTarget = new FakeTarget();
  const subscriptions = new Set();
  const removedKeys = [];
  const privacyApi = privacy ? {
    configValid: true,
    config: { storageKeys: { legacyQuizAnswers: 'kg-pantry-quiz' } },
    subscribe(listener) { subscriptions.add(listener); return () => subscriptions.delete(listener); },
  } : null;
  const window = {
    location: { href: 'https://shop.example.test/ar/quiz', origin: 'https://shop.example.test' },
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    KGPrivacy: privacyApi,
    sessionStorage: { removeItem: (key) => removedKeys.push(key) },
    ...(client ? { KGClient: {
      safeUrl(raw, { image = false } = {}) {
        try {
          const url = new URL(raw, 'https://shop.example.test/ar/quiz');
          if (url.origin !== 'https://shop.example.test' && !(image && url.origin === 'https://cdn.shopify.com')) return null;
          if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
          return url;
        } catch { return null; }
      },
      productPath(kind, handle) {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)
          ? `https://shop.example.test/ar/${kind}/${handle}`
          : null;
      },
    } } : {}),
    ...(featureFlags ? { KG_FF: { ready: Promise.resolve(true), _defs: [], isEnabled: () => true } } : {}),
  };
  const customElements = { get: () => null, define: (_name, ctor) => { Component = ctor; } };
  vm.runInNewContext(source, { window, HTMLElement: FakeQuiz, customElements, Promise, JSON, Number, String, Object, Array, URL, Event: class {} });
  const quiz = new Component(config);
  quiz.templates = {
    '[data-kg-quiz-config]': { dataset: { config: JSON.stringify(config?.policy ?? quizPolicy) } },
    '[data-kg-quiz-questions]': { dataset: { json: JSON.stringify(config?.questions ?? questions) } },
    '[data-kg-quiz-personas]': { dataset: { json: JSON.stringify(config?.personas ?? personas) } },
    '[data-kg-quiz-scoring]': { dataset: { json: JSON.stringify(config?.scoring ?? scoring) } },
  };
  return { quiz, window, subscriptions, removedKeys, flagListeners: windowTarget };
}

function selectAnswer(quiz, value = '1') {
  quiz.dispatch('change', {
    target: {
      value,
      matches: (selector) => selector === 'input[type=radio][name^="kg-quiz-q"]',
    },
  });
}

test('quiz listeners and subscriptions are removed and reattached once; reconnect starts fresh', async () => {
  const h = makeHarness({ featureFlags: true });
  h.quiz.connectedCallback();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.quiz.initialized, true);
  assert.equal(h.quiz.count('change'), 1);
  assert.equal(h.quiz.count('keydown'), 1);
  assert.equal(h.quiz.prev.count('click'), 1);
  assert.equal(h.quiz.next.count('click'), 1);
  assert.equal(h.flagListeners.count('kg:feature-flags:change'), 1);
  assert.equal(h.subscriptions.size, 1);

  selectAnswer(h.quiz);
  assert.deepEqual(Array.from(h.quiz.answers), [1]);
  h.quiz.step = 3;
  h.quiz.disconnectedCallback();
  assert.deepEqual(Array.from(h.quiz.answers), []);
  assert.equal(h.quiz.step, 0);
  assert.equal(h.quiz.stage.childNodes.length, 0);
  assert.equal(h.quiz.count('change'), 0);
  assert.equal(h.quiz.next.count('click'), 0);
  assert.equal(h.flagListeners.count('kg:feature-flags:change'), 0);
  assert.equal(h.subscriptions.size, 0);

  h.quiz.isConnected = true;
  h.quiz.connectedCallback();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.quiz.count('change'), 1);
  assert.equal(h.quiz.next.count('click'), 1);
  assert.equal(h.flagListeners.count('kg:feature-flags:change'), 1);
  assert.equal(h.subscriptions.size, 1);
  selectAnswer(h.quiz);
  h.quiz.next.click();
  assert.equal(h.quiz.step, 1, 'one click advances exactly one step after reconnect');
  h.quiz.disconnectedCallback();
});

test('legacy answer key is removed on startup and privacy notifications without storing or transmitting answers', () => {
  const h = makeHarness();
  h.quiz.connectedCallback();
  assert.deepEqual(h.removedKeys, ['kg-pantry-quiz']);
  h.quiz.answers = [1, 2, 3];
  for (const listener of h.subscriptions) listener({ preferences: false });
  assert.deepEqual(h.removedKeys, ['kg-pantry-quiz', 'kg-pantry-quiz']);
  assert.deepEqual(Array.from(h.quiz.answers), [1, 2, 3]);
  assert.doesNotMatch(source, /sessionStorage\.(?:getItem|setItem)|fetch\s*\(|Sentry|gtag|dataLayer/);
  h.quiz.disconnectedCallback();
});

test('question, persona and scoring data are shape-checked and bounded before HTML rendering', () => {
  const valid = makeHarness();
  const policy = valid.quiz._validatePolicy(quizPolicy);
  const checked = valid.quiz._validateConfiguration(questions, personas, scoring, policy);
  assert.ok(checked);

  assert.equal(valid.quiz._validateConfiguration([{ label: 'only four' }], personas, scoring, policy), null);
  assert.equal(valid.quiz._validateConfiguration(questions.map((question, index) => index ? question : ({ ...question, label: '<x>'.repeat(100) })), personas, scoring, policy), null);
  assert.equal(valid.quiz._validateConfiguration(questions, personas.map((persona, index) => index ? persona : ({ ...persona, collection: '../outside' })), scoring, policy), null);
  assert.equal(valid.quiz._validateConfiguration(questions, personas, { thresholds: [0.5, 0.25, 0.75] }, policy), null);
  assert.equal(valid.quiz._validatePolicy({ ...quizPolicy, questionCount: 0 }), null);

  const oversized = makeHarness();
  oversized.quiz.templates['[data-kg-quiz-questions]'].dataset.json = ' '.repeat(12001);
  oversized.quiz.connectedCallback();
  assert.match(oversized.quiz.stage.html, /Quiz data is unavailable/);
  assert.match(oversized.quiz.stage.html, /\/ar\/collections\/all/);
  oversized.quiz.disconnectedCallback();
});

test('persona images require the shared same-origin or configured Shopify CDN URL guard', () => {
  const h = makeHarness();
  const withImage = personas.map((persona, index) => index ? persona : ({ ...persona, image: 'https://cdn.shopify.com/images/pantry.jpg' }));
  const policy = h.quiz._validatePolicy(quizPolicy);
  const valid = h.quiz._validateConfiguration(questions, withImage, scoring, policy);
  assert.equal(valid.personas[0].image, 'https://cdn.shopify.com/images/pantry.jpg');

  const hostile = personas.map((persona, index) => index ? persona : ({ ...persona, image: 'https://attacker.example/collect' }));
  assert.equal(h.quiz._validateConfiguration(questions, hostile, scoring, policy), null);

  const noClient = makeHarness({ client: false });
  assert.equal(noClient.quiz._validateConfiguration(questions, withImage, scoring, policy), null);
});

test('result scoring uses maintained thresholds and collection links use locale-aware client routes', () => {
  const h = makeHarness();
  h.quiz.questions = [
    { label: 'Q1', options: ['0', '1', '2', '3', '4'] },
    ...questions.slice(1),
  ];
  h.quiz.personas = personas;
  h.quiz.thresholds = [0.25, 0.5, 0.75];
  h.quiz.policy = quizPolicy;
  h.quiz.answers = [2, 0, 0, 0, 0];
  assert.equal(h.quiz._scorePersona().name, 'Entertainer', 'normalized score exactly at first threshold advances to persona two');
  h.quiz.answers = [4, 0, 0, 0, 0];
  assert.equal(h.quiz._scorePersona().name, 'Explorer');
  h.quiz.answers = [4, 1, 1, 0, 0];
  assert.equal(h.quiz._scorePersona().name, 'Minimalist');

  h.quiz.configurationValid = true;
  h.quiz.questions = questions;
  h.quiz.answers = [0, 0, 0, 0, 0];
  h.quiz.connectedCallback();
  h.quiz._renderResult();
  assert.match(h.quiz.stage.html, /https:\/\/shop\.example\.test\/ar\/collections\/everyday-pantry/);
  assert.match(h.quiz.stage.html, /Shop your pantry/);

  const noClient = makeHarness({ client: false });
  noClient.quiz.configurationValid = true;
  noClient.quiz.questions = questions;
  noClient.quiz.personas = personas;
  noClient.quiz.thresholds = scoring.thresholds;
  noClient.quiz.policy = quizPolicy;
  noClient.quiz.answers = [0, 0, 0, 0, 0];
  noClient.quiz.connectedCallback();
  noClient.quiz._renderResult();
  assert.match(noClient.quiz.stage.html, /https:\/\/shop\.example\.test\/ar\/collections\/all/);
  for (const hostileUrl of ['javascript:alert(1)', 'https://attacker.example/out', 'https://user:pass@shop.example.test/path']) {
    h.quiz.attrs['data-fallback-url'] = hostileUrl;
    assert.equal(h.quiz._fallbackUrl(), '#');
    noClient.quiz.attrs['data-fallback-url'] = hostileUrl;
    assert.equal(noClient.quiz._fallbackUrl(), '#');
  }
});

test('quiz block keeps maintained locale JSON in escaped template attributes', () => {
  const block = fs.readFileSync('blocks/pantry-quiz.liquid', 'utf8');
  assert.match(block, /quiz\.default_questions_json' \| t/);
  assert.match(block, /quiz\.default_personas_json' \| t/);
  assert.match(block, /render 'quiz-config'/);
  assert.match(block, /data-kg-quiz-scoring data-json="\{\{ block\.settings\.scoring_json \| escape/);
  assert.match(block, /data-fallback-url="\{\{ routes\.all_products_collection_url \| escape/);
  assert.doesNotMatch(block, /\[\{"label":"How do you cook most often\?/);
});

test('quiz Liquid selector and context-specific JSON escaping match rendered template transport', () => {
  const block = fs.readFileSync('blocks/pantry-quiz.liquid', 'utf8');
  const policy = fs.readFileSync('snippets/quiz-config.liquid', 'utf8');
  assert.match(source, /_validatePolicy\(this\._parseJson\('\[data-kg-quiz-config\]'\)\)/);
  assert.match(policy, /<template\s+data-kg-quiz-config\b[^>]*\bdata-config=/);
  assert.doesNotMatch(policy, /id="kg-quiz-config"/);

  assert.match(block, /assign questions_json_attribute\s*=\s*questions_raw\s*\|\s*escape/);
  assert.match(block, /assign questions_json_attribute\s*=\s*questions_raw\s*\|\s*escape_once/);
  assert.match(block, /assign personas_json_attribute\s*=\s*personas_raw\s*\|\s*escape/);
  assert.match(block, /assign personas_json_attribute\s*=\s*personas_raw\s*\|\s*escape_once/);
  assert.match(block, /data-kg-quiz-questions data-json="\{\{ questions_json_attribute \}\}"/);
  assert.match(block, /data-kg-quiz-personas data-json="\{\{ personas_json_attribute \}\}"/);
  assert.match(block, /data-kg-quiz-scoring data-json="\{\{ block\.settings\.scoring_json \| escape/);
});
