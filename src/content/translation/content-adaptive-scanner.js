/**
 * Adaptive content scanner helpers.
 * Keeps semantic text discovery and low-value text filtering out of content-main.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  const ADAPTIVE_TEXT_SELECTORS = [
    '[markdown-text]',
    '[data-testid*="text" i]',
    '[data-testid*="content" i]',
    '[class*="content" i]',
    '[class*="description" i]',
    '[class*="summary" i]',
    '[class*="comment" i]',
    '[class*="reply" i]',
    '[class*="message" i]',
    '[class*="article" i]',
    '[class*="post" i]',
    '[class*="entry" i]',
    '[class*="thread" i]',
    '[class*="story" i]',
    '[class*="body" i]',
    '[class*="title" i]',
    '[role="article"]',
    '[role="feed"] article',
    '[role="listitem"]',
    'article p',
    'main p',
    'section p',
    'article li',
    'main li',
    'blockquote',
    'figcaption',
    'td',
    'th'
  ];

  const LOW_VALUE_TEXT_PATTERNS = [
    /^[a-f0-9]{16,}$/i,
    /^(?:[A-Z0-9]{8,}[-_]){1,}[A-Z0-9]{4,}$/i,
    /^\d+(?:[.,]\d+)?\s*(?:b|kb|kib|mb|mib|gb|gib|tb|tib)$/i,
    /^\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:utc|gmt|jst|est|pst))?$/i,
    /^(?:seeders|leechers|completed|date|size|file size|info hash|submitter|category):?$/i,
    /^magnet:\?xt=/i,
    /^(?:reply|share|like|liked|repost|follow|following|subscribe|login|sign in|sign up)$/i,
    /^[#@][\p{L}\p{N}_-]{1,40}$/u
  ];

  function isLowValueText(text) {
    const raw = String(text || '').trim();
    if (!raw) return true;
    const normalized = raw.replace(/\s+/g, ' ');
    for (const re of LOW_VALUE_TEXT_PATTERNS) {
      if (re.test(normalized)) return true;
    }
    if (/^[A-Fa-f0-9]{32,}$/.test(normalized.replace(/\s+/g, ''))) return true;
    if (/^[\w.-]+\.(?:mkv|mp4|avi|mov|zip|rar|7z|torrent|ass|srt|png|jpg|jpeg|webp)$/i.test(normalized)) return true;
    if (normalized.length < 4 && !/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(normalized)) return true;
    return false;
  }

  function hasSemanticContentSignal(el) {
    if (!(el instanceof Element)) return false;
    if (el.hasAttribute('markdown-text')) return true;
    const attrs = Array.from(el.attributes || []).map(attr => attr.name + ' ' + attr.value).join(' ');
    const idClass = ((el.id || '') + ' ' + (el.className || '') + ' ' + attrs).toLowerCase();
    return /\b(article|body|comment|content|description|entry|message|post|reply|story|summary|text|thread|title)\b/.test(idClass);
  }

  function hasReadableTextShape(el, deps, text) {
    const directText = deps.getDirectText(el);
    if (directText && directText.length >= Math.min(24, text.length)) return true;
    if (text.length >= 80 && /[.!?。！？]\s|\n|[\u3002\uff01\uff1f]/.test(text)) return true;
    if (el.querySelector?.('p,li,blockquote,figcaption,dd,dt')) return true;
    return false;
  }

  function hasHighLinkDensity(el, getVisibleText) {
    const text = getVisibleText(el);
    if (!text || text.length < 40) return false;
    const linkText = Array.from(el.querySelectorAll('a')).map(a => getVisibleText(a)).join(' ');
    return linkText.length > 0 && linkText.length / text.length > 0.82;
  }

  function hasHighControlDensity(el, getVisibleText) {
    const text = getVisibleText(el);
    if (!text || text.length < 20) return false;
    const controls = el.querySelectorAll('button,input,select,textarea,[role="button"],[role="menuitem"]').length;
    const textNodes = Math.max(1, Array.from(el.querySelectorAll('p,li,td,th,dd,dt,blockquote,figcaption,[markdown-text]')).length);
    return controls >= 3 && controls > textNodes;
  }

  function isAdaptiveTextCandidate(el, deps) {
    if (!(el instanceof Element)) return false;
    if (deps.isIgnored(el) || deps.observedElements.has(el) || deps.processedElements.has(el)) return false;
    if (deps.matchesSiteRuleSelector(el, deps.siteRule?.excludeSelectors)) return false;
    if (hasHighControlDensity(el, deps.getVisibleText) || hasHighLinkDensity(el, deps.getVisibleText)) return false;
    const text = deps.getVisibleText(el);
    if (deps.isInvalidText(text) || isLowValueText(text)) return false;
    if (text.length > Math.max(1800, deps.settings.maxCharsPerRequest || 4000)) return false;
    const childBlockCount = Array.from(el.children || []).filter(child => deps.isBlockNode(child)).length;
    const semantic = hasSemanticContentSignal(el);
    if (hasReadableTextShape(el, deps, text)) return true;
    return childBlockCount <= (semantic ? 5 : 2) || semantic;
  }

  function scanReadableTextFallback(root, deps) {
    try {
      root.querySelectorAll?.('p,li,dd,dt,blockquote,figcaption,caption,h1,h2,h3,h4,h5,h6').forEach(function(el) {
        if (isAdaptiveTextCandidate(el, deps)) deps.startObserveElement(el);
      });
    } catch (e) {
      deps.safeLog?.('debug', 'Content', 'Adaptive fallback skipped: ' + e.message);
    }
  }

  function scanAdaptiveTextElements(root, deps) {
    if (!root || !(root instanceof Element || root instanceof DocumentFragment)) return;
    for (const selector of ADAPTIVE_TEXT_SELECTORS) {
      try {
        if (root instanceof Element && root.matches(selector)) deps.startObserveElement(root);
        root.querySelectorAll?.(selector).forEach(function(el) {
          if (isAdaptiveTextCandidate(el, deps)) deps.startObserveElement(el);
        });
      } catch (e) {
        deps.safeLog?.('debug', 'Content', 'Adaptive selector skipped: ' + selector, { error: e.message });
      }
    }
    scanReadableTextFallback(root, deps);
  }

  ctx.fn.adaptiveScanner = {
    scanAdaptiveTextElements,
    isLowValueText,
    hasSemanticContentSignal,
    isAdaptiveTextCandidate,
    scanReadableTextFallback,
    ADAPTIVE_TEXT_SELECTORS,
    LOW_VALUE_TEXT_PATTERNS
  };
})();
