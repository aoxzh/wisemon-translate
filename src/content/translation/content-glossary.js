(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function applyGlossary(text) {
    if (!text) return text;
    const settings = ctx.state.settings || {};
    const activeTerms = getActiveTerms(settings);
    if (activeTerms.length > 0) {
      return applyStructuredGlossary(text, activeTerms);
    }
    if (!settings.glossary) return text;
    const glossary = settings.glossary;
    if (typeof glossary !== 'string' || !glossary.trim()) return text;
    const lines = glossary.split('\n').filter(Boolean);
    let result = text;
    for (const line of lines) {
      const parts = line.split(',').map(function(s) { return s.trim(); });
      if (parts.length >= 2 && parts[0] && parts[1]) {
        try {
          const regex = new RegExp(parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          result = result.replace(regex, parts[1]);
        } catch (e) {}
      }
    }
    return result;
  }

  function getActiveTerms(settings) {
    const terms = Array.isArray(settings.terms) ? settings.terms.slice() : [];
    const siteTerms = Array.isArray(settings.siteTerms) ? settings.siteTerms : [];
    const host = location.hostname.toLowerCase();
    siteTerms.forEach(function(term) {
      if (!term || !term.pattern || !term.replacement) return;
      const domains = String(term.domains || '').split(/[\n,]+/).map(function(item) { return item.trim().toLowerCase(); }).filter(Boolean);
      if (!domains.length) return;
      const matched = domains.some(function(domain) {
        const clean = domain.replace(/^\*\./, '');
        return host === clean || host.endsWith('.' + clean);
      });
      if (matched) terms.push({ pattern: term.pattern, replacement: term.replacement, regex: !!term.regex });
    });
    return terms;
  }

  function applyStructuredGlossary(text, terms) {
    if (!text || !terms || terms.length === 0) return text;
    const placeholderMap = {};
    let placeholderCounter = 0;
    const PLACEHOLDER_PREFIX = '\x00GLOSSPH_';
    const PLACEHOLDER_SUFFIX = '\x00';
    let result = text;
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if (!term || !term.pattern || !term.replacement) continue;
      let regex;
      if (term.regex) {
        try {
          regex = new RegExp(term.pattern, 'gi');
        } catch (e) {
          regex = new RegExp(term.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }
      } else {
        regex = new RegExp('\\b' + term.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      }
      result = result.replace(regex, function() {
        const key = PLACEHOLDER_PREFIX + (placeholderCounter++) + PLACEHOLDER_SUFFIX;
        placeholderMap[key] = term.replacement;
        return key;
      });
    }
    for (const key in placeholderMap) {
      if (Object.prototype.hasOwnProperty.call(placeholderMap, key)) {
        result = result.split(key).join(placeholderMap[key]);
      }
    }
    return result;
  }

  Object.assign(ctx.fn, {
    applyGlossary,
    applyStructuredGlossary,
    getActiveTerms
  });
})();
