/**
 * Detect client-side navigation from an isolated content-script world.
 * Polling covers page-world history.pushState calls that cannot be patched
 * reliably across the extension/page JavaScript boundary.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  let timer = null;
  let lastUrl = location.href;
  let listener = null;

  function checkNavigation() {
    const nextUrl = location.href;
    if (nextUrl === lastUrl) return;
    const previousUrl = lastUrl;
    lastUrl = nextUrl;
    Promise.resolve(listener?.(nextUrl, previousUrl)).catch(error => {
      ctx.fn.safeLog?.('warn', 'Navigation', 'SPA navigation refresh failed: ' + error.message);
    });
  }

  function startNavigationObserver(onNavigate) {
    stopNavigationObserver();
    listener = onNavigate;
    lastUrl = location.href;
    window.addEventListener('popstate', checkNavigation);
    window.addEventListener('hashchange', checkNavigation);
    window.addEventListener('pageshow', checkNavigation);
    timer = setInterval(checkNavigation, 500);
  }

  function stopNavigationObserver() {
    if (timer) clearInterval(timer);
    timer = null;
    window.removeEventListener('popstate', checkNavigation);
    window.removeEventListener('hashchange', checkNavigation);
    window.removeEventListener('pageshow', checkNavigation);
    listener = null;
  }

  Object.assign(ctx.fn, { startNavigationObserver, stopNavigationObserver });
})();
