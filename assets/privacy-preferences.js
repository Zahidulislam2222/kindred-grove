/* Reopens Shopify's native consent preferences UI when its public bridge exists. */
document.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-kg-open-privacy-preferences]');
  if (!trigger) return;
  event.preventDefault();
  const status = document.querySelector('[data-kg-privacy-preferences-status]');
  try {
    if (!window.privacyBanner || typeof window.privacyBanner.showPreferences !== 'function') {
      throw new Error('Native privacy preferences are unavailable.');
    }
    await window.privacyBanner.showPreferences();
  } catch (_error) {
    if (status) status.textContent = trigger.dataset.unavailableMessage || '';
  }
});

document.addEventListener('change', (event) => {
  if (!event.target.matches('[data-shopify-country-selector]')) return;
  const form = event.target.form;
  if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
});
