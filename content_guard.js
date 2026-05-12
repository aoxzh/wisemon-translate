/**
 * Lightweight content guard.
 * Keeps heavy translation code out of invisible/noisy frames until needed.
 */
(function() {
  'use strict';

  if (window.__LLM_TRANSLATE_GUARD__) return;
  window.__LLM_TRANSLATE_GUARD__ = true;

  const BLOCKED_HOSTS = [
    'doubleclick.net',
    'googlesyndication.com',
    'google-analytics.com',
    'facebook.net',
    'adnxs.com',
    'taboola.com',
    'outbrain.com'
  ];

  function isBlockedHost() {
    try {
      const host = location.hostname.toLowerCase();
      return BLOCKED_HOSTS.some(h => host === h || host.endsWith('.' + h));
    } catch (e) {
      return false;
    }
  }

  function isTopFrame() {
    try {
      return window.top === window;
    } catch (e) {
      return false;
    }
  }

  function hasUsefulFrameContent() {
    try {
      if (document.querySelector('video, track[kind="subtitles"], track[kind="captions"], embed[type="application/pdf"], iframe[src*=".pdf"]')) {
        return true;
      }
      if (location.hostname && /(^|\.)youtube\.com$/.test(location.hostname)) return true;
      const body = document.body;
      if (!body) return false;
      const text = (body.innerText || '').replace(/\s+/g, ' ').trim();
      if (text.length < 600) return false;
      const rect = document.documentElement.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80;
    } catch (e) {
      return false;
    }
  }

  function shouldInject() {
    if (isBlockedHost()) return false;
    if (isTopFrame()) return true;
    return hasUsefulFrameContent();
  }

  function requestInjection(reason) {
    if (window.__LLM_TRANSLATE_INJECTION_REQUESTED__) return;
    window.__LLM_TRANSLATE_INJECTION_REQUESTED__ = true;
    chrome.runtime.sendMessage({ action: 'inject-content-main', reason }).catch(() => {
      window.__LLM_TRANSLATE_INJECTION_REQUESTED__ = false;
    });
  }

  function run() {
    // Top frames always inject
    if (isTopFrame()) {
      requestInjection('top-frame');
      return;
    }

    // Blocked hosts never inject
    if (isBlockedHost()) return;

    // Child frame: check immediately if useful
    if (hasUsefulFrameContent()) {
      requestInjection('useful-frame');
      return;
    }

    // Child frame without useful content yet: observe briefly for content appearance
    const observer = new MutationObserver(() => {
      if (hasUsefulFrameContent()) {
        observer.disconnect();
        requestInjection('frame-became-useful');
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 8000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
