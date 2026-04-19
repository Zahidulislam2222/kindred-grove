/**
 * Collection filters — progressive enhancement.
 *
 * With JS disabled, the Apply button inside <noscript> is shown and the
 * user clicks it to submit. With JS, any change to an input in the form
 * auto-submits so the page reloads with the new query params. Debounced
 * to 350ms so rapid changes (e.g. dragging price inputs) coalesce.
 */
(function () {
  'use strict';

  const form = document.querySelector('[data-kg-filter-form]');
  if (!form) return;

  let debounceTimer = null;

  function submitSoon() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => form.submit(), 350);
  }

  form.addEventListener('change', (event) => {
    if (event.target.matches('[data-kg-filter-input]')) {
      submitSoon();
    }
  });

  // Submit immediately on Enter inside number/text inputs (no debounce).
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input[type="number"], input[type="text"]')) {
      event.preventDefault();
      clearTimeout(debounceTimer);
      form.submit();
    }
  });
})();
