/**
 * Shadow DOM observation and scanning support.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getScannedShadowRoots() {
    return ctx.fn.scannedShadowRoots || new WeakSet();
  }

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
    const scannedShadowRoots = getScannedShadowRoots();
    if (!shadowRoot || scannedShadowRoots.has(shadowRoot)) return;
    scannedShadowRoots.add(shadowRoot);
    try {
      if (typeof ctx.fn.scanNode === 'function') ctx.fn.scanNode(shadowRoot);
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
    if (typeof ctx.fn.scanNode === 'function') ctx.fn.scanNode(shadowRoot);
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

  Object.assign(ctx.fn, {
    getShadowRoot,
    findAllShadowRoots,
    scanShadowRoot,
    onShadowRootCreated,
    onShadowRootBatch,
    observeShadowRoot,
    startShadowRootObservation
  });
})();
