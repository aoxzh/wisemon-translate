/**
 * Translation injection and DOM wrapper rendering.
 * Separated from content-main to keep the core engine from growing indefinitely.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const constants = ctx.constants || {};
  const TAG_NAME = constants.TAG_NAME || 'llm-translate';
  const ATTR_PROCESSED = constants.ATTR_PROCESSED || 'data-llm-done';
  const ATTR_ID = constants.ATTR_ID || 'data-llm-id';
  const ATTR_OBSERVED = constants.ATTR_OBSERVED || 'data-llm-observed';
  const BLOCK_TAGS = constants.BLOCK_TAGS || new Set();
  const WARP_TAGS = constants.WARP_TAGS || new Set();
  const REPLACE_TAGS = constants.REPLACE_TAGS || new Set();
  const STRICT_PARENT_TAGS = constants.STRICT_PARENT_TAGS || new Set();

  function _safeLog(level, tag, msg, data) {
    if (typeof ctx.fn?.safeLog === 'function') {
      ctx.fn.safeLog(level, tag, msg, data);
    }
  }

  function getSettings() { return ctx.state.settings; }

  function getProcessedElements() { return ctx.fn.processedElements; }
  function getObservedElements() { return ctx.fn.observedElements; }

  // ---- Node Group Build: serialize with placeholder preservation ----
  function buildNodeGroup(hostEl) {
    const processedElements = getProcessedElements();
    if (processedElements.has(hostEl)) return null;

    const nodes = [];
    let plainText = '';
    const placeholderMap = new Map();
    let counter = 0;

    function pushPlaceholder(html) {
      counter++;
      // Use LLM-friendly XML placeholder that won't leak into translation
      const key = `<llm-tag n="${counter}"/>`;
      placeholderMap.set(key, html);
      return key;
    }

    function traverse(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.replace(/\s+/g, ' ').trim();
        if (t) plainText += (plainText ? ' ' : '') + t;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toUpperCase();

      // Skip script/style elements entirely
      if (tag === 'SCRIPT' || tag === 'STYLE') return;

      // Replace images/svgs/media with placeholder
      if (REPLACE_TAGS.has(tag)) {
        plainText += (plainText ? ' ' : '') + pushPlaceholder(node.outerHTML);
        return;
      }

      // Preserve inline formatting
      if (WARP_TAGS.has(tag)) {
        for (const child of node.childNodes) traverse(child);
        return;
      }

      // Skip elements with data/JSON content
      if (node.matches && (node.matches('script, style, noscript, [type="application/json"], [type="application/ld+json"]') ||
          node.getAttribute?.('type') === 'application/json' ||
          node.getAttribute?.('type') === 'application/ld+json')) {
        return;
      }

      // Recurse
      for (const child of node.childNodes) traverse(child);
    }

    const wholeElementHost = ['A','BUTTON','LABEL','SUMMARY','FIGCAPTION','CAPTION'].includes(hostEl.tagName);

    // Collect direct child nodes for the group
    for (const child of hostEl.childNodes) {
      if (child.nodeType === Node.TEXT_NODE || (child.nodeType === Node.ELEMENT_NODE && (wholeElementHost || !isBlockNode(child)))) {
        nodes.push(child);
        traverse(child);
      }
    }

    const isInvalidText = ctx.fn.isInvalidText || function(text) { return !text || String(text).trim().length < 2; };
    const cleanTextForTranslation = ctx.fn.cleanTextForTranslation || function(text) { return String(text || '').replace(/\s+/g, ' ').trim(); };

    if (!plainText || isInvalidText(plainText)) return null;

    // Apply glossary before translation (term replacement)
    plainText = ctx.fn.applyGlossary ? ctx.fn.applyGlossary(plainText) : plainText;
    // Clean up any remaining placeholder-like artifacts in the source text
    plainText = cleanTextForTranslation(plainText);

    if (!plainText || plainText.length < 2) return null;

    const id = (typeof generateId === 'function') ? generateId() : String(Date.now()) + Math.random();
    processedElements.set(hostEl, { id: id });
    hostEl.setAttribute(ATTR_PROCESSED, 'true');
    hostEl.setAttribute(ATTR_ID, id);
    hostEl.removeAttribute(ATTR_OBSERVED);

    return { element: hostEl, text: plainText, nodes, placeholderMap };
  }

  function isBlockNode(el) {
    if (!(el instanceof Element)) return false;
    if (BLOCK_TAGS.has(el.tagName)) return true;
    try {
      const display = getComputedStyle(el).display;
      return !display.startsWith('inline');
    } catch (e) { return false; }
  }

  // ---- Translation Injection ----
  function applyPageState(state) {
    const settings = getSettings();
    const root = document.documentElement;
    root.setAttribute('llm-state', state);
    root.setAttribute('llm-page-tone', detectPageTone());
    // Theme
    const theme = normalizeTranslationTheme(settings?.translationTheme);
    root.setAttribute('llm-theme', theme);
    // Position
    const position = settings?.translationPosition || 'after';
    root.setAttribute('llm-pos', position);
    // Font size as CSS variable
    const fontSize = (settings?.fontSize || 94) / 100;
    root.style.setProperty('--llm-font-size', fontSize + 'em');
  }

  function detectPageTone() {
    try {
      const samples = [document.body, document.documentElement].filter(Boolean);
      for (const el of samples) {
        const color = getComputedStyle(el).backgroundColor;
        const rgb = parseCssRgb(color);
        if (!rgb) continue;
        const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
        return luminance < 0.42 ? 'dark' : 'light';
      }
    } catch (e) {}
    return 'light';
  }

  function parseCssRgb(value) {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null;
    const match = String(value).match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(',').map(part => parseFloat(part.trim()));
    if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) return null;
    if (parts.length >= 4 && parts[3] === 0) return null;
    return parts.slice(0, 3);
  }

  function injectTranslationResult(group, translatedText) {
    const settings = getSettings();
    const processedElements = getProcessedElements();
    const { element, nodes } = group;
    if (!element.isConnected || !element.parentNode) return;
    if (settings?.displayMode !== 'replace' && shouldSkipCompactUiInBilingual(element, group.text)) {
      processedElements.set(element, { skippedCompactUi: true });
      element.setAttribute(ATTR_PROCESSED, 'true');
      return;
    }
    if (shouldReplaceCompactUiText(element, group.text)) {
      replaceCompactUiText(group, translatedText);
      return;
    }

    // Determine if this is a block or inline insertion
    const isBlock = isBlockNode(element) || isCompactUiTextElement(element, group.text);
    const wrapperClass = isBlock ? `${TAG_NAME}-block-wrapper` : `${TAG_NAME}-inline-wrapper`;
    // For elements inside strict parents (tr/ul/ol/table), use inline-only
    const hasStrictParent = element.parentNode && element.parentNode.nodeType === 1 && STRICT_PARENT_TAGS.has(element.parentNode.tagName);

    const wrapper = document.createElement(isBlock && !hasStrictParent ? 'div' : 'span');
    wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
    wrapper.setAttribute(ATTR_ID, element.getAttribute(ATTR_ID));

    const inner = document.createElement('span');
    inner.className = `${TAG_NAME}-inner`;
    inner.textContent = translatedText;
    wrapper.appendChild(inner);

    if (settings?.displayMode === 'replace') {
      element.classList.add('llm-original-hidden');
      applyPageState('translation');
    } else {
      applyPageState('dual');
    }

    // For strict-parent elements (td/li/option inside tr/ul/ol/select),
    // append wrapper INSIDE the element to avoid invalid DOM
    if (hasStrictParent) {
      element.appendChild(wrapper);
      return;
    }

    // Normal insertion: after the host element
    const position = settings?.translationPosition || 'after';
    if (element.nextSibling) {
      if (position === 'before') {
        element.parentNode.insertBefore(wrapper, element);
      } else {
        element.parentNode.insertBefore(wrapper, element.nextSibling);
      }
    } else {
      if (position === 'before') {
        element.parentNode.insertBefore(wrapper, element);
      } else {
        element.parentNode.appendChild(wrapper);
      }
    }
  }

  function isCompactUiTextElement(el, text) {
    if (!(el instanceof Element)) return false;
    const tag = el.tagName;
    if (['A','BUTTON','LABEL','SUMMARY','LI','FIGCAPTION','CAPTION','TH','TD'].includes(tag)) return true;
    const len = String(text || '').replace(/\s+/g, '').length;
    if (len <= 16 && el.closest?.('nav, header, footer, aside, menu, [role="navigation"], [role="menu"], [class*="menu"], [class*="nav"], [class*="footer"], [class*="header"]')) {
      return true;
    }
    return false;
  }

  function shouldReplaceCompactUiText(el, text) {
    const settings = getSettings();
    if (!(el instanceof Element)) return false;
    if (settings?.displayMode !== 'replace') return false;
    const compactLen = String(text || '').replace(/\s+/g, '').length;
    if (compactLen === 0 || compactLen > 24) return false;
    if (!el.closest?.('nav, header, footer, aside, menu, [role="navigation"], [role="menu"], [class*="menu"], [class*="nav"], [class*="footer"], [class*="header"]')) {
      return false;
    }
    if (el.querySelector?.('img, svg, canvas, video, audio')) return false;
    return ['A','BUTTON','SPAN','LI','LABEL','SUMMARY','P','DIV'].includes(el.tagName);
  }

  function shouldSkipCompactUiInBilingual(el, text) {
    if (!(el instanceof Element)) return false;
    const compactLen = String(text || '').replace(/\s+/g, '').length;
    if (compactLen === 0 || compactLen > 32) return false;
    if (['TD','TH','CAPTION','FIGCAPTION'].includes(el.tagName)) return false;
    if (el.closest?.('nav, header, footer, aside, menu, [role="navigation"], [role="menu"], [role="tablist"], [class*="menu"], [class*="nav"], [class*="footer"], [class*="header"], [class*="toolbar"], [class*="button"], [class*="breadcrumb"]')) {
      return true;
    }
    return ['A','BUTTON','LABEL','SUMMARY'].includes(el.tagName);
  }

  function normalizeTranslationTheme(theme) {
    const allowed = ['none', 'grey', 'weakening', 'underline', 'nativeUnderline', 'nativeDashed', 'nativeDotted', 'thinDashed', 'wavy', 'dashed', 'divider', 'dividingLine', 'blockquote', 'background', 'highlight', 'marker', 'marker2', 'italic', 'bold', 'subtle', 'card', 'paper', 'dashedBorder', 'solidBorder', 'mask', 'opacity'];
    if (allowed.includes(theme)) return theme;
    const legacyMap = {
      dividingLine: 'divider',
      blurReveal: 'mask'
    };
    return legacyMap[theme] || 'none';
  }

  function replaceCompactUiText(group, translatedText) {
    const settings = getSettings();
    const pageTranslated = ctx.state.pageTranslated;
    const el = group.element;
    if (!el.hasAttribute('data-llm-original-html')) {
      el.setAttribute('data-llm-original-html', 'true');
      // Store cloned child nodes so restoration does not re-parse HTML strings.
      const fragment = document.createDocumentFragment();
      Array.from(el.childNodes).forEach(function(node) {
        fragment.appendChild(node.cloneNode(true));
      });
      el._llmOriginalFragment = fragment;
    }
    el.textContent = translatedText;
    el.setAttribute('title', group.text);
    el.setAttribute(ATTR_PROCESSED, 'true');
    applyPageState(pageTranslated ? (settings?.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
  }

  function showRetry(group, errorMsg) {
    const settings = getSettings();
    const processedElements = getProcessedElements();
    const observedElements = getObservedElements();
    if (!group.element.isConnected || !group.element.parentNode) return;
    const isBlock = isBlockNode(group.element);
    const wrapperClass = isBlock ? `${TAG_NAME}-block-wrapper` : `${TAG_NAME}-inline-wrapper`;
    const hasStrictParent = group.element.parentNode && group.element.parentNode.nodeType === 1 && STRICT_PARENT_TAGS.has(group.element.parentNode.tagName);

    const wrapper = document.createElement('span');
    wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
    wrapper.setAttribute(ATTR_ID, group.element.getAttribute(ATTR_ID));
    const retry = document.createElement('span');
    retry.className = `${TAG_NAME}-retry`;
    retry.textContent = 'Retry';
    retry.title = errorMsg;
    retry.onclick = () => {
      wrapper.remove();
      processedElements.delete(group.element);
      group.element.removeAttribute(ATTR_PROCESSED);
      group.element.removeAttribute(ATTR_OBSERVED);
      observedElements.delete?.(group.element);
      if (typeof ctx.fn.startObserveElement === 'function') ctx.fn.startObserveElement(group.element);
      if (typeof ctx.fn.scheduleProcessViewBatch === 'function') ctx.fn.scheduleProcessViewBatch([group.element]);
    };
    wrapper.appendChild(retry);
    const position = settings?.translationPosition || 'after';
    if (hasStrictParent) {
      group.element.appendChild(wrapper);
    } else if (position === 'before') {
      group.element.parentNode.insertBefore(wrapper, group.element);
    } else if (group.element.nextSibling) {
      group.element.parentNode.insertBefore(wrapper, group.element.nextSibling);
    } else {
      group.element.parentNode.appendChild(wrapper);
    }
  }

  function reprocessSkippedCompactUi() {
    const processedElements = getProcessedElements();
    const observedElements = getObservedElements();
    // When switching from bilingual to replace mode, elements that were skipped
    // because they are compact UI need to be re-evaluated and translated.
    const toReprocess = [];
    document.querySelectorAll(`[${ATTR_PROCESSED}]`).forEach(function(el) {
      const info = processedElements.get(el);
      if (info && info.skippedCompactUi) {
        processedElements.delete(el);
        el.removeAttribute(ATTR_PROCESSED);
        el.removeAttribute(ATTR_OBSERVED);
        observedElements.delete?.(el);
        toReprocess.push(el);
      }
    });
    if (toReprocess.length) {
      if (typeof LOG !== 'undefined') LOG.info('Content', `Reprocessing ${toReprocess.length} skipped compact UI elements after display mode change`);
      toReprocess.forEach(function(el) {
        if (typeof ctx.fn.startObserveElement === 'function') ctx.fn.startObserveElement(el);
      });
      if (typeof ctx.fn.scheduleProcessViewBatch === 'function') ctx.fn.scheduleProcessViewBatch(toReprocess);
    }
  }

  function removeTranslation(wrapper) {
    const processedElements = getProcessedElements();
    // Restore original element visibility
    const wrapperId = wrapper.getAttribute(ATTR_ID);
    const candidates = [wrapper.previousElementSibling, wrapper.nextElementSibling];
    let originalEl = candidates.find(el => el && el.hasAttribute(ATTR_PROCESSED) && (!wrapperId || el.getAttribute(ATTR_ID) === wrapperId));
    // For strict-parent wrappers (td/th/li), the original is the parent element
    if (!originalEl && wrapper.parentElement?.hasAttribute(ATTR_PROCESSED) && (!wrapperId || wrapper.parentElement.getAttribute(ATTR_ID) === wrapperId)) {
      originalEl = wrapper.parentElement;
    }
    if (originalEl) {
      originalEl.classList.remove('llm-original-hidden');
      originalEl.removeAttribute(ATTR_PROCESSED);
      processedElements.delete(originalEl);
    }
    wrapper.remove();
  }

  function removeTranslationFrom(container) {
    container.querySelectorAll(`[class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"]`).forEach(removeTranslation);
  }

  Object.assign(ctx.fn, {
    buildNodeGroup,
    isBlockNode,
    applyPageState,
    detectPageTone,
    parseCssRgb,
    injectTranslationResult,
    isCompactUiTextElement,
    shouldReplaceCompactUiText,
    shouldSkipCompactUiInBilingual,
    normalizeTranslationTheme,
    replaceCompactUiText,
    showRetry,
    reprocessSkippedCompactUi,
    removeTranslation,
    removeTranslationFrom
  });
})();
