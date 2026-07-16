/**
 * Viewport translation batching, in-page deduplication and stream transport.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function createContentBatchProcessor(deps) {
    const translatedTextHashes = new Set();
    const translatedTextCache = new Map();

    function reset() {
      translatedTextHashes.clear();
      translatedTextCache.clear();
    }

    function getTextHash(text) {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      return 'h_' + Math.abs(hash).toString(36);
    }

    function isTranslationErrorResult(raw) {
      return !raw || (typeof raw === 'string' && raw.indexOf('[Translation Error:') === 0);
    }

    async function retrySingleTranslation(group, raw) {
      if (!isTranslationErrorResult(raw)) return raw;
      const settings = deps.getSettings();
      const stats = deps.getTranslationStats();
      try {
        const res = await chrome.runtime.sendMessage({
          action: 'translate',
          text: group.text,
          runId: group.runId,
          requestId: `single_${group.runId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang
        });
        if (res && res.translated && !res.error) {
          stats.recovered = (stats.recovered || 0) + 1;
          group.recoveredBySingleRetry = true;
          deps.safeLog('warn', 'Content', 'Recovered failed batch item with single retry', {
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

    async function processViewBatch(elements) {
      const observed = deps.getObservedElements();
      const processed = deps.getProcessedElements();
      const runId = deps.getTranslationRunId();
      const stats = deps.getTranslationStats();
      const task = deps.getTranslationTask();
      const queue = deps.getTranslateQueue();
      const toProcess = deps.pruneTranslationCandidates(elements.filter(el => observed.has(el) && !processed.has(el)));
      if (toProcess.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };

      deps.safeLog('info', 'Content', `Viewport batch: ${toProcess.length} elements`, {
        runId,
        queueSize: queue?.size ? queue.size() : 0
      });
      const groups = [];

      for (const el of toProcess) {
        const group = deps.buildNodeGroup(el);
        if (!group) continue;
        const hash = getTextHash(group.text);
        if (translatedTextHashes.has(hash)) {
          const cachedResult = translatedTextCache.get(hash);
          if (cachedResult) {
            deps.injectTranslationResult(group, cachedResult);
            stats.succeeded++;
            deps.safeLog('debug', 'Content', 'Injected duplicate text from in-page cache', { hash, textLength: group.text.length });
          } else {
            processed.delete(group.element);
            group.element.removeAttribute(deps.attrProcessed);
            const existingId = group.element.getAttribute(deps.attrId);
            if (existingId) group.preservedId = existingId;
            deps.safeLog('warn', 'Content', 'Duplicate text hash had no cached translation; re-queued element', {
              hash,
              textLength: group.text.length
            });
            group.textHash = hash;
            group.runId = runId;
            groups.push(group);
          }
          continue;
        }
        group.textHash = hash;
        group.runId = runId;
        groups.push(group);
      }

      if (groups.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };
      stats.queued += groups.length;
      task.setState(task.states.QUEUED || 'queued', { runId, reason: '' });
      deps.publishTranslationProgress();

      const totalVisible = stats.queued;
      deps.updateFabProgress(totalVisible - groups.length, totalVisible);
      let doneCount = 0;
      let failedCount = 0;

      async function injectOne(group, raw) {
        if (group.runId !== deps.getTranslationRunId()) return;
        task.setState(task.states.TRANSLATING || 'translating', { runId, reason: '' });
        raw = await retrySingleTranslation(group, raw);
        if (group.runId !== deps.getTranslationRunId()) return;
        deps.incrementTotalProcessed();
        if (isTranslationErrorResult(raw)) {
          failedCount++;
          stats.failed++;
          stats.lastError = String(raw || 'Unknown error').replace(/^\[Translation Error:\s*|\]$/g, '').slice(0, 240);
          deps.safeLog('error', 'Content', 'Element translation failed', {
            reason: raw || 'Unknown',
            textLength: group.text.length
          });
          deps.showRetry(group, raw || 'Unknown error');
        } else {
          const cleaned = deps.cleanTranslatedText(raw);
          if (cleaned && cleaned.length > 0) {
            deps.injectTranslationResult(group, cleaned);
            translatedTextHashes.add(group.textHash);
            translatedTextCache.set(group.textHash, cleaned);
            const retrying = deps.getRetryingElements();
            if (retrying.has(group.element) && !group.recoveredBySingleRetry) stats.recovered = (stats.recovered || 0) + 1;
            retrying.delete(group.element);
            doneCount++;
            stats.succeeded++;
          } else {
            failedCount++;
            stats.failed++;
            stats.lastError = 'Empty result after cleaning';
            deps.safeLog('error', 'Content', 'Element translation cleaned to empty', {
              textLength: group.text.length
            });
            deps.showRetry(group, 'Empty result after cleaning');
          }
        }
        const batchCompleted = doneCount + failedCount;
        deps.updateFabProgress(totalVisible - (groups.length - batchCompleted), totalVisible);
        if (stats.queued > 0 && stats.succeeded + stats.failed >= stats.queued) {
          task.setState(task.states.COMPLETED || 'completed', { runId, reason: '' });
        }
        deps.publishTranslationProgress();
      }

      if (shouldStreamGroup(groups[0], groups.length)) {
        const group = groups[0];
        const live = createTranslationWrapper(group);
        group.onStreamUpdate = function(text) {
          if (!live?.inner || group.runId !== deps.getTranslationRunId()) return;
          live.inner.textContent = deps.cleanTranslatedText(text);
        };
        try {
          const raw = await sendTranslateStream(group);
          if (live?.wrapper) live.wrapper.remove();
          await injectOne(group, raw);
        } catch (err) {
          if (live?.wrapper) live.wrapper.remove();
          if (group.runId !== deps.getTranslationRunId()) return;
          failedCount++;
          stats.failed++;
          deps.incrementTotalProcessed();
          stats.lastError = err.message || 'Stream item failed';
          task.setState(task.states.FAILED || 'failed', { runId, reason: err.message });
          deps.safeLog('error', 'Content', 'Stream item failed: ' + err.message, { textLength: group.text.length });
          deps.showRetry(group, err.message);
          deps.publishTranslationProgress();
        }
      } else if (queue) {
        groups.forEach(function(group) {
          if (group.runId !== deps.getTranslationRunId()) return;
          queue.add(group.text, { runId }).then(function(raw) {
            return injectOne(group, raw);
          }).catch(function(err) {
            if (group.runId !== deps.getTranslationRunId()) return;
            failedCount++;
            stats.failed++;
            deps.incrementTotalProcessed();
            stats.lastError = err.message || 'Viewport item failed';
            task.setState(task.states.FAILED || 'failed', { runId, reason: err.message });
            deps.safeLog('error', 'Content', 'Viewport item failed: ' + err.message, { textLength: group.text.length });
            deps.showRetry(group, err.message);
            deps.publishTranslationProgress();
          });
        });
      } else {
        try {
          const results = await sendTranslateBatch(groups.map(group => group.text), { runId });
          await Promise.all(groups.map(function(group, index) { return injectOne(group, results[index]); }));
        } catch (err) {
          if (runId !== deps.getTranslationRunId()) return;
          stats.failed += groups.length;
          deps.incrementTotalProcessed(groups.length);
          stats.lastError = err.message || 'Viewport batch failed';
          task.setState(task.states.FAILED || 'failed', { runId, reason: err.message });
          deps.safeLog('error', 'Content', 'Viewport batch failed: ' + err.message, { count: groups.length, runId });
          deps.publishTranslationProgress();
        }
      }
    }

    function scheduleProcessViewBatch(elements) {
      processViewBatch(elements).catch(err => {
        deps.safeLog('error', 'Content', 'Scheduled viewport batch crashed: ' + err.message, err.stack);
      });
    }

    async function sendTranslateBatch(texts, args = {}) {
      if (args.runId && args.runId !== deps.getTranslationRunId()) {
        return texts.map(() => '[Translation Error: Translation run was canceled]');
      }
      const message = {
        action: 'translate-batch',
        texts,
        runId: args.runId,
        requestId: `batch_${args.runId || 0}_${Date.now()}_${Math.random().toString(36).slice(2)}`
      };
      const pageContext = deps.getPageContext();
      if (pageContext) message.context = pageContext;
      const res = await chrome.runtime.sendMessage(message);
      if (res.error) throw new Error(res.error);
      return res.results || [];
    }

    function shouldStreamGroup(group, groupCount) {
      const settings = deps.getSettings();
      if (!settings?.useStream || settings.streamRenderMode === 'disabled') return false;
      if (groupCount !== 1 || !group?.text || group.text.length > 1800) return false;
      return settings.displayMode !== 'replace';
    }

    function createTranslationWrapper(group) {
      const settings = deps.getSettings();
      const element = group.element;
      if (!element.isConnected || !element.parentNode) return null;
      const isBlock = deps.isBlockNode(element) || deps.isCompactUiTextElement(element, group.text);
      const wrapperClass = isBlock ? `${deps.tagName}-block-wrapper` : `${deps.tagName}-inline-wrapper`;
      const hasStrictParent = element.parentNode.nodeType === 1 && deps.strictParentTags.has(element.parentNode.tagName);
      const wrapper = document.createElement(isBlock && !hasStrictParent ? 'div' : 'span');
      wrapper.className = wrapperClass + (hasStrictParent ? ' llm-strict-wrapper' : '');
      wrapper.setAttribute(deps.attrId, element.getAttribute(deps.attrId));
      const inner = document.createElement('span');
      inner.className = `${deps.tagName}-inner`;
      wrapper.appendChild(inner);

      if (hasStrictParent) element.appendChild(wrapper);
      else if ((settings.translationPosition || 'after') === 'before') element.parentNode.insertBefore(wrapper, element);
      else if (element.nextSibling) element.parentNode.insertBefore(wrapper, element.nextSibling);
      else element.parentNode.appendChild(wrapper);
      deps.applyPageState('dual');
      return { wrapper, inner };
    }

    function sendTranslateStream(group) {
      const settings = deps.getSettings();
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

        port.onMessage.addListener(message => {
          if (!message || message.requestId !== requestId) return;
          if (message.type === 'delta') {
            latest = message.text || latest;
            if (typeof group.onStreamUpdate === 'function') group.onStreamUpdate(latest);
          } else if (message.type === 'done') settle(resolve, message.text || latest);
          else if (message.type === 'error') settle(reject, new Error(message.error || 'Translation failed'));
        });
        port.onDisconnect.addListener(() => {
          if (!settled) settle(latest ? resolve : reject, latest || new Error('Translation stream disconnected before receiving any data'));
        });
        port.postMessage({
          action: 'translate-stream',
          requestId,
          runId: group.runId,
          text: group.text,
          pageUrl: location.href,
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang
        });
      });
    }

    return { reset, getTextHash, processViewBatch, scheduleProcessViewBatch, sendTranslateBatch };
  }

  ctx.fn.createContentBatchProcessor = createContentBatchProcessor;
})();
