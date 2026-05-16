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
            if (node.nodeType === Node.ELEMENT_NODE && !isIgnored(node)) {
              queueForRescan(node);
            }
          }
        } else if (m.type === 'characterData') {
          if (!isIgnored(m.target.parentElement)) {
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

  function isIgnored(node) {
    return typeof ctx.fn.isIgnored === 'function' ? ctx.fn.isIgnored(node) : false;
  }

  function getDirtyQueue() {
    if (!ctx.state.dirtyQueue) ctx.state.dirtyQueue = new Set();
    return ctx.state.dirtyQueue;
  }

  function rescanDependenciesReady() {
    return typeof ctx.fn.scanNode === 'function'
      && typeof ctx.fn.scheduleProcessViewBatch === 'function'
      && ctx.fn.observedElements
      && ctx.fn.processedElements;
  }

  function queueForRescan(node) {
    const container = findTranslatableContainer(node);
    if (!container) return;
    const dirtyQueue = getDirtyQueue();
    dirtyQueue.add({ node, container });
    scheduleDirtyFlush();
  }

  function scheduleDirtyFlush(delay) {
    if (ctx.state.dirtyProcessing) return;
    ctx.state.dirtyProcessing = true;
    const schedule = delay
      ? (cb) => setTimeout(cb, delay)
      : (typeof requestIdleCallback === 'function'
        ? (cb) => requestIdleCallback(cb, { timeout: 200 })
        : (cb) => setTimeout(cb, 50));
    schedule(flushDirtyQueue);
  }

  function flushDirtyQueue() {
    const dirtyQueue = getDirtyQueue();
    try {
      if (!rescanDependenciesReady()) return;
      dirtyQueue.forEach(item => {
        const target = item.node instanceof Element ? item.node : item.container;
        if (!target || !target.isConnected) return;
        if (typeof ctx.fn.removeTranslationFrom === 'function') {
          ctx.fn.removeTranslationFrom(target);
        }
        ctx.fn.scanNode(target);
        if (item.container && item.container !== target && item.container.isConnected) {
          ctx.fn.scanNode(item.container);
        }
        processVisiblePending(target);
      });
      dirtyQueue.clear();
    } finally {
      ctx.state.dirtyProcessing = false;
      if (dirtyQueue.size > 0) scheduleDirtyFlush(rescanDependenciesReady() ? 0 : 100);
    }
  }

  function processVisiblePending(root) {
    if (!(root instanceof Element)) return;
    const pending = [];
    const candidates = [root].concat(Array.from(root.querySelectorAll('*')));
    candidates.forEach(el => {
      if (!ctx.fn.observedElements?.has(el) || ctx.fn.processedElements?.has(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 500 && rect.bottom > -500) pending.push(el);
    });
    if (pending.length > 0) ctx.fn.scheduleProcessViewBatch(pending);
  }

  function findTranslatableContainer(start) {
    if (!(start instanceof Element)) return null;
    if (isIgnored(start)) return null;
    let curr = start;
    while (curr && curr !== document.body) {
      if (ctx.fn.BLOCK_TAGS?.has(curr.tagName) || ctx.fn.observedElements?.has(curr)) return curr;
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
