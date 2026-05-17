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

  // Hover state
  let activeHoverParagraphs = new Set();
  let currentPopup = null;
  let hoverDebounceTimer = null;
  let hoverPendingRequest = null; // AbortController for canceling in-flight hover requests
  let subtitleObserver = null;    // MutationObserver for video subtitle detection
  const scannedShadowRoots = new WeakSet();  // shadow roots already scanned

  function syncSharedTrackingState() {
    ctx.fn.observedElements = observedElements;
    ctx.fn.processedElements = processedElements;
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
          batchInterval: isDeepSeekFlash(settings) ? 40 : (settings.largeTextMode ? 90 : 140),
          batchSize: isDeepSeekFlash(settings) ? 12 : (settings.largeTextMode ? Math.min(Math.max(settings.maxConcurrency || 8, 8), 16) : Math.min(Math.max(settings.maxConcurrency || 8, 6), 12)),
          batchLength: isDeepSeekFlash(settings) ? Math.min(Math.max(settings.maxCharsPerRequest || 16000, 12000), 16000) : (settings.largeTextMode ? Math.min(Math.max(settings.maxCharsPerRequest || 12000, 9000), 12000) : (settings.maxCharsPerRequest || 12000)),
          maxParallelBatches: isDeepSeekFlash(settings) ? Math.max(2, Math.min(5, Math.ceil((settings.maxConcurrency || 8) / 2))) : Math.max(1, Math.min(4, Math.ceil((settings.maxConcurrency || 8) / 3))),
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
      translateToBottom,
      togglePageTranslation,
      restoreOriginal,
      removeTranslationFrom,
      applyPageState,
      syncSharedTrackingState,
      publishTranslationProgress,
      processedElements,
      observedElements,
      shouldSkipTranslation,
      getVisibleText,
      isIgnored,
      isTranslatableElement,
      onKeyDown,
      onKeyUp,
      onMouseOver,
      onMouseOut,
      BLOCK_TAGS,
      WARP_TAGS,
      IGNORE_TAGS,
      ATTR_PROCESSED,
      ATTR_ID
    });
    syncSharedTrackingState();

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
      if (typeof ctx.fn.updateFabFromSettings === 'function') ctx.fn.updateFabFromSettings();
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
      const result = await startTranslation();
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
    document.querySelectorAll(`[${ATTR_OBSERVED}]`).forEach(el => {
      el.removeAttribute(ATTR_OBSERVED);
    });
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
    translatedTextHashes.clear();
    translatedTextCache.clear();
    translationStats.queued = 0; translationStats.succeeded = 0; translationStats.failed = 0;
    translationStats.recovered = 0; translationStats.lastError = '';
    totalObserved = 0;
    totalProcessed = 0;
    translationTask.setState(translationTask.states.IDLE || 'idle', { runId: translationRunId, reason: '' });
    publishTranslationProgress();
  }

  async function startTranslation() {
    if (!settings) {
      const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
      settings = { ...DEFAULT_SETTINGS, ...res.settings };
    }

    // Fully reset state for clean re-translation
    observedElements = new WeakSet();
    processedElements = new WeakMap();
    syncSharedTrackingState();
    viewElements.clear();
    dirtyQueue.clear();
    dirtyProcessing = false;
    translatedTextHashes.clear();
    translatedTextCache.clear();
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
    const toProcess = pruneTranslationCandidates(elements.filter(el =>
      observedElements.has(el) && !processedElements.has(el)
    ));
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
    translationTask.setState(translationTask.states.QUEUED || 'queued', { runId: translationRunId, reason: '' });
    publishTranslationProgress();

    // Update FAB progress
    const totalVisible = translationStats.queued;
    const pending = groups.length;
    ctx.fn.updateFabProgress(totalVisible - pending, totalVisible);

    var doneCount = 0;
    var failedCount = 0;
    var totalVisible2 = translationStats.queued;

    function isTranslationErrorResult(raw) {
      return !raw || (typeof raw === 'string' && raw.indexOf('[Translation Error:') === 0);
    }

    async function retrySingleTranslation(group, raw) {
      if (!isTranslationErrorResult(raw)) return raw;
      try {
        const res = await chrome.runtime.sendMessage({
          action: 'translate',
          text: group.text,
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang
        });
        if (res && res.translated && !res.error) {
          translationStats.recovered = (translationStats.recovered || 0) + 1;
          _safeLog('warn', 'Content', 'Recovered failed batch item with single retry', {
            textLength: group.text.length,
            firstReason: raw || 'Unknown'
          });
          return res.translated;
        }
        return raw || `[Translation Error: ${res?.error || 'Single retry returned no translation'}]`;
      } catch (err) {
        return raw || `[Translation Error: ${err.message || 'Single retry failed'}]`;
      }
    }

    async function injectOne(group, raw) {
      if (group.runId !== translationRunId) return;
      translationTask.setState(translationTask.states.TRANSLATING || 'translating', { runId: translationRunId, reason: '' });
      raw = await retrySingleTranslation(group, raw);
      totalProcessed++;
      if (isTranslationErrorResult(raw)) {
        failedCount++;
        translationStats.failed++;
        translationStats.lastError = String(raw || 'Unknown error').replace(/^\[Translation Error:\s*|\]$/g, '').slice(0, 240);
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
          translationStats.lastError = 'Empty result after cleaning';
          _safeLog('error', 'Content', 'Element translation cleaned to empty', { textLength: group.text.length, textPreview: group.text.slice(0, 180) });
          showRetry(group, 'Empty result after cleaning');
        }
      }
      const batchCompleted = doneCount + failedCount;
      ctx.fn.updateFabProgress(totalVisible2 - (groups.length - batchCompleted), totalVisible2);
      if (translationStats.queued > 0 && translationStats.succeeded + translationStats.failed >= translationStats.queued) {
        translationTask.setState(translationTask.states.COMPLETED || 'completed', { runId: translationRunId, reason: '' });
      }
      publishTranslationProgress();
    }

    if (shouldStreamGroup(groups[0], groups.length)) {
      const group = groups[0];
      const live = createTranslationWrapper(group);
      group.onStreamUpdate = function(text) {
        if (!live?.inner || group.runId !== translationRunId) return;
        live.inner.textContent = cleanTranslatedText(text);
      };
      try {
        const raw = await sendTranslateStream(group);
        if (live?.wrapper) live.wrapper.remove();
        await injectOne(group, raw);
      } catch (err) {
        if (live?.wrapper) live.wrapper.remove();
        failedCount++;
        translationStats.failed++;
        totalProcessed++;
        translationStats.lastError = err.message || 'Stream item failed';
        translationTask.setState(translationTask.states.FAILED || 'failed', { runId: translationRunId, reason: err.message });
        _safeLog('error', 'Content', 'Stream item failed: ' + err.message, { textLength: group.text.length });
        showRetry(group, err.message);
        publishTranslationProgress();
      }
    } else if (translateQueue) {
      groups.forEach(function(group) {
        if (group.runId !== translationRunId) return;
        translateQueue.add(group.text, { runId: translationRunId }).then(function(raw) {
          return injectOne(group, raw);
        }).catch(function(err) {
          if (group.runId === translationRunId) {
            failedCount++;
            translationStats.failed++;
            totalProcessed++;
            translationStats.lastError = err.message || 'Viewport item failed';
            translationTask.setState(translationTask.states.FAILED || 'failed', { runId: translationRunId, reason: err.message });
            _safeLog('error', 'Content', 'Viewport item failed: ' + err.message, { textLength: group.text.length });
            showRetry(group, err.message);
            publishTranslationProgress();
          }
        });
      });
    } else {
      try {
        var texts = groups.map(function(g) { return g.text; });
        var results = await sendTranslateBatch(texts, { runId: translationRunId });
        await Promise.all(groups.map(function(group, i) { return injectOne(group, results[i]); }));
      } catch (err) {
        translationStats.failed += groups.length;
        totalProcessed += groups.length;
        doneCount = 0;
        failedCount = groups.length;
        translationStats.lastError = err.message || 'Viewport batch failed';
        translationTask.setState(translationTask.states.FAILED || 'failed', { runId: translationRunId, reason: err.message });
        _safeLog('error', 'Content', 'Viewport batch failed: ' + err.message, { count: groups.length, runId: translationRunId });
        publishTranslationProgress();
      }
    }
  }

  function scheduleProcessViewBatch(elements) {
    processViewBatch(elements).catch(err => {
      _safeLog('error', 'Content', 'Scheduled viewport batch crashed: ' + err.message, err.stack);
    });
  }

  async function translateToBottom() {
    if (!pageTranslated) {
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

  function hasRuleIncludeSelectors() {
    return Array.isArray(siteRule?.includeSelectors) && siteRule.includeSelectors.length > 0 && (siteRule.matchedIds || []).some(id => id && id !== 'default');
  }

  function collectRuleIncludedCandidates(root) {
    const out = [];
    const seen = new WeakSet();
    const selectors = siteRule?.includeSelectors || [];
    function add(el) {
      if (!(el instanceof Element) || seen.has(el) || processedElements.has(el)) return;
      if (!isBottomScanCandidate(el)) return;
      seen.add(el);
      out.push(el);
    }
    for (const selector of selectors) {
      try {
        if (root instanceof Element && root.matches(selector)) add(root);
        root.querySelectorAll?.(selector).forEach(add);
      } catch (err) {
        _safeLog('warn', 'Rules', 'Invalid translate-to-bottom include selector skipped: ' + selector, { error: err.message });
      }
    }
    root.querySelectorAll?.(`[${ATTR_OBSERVED}="true"]`).forEach(add);
    return pruneTranslationCandidates(out);
  }

  function collectUnprocessedCandidates(root) {
    const out = [];
    const seen = new WeakSet();
    function add(el) {
      if (!(el instanceof Element) || seen.has(el) || processedElements.has(el)) return;
      if (!isBottomScanCandidate(el)) return;
      seen.add(el);
      out.push(el);
    }

    root.querySelectorAll?.(`[${ATTR_OBSERVED}="true"]`).forEach(add);
    root.querySelectorAll?.('p, li, td, th, dd, dt, figcaption, caption, blockquote, h1, h2, h3, h4, h5, h6').forEach(add);

    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
          if (!value || isInvalidText(value)) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || isIgnored(parent) || matchesSiteRuleSelector(parent, siteRule?.excludeSelectors)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) add(findTranslationHostForTextNode(walker.currentNode));
    } catch (err) {
      LOG.debug('Content', `Bottom text scan skipped: ${err.message}`);
    }

    return pruneTranslationCandidates(out);
  }

  function isBottomScanCandidate(el) {
    if (!(el instanceof Element)) return false;
    if (isIgnored(el)) return false;
    if (matchesSiteRuleSelector(el, siteRule?.excludeSelectors)) return false;
    const text = getVisibleText(el);
    if (isInvalidText(text)) return false;
    if (shouldSkipTranslation(text, settings.targetLang)) return false;
    return true;
  }

  function pruneTranslationCandidates(candidates) {
    if (!ctx.fn.candidatePruner?.pruneCandidates) return Array.from(candidates || []);
    return ctx.fn.candidatePruner.pruneCandidates(candidates, getCandidatePrunerDeps());
  }

  function getCandidatePrunerDeps() {
    return {
      settings,
      siteRule,
      processedElements,
      isIgnored,
      matchesSiteRuleSelector,
      getVisibleText,
      isInvalidText,
      shouldSkipTranslation
    };
  }

  async function sendTranslateBatch(texts, args = {}) {
    if (args.runId && args.runId !== translationRunId) {
      return texts.map(() => '[Translation Error: Translation run was canceled]');
    }
    const res = await chrome.runtime.sendMessage({ action: 'translate-batch', texts });
    if (res.error) throw new Error(res.error);
    return res.results || [];
  }

  function shouldStreamGroup(group, groupCount) {
    if (!settings?.useStream || settings.streamRenderMode === 'disabled') return false;
    if (groupCount !== 1) return false;
    if (!group?.text || group.text.length > 1800) return false;
    if (settings.displayMode === 'replace') return false;
    return true;
  }

  function createTranslationWrapper(group) {
    const element = group.element;
    if (!element.isConnected || !element.parentNode) return null;
    const isBlock = isBlockNode(element) || isCompactUiTextElement(element, group.text);
    const wrapperClass = isBlock ? `${TAG_NAME}-block-wrapper` : `${TAG_NAME}-inline-wrapper`;
    const hasStrictParent = element.parentNode && element.parentNode.nodeType === 1 && STRICT_PARENT_TAGS.has(element.parentNode.tagName);

    const wrapper = document.createElement(isBlock && !hasStrictParent ? 'div' : 'span');
    wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
    wrapper.setAttribute(ATTR_ID, element.getAttribute(ATTR_ID));

    const inner = document.createElement('span');
    inner.className = `${TAG_NAME}-inner`;
    wrapper.appendChild(inner);

    if (hasStrictParent) {
      element.appendChild(wrapper);
    } else if ((settings.translationPosition || 'after') === 'before') {
      element.parentNode.insertBefore(wrapper, element);
    } else if (element.nextSibling) {
      element.parentNode.insertBefore(wrapper, element.nextSibling);
    } else {
      element.parentNode.appendChild(wrapper);
    }
    applyPageState('dual');
    return { wrapper, inner };
  }

  function sendTranslateStream(group) {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const port = chrome.runtime.connect({ name: 'translate-stream' });
      let settled = false;
      let latest = '';

      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        try { port.disconnect(); } catch (e) {}
        fn(value);
      };

      port.onMessage.addListener((message) => {
        if (!message || message.requestId !== requestId) return;
        if (message.type === 'delta') {
          latest = message.text || latest;
          if (typeof group.onStreamUpdate === 'function') group.onStreamUpdate(latest);
        } else if (message.type === 'done') {
          settle(resolve, message.text || latest);
        } else if (message.type === 'error') {
          settle(reject, new Error(message.error || 'Translation failed'));
        }
      });
      port.onDisconnect.addListener(() => {
        if (!settled) settle(resolve, latest);
      });
      port.postMessage({
        action: 'translate-stream',
        requestId,
        text: group.text,
        pageUrl: location.href,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang
      });
    });
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

  function scanAdaptiveTextElements(root) {
    ctx.fn.adaptiveScanner?.scanAdaptiveTextElements(root, getAdaptiveScannerDeps());
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
      const hasSemanticContent = ctx.fn.adaptiveScanner?.hasSemanticContentSignal(root);

      if (hasDirectText || hasSemanticContent || !hasBlockChild) {
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
      const semanticHost = ctx.fn.adaptiveScanner?.hasSemanticContentSignal(el) && visibleText.length <= Math.max(1200, settings.maxCharsPerRequest || 4000);

      if (['A','BUTTON','LABEL','SUMMARY','FIGCAPTION','CAPTION','TH','TD','LI','P','H1','H2','H3','H4','H5','H6'].includes(tag)) {
        candidate = el;
        break;
      }
      if (semanticHost) {
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

  function getAdaptiveScannerDeps() {
    return {
      settings,
      siteRule,
      observedElements,
      processedElements,
      startObserveElement,
      isIgnored,
      matchesSiteRuleSelector,
      getVisibleText,
      getDirectText,
      isInvalidText,
      isBlockNode,
      safeLog: _safeLog
    };
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
    if (pruneTranslationCandidates([el]).length === 0) {
      if (currentScanStats) currentScanStats.skippedInvalid++;
      return;
    }

    observedElements.add(el);
    totalObserved++;
    el.setAttribute(ATTR_OBSERVED, 'true');
    syncSharedTrackingState();
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

    if (!plainText || plainText.length < 2) return null;

    processedElements.set(hostEl, { id: generateId() });
    hostEl.setAttribute(ATTR_PROCESSED, 'true');
    hostEl.setAttribute(ATTR_ID, processedElements.get(hostEl).id);
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
    const root = document.documentElement;
    root.setAttribute('llm-state', state);
    root.setAttribute('llm-page-tone', detectPageTone());
    // Theme
    const theme = normalizeTranslationTheme(settings.translationTheme);
    root.setAttribute('llm-theme', theme);
    // Position
    const position = settings.translationPosition || 'after';
    root.setAttribute('llm-pos', position);
    // Font size as CSS variable
    const fontSize = (settings.fontSize || 94) / 100;
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
    const { element, nodes } = group;
    if (!element.isConnected || !element.parentNode) return;
    if (settings.displayMode !== 'replace' && shouldSkipCompactUiInBilingual(element, group.text)) {
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
    if (settings.displayMode !== 'replace') return false;
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
    retry.textContent = 'Retry';
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
        LOG.info('Content', 'Title translated: ' + title.slice(0, 40) + ' -> ' + res.translated.slice(0, 40));
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
    return ctx.fn.language?.getPageLanguageHint?.() || '';
  }

  function heuristicDetectLang(text) {
    return ctx.fn.language?.heuristicDetectLang?.(text) || '';
  }

  function getLanguageProfile(text) {
    return ctx.fn.language?.getLanguageProfile?.(text) || { total: 1, kana: 0, hangul: 0, han: 0, latin: 0, cjk: 0, latinRatio: 0, cjkRatio: 0 };
  }

  function normalizeTargetLang(targetLang) {
    return ctx.fn.language?.normalizeTargetLang?.(targetLang) || '';
  }

  function hasMeaningfulMixedLanguage(text, targetLang) {
    return !!ctx.fn.language?.hasMeaningfulMixedLanguage?.(text, targetLang);
  }

  function shouldSkipTranslation(text, targetLang) {
    return !!ctx.fn.language?.shouldSkipTranslation?.(text, targetLang);
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
