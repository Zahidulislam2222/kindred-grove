/**
 * <kg-pantry-quiz> — memory-only quiz that recommends a configured collection.
 * Dietary answers are never persisted, logged, or transmitted.
 */
class KindredGrovePantryQuiz extends HTMLElement {
  constructor() {
    super();
    this.shell = null;
    this.stage = null;
    this.progress = null;
    this.prev = null;
    this.next = null;
    this.questions = [];
    this.personas = [];
    this.thresholds = [];
    this.policy = null;
    this.step = 0;
    this.answers = [];
    this.initialized = false;
    this.configurationValid = false;
    this.connectionGeneration = 0;
    this.unsubscribePrivacy = null;
    this._onNavClick = this._onNavClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    this._onOptionChange = this._onOptionChange.bind(this);
    this._onFlagChange = this._onFlagChange.bind(this);
    this._onPrivacyChange = this._onPrivacyChange.bind(this);
  }

  connectedCallback() {
    const connection = ++this.connectionGeneration;
    this._detachListeners();
    this.shell = this.querySelector('[data-kg-quiz-shell]');
    this.stage = this.querySelector('[data-kg-quiz-stage]');
    this.progress = this.querySelector('[data-kg-quiz-progress]');
    this.prev = this.querySelector('[data-kg-quiz-prev]');
    this.next = this.querySelector('[data-kg-quiz-next]');
    if (!this.shell || !this.stage) return;

    this._clearLegacySessionAnswers();
    this._attachListeners();
    if (window.KGPrivacy && typeof window.KGPrivacy.subscribe === 'function') {
      this.unsubscribePrivacy = window.KGPrivacy.subscribe(this._onPrivacyChange);
    }

    const initialize = () => {
      if (!this.isConnected || connection !== this.connectionGeneration) return;
      this._initialize();
    };
    if (window.KG_FF && window.KG_FF.ready) {
      Promise.resolve(window.KG_FF.ready).then(initialize, initialize);
    } else {
      initialize();
    }
  }

  disconnectedCallback() {
    this.connectionGeneration += 1;
    this._detachListeners();
    this.answers = [];
    this.step = 0;
    if (this.stage) this.stage.replaceChildren();
  }

  _attachListeners() {
    if (this.prev) this.prev.addEventListener('click', this._onNavClick);
    if (this.next) this.next.addEventListener('click', this._onNavClick);
    this.addEventListener('change', this._onOptionChange);
    this.addEventListener('keydown', this._onKeydown);
    window.addEventListener('kg:feature-flags:change', this._onFlagChange);
  }

  _detachListeners() {
    if (this.prev) this.prev.removeEventListener('click', this._onNavClick);
    if (this.next) this.next.removeEventListener('click', this._onNavClick);
    this.removeEventListener('change', this._onOptionChange);
    this.removeEventListener('keydown', this._onKeydown);
    window.removeEventListener('kg:feature-flags:change', this._onFlagChange);
    if (typeof this.unsubscribePrivacy === 'function') this.unsubscribePrivacy();
    this.unsubscribePrivacy = null;
  }

  _initialize() {
    if (!this.isConnected || !this.shell || !this.stage) return;
    if (!this.initialized) {
      const policy = this._validatePolicy(this._parseJson('[data-kg-quiz-config]'));
      const questions = policy ? this._parseJson('[data-kg-quiz-questions]', policy.questionJsonMaxChars) : null;
      const personas = policy ? this._parseJson('[data-kg-quiz-personas]', policy.personaJsonMaxChars) : null;
      const scoring = policy ? this._parseJson('[data-kg-quiz-scoring]', policy.scoringJsonMaxChars) : null;
      const validated = policy ? this._validateConfiguration(questions, personas, scoring, policy) : null;
      this.configurationValid = !!validated;
      if (validated) {
        this.policy = policy;
        this.questions = validated.questions;
        this.personas = validated.personas;
        this.thresholds = validated.thresholds;
      }
      this.initialized = true;
    }
    this._applyFlagVisibility();
    if (!this.shell.hidden && !this.stage.childNodes.length) this._renderCurrent();
  }

