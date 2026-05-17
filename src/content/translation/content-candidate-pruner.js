/**
 * Candidate pruning for large and dynamic pages.
 * Keeps DOM scanning broad, but only lets high-value leaf-ish nodes enter
 * translation queues.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  const ALWAYS_LEAF_TAGS = new Set(['A', 'BUTTON', 'LABEL', 'SUMMARY', 'FIGCAPTION', 'CAPTION', 'TH', 'TD', 'LI', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

  function normalizeText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/[\u200b-\u200f\ufeff]/g, '')
      .trim()
      .toLowerCase();
  }

  function hasHighLinkDensity(el, deps, text) {
    if (!(el instanceof Element) || !text || text.length < 60) return false;
    const linkText = Array.from(el.querySelectorAll('a'))
      .map(a => deps.getVisibleText(a))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return linkText.length > 0 && linkText.length / text.length > 0.82;
  }

  function hasHighControlDensity(el, deps, text) {
    if (!(el instanceof Element) || !text || text.length < 40) return false;
    const controls = el.querySelectorAll('button,input,select,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]').length;
    if (controls < 3) return false;
    const textBlocks = Math.max(1, el.querySelectorAll('p,li,td,th,dd,dt,blockquote,figcaption,[markdown-text]').length);
    return controls > textBlocks;
  }

  function isOversizedContainer(el, deps, text) {
    if (!(el instanceof Element)) return false;
    if (ALWAYS_LEAF_TAGS.has(el.tagName)) return false;
    const childCandidates = Array.from(el.children || []).filter(child => {
      if (!(child instanceof Element) || deps.isIgnored(child)) return false;
      const childText = deps.getVisibleText(child);
      return childText && childText.length >= 2 && !deps.isInvalidText(childText);
    });
    const limit = Math.max(1800, deps.settings?.maxCharsPerRequest || 4000);
    return childCandidates.length >= 3 || text.length > limit;
  }

  function compareDocumentOrder(a, b) {
    if (a === b) return 0;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    return 0;
  }

  function pruneCandidates(candidates, deps) {
    const expanded = [];
    for (const el of candidates || []) {
      if (!(el instanceof Element)) continue;
      const text = deps.getVisibleText(el);
      if (isOversizedContainer(el, deps, text)) {
        const leafSelector = 'p,li,td,th,dd,dt,blockquote,figcaption,caption,h1,h2,h3,h4,h5,h6';
        el.querySelectorAll?.(leafSelector).forEach(child => expanded.push(child));
      } else {
        expanded.push(el);
      }
    }

    const unique = [];
    const seenElements = new WeakSet();
    const seenText = new Set();

    for (const el of expanded) {
      if (!(el instanceof Element) || seenElements.has(el)) continue;
      if (deps.processedElements?.has(el)) continue;
      if (deps.isIgnored(el)) continue;
      if (deps.matchesSiteRuleSelector?.(el, deps.siteRule?.excludeSelectors)) continue;

      const text = deps.getVisibleText(el);
      if (!text || deps.isInvalidText(text)) continue;
      if (deps.shouldSkipTranslation?.(text, deps.settings?.targetLang)) continue;
      if (hasHighControlDensity(el, deps, text) || hasHighLinkDensity(el, deps, text)) continue;
      if (isOversizedContainer(el, deps, text)) continue;

      const normalized = normalizeText(text);
      if (!normalized || seenText.has(normalized)) continue;
      seenText.add(normalized);
      seenElements.add(el);
      unique.push(el);
    }

    unique.sort(compareDocumentOrder);

    const selected = [];
    for (const el of unique) {
      const coveredByDescendant = selected.some(kept => el !== kept && el.contains(kept));
      if (coveredByDescendant) continue;

      for (let i = selected.length - 1; i >= 0; i--) {
        if (selected[i].contains(el)) selected.splice(i, 1);
      }
      selected.push(el);
    }

    return selected.sort(compareDocumentOrder);
  }

  ctx.fn.candidatePruner = {
    pruneCandidates,
    normalizeText
  };
})();
