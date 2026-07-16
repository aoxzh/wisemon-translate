/**
 * Element-level utilities used across content scripts.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const constants = ctx.constants || {};
  const IGNORE_TAGS = constants.IGNORE_TAGS || new Set();
  const IGNORE_SELECTOR = constants.IGNORE_SELECTOR || '';

  function getSettings() { return ctx.state.settings; }

  function isIgnored(el) {
    if (!(el instanceof Element)) return false;
    const tag = el.tagName.toUpperCase();
    if (IGNORE_TAGS.has(tag)) return true;
    if (el.matches && el.matches(IGNORE_SELECTOR)) return true;
    if (el.closest && el.closest(IGNORE_SELECTOR)) return true;
    // User-defined extra exclude selector
    const settings = getSettings();
    if (settings && settings.extraExcludeSelector) {
      try {
        if (el.matches && el.matches(settings.extraExcludeSelector)) return true;
        if (el.closest && el.closest(settings.extraExcludeSelector)) return true;
      } catch(e) { /* invalid selector, ignore */ }
    }
    return false;
  }

  function matchesSiteRuleSelector(el, selectors) {
    if (!el || !Array.isArray(selectors) || selectors.length === 0) return false;
    for (const selector of selectors) {
      try {
        if (selector && el.matches(selector)) return true;
        if (selector && el.closest(selector)) return true;
      } catch (e) {}
    }
    return false;
  }

  function isTranslatableElement(el) {
    if (!(el instanceof Element)) return false;
    if (isIgnored(el)) return false;
    const observedElements = ctx.fn.observedElements;
    if (observedElements && observedElements.has(el)) return false;
    const getVisibleText = ctx.fn.getVisibleText;
    const isInvalidText = ctx.fn.isInvalidText;
    const text = getVisibleText ? getVisibleText(el) : '';
    if (isInvalidText ? isInvalidText(text) : !text) return false;
    return true;
  }

  Object.assign(ctx.fn, {
    isIgnored,
    matchesSiteRuleSelector,
    isTranslatableElement
  });
})();
