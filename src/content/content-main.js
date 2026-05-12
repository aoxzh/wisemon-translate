/**
 * Content Script - Main Page Interaction
 * Inspired by kiss-translator architecture:
 * - MutationObserver for dynamic content
 * - IntersectionObserver for viewport-aware lazy translation
 * - Rich text preservation via placeholder replacement
 * - Comprehensive element coverage (BLOCK + INLINE + WARP)
 */

(function() {
  'use strict';

  if (window.__LLM_TRANSLATE_MAIN_STATUS__ === 'ready' || window.__LLM_TRANSLATE_MAIN_STATUS__ === 'loading') return;
  window.__LLM_TRANSLATE_MAIN_STATUS__ = 'loading';

  // ---- Constants ----
  const TAG_NAME = 'llm-translate';
  const ATTR_PROCESSED = 'data-llm-done';
  const ATTR_ID = 'data-llm-id';
  if (!window.__LLM_CTX__) window.__LLM_CTX__ = { state: {}, fn: {}, features: {} };
  window.__LLM_CTX__.state.tagName = TAG_NAME;
  window.__LLM_CTX__.state.attrProcessed = ATTR_PROCESSED;

  // Block elements: treated as translatable containers
  const BLOCK_TAGS = new Set([
    'ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','DD','DIV','DL','DT',
    'FIELDSET','FIGCAPTION','FIGURE','FOOTER','FORM','H1','H2','H3','H4','H5','H6',
    'HEADER','LI','MAIN','NAV','OL','P','PRE','SECTION','TABLE','TD','TFOOT','TH','UL'
  ]);

  // Inline formatting elements preserved during translation (WARP)
  const WARP_TAGS = new Set([
    'A','ABBR','B','BDI','BDO','BIG','CITE','CODE','DEL','DFN','EM',
    'FONT','I','INS','KBD','LABEL','MARK','Q','RP','RT','RUBY','S',
    'SAMP','SMALL','SPAN','STRONG','SUB','SUP','TIME','TT','U','VAR'
  ]);

  // Elements whose HTML content is replaced as-is (not translated)
  const REPLACE_TAGS = new Set(['IMG','SVG','CANVAS','VIDEO','AUDIO','IFRAME','OBJECT','EMBED']);

  // Elements completely ignored
  const IGNORE_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','TEMPLATE','AREA','MAP','WBR','BR','HR','PRE','CODE','KBD','SAMP']);

  // Additional ignore selectors
  const IGNORE_SELECTOR = `pre, code, kbd, samp, [contenteditable='true'], [translate='no'], .notranslate, [class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"], #llm-translate-inline-styles, .llm-translate-hover-btn, .llm-translate-popup`;

  // Built-in skip patterns (text that should NOT be translated)
  // Built-in skip patterns (text that should NOT be translated)
  const SKIP_PATTERNS = [
    /^(?:https?:\/\/|www\.)[^\s]*$/i,
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /^[\d.,\s%pxemremptvwvhdegs]+$/,
    /^[^\p{L}\p{N}\s]{1,5}$/u,
    /^&[a-z]+;$/i,
    /^\[\d+\]$/,
    /^\d{1,2}:\d{2}(:\d{2})?$/,
    /^#[A-Fa-f0-9]{3,8}$/,
    // JSON/script patterns — critical for avoiding garbage translation
    /^\s*[\{\[]/,           // starts with { or [
    /^\s*<\/?[a-zA-Z]+/,   // starts with HTML tag
    /[a-zA-Z0-9+/]{50,}={0,2}/, // base64-like
    /\$\{[^}]+\}/,          // template literal ${...}
    /\{\{[^}]+\}\}/,       // placeholder {{...}}
  ];

  // Elements that contain non-translatable content
  const NON_CONTENT_PATTERNS = [
    /^\s*function\s*\(/,     // JS function
    /^\s*\{[^}]*"[^"]+"\s*:/, // JSON-like
    /^\s*\/\//,              // JS comment
    /ue\.count|ue_csm|\.execute\(/, // JS framework calls
    /^[A-Z0-9]{10,}$/,       // all-caps IDs/tokens
    /^\s*P\.when\(/,         // Amazon JS pattern
    /^\s*\[.*\{.*\}.*\]/,    // Array of objects pattern
  ];

  // ---- Safe logging guard ----
  function _safeLog(level, tag, msg, data) {
    try {
      if (typeof LOG !== 'undefined' && LOG[level]) {
        LOG[level](tag, msg, data);
      } else if (typeof console !== 'undefined') {
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        fn(`[${tag}] ${msg}`, data || '');
      }
    } catch (e) { /* never crash on logging */ }
  }
  window.__LLM_CTX__.fn.safeLog = _safeLog;

  // ---- State ----
  let settings = null;
  let pageTranslated = false;
  let hoverEnabled = false;
  let hoverKeyPressed = false;
  let translationRunId = 0;
  let siteRule = null;
  let translateQueue = null;
  let translationStats = { queued: 0, succeeded: 0, failed: 0 };
  let currentScanStats = null;
  let initialVisibleElements = null;
  const ctx = window.__LLM_CTX__;

  // DOM tracking
  let mutationObserver = null;
  let intersectionObserver = null;
  let observedElements = new WeakSet();    // elements being watched by IO
  let processedElements = new WeakMap();   // element → translation rule snapshot
  const viewElements = new Set();            // elements currently in viewport
  const dirtyQueue = new Set();
  let dirtyProcessing = false;

  // Hover state
  let activeHoverParagraphs = new Set();
  let currentPopup = null;
  let hoverDebounceTimer = null;
  let hoverPendingRequest = null; // AbortController for canceling in-flight hover requests
  let subtitleObserver = null;    // MutationObserver for video subtitle detection
  const scannedShadowRoots = new WeakSet();  // shadow roots already scanned

  // ---- Initialization ----
  async function init() {
    LOG.info('Content', 'Content script v2 initializing...');
    try {
      const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
      settings = { ...DEFAULT_SETTINGS, ...res.settings };
    } catch (e) {
      settings = { ...DEFAULT_SETTINGS };
    }

    siteRule = typeof getSiteRule === 'function' ? getSiteRule(location.href, settings) : null;
    ctx.state.siteRule = siteRule;
    if (siteRule?.matchedIds?.length) {
      LOG.info('Rules', `Matched site rules: ${siteRule.matchedIds.join(', ')}`, siteRule);
    }
    if (siteRule?.disabled) {
      LOG.info('Content', `Site rule disabled translation: ${siteRule.reason || siteRule.id}`);
      ctx.fn.attachFrameMessageBridge();
      return;
    }
    if (siteRule?.disableAutoTranslate) settings.autoTranslate = false;
    if (siteRule?.privacyMode === 'strict') {
      settings.privacyMasking = true;
      settings.maskEmail = true;
      settings.maskPhone = true;
      settings.maskCreditCard = true;
      settings.maskSecrets = true;
    }
    if (siteRule?.injectedCss?.length) window.__LLM_CTX__.fn.injectRuleCss(siteRule.injectedCss);
    window.__LLM_CTX__.fn.injectCustomTranslationCss();

    translateQueue = typeof createBatchQueue === 'function'
      ? createBatchQueue(sendTranslateBatch, {
          batchInterval: settings.largeTextMode ? 120 : 160,
          batchSize: settings.largeTextMode ? Math.min(Math.max(settings.maxConcurrency || 6, 8), 16) : Math.min(Math.max(settings.maxConcurrency || 6, 6), 12),
          batchLength: settings.largeTextMode ? Math.min(Math.max(settings.maxCharsPerRequest || 12000, 9000), 12000) : (settings.maxCharsPerRequest || 12000),
          maxParallelBatches: Math.max(1, Math.min(4, Math.ceil((settings.maxConcurrency || 6) / 3))),
          tag: 'TranslateQueue'
        })
      : null;

    // Check excluded sites
    if (settings.excludedSites && settings.excludedSites.length > 0) {
      try {
        const hostname = location.hostname;
        const excluded = settings.excludedSites.some(site => {
          const s = site.trim();
          return s && (hostname === s || hostname.endsWith('.' + s));
        });
        if (excluded) {
          LOG.info('Content', `Site ${hostname} is excluded, skipping initialization`);
          return;
        }
      } catch (e) { /* ignore */ }
    }

    if (window.top !== window && !ctx.fn.shouldRunInFrame()) {
      LOG.info('Content', 'Iframe detected; installing lightweight message bridge only');
      ctx.fn.attachFrameMessageBridge();
      return;
    }

    hoverEnabled = settings.enableHover;

    // Create shared namespace for in-file feature modules
    ctx.state.settings = settings;
    ctx.state.hoverEnabled = hoverEnabled;
    ctx.state.translationRunId = translationRunId;
    ctx.state.pageTranslated = pageTranslated;
    ctx.state.viewElements = viewElements;
    ctx.state.dirtyQueue = dirtyQueue;
    ctx.state.inputState = new WeakMap();
    ctx.state.subtitleState = new WeakMap();
    ctx.state.subtitleCache = new Map();
    // Expose core engine functions to feature modules
    Object.assign(ctx.fn, {
      buildNodeGroup,
      injectTranslationResult,
      cleanTranslatedText,
      cleanTextForTranslation,
      scanNode,
      scheduleProcessViewBatch,
      togglePageTranslation,
      restoreOriginal,
      applyPageState,
      processedElements,
      observedElements,
      shouldSkipTranslation,
      getVisibleText,
      isIgnored,
      isTranslatableElement,
      BLOCK_TAGS,
      WARP_TAGS,
      IGNORE_TAGS,
      ATTR_PROCESSED,
      ATTR_ID
    });

    ctx.state.ready = true;
    ctx.fn.attachEventListeners();
    window.__LLM_TRANSLATE_INITIALIZED__ = true;
    window.__LLM_TRANSLATE_MAIN_STATUS__ = 'ready';

    LOG.info('Content', `Ready: model=${settings.model}, target=${settings.targetLang}, display=${settings.displayMode}`);
    ctx.fn.injectStyles();
    try {
      if (typeof ctx.fn.setupVideoSubtitleTranslation === 'function') ctx.fn.setupVideoSubtitleTranslation();
    } catch (err) {
      _safeLog('warn', 'Content', 'Subtitle setup skipped after init: ' + err.message);
    }
    try {
      if (typeof ctx.fn.createFab === 'function') ctx.fn.createFab();
    } catch (err) {
      _safeLog('warn', 'Content', 'FAB setup skipped after init: ' + err.message);
    }

    // Auto-translate if enabled
    if (settings.autoTranslate) {
      LOG.info('Content', 'Auto-translate enabled, starting translation...');
      setTimeout(() => togglePageTranslation(), 800);
    }
  }

  async function handleRuntimeMessage(request) {
    return ctx.fn.handleRuntimeMessage(request);
  }

  // ==================== PAGE TRANSLATION ENGINE ====================

  async function togglePageTranslation() {
    translationRunId++;
    if (translateQueue) translateQueue.clear('Translation run changed');
    if (pageTranslated) {
      restoreOriginal();
      ctx.fn.stopObservers();
      pageTranslated = false;
      ctx.state.pageTranslated = pageTranslated;
      return { success: true, pageTranslated, translatedCount: 0 };
    } else {
      const result = await startTranslation();
      pageTranslated = result.succeeded > 0;
      ctx.state.pageTranslated = pageTranslated;
      if (!pageTranslated) {
        ctx.fn.stopObservers();
        _safeLog('warn', 'Content', 'Translation did not produce visible translated text', result);
        return {
          success: false,
          pageTranslated: false,
          error: result.reason || 'No visible text was translated. Check Logs for details.',
          translatedCount: result.succeeded || 0
        };
      }
      return { success: true, pageTranslated: true, translatedCount: result.succeeded };
    }
  }

  function restoreOriginal() {
    document.querySelectorAll(`[class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"]`).forEach(el => removeTranslation(el));
    document.querySelectorAll('[data-llm-original-html]').forEach(el => {
      el.innerHTML = el.getAttribute('data-llm-original-html') || '';
      el.removeAttribute('data-llm-original-html');
      el.removeAttribute('title');
    });
    document.querySelectorAll('.llm-original-hidden').forEach(el => {
      el.classList.remove('llm-original-hidden');
    });
    document.querySelectorAll(`[${ATTR_PROCESSED}]`).forEach(el => {
      el.removeAttribute(ATTR_PROCESSED);
    });
    // Reset root state
    document.documentElement.removeAttribute('llm-state');
    document.documentElement.removeAttribute('llm-theme');
    // Restore page title
    restorePageTitle();
    // Clear all tracking state so re-translate works cleanly
    observedElements = new WeakSet();
    processedElements = new WeakMap();
    viewElements.clear();
    dirtyQueue.clear();
    dirtyProcessing = false;
    translatedTextHashes.clear();
    translatedTextCache.clear();
    translationStats = { queued: 0, succeeded: 0, failed: 0 };
  }

  async function startTranslation() {
    if (!settings) {
      const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
      settings = { ...DEFAULT_SETTINGS, ...res.settings };
    }

    // Fully reset state for clean re-translation
    observedElements = new WeakSet();
    processedElements = new WeakMap();
    viewElements.clear();
    dirtyQueue.clear();
    dirtyProcessing = false;
    translatedTextHashes.clear();
    translatedTextCache.clear();
    translationStats = { queued: 0, succeeded: 0, failed: 0 };
    currentScanStats = { observed: 0, skippedByRule: 0, skippedIgnored: 0, skippedInvalid: 0, skippedSameLanguage: 0 };
    initialVisibleElements = new Set();
    LOG.info('Content', 'Starting page translation, scanning DOM...');

    // Translate page title
    await translatePageTitle();

    // Setup observers
    ctx.fn.setupMutationObserver();
    ctx.fn.setupIntersectionObserver();

    // Initial scan (main document or main content only)
    const scanRoot = ctx.fn.getMainContentRoot();
    applyPageState(settings.displayMode === 'replace' ? 'translation' : 'dual');
    scanRuleIncludedElements(scanRoot);
    scanNode(scanRoot);
    if (initialVisibleElements.size > 0) {
      scheduleProcessViewBatch(Array.from(initialVisibleElements));
    }

    // Shadow DOM support
    startShadowRootObservation();

    LOG.info('Content', 'DOM scan complete. Waiting for first visible translation.', currentScanStats);
    const result = await waitForInitialTranslation();
    currentScanStats = null;
    initialVisibleElements = null;
    return result;
  }

  async function waitForInitialTranslation(timeoutMs = 20000) {
    var startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (translationStats.succeeded > 0) {
        return { succeeded: translationStats.succeeded, failed: translationStats.failed, queued: translationStats.queued, reason: '' };
      }
      if (translationStats.failed > 0 && translationStats.queued > 0 && (Date.now() - startedAt) > 3000) {
        if (translationStats.succeeded === 0) {
          return { succeeded: 0, failed: translationStats.failed, queued: translationStats.queued, reason: 'All initial translation requests failed.' };
        }
      }
      if (translationStats.queued === 0 && (Date.now() - startedAt) > 500) {
        return { succeeded: 0, failed: 0, queued: 0, reason: 'No translatable visible text was found on this page.' };
      }
      await new Promise(function(resolve) { setTimeout(resolve, 250); });
    }
    return { succeeded: translationStats.succeeded, failed: translationStats.failed, queued: translationStats.queued, reason: translationStats.succeeded > 0 ? '' : 'Timed out waiting for the first translation result.' };
  }

  // ---- MutationObserver: watch for dynamically added content ----
  // Deduplication: track already-translated text hashes to avoid duplicate API calls
  const translatedTextHashes = new Set();
  const translatedTextCache = new Map();
  function getTextHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const chr = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  async function processViewBatch(elements) {
    const toProcess = elements.filter(el =>
      observedElements.has(el) && !processedElements.has(el)
    );
    if (toProcess.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };

    LOG.info('Content', `Viewport batch: ${toProcess.length} elements`, {
      runId: translationRunId,
      queueSize: translateQueue?.size ? translateQueue.size() : 0
    });
    const groups = [];
    const textHashMap = new Map(); // hash -> translated result

    for (const el of toProcess) {
      const group = buildNodeGroup(el);
      if (!group) continue;
      const hash = getTextHash(group.text);
      // Skip if already translated in this session
      if (translatedTextHashes.has(hash)) {
        const cachedResult = translatedTextCache.get(hash) || textHashMap.get(hash);
        if (cachedResult) {
          injectTranslationResult(group, cachedResult);
          translationStats.succeeded++;
          LOG.debug('Content', 'Injected duplicate text from in-page cache', {
            hash,
            textLength: group.text.length
          });
        } else {
          processedElements.delete(group.element);
          group.element.removeAttribute(ATTR_PROCESSED);
          // Keep ATTR_ID on the element — removing it would produce "null" on re-translate
          const existingId = group.element.getAttribute(ATTR_ID);
          if (existingId) group.preservedId = existingId;
          _safeLog('warn', 'Content', 'Duplicate text hash had no cached translation; re-queued element', {
            hash,
            textPreview: group.text.slice(0, 120)
          });
          group.textHash = hash;
          group.runId = translationRunId;
          groups.push(group);
        }
        continue;
      }
      group.textHash = hash;
      group.runId = translationRunId;
      groups.push(group);
    }
    if (groups.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };
    translationStats.queued += groups.length;

    // Update FAB progress
    const totalVisible = translationStats.queued;
    const pending = groups.length;
    ctx.fn.updateFabProgress(totalVisible - pending, totalVisible);

    var doneCount = 0;
    var failedCount = 0;
    var totalVisible2 = translationStats.queued;

    function injectOne(group, raw) {
      if (group.runId !== translationRunId) return;
      if (!raw || raw.indexOf('[Translation Error:') === 0) {
        failedCount++;
        translationStats.failed++;
        _safeLog('error', 'Content', 'Element translation failed', { reason: raw || 'Unknown', textLength: group.text.length, textPreview: group.text.slice(0, 180) });
        showRetry(group, raw || 'Unknown error');
      } else {
        var cleaned = cleanTranslatedText(raw);
        if (cleaned && cleaned.length > 0) {
          injectTranslationResult(group, cleaned);
          translatedTextHashes.add(group.textHash);
          translatedTextCache.set(group.textHash, cleaned);
          doneCount++;
          translationStats.succeeded++;
        } else {
          failedCount++;
          translationStats.failed++;
          _safeLog('error', 'Content', 'Element translation cleaned to empty', { textLength: group.text.length, textPreview: group.text.slice(0, 180) });
          showRetry(group, 'Empty result after cleaning');
        }
      }
      ctx.fn.updateFabProgress(totalVisible2 - (groups.length - doneCount - failedCount), totalVisible2);
      chrome.runtime.sendMessage({ action: 'translation-progress', translatedCount: translationStats.succeeded, totalVisibleCount: totalVisible2 }).catch(function(){});
    }

    if (translateQueue) {
      groups.forEach(function(group) {
        if (group.runId !== translationRunId) return;
        translateQueue.add(group.text, { runId: translationRunId }).then(function(raw) {
          injectOne(group, raw);
        }).catch(function(err) {
          if (group.runId === translationRunId) {
            failedCount++;
            translationStats.failed++;
            _safeLog('error', 'Content', 'Viewport item failed: ' + err.message, { textLength: group.text.length });
            showRetry(group, err.message);
          }
        });
      });
    } else {
      try {
        var texts = groups.map(function(g) { return g.text; });
        var results = await sendTranslateBatch(texts, { runId: translationRunId });
        groups.forEach(function(group, i) { injectOne(group, results[i]); });
      } catch (err) {
        translationStats.failed += groups.length;
        doneCount = 0;
        failedCount = groups.length;
        _safeLog('error', 'Content', 'Viewport batch failed: ' + err.message, { count: groups.length, runId: translationRunId });
      }
    }
  }

  function scheduleProcessViewBatch(elements) {
    processViewBatch(elements).catch(err => {
      _safeLog('error', 'Content', 'Scheduled viewport batch crashed: ' + err.message, err.stack);
    });
  }

  async function sendTranslateBatch(texts, args = {}) {
    if (args.runId && args.runId !== translationRunId) {
      return texts.map(() => '[Translation Error: Translation run was canceled]');
    }
    const res = await chrome.runtime.sendMessage({ action: 'translate-batch', texts });
    if (res.error) throw new Error(res.error);
    return res.results || [];
  }

  // ---- DOM Scanning ----
  function scanRuleIncludedElements(root) {
    const selectors = siteRule?.includeSelectors || [];
    if (!root || !Array.isArray(selectors) || selectors.length === 0) return;
    for (const selector of selectors) {
      try {
        root.querySelectorAll(selector).forEach(function(el) {
          if (!matchesSiteRuleSelector(el, siteRule?.excludeSelectors)) {
            startObserveElement(el);
          }
        });
      } catch (e) {
        _safeLog('warn', 'Rules', 'Invalid include selector skipped: ' + selector, { error: e.message });
      }
    }
  }

  function scanNode(root, includeTextNodePass = true) {
    if (!(root instanceof Element) && !(root instanceof DocumentFragment)) return;
    if (root.nodeType === Node.ELEMENT_NODE && isIgnored(root)) return;

    // Skip non-main areas when translateMainOnly is enabled
    if (settings?.translateMainOnly && root !== document.body) {
      const tag = root.tagName.toLowerCase();
      const role = root.getAttribute('role');
      const skipRoles = ['banner', 'navigation', 'complementary', 'contentinfo', 'search'];
      if (skipRoles.includes(role)) return;
      const skipTags = ['header', 'footer', 'nav', 'aside'];
      if (skipTags.includes(tag)) return;
    }

    // Check if this node itself is a translatable block
    if (root.nodeType === Node.ELEMENT_NODE) {
      const hasBlockChild = [...root.children].some(c => BLOCK_TAGS.has(c.tagName));
      const hasDirectText = hasDirectTextNode(root);

      if (hasDirectText || !hasBlockChild) {
        if (isTranslatableElement(root)) {
          startObserveElement(root);
        }
      }
    }

    // Recurse into block children
    for (const child of root.children || []) {
      if (BLOCK_TAGS.has(child.tagName)) {
        scanNode(child, false);
      } else if (WARP_TAGS.has(child.tagName) && hasDirectTextNode(child)) {
        // Inline wrapper with text: scan for the nearest block parent
      }
    }

    // Also scan non-block elements that might contain text
    for (const child of root.children || []) {
      if (!BLOCK_TAGS.has(child.tagName) && !WARP_TAGS.has(child.tagName) && !isIgnored(child)) {
        scanNode(child, false);
      }
    }

    if (includeTextNodePass) scanTextNodes(root);
  }

  function scanTextNodes(root) {
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
          if (!value || value.length < Math.max(1, settings?.minTextLength || 2)) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent || isIgnored(parent)) return NodeFilter.FILTER_REJECT;
          if (matchesSiteRuleSelector(parent, siteRule?.excludeSelectors)) {
            if (currentScanStats) currentScanStats.skippedByRule++;
            return NodeFilter.FILTER_REJECT;
          }
          if (isInvalidText(value)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const hosts = new Set();
      while (walker.nextNode()) {
        const host = findTranslationHostForTextNode(walker.currentNode);
        if (host) hosts.add(host);
      }
      hosts.forEach(startObserveElement);
      if (hosts.size && currentScanStats) currentScanStats.textNodeHosts = (currentScanStats.textNodeHosts || 0) + hosts.size;
    } catch (err) {
      LOG.debug('Content', `Text node scan skipped: ${err.message}`);
    }
  }

  function findTranslationHostForTextNode(textNode) {
    let el = textNode?.parentElement;
    if (!el || isIgnored(el)) return null;

    let candidate = el;
    let depth = 0;
    while (el && el !== document.body && depth < 5) {
      if (isIgnored(el) || matchesSiteRuleSelector(el, siteRule?.excludeSelectors)) return null;
      if (el.hasAttribute?.(ATTR_PROCESSED) || observedElements.has(el)) return null;

      const tag = el.tagName;
      const directText = getDirectText(el);
      const childBlockCount = Array.from(el.children || []).filter(child => isBlockNode(child)).length;
      const visibleText = getVisibleText(el);

      if (['A','BUTTON','LABEL','SUMMARY','FIGCAPTION','CAPTION','TH','TD','LI','P','H1','H2','H3','H4','H5','H6'].includes(tag)) {
        candidate = el;
        break;
      }
      if (BLOCK_TAGS.has(tag) && directText && childBlockCount === 0 && visibleText.length <= Math.max(600, settings.maxCharsPerRequest || 4000)) {
        candidate = el;
        break;
      }
      if (WARP_TAGS.has(tag) && directText && (!el.parentElement || isBlockNode(el.parentElement))) {
        candidate = el;
        break;
      }

      candidate = el;
      el = el.parentElement;
      depth++;
    }

    if (!candidate || candidate === document.body || isIgnored(candidate)) return null;
    if (!isTranslatableElement(candidate)) return null;
    return candidate;
  }

  function getDirectText(el) {
    if (!(el instanceof Element)) return '';
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += ' ' + (child.nodeValue || '');
      }
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function startObserveElement(el) {
    if (!(el instanceof Element)) return;
    if (observedElements.has(el)) return;
    if (isIgnored(el)) {
      if (currentScanStats) currentScanStats.skippedIgnored++;
      return;
    }
    if (matchesSiteRuleSelector(el, siteRule?.excludeSelectors)) {
      if (currentScanStats) currentScanStats.skippedByRule++;
      return;
    }

    const text = getVisibleText(el);
    if (isInvalidText(text)) {
      if (currentScanStats) currentScanStats.skippedInvalid++;
      return;
    }

    // Language skip: don't translate if target language matches detected language
    if (shouldSkipTranslation(text, settings.targetLang)) {
      if (currentScanStats) currentScanStats.skippedSameLanguage++;
      return;
    }

    observedElements.add(el);
    if (currentScanStats) currentScanStats.observed++;
    if (ctx.state.intersectionObserver) ctx.state.intersectionObserver.observe(el);

    // Process immediately if in viewport
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
      viewElements.add(el);
      if (initialVisibleElements) {
        initialVisibleElements.add(el);
      } else {
        scheduleProcessViewBatch([el]);
      }
    }
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
    if (observedElements.has(el)) return false;
    const text = getVisibleText(el);
    if (isInvalidText(text)) return false;
    return true;
  }

  function hasDirectTextNode(el) {
    if (!(el instanceof Element)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue)) return true;
    }
    return false;
  }

  function getVisibleText(el) {
    if (!el) return '';
    // Use innerText (respects CSS visibility) but fallback to textContent
    return (el.innerText || el.textContent || '').trim();
  }

  function isInvalidText(text) {
    if (!text || text.length < 2) return true;
    const normalized = String(text).replace(/\s+/g, '').trim();
    const hasLetterOrNumber = /[\p{L}\p{N}]/u.test(normalized);
    const hasTranslatableScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}A-Za-z]/u.test(normalized);
    if (!hasLetterOrNumber || !hasTranslatableScript) return true;
    // Skip pure symbols/numbers
    if (/^[\d\s\p{P}\p{S}_]+$/u.test(text) && text.length < 30) return true;
    // Skip built-in patterns
    for (const re of SKIP_PATTERNS) {
      if (re.test(text)) return true;
    }
    // Skip non-content patterns (JSON, JS code, tokens)
    for (const re of NON_CONTENT_PATTERNS) {
      if (re.test(text)) return true;
    }
    // Skip if text has too many non-letter chars (likely code/JSON)
    const letters = (text.match(/[a-zA-Z一-鿿぀-ゟ゠-ヿ가-힯]/g) || []).length;
    if (letters < text.length * 0.15 && text.length > 20) return true;
    // Skip if text contains long unbroken token strings
    if (/[A-Za-z0-9+\/=]{60,}/.test(text)) return true;
    return false;
  }

  function isIgnored(el) {
    if (!(el instanceof Element)) return false;
    const tag = el.tagName.toUpperCase();
    if (IGNORE_TAGS.has(tag)) return true;
    if (el.matches && el.matches(IGNORE_SELECTOR)) return true;
    if (el.closest && el.closest(IGNORE_SELECTOR)) return true;
    // User-defined extra exclude selector
    if (settings && settings.extraExcludeSelector) {
      try {
        if (el.matches && el.matches(settings.extraExcludeSelector)) return true;
        if (el.closest && el.closest(settings.extraExcludeSelector)) return true;
      } catch(e) { /* invalid selector, ignore */ }
    }
    return false;
  }

  // ---- Node Group Build: serialize with placeholder preservation ----
  function buildNodeGroup(hostEl) {
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
      if (node.matches && (node.matches('script, style, noscript, [type="application/json"], [type="application/ld+json"]'))) return;
      if (node.getAttribute && (node.getAttribute('type') === 'application/json' || node.getAttribute('type') === 'application/ld+json')) return;

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

    if (!plainText || isInvalidText(plainText)) return null;

    // Apply glossary before translation (term replacement)
    plainText = ctx.fn.applyGlossary(plainText);
    // Clean up any remaining placeholder-like artifacts in the source text
    plainText = cleanTextForTranslation(plainText);

    processedElements.set(hostEl, { id: generateId() });
    hostEl.setAttribute(ATTR_PROCESSED, 'true');
    hostEl.setAttribute(ATTR_ID, processedElements.get(hostEl).id);

    return { element: hostEl, text: plainText, nodes, placeholderMap };
  }

  // Pre-processing: clean text before sending to LLM
  function cleanTextForTranslation(text) {
    if (!text) return '';
    // Remove any remaining JSON-like fragments
    text = text.replace(/\{[^{}]*"[^"]+"\s*:\s*[^,{}]+\}/g, '');
    // Remove any remaining placeholder syntax
    text = text.replace(/\{\{[0-9]+\}\}/g, '');
    // Remove base64-like strings
    text = text.replace(/[A-Za-z0-9+\/=]{40,}/g, '');
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  // Post-processing: clean LLM response of artifacts
  function cleanTranslatedText(text) {
    if (!text) return '';
    text = extractJsonTextArtifact(text) || text;
    // Remove placeholder echoes
    text = text.replace(/<llm-tag n="\d+"\/>/g, '');
    text = text.replace(/\{\{[0-9]+\}\}/g, '');
    // Remove JSON fragments that leaked through
    text = text.replace(/\{[^{}]*"[^"]+"\s*:\s*[0-9.]+\}/g, '');
    text = text.replace(/\["[A-Z0-9]+"\]/g, '');
    // Remove common framework code artifacts
    text = text.replace(/ue\.count\([^)]*\)/g, '');
    text = text.replace(/P\.when\([^)]*\)/g, '');
    text = text.replace(/\.execute\([^)]*\)/g, '');
    // Clean up whitespace
    text = text.replace(/^\s*[\{\[][\s\S]*[\}\]]\s*$/g, ''); // Remove if entire response is JSON
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function extractJsonTextArtifact(text) {
    var raw = String(text || '').trim();
    if (!/^[[{]/.test(raw) || !/"?(?:id|text|translations)"?\s*:/.test(raw)) return '';
    var candidates = [raw, raw.replace(/,\s*$/, ''), '[' + raw.replace(/,\s*$/, '') + ']'];
    for (var i = 0; i < candidates.length; i++) {
      try {
        var parsed = JSON.parse(candidates[i]);
        var items = Array.isArray(parsed?.translations) ? parsed.translations : (Array.isArray(parsed) ? parsed : [parsed]);
        var parts = [];
        for (var j = 0; j < items.length; j++) {
          if (items[j] && typeof items[j].text === 'string') parts.push(items[j].text);
        }
        if (parts.length) return parts.join('\n');
      } catch (e) { /* try next candidate */ }
    }
    return '';
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
    const root = document.documentElement;
    root.setAttribute('llm-state', state);
    // Theme
    const theme = settings.translationTheme || 'none';
    root.setAttribute('llm-theme', theme);
    // Position
    const position = settings.translationPosition || 'after';
    root.setAttribute('llm-pos', position);
    // Font size as CSS variable
    const fontSize = (settings.fontSize || 94) / 100;
    root.style.setProperty('--llm-font-size', fontSize + 'em');
  }

  // Strict-child tags: parents that only allow specific child elements
  const STRICT_PARENT_TAGS = new Set(['TR', 'UL', 'OL', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'SELECT']);

  function injectTranslationResult(group, translatedText) {
    const { element, nodes } = group;
    if (!element.isConnected || !element.parentNode) return;
    if (shouldReplaceCompactUiText(element, group.text)) {
      replaceCompactUiText(group, translatedText);
      return;
    }

    // Determine if this is a block or inline insertion
    const isBlock = isBlockNode(element) || isCompactUiTextElement(element, group.text);
    const wrapperClass = isBlock ? `${TAG_NAME}-block-wrapper` : `${TAG_NAME}-inline-wrapper`;
    // For elements inside strict parents (tr/ul/ol/table), use inline-only
    const hasStrictParent = element.parentNode && element.parentNode.nodeType === 1 && STRICT_PARENT_TAGS.has(element.parentNode.tagName);

    const wrapper = document.createElement('span');
    wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
    wrapper.setAttribute(ATTR_ID, element.getAttribute(ATTR_ID));

    const inner = document.createElement('span');
    inner.className = `${TAG_NAME}-inner`;
    inner.innerHTML = ctx.fn.escapeHtml(translatedText);
    wrapper.appendChild(inner);

    if (settings.displayMode === 'replace') {
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
    if (element.nextSibling) {
      if ((settings.translationPosition || 'after') === 'before') {
        element.parentNode.insertBefore(wrapper, element);
      } else {
        element.parentNode.insertBefore(wrapper, element.nextSibling);
      }
    } else {
      if ((settings.translationPosition || 'after') === 'before') {
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
    if (!(el instanceof Element)) return false;
    const compactLen = String(text || '').replace(/\s+/g, '').length;
    if (compactLen === 0 || compactLen > 24) return false;
    if (!el.closest?.('nav, header, footer, aside, menu, [role="navigation"], [role="menu"], [class*="menu"], [class*="nav"], [class*="footer"], [class*="header"]')) {
      return false;
    }
    if (el.querySelector?.('img, svg, canvas, video, audio')) return false;
    return ['A','BUTTON','SPAN','LI','LABEL','SUMMARY','P','DIV'].includes(el.tagName);
  }

  function replaceCompactUiText(group, translatedText) {
    const el = group.element;
    if (!el.hasAttribute('data-llm-original-html')) {
      el.setAttribute('data-llm-original-html', el.innerHTML);
    }
    el.textContent = translatedText;
    el.setAttribute('title', group.text);
    el.setAttribute(ATTR_PROCESSED, 'true');
    applyPageState(pageTranslated ? (settings.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
  }

  function showRetry(group, errorMsg) {
    if (!group.element.isConnected || !group.element.parentNode) return;
    const isBlock = isBlockNode(group.element);
    const wrapperClass = isBlock ? `${TAG_NAME}-block-wrapper` : `${TAG_NAME}-inline-wrapper`;
    const hasStrictParent = group.element.parentNode && group.element.parentNode.nodeType === 1 && STRICT_PARENT_TAGS.has(group.element.parentNode.tagName);

    const wrapper = document.createElement('span');
    wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
    wrapper.setAttribute(ATTR_ID, group.element.getAttribute(ATTR_ID));
    const retry = document.createElement('span');
    retry.className = `${TAG_NAME}-retry`;
    retry.textContent = '↻ Retry';
    retry.title = errorMsg;
    retry.onclick = () => {
      wrapper.remove();
      processedElements.delete(group.element);
      group.element.removeAttribute(ATTR_PROCESSED);
      startObserveElement(group.element);
    };
    wrapper.appendChild(retry);
    if (hasStrictParent) {
      group.element.appendChild(wrapper);
    } else if ((settings.translationPosition || 'after') === 'before') {
      group.element.parentNode.insertBefore(wrapper, group.element);
    } else if (group.element.nextSibling) {
      group.element.parentNode.insertBefore(wrapper, group.element.nextSibling);
    } else {
      group.element.parentNode.appendChild(wrapper);
    }
  }

  function removeTranslation(wrapper) {
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

  // ---- Shadow DOM Support ----
  function getShadowRoot(el) {
    // Firefox native
    if (el.openOrClosedShadowRoot) return el.openOrClosedShadowRoot;
    // Chrome extension API
    if (typeof chrome !== 'undefined' && chrome.dom && chrome.dom.openOrClosedShadowRoot) {
      try { return chrome.dom.openOrClosedShadowRoot(el); } catch(e) {}
    }
    // Standard
    return el.shadowRoot;
  }

  function findAllShadowRoots(root, results) {
    if (!results) results = new Set();
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const sr = getShadowRoot(node);
        if (sr) {
          results.add(sr);
          findAllShadowRoots(sr, results);
        }
      }
    } catch(e) { /* permission denied on closed shadow roots */ }
    return results;
  }

  function scanShadowRoot(shadowRoot) {
    if (!shadowRoot || scannedShadowRoots.has(shadowRoot)) return;
    scannedShadowRoots.add(shadowRoot);
    try {
      scanNode(shadowRoot);
      // Also observe shadow root for mutations
      if (ctx.state.mutationObserver) {
        ctx.state.mutationObserver.observe(shadowRoot, { childList: true, subtree: true });
      }
    } catch (e) { /* shadow root may be detached */ }
  }

  function onShadowRootCreated(e) {
    const host = e.target;
    if (!host || !host.shadowRoot) return;
    scanShadowRoot(host.shadowRoot);
  }

  function onShadowRootBatch(e) {
    const shadows = e.detail?.shadows || [];
    shadows.forEach(function(s) {
      const host = s.host;
      if (host && host.shadowRoot) scanShadowRoot(host.shadowRoot);
    });
  }

  function observeShadowRoot(shadowRoot) {
    if (!shadowRoot) return;
    // Inject styles into shadow root
    try {
      const existingStyle = shadowRoot.querySelector('#llm-translate-inline-styles');
      if (!existingStyle) {
        const styleEl = document.createElement('style');
        styleEl.id = 'llm-translate-inline-styles';
        styleEl.textContent = document.getElementById('llm-translate-inline-styles')?.textContent || '';
        shadowRoot.appendChild(styleEl);
      }
    } catch(e) { /* ignore if can't modify */ }

    // Setup mutation observer inside shadow
    try {
      if (ctx.state.mutationObserver) {
        ctx.state.mutationObserver.observe(shadowRoot, {
          childList: true, subtree: true,
          characterData: true, characterDataOldValue: true
        });
      }
    } catch(e) {}

    // Scan shadow content
    scanNode(shadowRoot);
  }

  let _shadowScanInterval = null;

  function startShadowRootObservation() {
    try {
      findAllShadowRoots(document.body).forEach(sr => observeShadowRoot(sr));
    } catch(e) { if (typeof LOG !== 'undefined') LOG.debug('Content', 'Shadow DOM scan failed: ' + e.message); }

    // Clear any existing interval (re-translate re-enters this function)
    if (_shadowScanInterval) { clearInterval(_shadowScanInterval); _shadowScanInterval = null; }

    // Periodically re-scan for shadow roots (lightweight, every 3s for first 30s)
    let scanCount = 0;
    _shadowScanInterval = setInterval(() => {
      try {
        const found = findAllShadowRoots(document.body);
        found.forEach(sr => observeShadowRoot(sr));
        scanCount++;
        if (scanCount > 10) { clearInterval(_shadowScanInterval); _shadowScanInterval = null; }
      } catch(e) { clearInterval(_shadowScanInterval); _shadowScanInterval = null; }
    }, 3000);
  }

  // ---- Title Translation ----
  let originalTitle = '';

  async function translatePageTitle() {
    try {
      const title = document.title.trim();
      if (!title || title.length < 2) return;
      originalTitle = title;

      const res = await chrome.runtime.sendMessage({
        action: 'translate',
        text: title
      });
      if (res.translated && !res.error) {
        document.title = res.translated;
        LOG.info('Content', 'Title translated: ' + title.slice(0, 40) + ' → ' + res.translated.slice(0, 40));
      }
    } catch(e) {
      _safeLog('warn', 'Content', 'Title translation failed: ' + e.message);
    }
  }

  function restorePageTitle() {
    if (originalTitle) {
      document.title = originalTitle;
      originalTitle = '';
    }
  }

  // ---- Language Detection (heuristic skip) ----
  function getPageLanguageHint() {
    const lang = (document.documentElement.lang || document.querySelector('meta[http-equiv="content-language"]')?.content || '').toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('es')) return 'es';
    // Domain-based hint
    if (location.hostname.endsWith('.jp')) return 'ja';
    if (location.hostname.endsWith('.cn') || location.hostname.endsWith('.tw')) return 'zh';
    if (location.hostname.endsWith('.kr')) return 'ko';
    // Sample body text for language detection
    const bodyText = (document.body?.innerText || '').slice(0, 8000);
    if (!bodyText) return '';
    // Japanese: hiragana + katakana
    const kana = (bodyText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    if (kana > 25) return 'ja';
    // Korean: hangul characters
    const hangul = (bodyText.match(/[\uac00-\ud7af]/g) || []).length;
    if (hangul > 50) return 'ko';
    // Chinese: CJK unified ideographs
    const cjk = (bodyText.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinChars = (bodyText.match(/[a-zA-Z]/g) || []).length;
    // If CJK dominates, it's Chinese (unless it has significant kana/hangul which we already checked)
    if (cjk > latinChars && cjk > 80) return 'zh';
    // If Latin dominates, it's English (or another Latin-script language)
    if (latinChars > cjk && latinChars > 100) return 'en';
    return '';
  }

  function heuristicDetectLang(text) {
    if (!text || text.length < 3) return '';
    const pageLang = getPageLanguageHint();

    // Quick checks with high confidence
    const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    const hasHangul = /[\uac00-\ud7af]/.test(text);
    const hasCJK = /[\u4e00-\u9fff]/.test(text);
    const hasLatin = /[a-zA-Z]{3,}/.test(text);

    // Japanese: hiragana/katakana presence is definitive
    if (hasKana) return 'ja';
    // Korean: hangul is definitive
    if (hasHangul) return 'ko';

    // Count characters for weighted decision
    const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    // Pure CJK: Chinese
    if (hasCJK && cjkCount > totalChars * 0.4) return 'zh';

    // Pure Latin: English/European
    if (hasLatin && latinCount > totalChars * 0.6) return 'en';

    // Mixed but CJK-dominant with page hint
    if (hasCJK && cjkCount > totalChars * 0.2) {
      if (pageLang === 'zh') return 'zh';
      return 'zh'; // default CJK to Chinese
    }

    // Mixed Latin-dominant with page hint
    if (hasLatin && latinCount > totalChars * 0.2) {
      if (pageLang === 'en' || pageLang === 'fr' || pageLang === 'de' || pageLang === 'es') return pageLang;
      return 'en';
    }

    // Short text: trust page language hint
    if (text.length < 30 && pageLang) return pageLang;

    return '';
  }

  function getLanguageProfile(text) {
    const value = String(text || '');
    const compact = value.replace(/\s/g, '');
    const total = compact.length || 1;
    const kana = (value.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const hangul = (value.match(/[\uac00-\ud7af]/g) || []).length;
    const han = (value.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (value.match(/[a-zA-Z]/g) || []).length;
    return {
      total,
      kana,
      hangul,
      han,
      latin,
      cjk: kana + hangul + han,
      latinRatio: latin / total,
      cjkRatio: (kana + hangul + han) / total
    };
  }

  function normalizeTargetLang(targetLang) {
    const lang = String(targetLang || '').toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('es')) return 'es';
    return lang.split('-')[0] || '';
  }

  function hasMeaningfulMixedLanguage(text, targetLang) {
    const target = normalizeTargetLang(targetLang);
    const p = getLanguageProfile(text);
    const minForeign = Math.max(4, Math.floor(p.total * 0.12));

    if (target === 'ja') {
      return p.latin >= minForeign || p.hangul >= minForeign;
    }
    if (target === 'zh') {
      return p.latin >= minForeign || p.kana >= 2 || p.hangul >= minForeign;
    }
    if (target === 'ko') {
      return p.latin >= minForeign || p.kana >= 2 || p.han >= minForeign;
    }
    if (target === 'en') {
      return p.cjk >= minForeign;
    }
    return p.cjk >= minForeign && p.latin >= minForeign;
  }

  function shouldSkipTranslation(text, targetLang) {
    const detected = heuristicDetectLang(text);
    if (!detected || !targetLang) return false;
    const target = normalizeTargetLang(targetLang);

    // Mixed-language blocks are common on Japanese/English technical pages.
    // If any meaningful foreign script is present, translate instead of
    // skipping the whole element just because the dominant language matches.
    if (hasMeaningfulMixedLanguage(text, targetLang)) return false;

    // Build target language group
    const isCJKTarget = target === 'zh' || target === 'ja' || target === 'ko';
    const isLatinTarget = target === 'en' || target === 'fr' || target === 'de' || target === 'es' || target === 'pt' || target === 'ru' || target === 'ar';
    const isCJKSource = detected === 'zh' || detected === 'ja' || detected === 'ko';
    const isLatinSource = detected === 'en' || detected === 'fr' || detected === 'de' || detected === 'es';

    // Skip if detected language IS the target language
    if (target === 'zh' && detected === 'zh') return true;
    if (target === 'ja' && detected === 'ja') return true;
    if (target === 'ko' && detected === 'ko') return true;
    if (target === detected) return true;

    // Cross-script: always translate (e.g., en->zh, zh->en)
    if ((isCJKTarget && isLatinSource) || (isLatinTarget && isCJKSource)) return false;

    // Same script family, short text: skip if page hint suggests same language
    const pageLang = getPageLanguageHint();
    if (text.length < 40 && pageLang && pageLang === target) return true;

    return false;
  }

  // ---- Hover Feature ----
  function onKeyDown(e) {
    if (!settings?.enableHover || settings.hoverMode === 'direct') return;
    // Skip if this key event would trigger a keyboard shortcut (avoid cursor flicker)
    if (settings?.keyboardShortcuts) {
      const sc = settings.keyboardShortcuts;
      if ((sc.translatePage && window.__LLM_CTX__.fn.checkCombo(e, sc.translatePage)) ||
          (sc.toggleHover && window.__LLM_CTX__.fn.checkCombo(e, sc.toggleHover)) ||
          (sc.toggleStyle && window.__LLM_CTX__.fn.checkCombo(e, sc.toggleStyle))) {
        return;
      }
    }
    var key = settings.hoverKey || 'shift';
    var match = (key === 'shift' && e.shiftKey) || (key === 'ctrl' && (e.ctrlKey || e.metaKey)) || (key === 'alt' && e.altKey);
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
    while (el && el !== document.body) {
      if (BLOCK_TAGS.has(el.tagName) && !isIgnored(el) && !processedElements.has(el)) {
        var text = getVisibleText(el);
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
    var target = getHoverTarget(e.target);
    if (!target || activeHoverParagraphs.has(target)) return;
    hoverDebounceTimer = setTimeout(function() { translateHoverElement(target, e); }, 300);
  }

  function onMouseOut(e) {
    if (hoverDebounceTimer) { clearTimeout(hoverDebounceTimer); hoverDebounceTimer = null; }
  }

  function translateHoverElement(el, e) {
    if (!el || processedElements.has(el)) return;
    var text = getVisibleText(el);
    if (!text || text.length < 10) return;

    if (hoverPendingRequest) {
      try { hoverPendingRequest.abort(); } catch(ex) {}
      hoverPendingRequest = null;
    }

    activeHoverParagraphs.add(el);
    var rect = el.getBoundingClientRect();
    var btn = document.createElement('button');
    btn.className = 'llm-translate-hover-btn';
    btn.textContent = 'Translating...';
    btn.style.left = Math.min((rect.right || e.clientX) + 8, innerWidth - 140) + 'px';
    btn.style.top = (rect.top || e.clientY) + 'px';
    document.body.appendChild(btn);

    var controller = new AbortController();
    hoverPendingRequest = controller;

    var cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model) : text;
    if (typeof getCachedTranslation === 'function') {
      getCachedTranslation(cacheKey).then(async function(cached) {
        if (cached && hoverPendingRequest === controller) {
          hoverPendingRequest = null;
          showHoverResult(el, btn, cached);
          return;
        }
        if (hoverPendingRequest !== controller) return;
        try {
          var res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
          if (controller.signal.aborted) return;
          hoverPendingRequest = null;
          if (res.error) throw new Error(res.error);
          showHoverResult(el, btn, res.translated);
        } catch (err) {
          if (controller.signal.aborted) return;
          hoverPendingRequest = null;
          processedElements.delete(el);
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
    try {
      var res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
      if (controller.signal.aborted) return;
      hoverPendingRequest = null;
      if (res.error) throw new Error(res.error);
      showHoverResult(el, btn, res.translated);
    } catch (err) {
      if (controller.signal.aborted) return;
      hoverPendingRequest = null;
      processedElements.delete(el);
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

  // ---- Input Box Translation ----
  // ---- Selection Popup ----
  // ==================== FLOATING ACTION BALL ====================
  // ==================== GLOSSARY / TERMINOLOGY ====================
  // ---- Cleanup on unload (SPA navigation / page close) ----
  window.addEventListener('beforeunload', () => {
    if (translateQueue) {
      try { translateQueue.clear('Page unload'); } catch (e) { /* ignore */ }
    }
    if (mutationObserver) {
      try { mutationObserver.disconnect(); } catch (e) { /* ignore */ }
    }
    if (intersectionObserver) {
      try { intersectionObserver.disconnect(); } catch (e) { /* ignore */ }
    }
    viewElements.clear();
    // Cancel any in-flight hover translation
    if (hoverPendingRequest) {
      try { hoverPendingRequest.abort(); } catch (e) { /* ignore */ }
    }
    // Flush pending logs
    if (typeof LOG !== 'undefined') {
      try { LOG.flush(); } catch (e) { /* ignore */ }
    }
  });

  // ---- Run ----
  init().catch(function(err) {
    window.__LLM_TRANSLATE_MAIN_STATUS__ = 'error';
    ctx.state.ready = false;
    ctx.state.initError = err.message || String(err);
    _safeLog('error', 'Content', 'Content script init failed: ' + ctx.state.initError, err.stack);
  });
})();
