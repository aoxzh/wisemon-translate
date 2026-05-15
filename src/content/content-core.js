(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function shouldRunInFrame() {
    try {
      const textLen = (document.body?.innerText || '').trim().length;
      const hasVideo = !!document.querySelector('video, track[kind="subtitles"], track[kind="captions"]');
      const isYouTube = /(^|\.)youtube\.com$/.test(location.hostname);
      return isYouTube || hasVideo || textLen > 600;
    } catch (e) {
      return false;
    }
  }

  function attachFrameMessageBridge() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'get-status') {
        sendResponse({ pageTranslated: false, hoverEnabled: false, frameSkipped: true });
      } else {
        sendResponse({ success: false, frameSkipped: true });
      }
      return false;
    });
  }

  function collectReadablePageText(limit = 12000) {
    const root = ctx.fn.getMainContentRoot();
    const parts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!parent || !text || text.length < 2 || ctx.fn.isIgnored(parent) || ctx.fn.isInvalidText(text)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      const value = (walker.currentNode.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (value) parts.push(value);
      if (parts.join('\n').length >= limit) break;
    }
    return parts.join('\n').slice(0, limit);
  }

  function attachEventListeners() {
    if (window.__LLM_MESSAGE_BRIDGE_ATTACHED__) return;
    window.__LLM_MESSAGE_BRIDGE_ATTACHED__ = true;

    addOptionalListener(document, 'keydown', 'onKeyCombo');
    addOptionalListener(document, 'keydown', 'onKeyDown');
    addOptionalListener(document, 'keydown', 'onEditableKeyDown', true);
    addOptionalListener(document, 'keyup', 'onKeyUp');
    addOptionalListener(document, 'mouseover', 'onMouseOver');
    addOptionalListener(document, 'mouseout', 'onMouseOut');
    addOptionalListener(document, 'input', 'onInput', true);
    addOptionalListener(document, 'mouseup', 'onMouseUp');
    addOptionalListener(document, '__llm_shadowroot_created__', 'onShadowRootCreated');
    addOptionalListener(document, '__llm_shadowroot_batch__', 'onShadowRootBatch');

    try {
      if (typeof ctx.fn.setupVideoSubtitleTranslation === 'function') ctx.fn.setupVideoSubtitleTranslation();
    } catch (err) {
      ctx.fn.safeLog?.('warn', 'Content', 'Subtitle setup skipped: ' + err.message);
    }
    try {
      if (typeof ctx.fn.createFab === 'function') ctx.fn.createFab();
    } catch (err) {
      ctx.fn.safeLog?.('warn', 'Content', 'FAB setup skipped: ' + err.message);
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = ctx.fn.handleRuntimeMessageProxy || ctx.fn.handleRuntimeMessage;
      waitUntilReady().then(() => handler(request)).then(sendResponse).catch(err => sendResponse({ error: err.message }));
      return true;
    });
  }

  function addOptionalListener(target, eventName, handlerName, options) {
    target.addEventListener(eventName, function(event) {
      const handler = ctx.fn[handlerName];
      if (typeof handler !== 'function') return;
      return handler(event);
    }, options);
  }

  function waitUntilReady(timeoutMs = 5000) {
    if (ctx.state.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (ctx.state.ready) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Content script is still initializing'));
        }
      }, 50);
    });
  }

  async function handleRuntimeMessage(request) {
    const state = ctx.state;
    const fn = ctx.fn;
    switch (request.action) {
      case 'translate-page':
        return await fn.togglePageTranslation();
      case 'toggle-translation':
        return await fn.togglePageTranslation();
      case 'get-status':
        return { pageTranslated: !!state.pageTranslated, hoverEnabled: !!state.hoverEnabled };
      case 'toggle-hover':
        state.hoverEnabled = !state.hoverEnabled;
        if (!state.hoverEnabled && state.hoverPendingRequest) {
          try { state.hoverPendingRequest.abort(); } catch (e) {}
          state.hoverPendingRequest = null;
        }
        return { success: true, hoverEnabled: state.hoverEnabled };
      case 'translate-selection':
        if (request.text) fn.showSelectionPopup(request.text);
        return { success: true };
      case 'get-selection-text':
        return { text: (window.getSelection?.()?.toString() || '').trim() };
      case 'get-page-text':
        return { text: collectReadablePageText() };
      case 'translate-input': {
        const el = fn.getDeepActiveElement();
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
          await fn.translateInputElement(el, fn.getEditableText(el));
        }
        return { success: true };
      }
      case 'update-theme':
        state.settings = { ...(state.settings || {}), ...(request.settings || request) };
        fn.injectCustomTranslationCss();
        fn.applyPageState(state.pageTranslated ? (state.settings.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
        document.documentElement.style.setProperty('--llm-font-size', ((state.settings.fontSize || 94) / 100) + 'em');
        document.querySelectorAll('.llm-original-hidden').forEach(el => {
          if (state.settings.displayMode !== 'replace') el.classList.remove('llm-original-hidden');
        });
        if (state.settings.displayMode === 'replace') {
          document.querySelectorAll(`[${state.attrProcessed || 'data-llm-done'}]`).forEach(el => {
            if (!el.classList.contains('llm-original-hidden')) el.classList.add('llm-original-hidden');
          });
        }
        return { success: true };
      case 'toggle-only-translation': {
        state.settings.displayMode = state.settings.displayMode === 'replace' ? 'bilingual' : 'replace';
        fn.applyPageState(state.pageTranslated ? (state.settings.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
        document.querySelectorAll('.llm-original-hidden').forEach(el => {
          if (state.settings.displayMode !== 'replace') el.classList.remove('llm-original-hidden');
        });
        if (state.settings.displayMode === 'replace') {
          document.querySelectorAll(`[${state.attrProcessed || 'data-llm-done'}]`).forEach(el => {
            if (!el.classList.contains('llm-original-hidden')) el.classList.add('llm-original-hidden');
          });
        }
        return { success: true, displayMode: state.settings.displayMode };
      }
      case 'translate-to-bottom':
        if (!state.pageTranslated) await fn.togglePageTranslation();
        else {
          fn.scanNode(document.body);
          const remaining = [...document.querySelectorAll(`[${state.attrProcessed || 'data-llm-done'}="true"]`)].filter(el => !fn.processedElements.has(el));
          if (remaining.length > 0) fn.scheduleProcessViewBatch(remaining);
        }
        return { success: true };
    }
    return { error: 'Unknown action' };
  }

  Object.assign(ctx.fn, {
    shouldRunInFrame,
    attachFrameMessageBridge,
    attachEventListeners,
    handleRuntimeMessage,
    handleRuntimeMessageProxy: handleRuntimeMessage,
    collectReadablePageText,
    waitUntilReady
  });

  attachEventListeners();
})();
