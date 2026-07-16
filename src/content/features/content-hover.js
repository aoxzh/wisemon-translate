/**
 * Hover translation feature.
 * Loaded by content-main when hover mode is enabled.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ || {};
  const constants = ctx.constants || {};
  const BLOCK_TAGS = constants.BLOCK_TAGS || new Set();
  const ATTR_PROCESSED = constants.ATTR_PROCESSED || 'data-llm-done';

  let settings = null;
  let hoverKeyPressed = false;
  const activeHoverParagraphs = new Set();
  let hoverDebounceTimer = null;
  let hoverPendingRequest = null; // AbortController for canceling in-flight hover requests
  let currentHoverEl = null;
  let currentHoverBtn = null;

  function _safeLog(level, tag, msg, data) {
    if (typeof ctx.fn?.safeLog === 'function') {
      ctx.fn.safeLog(level, tag, msg, data);
    }
  }

  function getProcessedElements() {
    return ctx.fn?.processedElements;
  }

  function isIgnored(el) {
    return typeof ctx.fn?.isIgnored === 'function' ? ctx.fn.isIgnored(el) : false;
  }

  function getVisibleText(el) {
    return typeof ctx.fn?.getVisibleText === 'function' ? ctx.fn.getVisibleText(el) : '';
  }

  function isInvalidText(text) {
    return typeof ctx.fn?.isInvalidText === 'function' ? ctx.fn.isInvalidText(text) : !text;
  }

  function onKeyDown(e) {
    if (!settings?.enableHover || settings.hoverMode === 'direct') return;
    if (settings?.keyboardShortcuts) {
      const sc = settings.keyboardShortcuts;
      if ((sc.translatePage && ctx.fn?.checkCombo && ctx.fn.checkCombo(e, sc.translatePage)) ||
          (sc.toggleHover && ctx.fn?.checkCombo && ctx.fn.checkCombo(e, sc.toggleHover)) ||
          (sc.toggleStyle && ctx.fn?.checkCombo && ctx.fn.checkCombo(e, sc.toggleStyle))) {
        return;
      }
    }
    const key = settings.hoverKey || 'shift';
    const match = (key === 'shift' && e.shiftKey) || (key === 'ctrl' && (e.ctrlKey || e.metaKey)) || (key === 'alt' && e.altKey);
    if (match && !hoverKeyPressed) {
      hoverKeyPressed = true;
      document.body.style.cursor = 'pointer';
    }
  }

  function onKeyUp(e) {
    if (hoverKeyPressed) {
      const key = (settings && settings.hoverKey) || 'shift';
      const stillPressed = (key === 'shift' && e.shiftKey) ||
                           (key === 'ctrl' && (e.ctrlKey || e.metaKey)) ||
                           (key === 'alt' && e.altKey);
      if (!stillPressed) {
        hoverKeyPressed = false;
        document.body.style.cursor = '';
      }
    }
  }

  function getHoverTarget(el) {
    const processedElements = getProcessedElements();
    while (el && el !== document.body) {
      if (BLOCK_TAGS.has(el.tagName) && !isIgnored(el) && !processedElements?.has(el)) {
        const text = getVisibleText(el);
        if (text && text.length >= 10 && !isInvalidText(text)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function onMouseOver(e) {
    if (!settings?.enableHover) return;
    if (settings.hoverMode !== 'direct' && !hoverKeyPressed) return;
    if (hoverDebounceTimer) clearTimeout(hoverDebounceTimer);
    const target = getHoverTarget(e.target);
    if (!target || activeHoverParagraphs.has(target)) return;
    hoverDebounceTimer = setTimeout(function() { translateHoverElement(target, e); }, 300);
  }

  function onMouseOut(e) {
    if (hoverDebounceTimer) { clearTimeout(hoverDebounceTimer); hoverDebounceTimer = null; }
  }

  function cleanupHover() {
    if (hoverPendingRequest) {
      try { hoverPendingRequest.abort(); } catch(ex) {}
      hoverPendingRequest = null;
    }
    if (currentHoverBtn && currentHoverBtn.parentNode) currentHoverBtn.remove();
    if (currentHoverEl) {
      activeHoverParagraphs.delete(currentHoverEl);
      currentHoverEl = null;
    }
    currentHoverBtn = null;
  }

  function translateHoverElement(el, e) {
    const processedElements = getProcessedElements();
    if (!el || processedElements?.has(el)) return;
    const text = getVisibleText(el);
    if (!text || text.length < 10) return;

    cleanupHover();

    activeHoverParagraphs.add(el);
    currentHoverEl = el;
    const rect = el.getBoundingClientRect();
    const btn = document.createElement('button');
    btn.className = 'llm-translate-hover-btn';
    btn.textContent = 'Translating...';
    btn.style.left = Math.min((rect.right || e.clientX) + 8, innerWidth - 140) + 'px';
    btn.style.top = (rect.top || e.clientY) + 'px';
    document.body.appendChild(btn);
    currentHoverBtn = btn;

    const controller = new AbortController();
    hoverPendingRequest = controller;

    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model) : text;
    if (typeof getCachedTranslation === 'function') {
      getCachedTranslation(cacheKey).then(async function(cached) {
        if (cached && hoverPendingRequest === controller) {
          hoverPendingRequest = null;
          currentHoverEl = null;
          currentHoverBtn = null;
          showHoverResult(el, btn, cached);
          return;
        }
        if (hoverPendingRequest !== controller) {
          cleanupHover();
          return;
        }
        try {
          const res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
          if (controller.signal.aborted) {
            cleanupHover();
            return;
          }
          hoverPendingRequest = null;
          currentHoverEl = null;
          currentHoverBtn = null;
          if (res.error) throw new Error(res.error);
          showHoverResult(el, btn, res.translated);
        } catch (err) {
          if (controller.signal.aborted) {
            cleanupHover();
            return;
          }
          hoverPendingRequest = null;
          currentHoverEl = null;
          currentHoverBtn = null;
          processedElements?.delete(el);
          el.removeAttribute(ATTR_PROCESSED);
          if (btn.parentNode) btn.remove();
          activeHoverParagraphs.delete(el);
          _safeLog('error', 'Content', 'Hover translate failed: ' + err.message);
        }
      });
    } else {
      translateHoverDirect(el, btn, text, controller);
    }
  }

  async function translateHoverDirect(el, btn, text, controller) {
    const processedElements = getProcessedElements();
    try {
      const res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
      if (controller.signal.aborted) {
        cleanupHover();
        return;
      }
      hoverPendingRequest = null;
      currentHoverEl = null;
      currentHoverBtn = null;
      if (res.error) throw new Error(res.error);
      showHoverResult(el, btn, res.translated);
    } catch (err) {
      if (controller.signal.aborted) {
        cleanupHover();
        return;
      }
      hoverPendingRequest = null;
      currentHoverEl = null;
      currentHoverBtn = null;
      processedElements?.delete(el);
      el.removeAttribute(ATTR_PROCESSED);
      if (btn.parentNode) btn.remove();
      activeHoverParagraphs.delete(el);
      _safeLog('error', 'Content', 'Hover direct translate failed: ' + err.message);
    }
  }

  function showHoverResult(el, btn, result) {
    activeHoverParagraphs.delete(el);
    btn.textContent = result.slice(0, 120) + (result.length > 120 ? '...' : '');
    btn.title = result;
    setTimeout(function() {
      if (btn.parentNode) { btn.remove(); activeHoverParagraphs.delete(el); }
    }, 5000);
  }

  function initHoverFeature(nextSettings) {
    settings = nextSettings;
    if (!ctx.fn) ctx.fn = {};
    ctx.fn.onKeyDown = onKeyDown;
    ctx.fn.onKeyUp = onKeyUp;
    ctx.fn.onMouseOver = onMouseOver;
    ctx.fn.onMouseOut = onMouseOut;
  }

  function destroyHoverFeature() {
    if (ctx.fn) {
      delete ctx.fn.onKeyDown;
      delete ctx.fn.onKeyUp;
      delete ctx.fn.onMouseOver;
      delete ctx.fn.onMouseOut;
    }
    cleanupHover();
    settings = null;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.initHoverFeature = initHoverFeature;
    globalThis.destroyHoverFeature = destroyHoverFeature;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initHoverFeature, destroyHoverFeature };
  }
})();
