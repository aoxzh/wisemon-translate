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

  if (!window.__LLM_CTX__) window.__LLM_CTX__ = { state: {}, fn: {}, features: {} };
  const ctx = window.__LLM_CTX__;

  // ---- Constants ----
  const constants = ctx.constants || {};
  const TAG_NAME = constants.TAG_NAME || 'llm-translate';
  const ATTR_PROCESSED = constants.ATTR_PROCESSED || 'data-llm-done';
  const ATTR_ID = constants.ATTR_ID || 'data-llm-id';
  const ATTR_OBSERVED = constants.ATTR_OBSERVED || 'data-llm-observed';

  const BLOCK_TAGS = constants.BLOCK_TAGS || new Set();
  const WARP_TAGS = constants.WARP_TAGS || new Set();
  const REPLACE_TAGS = constants.REPLACE_TAGS || new Set();
  const IGNORE_TAGS = constants.IGNORE_TAGS || new Set();
  const IGNORE_SELECTOR = constants.IGNORE_SELECTOR || '';
  const STRICT_PARENT_TAGS = constants.STRICT_PARENT_TAGS || new Set();

  const SKIP_PATTERNS = constants.SKIP_PATTERNS || [];
  const NON_CONTENT_PATTERNS = constants.NON_CONTENT_PATTERNS || [];
  const textUtils = ctx.fn.textUtils || {};
  const cleanTextForTranslation = textUtils.cleanTextForTranslation || function(text) { return String(text || '').replace(/\s+/g, ' ').trim(); };
  const cleanTranslatedText = textUtils.cleanTranslatedText || cleanTextForTranslation;
  const getDirectText = textUtils.getDirectText || function() { return ''; };
  const getVisibleText = textUtils.getVisibleText || function(el) { return (el?.innerText || el?.textContent || '').trim(); };
  const hasDirectTextNode = textUtils.hasDirectTextNode || function(el) { return !!el?.textContent?.trim(); };
  const isInvalidText = textUtils.createInvalidTextChecker
    ? textUtils.createInvalidTextChecker({ SKIP_PATTERNS, NON_CONTENT_PATTERNS })
    : function(text) { return !text || String(text).trim().length < 2; };

  // Aliases for functions provided by content-injection.js
  const buildNodeGroup = (...args) => ctx.fn.buildNodeGroup(...args);
  const isBlockNode = (...args) => ctx.fn.isBlockNode(...args);
  const injectTranslationResult = (...args) => ctx.fn.injectTranslationResult(...args);
  const applyPageState = (...args) => ctx.fn.applyPageState(...args);
  const showRetry = (...args) => ctx.fn.showRetry(...args);
  const reprocessSkippedCompactUi = (...args) => ctx.fn.reprocessSkippedCompactUi(...args);
  const removeTranslation = (wrapper) => ctx.fn.removeTranslation(wrapper);
  const removeTranslationFrom = (container) => ctx.fn.removeTranslationFrom(container);
  const normalizeTranslationTheme = (theme) => ctx.fn.normalizeTranslationTheme(theme);
  const replaceCompactUiText = (group, text) => ctx.fn.replaceCompactUiText(group, text);

  // Aliases for functions provided by content-shadow.js / content-title.js / content-language.js
  const startShadowRootObservation = () => ctx.fn.startShadowRootObservation();
  const translatePageTitle = () => ctx.fn.translatePageTitle();
  const restorePageTitle = () => ctx.fn.restorePageTitle();
  const shouldSkipTranslation = (...args) => ctx.fn.shouldSkipTranslation(...args);

  // Aliases for functions provided by content-element-utils.js
  const isIgnored = (...args) => ctx.fn.isIgnored(...args);
  const matchesSiteRuleSelector = (...args) => ctx.fn.matchesSiteRuleSelector(...args);
  const isTranslatableElement = (...args) => ctx.fn.isTranslatableElement(...args);

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
  let translationInProgress = false;
  let translationAvailable = true;
  let resumeTranslationAfterNavigation = false;
  let translationRunId = 0;
  let siteRule = null;
  let pageContext = null;       // page title + main content summary for context-aware translation
  let translateQueue = null;
  let translationStats = { queued: 0, succeeded: 0, failed: 0, recovered: 0, lastError: '' };
  let totalObserved = 0;      // total elements observed by IO (counter because WeakSet has no size)
  let totalProcessed = 0;     // total elements processed (success or fail)
  const translationTask = typeof ctx.fn.createTranslationTask === 'function'
    ? ctx.fn.createTranslationTask()
    : { states: {}, setState() {}, getSnapshot() { return {}; } };
  let currentScanStats = null;
  let initialVisibleElements = null;

  // DOM tracking
  let mutationObserver = null;
  let intersectionObserver = null;
  let observedElements = new WeakSet();    // elements being watched by IO
  let processedElements = new WeakMap();   // element → translation rule snapshot
  const viewElements = new Set();            // elements currently in viewport
  const dirtyQueue = new Set();
  let dirtyProcessing = false;
  const retryingElements = new WeakSet();

  // Other UI state
  let currentPopup = null;
  let subtitleObserver = null;    // MutationObserver for video subtitle detection
  const scannedShadowRoots = new WeakSet();  // shadow roots already scanned

  const contentScanner = ctx.fn.createContentScanner({
    attrObserved: ATTR_OBSERVED,
    attrProcessed: ATTR_PROCESSED,
    blockTags: BLOCK_TAGS,
    warpTags: WARP_TAGS,
    viewElements,
    getSettings: () => settings,
    getSiteRule: () => siteRule,
    getObservedElements: () => observedElements,
    getProcessedElements: () => processedElements,
    getScanStats: () => currentScanStats,
    getInitialVisibleElements: () => initialVisibleElements,
    incrementTotalObserved: () => { totalObserved++; },
    syncSharedTrackingState,
    scheduleProcessViewBatch,
    isIgnored,
    matchesSiteRuleSelector,
    isTranslatableElement,
    getVisibleText,
    getDirectText,
    hasDirectTextNode,
    isInvalidText,
    isBlockNode,
    shouldSkipTranslation,
    safeLog: _safeLog
  });

  const batchProcessor = ctx.fn.createContentBatchProcessor({
    tagName: TAG_NAME,
    attrProcessed: ATTR_PROCESSED,
    attrId: ATTR_ID,
    strictParentTags: STRICT_PARENT_TAGS,
    getSettings: () => settings,
    getTranslationRunId: () => translationRunId,
    getPageContext: () => pageContext,
    getTranslateQueue: () => translateQueue,
    getTranslationStats: () => translationStats,
    getTranslationTask: () => translationTask,
    getObservedElements: () => observedElements,
    getProcessedElements: () => processedElements,
    getRetryingElements: () => retryingElements,
    incrementTotalProcessed: (amount = 1) => { totalProcessed += amount; },
    pruneTranslationCandidates,
    buildNodeGroup,
    injectTranslationResult,
    cleanTranslatedText,
    showRetry,
    isBlockNode,
    isCompactUiTextElement: (...args) => ctx.fn.isCompactUiTextElement(...args),
    applyPageState,
    updateFabProgress: (...args) => ctx.fn.updateFabProgress(...args),
    publishTranslationProgress,
    safeLog: _safeLog
  });

  function syncSharedTrackingState() {
    // Use getters so external modules always see the current WeakSet/WeakMap
    // even after reset reassigns the module-level variables.
    // Redefine them on every main-script initialization. A failed initialization
    // can be reinjected, and retaining getters from the failed closure would make
    // helper modules read stale tracking collections.
    Object.defineProperty(ctx.fn, 'observedElements', {
      get: function() { return observedElements; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ctx.fn, 'processedElements', {
      get: function() { return processedElements; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ctx.fn, 'scannedShadowRoots', {
      get: function() { return scannedShadowRoots; },
      enumerable: true,
      configurable: true
    });
    ctx.state.translationStats = translationStats;
    ctx.state.totalObserved = totalObserved;
    ctx.state.totalProcessed = totalProcessed;
    ctx.state.translationTask = translationTask.getSnapshot(translationStats, { totalObserved, totalProcessed });
  }

  function publishTranslationProgress() {
    syncSharedTrackingState();
    const task = ctx.state.translationTask || {};
    chrome.runtime.sendMessage({
      action: 'translation-progress',
      translatedCount: translationStats.succeeded,
      totalVisibleCount: totalObserved,
      processedCount: totalProcessed,
      failedCount: translationStats.failed,
      queuedCount: translationStats.queued,
      recoveredCount: translationStats.recovered || 0,
      lastError: translationStats.lastError || '',
      taskState: task.state || 'idle',
      taskReason: task.reason || '',
      taskRunId: task.runId || translationRunId,
      pendingCount: task.pending || 0
    }).catch(function(){});
  }

  function isDeepSeekFlash(config) {
    return config?.provider === 'deepseek' && config?.model === 'deepseek-v4-flash';
  }

  function cancelTranslationRun(runId) {
    if (!runId) return;
    chrome.runtime.sendMessage({ action: 'cancel-translation-run', runId }).catch(function() {});
  }

  function isCurrentSiteExcluded(config) {
    const sites = config?.excludedSites || [];
    const hostname = location.hostname;
    return sites.some(site => {
      const value = String(site || '').trim();
      return value && (hostname === value || hostname.endsWith('.' + value));
    });
  }

  async function refreshPageConfiguration(url) {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
      settings = { ...DEFAULT_SETTINGS, ...res.settings };
    } catch (e) {
      settings = { ...DEFAULT_SETTINGS };
    }
    siteRule = typeof getSiteRule === 'function' ? await getSiteRule(url || location.href, settings) : null;
    if (siteRule?.disableAutoTranslate) settings.autoTranslate = false;
    if (siteRule?.privacyMode === 'strict') {
      settings.privacyMasking = true;
      settings.maskEmail = true;
      settings.maskPhone = true;
      settings.maskCreditCard = true;
      settings.maskSecrets = true;
      settings.maskVerificationCodes = true;
      settings.maskPrivateKeys = true;
    }
    ctx.state.settings = settings;
    ctx.state.siteRule = siteRule;
    ctx.fn.injectRuleCss(siteRule?.injectedCss || []);
    ctx.fn.injectCustomTranslationCss();
    const availability = { disabled: !!siteRule?.disabled, excluded: isCurrentSiteExcluded(settings) };
    translationAvailable = !availability.disabled && !availability.excluded;
    ctx.state.translationAvailable = translationAvailable;
    return availability;
  }

  let navigationVersion = 0;
  async function handlePageNavigation(nextUrl) {
    const version = ++navigationVersion;
    const wasTranslated = pageTranslated;
    if (wasTranslated || translationInProgress) resumeTranslationAfterNavigation = true;
    cancelTranslationRun(translationRunId);
    translationRunId++;
    ctx.state.translationRunId = translationRunId;
    translationInProgress = false;
    if (translateQueue) translateQueue.clear('Page navigation');
    if (wasTranslated) restoreOriginal();
    pageTranslated = false;
    ctx.state.pageTranslated = false;
    pageContext = null;

    const availability = await refreshPageConfiguration(nextUrl);
    if (version !== navigationVersion) return;
    if (siteRule?.matchedIds?.length) LOG.info('Rules', `SPA route matched rules: ${siteRule.matchedIds.join(', ')}`);
    if (availability.disabled || availability.excluded) {
      ctx.fn.stopObservers();
      if (typeof destroyHoverFeature === 'function') destroyHoverFeature();
      return;
    }
    activateTranslationFeatures();
    if (resumeTranslationAfterNavigation || settings.autoTranslate) {
      await new Promise(resolve => setTimeout(resolve, 150));
      if (version === navigationVersion && !pageTranslated) {
        await togglePageTranslation();
        if (version === navigationVersion && pageTranslated) resumeTranslationAfterNavigation = false;
      }
    }
  }

  function handleSiteRulesChanged() {
    handlePageNavigation(location.href).catch(error => {
      _safeLog('warn', 'Rules', 'Failed to apply updated site rules: ' + error.message);
    });
  }

  function activateTranslationFeatures() {
    if (!translationAvailable) return;
    ctx.fn.injectStyles();
    if (settings.enableHover && typeof initHoverFeature === 'function') initHoverFeature(settings);
    try {
      if (typeof ctx.fn.setupVideoSubtitleTranslation === 'function') ctx.fn.setupVideoSubtitleTranslation();
    } catch (err) {
      _safeLog('warn', 'Content', 'Subtitle setup skipped: ' + err.message);
    }
    try {
      if (typeof ctx.fn.updateFabFromSettings === 'function') ctx.fn.updateFabFromSettings();
    } catch (err) {
      _safeLog('warn', 'Content', 'FAB setup skipped: ' + err.message);
    }
  }

  // ---- Initialization ----
  async function init() {
    LOG.info('Content', 'Content script v2 initializing...');
    const availability = await refreshPageConfiguration(location.href);
    if (siteRule?.matchedIds?.length) {
      LOG.info('Rules', `Matched site rules: ${siteRule.matchedIds.join(', ')}`, siteRule);
    }
    if (availability.disabled) {
      LOG.info('Content', `Site rule disabled translation: ${siteRule.reason || siteRule.id}`);
    }

    translateQueue = typeof createBatchQueue === 'function'
      ? createBatchQueue(sendTranslateBatch, {
          batchInterval: isDeepSeekFlash(settings) ? 40 : (settings.largeTextMode ? 90 : 140),
          batchSize: isDeepSeekFlash(settings) ? 12 : (settings.largeTextMode ? Math.min(Math.max(settings.maxConcurrency || 8, 8), 16) : Math.min(Math.max(settings.maxConcurrency || 8, 6), 12)),
          batchLength: isDeepSeekFlash(settings) ? Math.min(Math.max(settings.maxCharsPerRequest || 16000, 12000), 16000) : (settings.largeTextMode ? Math.min(Math.max(settings.maxCharsPerRequest || 12000, 9000), 12000) : (settings.maxCharsPerRequest || 12000)),
          maxParallelBatches: isDeepSeekFlash(settings) ? Math.max(2, Math.min(5, Math.ceil((settings.maxConcurrency || 8) / 2))) : Math.max(1, Math.min(4, Math.ceil((settings.maxConcurrency || 8) / 3))),
          tag: 'TranslateQueue'
        })
      : null;

    // Check excluded sites
    if (availability.excluded) {
      LOG.info('Content', `Site ${location.hostname} is excluded, skipping initialization`);
    }

    if (window.top !== window && !ctx.fn.shouldRunInFrame()) {
      LOG.info('Content', 'Iframe detected; installing lightweight message bridge only');
      ctx.fn.attachFrameMessageBridge();
      return;
    }

    // Create shared namespace for in-file feature modules
    ctx.state.settings = settings;
    ctx.state.hoverEnabled = settings.enableHover;
    ctx.state.translationRunId = translationRunId;
    ctx.state.pageTranslated = pageTranslated;
    ctx.state.viewElements = viewElements;
    ctx.state.dirtyQueue = dirtyQueue;
    ctx.state.inputState = new WeakMap();
    ctx.state.subtitleState = new WeakMap();
    ctx.state.subtitleCache = new Map();
    // Expose core engine functions to feature modules
    Object.assign(ctx.fn, {
      cleanTranslatedText,
      cleanTextForTranslation,
      isInvalidText,
      scanNode,
      scheduleProcessViewBatch,
      startObserveElement,
      translateToBottom,
      togglePageTranslation,
      restoreOriginal,
      retryFailedTranslations,
      syncSharedTrackingState,
      publishTranslationProgress,
      processedElements,
      observedElements,
      getVisibleText,
      BLOCK_TAGS,
      WARP_TAGS,
      IGNORE_TAGS,
      ATTR_PROCESSED,
      ATTR_ID
    });
    syncSharedTrackingState();

    ctx.state.ready = true;
    ctx.fn.attachEventListeners();
    ctx.fn.startNavigationObserver?.(handlePageNavigation);
    window.addEventListener('llm-site-rules-changed', handleSiteRulesChanged);
    window.__LLM_TRANSLATE_INITIALIZED__ = true;
    window.__LLM_TRANSLATE_MAIN_STATUS__ = 'ready';

    LOG.info('Content', `Ready: model=${settings.model}, target=${settings.targetLang}, display=${settings.displayMode}`);
    activateTranslationFeatures();

    // Auto-translate if enabled
    if (translationAvailable && settings.autoTranslate) {
      LOG.info('Content', 'Auto-translate enabled, starting translation...');
      setTimeout(() => togglePageTranslation(), 800);
    }
  }

  async function handleRuntimeMessage(request) {
    return ctx.fn.handleRuntimeMessage(request);
  }

  // ==================== PAGE TRANSLATION ENGINE ====================

  async function togglePageTranslation() {
    if (!translationAvailable) {
      return { success: false, disabled: true, pageTranslated: false, translatedCount: 0 };
    }
    if (translationInProgress && !pageTranslated) {
      cancelTranslationRun(translationRunId);
      translationRunId++;
      ctx.state.translationRunId = translationRunId;
      if (translateQueue) translateQueue.clear('Translation canceled by user');
      translationInProgress = false;
      restoreOriginal();
      ctx.fn.stopObservers();
      return { success: true, canceled: true, pageTranslated: false, translatedCount: 0 };
    }
    cancelTranslationRun(translationRunId);
    translationRunId++;
    ctx.state.translationRunId = translationRunId;
    const runId = translationRunId;
    translationTask.setState(translationTask.states.SCANNING || 'scanning', { runId: translationRunId, reason: '' });
    if (translateQueue) translateQueue.clear('Translation run changed');
    if (pageTranslated) {
      translationTask.setState(translationTask.states.CANCELED || 'canceled', { runId: translationRunId, reason: 'Restored original page' });
      restoreOriginal();
      ctx.fn.stopObservers();
      pageTranslated = false;
      ctx.state.pageTranslated = pageTranslated;
      return { success: true, pageTranslated, translatedCount: 0 };
    } else {
      translationInProgress = true;
      let result;
      try {
        result = await startTranslation(runId);
      } catch (error) {
        if (runId === translationRunId) translationInProgress = false;
        throw error;
      }
      if (runId !== translationRunId) return { success: true, canceled: true, pageTranslated: false, translatedCount: 0 };
      translationInProgress = false;
      pageTranslated = result.succeeded > 0;
      ctx.state.pageTranslated = pageTranslated;
      if (!pageTranslated) {
        translationTask.setState(translationTask.states.FAILED || 'failed', { runId: translationRunId, reason: result.reason || 'No visible text was translated.' });
        ctx.fn.stopObservers();
        _safeLog('warn', 'Content', 'Translation did not produce visible translated text', result);
        return {
          success: false,
          pageTranslated: false,
          error: result.reason || 'No visible text was translated. Check Logs for details.',
          translatedCount: result.succeeded || 0
        };
      }
      translationTask.setState(translationTask.states.COMPLETED || 'completed', { runId: translationRunId, reason: '' });
      publishTranslationProgress();
      return { success: true, pageTranslated: true, translatedCount: result.succeeded };
    }
  }

  function restoreOriginal() {
    document.querySelectorAll(`[class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"]`).forEach(el => removeTranslation(el));
    document.querySelectorAll(`[${ATTR_PROCESSED}]`).forEach(el => {
      el.classList.remove('llm-original-hidden');
      el.removeAttribute(ATTR_PROCESSED);
      processedElements.delete(el);
    });
    document.querySelectorAll('[data-llm-original-html]').forEach(el => {
      // Restore from cloned child nodes when available to avoid re-parsing HTML strings.
      const restoredFragment = el._llmOriginalFragment;
      if (restoredFragment) {
        el.textContent = '';
        el.appendChild(restoredFragment.cloneNode(true));
      } else {
        // Fallback: clear only; do not re-parse original HTML to avoid script re-execution.
        el.textContent = '';
      }
      el.removeAttribute('data-llm-original-html');
      el.removeAttribute('title');
      delete el._llmOriginalFragment;
    });
    document.querySelectorAll('.llm-original-hidden').forEach(el => {
      el.classList.remove('llm-original-hidden');
    });
    document.querySelectorAll(`[${ATTR_OBSERVED}]`).forEach(el => {
      el.removeAttribute(ATTR_OBSERVED);
    });
    // Stop observers to avoid stale callbacks on restored DOM.
    if (typeof ctx.fn.stopObservers === 'function') ctx.fn.stopObservers();
    // Reset root state
    document.documentElement.removeAttribute('llm-state');
    document.documentElement.removeAttribute('llm-theme');
    // Restore page title
    restorePageTitle();
    // Clear all tracking state so re-translate works cleanly
    observedElements = new WeakSet();
    processedElements = new WeakMap();
    syncSharedTrackingState();
    viewElements.clear();
    dirtyQueue.clear();
    dirtyProcessing = false;
    batchProcessor.reset();
    translationStats.queued = 0; translationStats.succeeded = 0; translationStats.failed = 0;
    translationStats.recovered = 0; translationStats.lastError = '';
    totalObserved = 0;
    totalProcessed = 0;
    translationTask.setState(translationTask.states.IDLE || 'idle', { runId: translationRunId, reason: '' });
    publishTranslationProgress();
  }

  function extractPageContext() {
    if (!settings?.enableContextAwareTranslation) return '';
    try {
      const title = document.title?.trim() || '';
      const root = ctx.fn.getMainContentRoot ? ctx.fn.getMainContentRoot() : document.body;
      if (!root) return title;
      const skipSelector = 'nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], script, style, noscript, iframe, pre, code';
      const textParts = [];
      let chars = 0;
      const maxChars = 800;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode() && chars < maxChars) {
        const value = walker.currentNode.nodeValue.replace(/\s+/g, ' ').trim();
        if (!value) continue;
        textParts.push(value);
        chars += value.length + 1;
      }
      const summary = textParts.join(' ').slice(0, maxChars).trim();
      if (!title && !summary) return '';
      let context = '';
      if (title) context += `Page title: ${title}\n`;
      if (summary) context += `Article summary: ${summary}`;
      return context.slice(0, 1000);
    } catch (e) {
      _safeLog('warn', 'Content', 'Failed to extract page context: ' + e.message);
      return '';
    }
  }

  async function startTranslation(expectedRunId = translationRunId) {
    if (!settings) {
      const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
      settings = { ...DEFAULT_SETTINGS, ...res.settings };
    }

    // Extract page context once per translation run for context-aware translation
    pageContext = extractPageContext();

    // Fully reset state for clean re-translation
    observedElements = new WeakSet();
    processedElements = new WeakMap();
    syncSharedTrackingState();
    viewElements.clear();
    dirtyQueue.clear();
    dirtyProcessing = false;
    batchProcessor.reset();
    translationStats.queued = 0; translationStats.succeeded = 0; translationStats.failed = 0;
    translationStats.recovered = 0; translationStats.lastError = '';
    totalObserved = 0;
    totalProcessed = 0;
    translationTask.setState(translationTask.states.SCANNING || 'scanning', { runId: translationRunId, reason: '' });
    syncSharedTrackingState();
    currentScanStats = { observed: 0, skippedByRule: 0, skippedIgnored: 0, skippedInvalid: 0, skippedSameLanguage: 0 };
    initialVisibleElements = new Set();
    LOG.info('Content', 'Starting page translation, scanning DOM...');

    // Translate page title
    await translatePageTitle();
    if (expectedRunId !== translationRunId) {
      return { succeeded: 0, failed: 0, queued: 0, reason: 'Translation run was canceled.' };
    }

    // Setup observers
    ctx.fn.setupMutationObserver();
    ctx.fn.setupIntersectionObserver();

    // Initial scan (main document or main content only)
    const scanRoot = ctx.fn.getMainContentRoot();
    const ruleScoped = hasRuleIncludeSelectors();
    applyPageState(settings.displayMode === 'replace' ? 'translation' : 'dual');
    scanRuleIncludedElements(scanRoot);
    if (!ruleScoped) {
      scanAdaptiveTextElements(scanRoot);
      scanNode(scanRoot);
    }
    if (initialVisibleElements.size > 0) {
      scheduleProcessViewBatch(Array.from(initialVisibleElements));
    }

    // Shadow DOM support
    startShadowRootObservation();

    LOG.info('Content', 'DOM scan complete. Waiting for first visible translation.', currentScanStats);
    publishTranslationProgress();
    translationTask.setState(translationTask.states.SETTLING || 'settling', { runId: translationRunId, reason: 'Waiting for initial visible translations' });
    const result = await waitForInitialTranslation();
    if (expectedRunId !== translationRunId) {
      return { succeeded: 0, failed: 0, queued: 0, reason: 'Translation run was canceled.' };
    }
    currentScanStats = null;
    initialVisibleElements = null;
    return result;
  }

  async function waitForInitialTranslation(timeoutMs = 20000) {
    var startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const completed = translationStats.succeeded + translationStats.failed;
      // Wait until all queued items are processed (not just the first success)
      if (translationStats.queued > 0 && completed >= translationStats.queued) {
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
    const completed = translationStats.succeeded + translationStats.failed;
    return { succeeded: translationStats.succeeded, failed: translationStats.failed, queued: translationStats.queued, reason: translationStats.succeeded > 0 ? '' : 'Timed out waiting for the first translation result.' };
  }

  // Viewport batching, deduplication and stream transport live in content-batch-processor.js
  function processViewBatch(elements) {
    return batchProcessor.processViewBatch(elements);
  }

  function scheduleProcessViewBatch(elements) {
    return batchProcessor.scheduleProcessViewBatch(elements);
  }

  function sendTranslateBatch(texts, args) {
    return batchProcessor.sendTranslateBatch(texts, args);
  }

  async function translateToBottom() {
    if (!pageTranslated) {
      cancelTranslationRun(translationRunId);
      pageTranslated = true;
      ctx.state.pageTranslated = true;
      translationRunId++;
      ctx.state.translationRunId = translationRunId;
      translationTask.setState(translationTask.states.SCANNING || 'scanning', { runId: translationRunId, reason: 'Translate to bottom' });
      await startTranslation();
    }

    translationTask.setState(translationTask.states.SCANNING || 'scanning', { runId: translationRunId, reason: 'Collecting remaining page content' });
    const root = ctx.fn.getMainContentRoot ? ctx.fn.getMainContentRoot() : document.body;
    const ruleScoped = hasRuleIncludeSelectors();
    scanRuleIncludedElements(root);
    if (!ruleScoped) {
      scanAdaptiveTextElements(root);
      scanNode(root);
      scanTextNodes(root);
    }

    const candidates = ruleScoped ? collectRuleIncludedCandidates(root) : collectUnprocessedCandidates(root);
    if (candidates.length > 0) {
      candidates.forEach(el => {
        if (!observedElements.has(el)) {
          observedElements.add(el);
          totalObserved++;
          el.setAttribute(ATTR_OBSERVED, 'true');
        }
      });
      publishTranslationProgress();
      await processViewBatch(candidates);
    } else {
      translationTask.setState(translationTask.states.COMPLETED || 'completed', { runId: translationRunId, reason: 'No remaining content' });
      publishTranslationProgress();
    }

    return {
      success: true,
      pageTranslated: true,
      queued: translationStats.queued,
      succeeded: translationStats.succeeded,
      failed: translationStats.failed,
      recovered: translationStats.recovered || 0,
      lastError: translationStats.lastError || '',
      totalObserved,
      totalProcessed,
      remaining: candidates.length
    };
  }

  async function retryFailedTranslations() {
    const wrappers = Array.from(document.querySelectorAll(`.${TAG_NAME}-retry`))
      .map(retry => retry.closest(`[class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"]`))
      .filter(Boolean);
    const candidates = [];
    const seen = new WeakSet();

    wrappers.forEach(function(wrapper) {
      const host = findRetryHost(wrapper);
      if (!host || seen.has(host)) return;
      seen.add(host);
      wrapper.remove();
      host.classList.remove('llm-original-hidden');
      host.removeAttribute(ATTR_PROCESSED);
      processedElements.delete(host);
      observedElements.add(host);
      retryingElements.add(host);
      host.setAttribute(ATTR_OBSERVED, 'true');
      candidates.push(host);
    });

    if (candidates.length === 0) {
      publishTranslationProgress();
      return { success: true, retried: 0, queued: translationStats.queued, failed: translationStats.failed };
    }

    translationTask.setState(translationTask.states.QUEUED || 'queued', { runId: translationRunId, reason: 'Retry failed translations' });
    translationStats.failed = Math.max(0, (translationStats.failed || 0) - candidates.length);
    translationStats.lastError = '';
    publishTranslationProgress();
    await processViewBatch(candidates);
    return {
      success: true,
      retried: candidates.length,
      queued: translationStats.queued,
      succeeded: translationStats.succeeded,
      failed: translationStats.failed,
      recovered: translationStats.recovered || 0
    };
  }

  function findRetryHost(wrapper) {
    if (!(wrapper instanceof Element)) return null;
    const wrapperId = wrapper.getAttribute(ATTR_ID);
    const candidates = [wrapper.previousElementSibling, wrapper.nextElementSibling, wrapper.parentElement];
    return candidates.find(function(el) {
      return el && el.hasAttribute?.(ATTR_PROCESSED) && (!wrapperId || el.getAttribute(ATTR_ID) === wrapperId);
    }) || null;
  }

  // Candidate scanning and pruning live in content-scanner.js
  function hasRuleIncludeSelectors() {
    return contentScanner.hasRuleIncludeSelectors();
  }

  function collectRuleIncludedCandidates(root) {
    return contentScanner.collectRuleIncludedCandidates(root);
  }

  function collectUnprocessedCandidates(root) {
    return contentScanner.collectUnprocessedCandidates(root);
  }

  function pruneTranslationCandidates(candidates) {
    return contentScanner.pruneTranslationCandidates(candidates);
  }

  function scanRuleIncludedElements(root) {
    return contentScanner.scanRuleIncludedElements(root);
  }

  function scanAdaptiveTextElements(root) {
    return contentScanner.scanAdaptiveTextElements(root);
  }

  function scanNode(root, includeTextNodePass) {
    return contentScanner.scanNode(root, includeTextNodePass);
  }

  function scanTextNodes(root) {
    return contentScanner.scanTextNodes(root);
  }

  function startObserveElement(el) {
    return contentScanner.startObserveElement(el);
  }

  // Element utilities live in content-element-utils.js

  // Node-group build / injection helpers live in content-injection.js

  // Shadow DOM, title translation and language helpers live in their own modules

  // ---- Input Box Translation ----
  // ---- Selection Popup ----
  // ==================== FLOATING ACTION BALL ====================
  // ==================== GLOSSARY / TERMINOLOGY ====================
  // ---- Cleanup on unload (SPA navigation / page close) ----
  window.addEventListener('beforeunload', () => {
    cancelTranslationRun(translationRunId);
    ctx.fn.stopNavigationObserver?.();
    window.removeEventListener('llm-site-rules-changed', handleSiteRulesChanged);
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
    if (typeof destroyHoverFeature === 'function') destroyHoverFeature();
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
