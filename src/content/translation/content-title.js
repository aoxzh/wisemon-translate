/**
 * Page title translation helpers.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function _safeLog(level, tag, msg, data) {
    if (typeof ctx.fn?.safeLog === 'function') {
      ctx.fn.safeLog(level, tag, msg, data);
    }
  }

  let originalTitle = '';

  async function translatePageTitle() {
    try {
      const title = document.title.trim();
      if (!title || title.length < 2) return;
      originalTitle = title;

      const res = await chrome.runtime.sendMessage({
        action: 'translate',
        text: title,
        runId: ctx.state.translationRunId,
        requestId: `title_${ctx.state.translationRunId || 0}_${Date.now()}`
      });
      if (res.translated && !res.error) {
        document.title = res.translated;
        if (typeof LOG !== 'undefined') LOG.info('Content', 'Title translated: ' + title.slice(0, 40) + ' -> ' + res.translated.slice(0, 40));
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

  Object.assign(ctx.fn, {
    translatePageTitle,
    restorePageTitle
  });
})();
