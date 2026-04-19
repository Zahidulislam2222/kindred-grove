/**
 * <kg-pantry-quiz> — multi-step quiz that recommends a pantry persona.
 *
 * State machine:
 *   idle → step(0) → step(1) → … step(n-1) → result
 *   Back/Next navigate; Enter submits; number keys 1–9 select option.
 *
 * Persistence:
 *   Partial progress (answers + current step) is kept in sessionStorage
 *   under `data-persist-key` so a page reload mid-quiz does not lose state.
 *
 * Scoring:
 *   Sum of answer indexes, mapped to 1 of 4 personas by quartile of the
 *   maximum possible score. This is intentionally simple and overridable
 *   by the merchant later (scoring rules could move into the persona JSON).
 *
 * Feature-flag gate:
 *   If `data-flag-name` is set AND `window.KG_FF` is present AND the flag
 *   resolves to falsy, the shell stays hidden. Flag undefined → shown.
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
    this.step = 0;
    this.answers = [];
    this._onNavClick = this._onNavClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    this._onOptionChange = this._onOptionChange.bind(this);
  }

  connectedCallback() {
    this.shell = this.querySelector('[data-kg-quiz-shell]');
    this.stage = this.querySelector('[data-kg-quiz-stage]');
    this.progress = this.querySelector('[data-kg-quiz-progress]');
    this.prev = this.querySelector('[data-kg-quiz-prev]');
    this.next = this.querySelector('[data-kg-quiz-next]');
    if (!this.shell || !this.stage) return;

    if (!this._passesFlag()) return;
    this.shell.hidden = false;

    this.questions = this._parseJson('[data-kg-quiz-questions]') || [];
    this.personas = this._parseJson('[data-kg-quiz-personas]') || [];
    if (this.questions.length === 0) return;

    this._restore();

    if (this.prev) this.prev.addEventListener('click', this._onNavClick);
    if (this.next) this.next.addEventListener('click', this._onNavClick);
    this.addEventListener('change', this._onOptionChange);
    this.addEventListener('keydown', this._onKeydown);

    this._render();
  }

  _passesFlag() {
    const name = this.getAttribute('data-flag-name');
    if (!name) return true;
    if (!window.KG_FF) return true; // flag system not loaded — default-on
    // If the flag is defined, use its boolean result. If it's missing, default-on.
    const defs = window.KG_FF._defs || [];
    const known = defs.some((d) => d && d.name === name);
    if (!known) return true;
    return !!window.KG_FF.isEnabled(name);
  }

  _parseJson(selector) {
    try {
      const el = this.querySelector(selector);
      if (!el) return null;
      return JSON.parse(el.textContent);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      return null;
    }
  }

  /* ----- persistence ----- */

  _persistKey() { return this.getAttribute('data-persist-key') || 'kg-pantry-quiz'; }

  _restore() {
    try {
      const raw = sessionStorage.getItem(this._persistKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.answers)) return;
      this.answers = data.answers.slice(0, this.questions.length);
      this.step = Math.min(data.step || 0, this.questions.length);
    } catch (_e) { /* ignore */ }
  }

  _save() {
    try {
      sessionStorage.setItem(
        this._persistKey(),
        JSON.stringify({ answers: this.answers, step: this.step })
      );
    } catch (_e) { /* quota / private mode */ }
  }

  _clear() {
    try { sessionStorage.removeItem(this._persistKey()); } catch (_e) { /* ignore */ }
  }

  /* ----- render ----- */

  _render() {
    if (this.step >= this.questions.length) return this._renderResult();
    const q = this.questions[this.step];
    const selected = this.answers[this.step];
    this.stage.innerHTML = `
      <fieldset class="kg-quiz__fieldset stack-sm">
        <legend class="kg-quiz__legend h3">${this._escape(q.label)}</legend>
        <div class="kg-quiz__options stack-sm" role="radiogroup" aria-label="${this._attr(q.label)}">
          ${(q.options || []).map((opt, i) => `
            <label class="kg-quiz__option">
              <input type="radio" name="kg-quiz-q${this.step}" value="${i}" ${selected === i ? 'checked' : ''}>
              <span class="kg-quiz__option-body">
                <span class="kg-quiz__option-num" aria-hidden="true">${i + 1}</span>
                <span class="kg-quiz__option-label">${this._escape(opt)}</span>
              </span>
            </label>
          `).join('')}
        </div>
      </fieldset>
    `;
    this._updateNav();
    this._updateProgress();
    const first = this.stage.querySelector('input[type=radio]' + (selected != null ? `[value="${selected}"]` : ''));
    if (first) first.focus();
  }

  _renderResult() {
    const persona = this._scorePersona();
    const collectionUrl = persona && persona.collection ? `/collections/${encodeURIComponent(persona.collection)}` : '/collections/all';
    this.stage.innerHTML = `
      <div class="kg-quiz__result stack" role="status">
        <p class="eyebrow">Your pantry persona</p>
        <h3 class="h2 kg-quiz__result-name">${this._escape(persona.name)}</h3>
        ${persona.image ? `<img class="kg-quiz__result-image" src="${this._attr(persona.image)}" alt="${this._attr(persona.name)}" loading="lazy">` : ''}
        <p class="text-lg">${this._escape(persona.description)}</p>
        <div class="cluster">
          <a href="${this._attr(collectionUrl)}" class="button button--primary button--lg">Shop your pantry</a>
          <button type="button" class="button button--ghost" data-kg-quiz-restart>Retake the quiz</button>
        </div>
      </div>
    `;
    if (this.prev) this.prev.disabled = true;
    if (this.next) this.next.disabled = true;
    this._updateProgress(100);
    this._reportComplete(persona);

    const restart = this.stage.querySelector('[data-kg-quiz-restart]');
    if (restart) restart.addEventListener('click', () => {
      this.answers = [];
      this.step = 0;
      this._clear();
      this._render();
    });
  }

  _scorePersona() {
    if (!this.personas || this.personas.length === 0) {
      return { name: 'Your pantry', description: 'Start with our essentials.', collection: '', image: '' };
    }
    const total = this.answers.reduce((sum, a) => sum + (typeof a === 'number' ? a : 0), 0);
    const maxPer = this.questions.reduce((acc, q) => acc + Math.max(0, (q.options || []).length - 1), 0);
    const pct = maxPer > 0 ? total / maxPer : 0;
    // Quartile mapping
    let idx = 0;
    if (pct >= 0.75) idx = 3;
    else if (pct >= 0.5) idx = 2;
    else if (pct >= 0.25) idx = 1;
    const safeIdx = Math.min(idx, this.personas.length - 1);
    return this.personas[safeIdx];
  }

  _reportComplete(persona) {
    try {
      const params = { quiz: 'pantry_quiz', persona_slug: persona.slug || '', persona_name: persona.name || '' };
      if (typeof window.gtag === 'function') window.gtag('event', 'quiz_complete', params);
      else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'quiz_complete', params });
    } catch (_e) { /* non-critical */ }
  }

  _updateNav() {
    if (this.prev) this.prev.disabled = this.step === 0;
    if (this.next) {
      this.next.disabled = this.answers[this.step] == null;
      this.next.textContent = this.step === this.questions.length - 1
        ? (this.getAttribute('data-submit-label') || 'See my pantry')
        : (this.getAttribute('data-next-label') || 'Next');
    }
  }

  _updateProgress(forcePct) {
    const total = this.questions.length;
    const pct = forcePct != null ? forcePct : Math.round(((this.step) / total) * 100);
    if (this.progress) this.progress.style.width = pct + '%';
    const bar = this.progress ? this.progress.closest('[role=progressbar]') : null;
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
  }

  /* ----- events ----- */

  _onOptionChange(event) {
    if (!event.target.matches('input[type=radio][name^="kg-quiz-q"]')) return;
    const value = parseInt(event.target.value, 10);
    this.answers[this.step] = value;
    this._save();
    this._updateNav();
  }

  _onNavClick(event) {
    if (event.currentTarget === this.prev && this.step > 0) {
      this.step -= 1;
      this._save();
      this._render();
    } else if (event.currentTarget === this.next) {
      if (this.answers[this.step] == null) return;
      this.step += 1;
      this._save();
      this._render();
    }
  }

  _onKeydown(event) {
    if (event.key >= '1' && event.key <= '9') {
      const idx = parseInt(event.key, 10) - 1;
      const radios = this.stage.querySelectorAll('input[type=radio]');
      if (radios[idx]) {
        radios[idx].checked = true;
        radios[idx].dispatchEvent(new Event('change', { bubbles: true }));
        radios[idx].focus();
        event.preventDefault();
      }
    } else if (event.key === 'Enter') {
      if (!this.next.disabled) {
        event.preventDefault();
        this.next.click();
      }
    }
  }

  /* ----- utils ----- */

  _escape(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  _attr(str) { return this._escape(str); }
}

if (!customElements.get('kg-pantry-quiz')) {
  customElements.define('kg-pantry-quiz', KindredGrovePantryQuiz);
}
