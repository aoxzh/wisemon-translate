(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  const MAIN_CONTENT_SELECTORS = [
    'main', 'article', '[role="main"]', '.post-content', '.entry-content',
    '.article-content', '.content', '.main-content', '#content', '#main',
    '.markdown-body', '.repository-content', '.topic-content'
  ];

  function setupMutationObserver() {
    if (ctx.state.mutationObserver) ctx.state.mutationObserver.disconnect();
    ctx.state.mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !ctx.fn.isIgnored(node)) {
              queueForRescan(node);
            }
          }
        } else if (m.type === 'characterData') {
          if (!ctx.fn.isIgnored(m.target.parentElement)) {
            queueForRescan(m.target.parentElement);
          }
        }
      }
    });
    ctx.state.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });
  }

  function queueForRescan(node) {
    const container = findTranslatableContainer(node);
    if (!container) return;
    ctx.state.dirtyQueue.add(container);
    if (!ctx.state.dirtyProcessing) {
      ctx.state.dirtyProcessing = true;
      const schedule = typeof requestIdleCallback === 'function'
        ? (cb) => requestIdleCallback(cb, { timeout: 200 })
        : (cb) => setTimeout(cb, 50);
      schedule(() => {
        ctx.state.dirtyQueue.forEach(el => {
          ctx.fn.removeTranslationFrom(el);
          ctx.fn.scanNode(el);
        });
        ctx.state.dirtyQueue.clear();
        ctx.state.dirtyProcessing = false;
      });
    }
  }

  function findTranslatableContainer(start) {
    if (!(start instanceof Element)) return null;
    if (ctx.fn.isIgnored(start)) return null;
    let curr = start;
    while (curr && curr !== document.body) {
      if (ctx.fn.BLOCK_TAGS.has(curr.tagName) || ctx.fn.observedElements.has(curr)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  function setupIntersectionObserver() {
    if (ctx.state.intersectionObserver) ctx.state.intersectionObserver.disconnect();
    ctx.state.intersectionObserver = new IntersectionObserver((entries) => {
      const pending = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ctx.state.viewElements.add(entry.target);
          pending.push(entry.target);
        } else {
          ctx.state.viewElements.delete(entry.target);
        }
      });
      if (pending.length > 0) ctx.fn.scheduleProcessViewBatch(pending);
    }, { threshold: 0.05, rootMargin: '300px 0px 300px 0px' });
  }

  function stopObservers() {
    if (ctx.state.mutationObserver) { ctx.state.mutationObserver.disconnect(); ctx.state.mutationObserver = null; }
    if (ctx.state.intersectionObserver) { ctx.state.intersectionObserver.disconnect(); ctx.state.intersectionObserver = null; }
    if (ctx.state.subtitleObserver) { ctx.state.subtitleObserver.disconnect(); ctx.state.subtitleObserver = null; }
    ctx.state.viewElements.clear();
  }

  function getMainContentRoot() {
    const settings = ctx.state.settings || {};
    if (!settings.translateMainOnly) return document.body;
    const ruleSelectors = ctx.state.siteRule?.mainSelectors || [];
    for (const sel of ruleSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    for (const sel of MAIN_CONTENT_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    return document.body;
  }

  Object.assign(ctx.fn, {
    setupMutationObserver,
    queueForRescan,
    findTranslatableContainer,
    setupIntersectionObserver,
    stopObservers,
    getMainContentRoot
  });
})();