  _validatePolicy(policy) {
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return null;
    const positive = (key) => Number.isSafeInteger(policy[key]) && policy[key] > 0;
    const fields = [
      'questionCount', 'personaCount', 'questionJsonMaxChars', 'personaJsonMaxChars',
      'scoringJsonMaxChars', 'questionLabelMaxLength', 'optionLabelMaxLength',
      'optionCountMin', 'optionCountMax', 'personaNameMaxLength',
      'personaDescriptionMaxLength', 'personaImageUrlMaxLength'
    ];
    if (fields.some((key) => !positive(key))
      || policy.optionCountMin < 2 || policy.optionCountMax < policy.optionCountMin
      || policy.optionCountMax > 9) return null; // Number-key shortcuts cover 1–9.
    return policy;
  }

  _validateConfiguration(questions, personas, scoring, policy = this.policy) {
    if (!policy || !Array.isArray(questions) || questions.length !== policy.questionCount
      || !Array.isArray(personas) || personas.length !== policy.personaCount) return null;
    const validText = (value, maxLength) => typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
    const validHandle = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
    const safeQuestions = questions.map((question) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)
        || !validText(question.label, policy.questionLabelMaxLength) || !Array.isArray(question.options)
        || question.options.length < policy.optionCountMin || question.options.length > policy.optionCountMax
        || question.options.some((option) => !validText(option, policy.optionLabelMaxLength))) return null;
      return { label: question.label, options: question.options.slice() };
    });
    if (safeQuestions.some((question) => !question)) return null;

    const safePersonas = personas.map((persona) => {
      if (!persona || typeof persona !== 'object' || Array.isArray(persona)
        || !validText(persona.name, policy.personaNameMaxLength) || !validText(persona.description, policy.personaDescriptionMaxLength)
        || (persona.collection != null && persona.collection !== '' && !validHandle(persona.collection))
        || (persona.slug !== undefined && !validHandle(persona.slug))
        || (persona.image !== undefined && (typeof persona.image !== 'string' || persona.image.length > policy.personaImageUrlMaxLength))) return null;
      let image = '';
      if (persona.image) {
        const safeImage = window.KGClient && typeof window.KGClient.safeUrl === 'function'
          ? window.KGClient.safeUrl(persona.image, { image: true })
          : null;
        if (!safeImage) return null;
        image = safeImage.href;
      }
      return { name: persona.name, description: persona.description, collection: persona.collection || '', image };
    });
    if (safePersonas.some((persona) => !persona)) return null;

    if (!scoring || typeof scoring !== 'object' || Array.isArray(scoring)
      || !Array.isArray(scoring.thresholds) || scoring.thresholds.length !== safePersonas.length - 1
      || scoring.thresholds.some((threshold, index, all) => !Number.isFinite(threshold)
        || threshold <= 0 || threshold >= 1 || (index > 0 && threshold <= all[index - 1]))) return null;

    return { questions: safeQuestions, personas: safePersonas, thresholds: scoring.thresholds.slice() };
  }

  _clearLegacySessionAnswers() {
    try {
      const config = window.KGPrivacy && window.KGPrivacy.configValid ? window.KGPrivacy.config : {};
      const key = config.storageKeys && config.storageKeys.legacyQuizAnswers;
      if (key) window.sessionStorage.removeItem(key);
    } catch (_error) { /* old answers are never restored; storage may be blocked */ }
  }

  _onPrivacyChange() {
    this._clearLegacySessionAnswers();
  }

  _onFlagChange() {
    this._applyFlagVisibility();
  }

  _applyFlagVisibility() {
    if (!this.shell) return;
    this.shell.hidden = !this._passesFlag();
    if (this.shell.hidden) {
      this.answers = [];
      this.step = 0;
      if (this.stage) this.stage.replaceChildren();
    } else if (this.initialized && this.stage && !this.stage.childNodes.length) {
      this._renderCurrent();
    }
  }

  _passesFlag() {
    const name = this.getAttribute('data-flag-name');
    if (!name || !window.KG_FF) return true;
    const defs = window.KG_FF._defs || [];
    if (!defs.some((definition) => definition && definition.name === name)) return true;
    return !!window.KG_FF.isEnabled(name);
  }

  _parseJson(selector, maxChars) {
    try {
      const element = this.querySelector(selector);
      const raw = element && element.dataset && (element.dataset.json || element.dataset.config);
      if (typeof raw !== 'string' || (maxChars && raw.length > maxChars)) return null;
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  _renderCurrent() {
    if (!this.configurationValid) return this._renderFallback();
    if (this.step >= this.questions.length) return this._renderResult();
    const question = this.questions[this.step];
    const selected = this.answers[this.step];
    this.stage.innerHTML = `
      <fieldset class="kg-quiz__fieldset stack-sm">
        <legend class="kg-quiz__legend h3">${this._escape(question.label)}</legend>
        <div class="kg-quiz__options stack-sm" role="radiogroup" aria-label="${this._attr(question.label)}">
          ${question.options.map((option, index) => `
            <label class="kg-quiz__option">
              <input type="radio" name="kg-quiz-q${this.step}" value="${index}" ${selected === index ? 'checked' : ''}>
              <span class="kg-quiz__option-body">
                <span class="kg-quiz__option-num" aria-hidden="true">${index + 1}</span>
                <span class="kg-quiz__option-label">${this._escape(option)}</span>
              </span>
            </label>
          `).join('')}
        </div>
      </fieldset>
    `;
    this._updateNav();
    this._updateProgress();
    const first = this.stage.querySelector(`input[type=radio]${selected != null ? `[value="${selected}"]` : ''}`);
    if (first) first.focus();
  }

  _renderFallback() {
    const url = this._fallbackUrl();
    const message = this.getAttribute('data-invalid-message') || '';
    const browse = this.getAttribute('data-browse-label') || '';
    this.stage.innerHTML = `<div class="kg-quiz__fallback stack" role="status"><p>${this._escape(message)}</p><a class="button button--primary" href="${this._attr(url)}">${this._escape(browse)}</a></div>`;
    if (this.prev) this.prev.disabled = true;
    if (this.next) this.next.disabled = true;
    this._updateProgress(0);
  }

  _fallbackUrl() {
    const raw = this.getAttribute('data-fallback-url') || '#';
    if (window.KGClient && typeof window.KGClient.safeUrl === 'function') {
      const safe = window.KGClient.safeUrl(raw);
      return safe ? safe.href : '#';
    }
    try {
      const url = new URL(raw, window.location.href);
      if (!['https:', 'http:'].includes(url.protocol) || url.origin !== window.location.origin
        || url.username || url.password || url.hash) return '#';
      return url.href;
    } catch (_error) {
      return '#';
    }
  }

  _renderResult() {
    const persona = this._scorePersona();
    const client = window.KGClient;
    const collectionUrl = persona.collection && client && typeof client.productPath === 'function'
      ? client.productPath('collections', persona.collection)
      : (client && typeof client.productPath === 'function' ? client.productPath('collections', 'all') : null);
    const fallbackUrl = collectionUrl || this._fallbackUrl();
    const safeImage = persona.image && client && typeof client.safeUrl === 'function'
      ? client.safeUrl(persona.image, { image: true })
      : null;
    const eyebrow = this.getAttribute('data-result-label') || '';
    const shopLabel = this.getAttribute('data-shop-label') || '';
    const restartLabel = this.getAttribute('data-restart-label') || '';
    this.stage.innerHTML = `
      <div class="kg-quiz__result stack" role="status">
        <p class="eyebrow">${this._escape(eyebrow)}</p>
        <h3 class="h2 kg-quiz__result-name">${this._escape(persona.name)}</h3>
        ${safeImage ? `<img class="kg-quiz__result-image" src="${this._attr(safeImage.href)}" alt="${this._attr(persona.name)}" loading="lazy">` : ''}
        <p class="text-lg">${this._escape(persona.description)}</p>
        <div class="cluster">
          <a href="${this._attr(fallbackUrl)}" class="button button--primary button--lg">${this._escape(shopLabel)}</a>
          <button type="button" class="button button--ghost" data-kg-quiz-restart>${this._escape(restartLabel)}</button>
        </div>
      </div>
    `;
    if (this.prev) this.prev.disabled = true;
    if (this.next) this.next.disabled = true;
    this._updateProgress(100);
    const restart = this.stage.querySelector('[data-kg-quiz-restart]');
    if (restart) restart.addEventListener('click', () => {
      this.answers = [];
      this.step = 0;
      this._renderCurrent();
    });
  }

  _scorePersona() {
    const total = this.answers.slice(0, this.questions.length).reduce((sum, answer, index) => {
      const question = this.questions[index];
      if (!question) return sum;
      const maxOption = question.options.length - 1;
      return sum + (Number.isSafeInteger(answer) && answer >= 0 && answer <= maxOption ? answer : 0);
    }, 0);
    const maxScore = this.questions.reduce((sum, question) => sum + question.options.length - 1, 0);
    const proportion = maxScore > 0 ? total / maxScore : 0;
    const personaIndex = this.thresholds.findIndex((threshold) => proportion < threshold);
    return this.personas[personaIndex < 0 ? this.personas.length - 1 : personaIndex];
  }

  _updateNav() {
    if (this.prev) this.prev.disabled = this.step === 0;
    if (this.next) {
      this.next.disabled = !Number.isSafeInteger(this.answers[this.step]);
      this.next.textContent = this.step === this.questions.length - 1
        ? (this.getAttribute('data-submit-label') || '')
        : (this.getAttribute('data-next-label') || '');
    }
  }

  _updateProgress(forcePct) {
    const total = this.questions.length;
    const percentage = forcePct != null ? forcePct : Math.round((this.step / total) * 100);
    if (this.progress) this.progress.style.width = `${percentage}%`;
    const bar = this.progress ? this.progress.closest('[role=progressbar]') : null;
    if (bar) bar.setAttribute('aria-valuenow', String(percentage));
  }

  _onOptionChange(event) {
    if (!event.target.matches('input[type=radio][name^="kg-quiz-q"]')) return;
    const value = Number(event.target.value);
    const question = this.questions[this.step];
    if (!this.configurationValid || !question || !Number.isSafeInteger(value) || value < 0 || value >= question.options.length) return;
    this.answers[this.step] = value;
    this._updateNav();
  }

  _onNavClick(event) {
    if (event.currentTarget === this.prev && this.step > 0) {
      this.step -= 1;
      this._renderCurrent();
    } else if (event.currentTarget === this.next) {
      if (!Number.isSafeInteger(this.answers[this.step])) return;
      this.step += 1;
      this._renderCurrent();
    }
  }

  _onKeydown(event) {
    if (!this.configurationValid || !this.stage) return;
    if (event.key >= '1' && event.key <= '9') {
      const index = Number(event.key) - 1;
      const radios = this.stage.querySelectorAll('input[type=radio]');
      if (radios[index]) {
        radios[index].checked = true;
        radios[index].dispatchEvent(new Event('change', { bubbles: true }));
        radios[index].focus();
        event.preventDefault();
      }
    } else if (event.key === 'Enter' && this.next && !this.next.disabled) {
      event.preventDefault();
      this.next.click();
    }
  }

  _escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  _attr(value) { return this._escape(value); }
}

if (!customElements.get('kg-pantry-quiz')) {
  customElements.define('kg-pantry-quiz', KindredGrovePantryQuiz);
}
