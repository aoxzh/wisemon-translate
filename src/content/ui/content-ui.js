(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getSettings() {
    return ctx.state.settings || null;
  }

  function injectStyles() {
    if (document.getElementById('llm-translate-inline-styles')) return;
    const link = document.createElement('link');
    link.id = 'llm-translate-inline-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/content/ui/inline-styles.css');
    document.head.appendChild(link);
  }

  function injectRuleCss(cssList) {
    document.getElementById('llm-translate-rule-styles')?.remove();
    if (!Array.isArray(cssList) || cssList.length === 0) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'llm-translate-rule-styles';
    styleEl.textContent = cssList.join('\n');
    document.documentElement.appendChild(styleEl);
  }

  function injectCustomTranslationCss() {
    const existing = document.getElementById('llm-translate-custom-styles');
    if (existing) existing.remove();
    const settings = getSettings();
    if (!settings?.customTranslationCss?.trim()) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'llm-translate-custom-styles';
    styleEl.textContent = settings.customTranslationCss;
    document.documentElement.appendChild(styleEl);
  }

  function showToast(msg, duration = 2500) {
    const existing = document.querySelector('.llm-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'llm-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('llm-toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showOverlay() {
    const existing = document.getElementById('llm-overlay');
    if (existing) return;
    const overlay = document.createElement('div');
    overlay.id = 'llm-overlay';
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    const overlay = document.getElementById('llm-overlay');
    if (overlay) overlay.remove();
  }

  function createLoadingSpinner() {
    const tagName = ctx.state.tagName || 'llm-translate';
    const el = document.createElement('span');
    el.className = tagName + '-loading';
    for (let i = 0; i < 3; i++) {
      el.appendChild(document.createElement('span'));
    }
    return el;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setSafeText(el, text) {
    if (!el) return;
    el.textContent = text == null ? '' : String(text);
  }

  Object.assign(ctx.fn, {
    injectStyles,
    injectRuleCss,
    injectCustomTranslationCss,
    showToast,
    showOverlay,
    hideOverlay,
    createLoadingSpinner,
    escapeHtml,
    setSafeText
  });
})();
