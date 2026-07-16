(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const POPUP_MARGIN = 8;

  function getSettings() {
    return ctx.state.settings || null;
  }

  function onMouseUp(e) {
    const settings = getSettings();
    if (!settings?.enableSelection) return;
    if (e.target.closest('.llm-translate-popup')) return;
    const sel = getSelection();
    const text = sel?.toString()?.trim();
    if (!text || text.length < 1) {
      hideSelectionPopup();
      return;
    }
    ctx.state.lastSelectionAnchor = {
      x: e.clientX,
      y: e.clientY
    };
    showSelectionPopup(text, e.clientX, e.clientY);
  }

  function getSelectionAnchor() {
    try {
      const selection = window.getSelection?.();
      if (!selection || selection.rangeCount < 1) return null;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect?.();
      if (!rect || (!rect.width && !rect.height && !rect.left && !rect.top)) return null;
      const x = rect.right || rect.left || innerWidth / 2;
      const y = rect.top || rect.bottom || 80;
      return { x, y };
    } catch (e) {
      return null;
    }
  }

  function showSelectionPopup(text, x, y) {
    hideSelectionPopup();
    const escapeHtml = ctx.fn.escapeHtml;
    const anchor = (typeof x === 'number' && typeof y === 'number')
      ? { x, y }
      : (getSelectionAnchor() || ctx.state.lastSelectionAnchor || { x: innerWidth / 2, y: 80 });
    const popup = document.createElement('div');
    popup.className = 'llm-translate-popup';
    popup.innerHTML = '<div class="llm-popup-header">' +
        '<div class="llm-popup-title">Selection Translation</div>' +
        '<div class="llm-popup-window-actions">' +
          '<button type="button" data-action="pin" aria-pressed="false" title="Keep open">Pin</button>' +
          '<button type="button" data-action="close" title="Close">x</button>' +
        '</div>' +
      '</div>' +
      '<div class="llm-popup-body">' +
        '<div class="llm-popup-original">' + escapeHtml(text.slice(0, 600)) + (text.length > 600 ? '...' : '') + '</div>' +
        '<div class="llm-popup-result llm-translate-loading">Translating...</div>' +
      '</div>' +
      '<div class="llm-popup-ai-actions"></div>' +
      '<div class="llm-popup-actions">' +
        '<button type="button" data-action="copy-source">Copy Source</button>' +
        '<button type="button" data-action="copy-result">Copy Result</button>' +
        '<button type="button" data-action="speak-source">🔊 Source</button>' +
        '<button type="button" data-action="speak-result">🔊 Result</button>' +
        '<button type="button" data-action="save-vocab">⭐ Save</button>' +
        '<button type="button" data-action="open-side">Side Panel</button>' +
      '</div>';
    positionPopup(popup, anchor.x + 10, anchor.y + 10);
    document.body.appendChild(popup);
    ctx.state.currentSelectionPopup = popup;
    let translatedText = '';
    let pinned = false;
    let autoHide = null;
    let clickOutside = null;

    makePopupDraggable(popup);

    function armAutoHide() {
      clearTimeout(autoHide);
      if (clickOutside) document.removeEventListener('click', clickOutside);
      if (pinned) return;
      autoHide = setTimeout(hideSelectionPopup, 15000);
      clickOutside = function(ev) {
        if (!popup.contains(ev.target)) {
          hideSelectionPopup();
          document.removeEventListener('click', clickOutside);
          clearTimeout(autoHide);
        }
      };
      setTimeout(function() {
        if (ctx.state.currentSelectionPopup === popup && !pinned) {
          document.addEventListener('click', clickOutside);
        }
      }, 100);
    }

    popup.addEventListener('click', async function(ev) {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      ev.stopPropagation();
      const action = btn.dataset.action;
      if (action === 'close') {
        hideSelectionPopup();
        return;
      }
      if (action === 'pin') {
        pinned = !pinned;
        btn.setAttribute('aria-pressed', String(pinned));
        btn.textContent = pinned ? 'Pinned' : 'Pin';
        popup.classList.toggle('llm-popup-pinned', pinned);
        armAutoHide();
        return;
      }
      if (action === 'copy-source') {
        await navigator.clipboard.writeText(text);
        ctx.fn.showToast?.('Source copied', 1200);
      }
      if (action === 'copy-result') {
        await navigator.clipboard.writeText(translatedText || '');
        ctx.fn.showToast?.('Translation copied', 1200);
      }
      if (action === 'open-side') {
        await chrome.storage.local.set({ 'llm-translate-sidepanel-draft': { text, translated: translatedText, ts: Date.now() } });
        chrome.runtime.sendMessage({ action: 'open-sidepanel' }).catch(function() {});
      }
      if (action === 'speak-source') {
        if (text) ctx.fn.speakTTS?.(text, getSettings()?.sourceLang);
      }
      if (action === 'speak-result') {
        if (translatedText) ctx.fn.speakTTS?.(translatedText, getSettings()?.targetLang);
      }
      if (action === 'save-vocab') {
        try {
          const settings = getSettings() || {};
          await chrome.runtime.sendMessage({
            action: 'save-vocabulary',
            item: {
              term: text,
              translation: translatedText && translatedText !== '--' ? translatedText : '',
              sourceLang: settings.sourceLang,
              targetLang: settings.targetLang,
              context: text.slice(0, 240),
              url: location.href,
              title: document.title
            }
          });
          ctx.fn.showToast?.('Saved to vocabulary', 1200);
        } catch (e) {
          ctx.fn.showToast?.('Save failed', 1500);
        }
      }
    });

    // Render custom AI action buttons from settings
    function renderAiActionButtons() {
      const actions = getSettings()?.aiActions || [];
      const container = popup.querySelector('.llm-popup-ai-actions');
      if (!container || actions.length === 0) return;
      container.innerHTML = '';
      actions.forEach(function(action) {
        if (!action || !action.prompt) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'llm-popup-ai-action-btn';
        btn.title = action.name || '';
        btn.textContent = (action.icon || '⚡') + ' ' + (action.name || 'Action');
        btn.addEventListener('click', async function(ev) {
          ev.stopPropagation();
          pinned = true;
          const resultEl = popup.querySelector('.llm-popup-result');
          resultEl.textContent = '';
          resultEl.classList.add('llm-translate-loading');
          try {
            const res = await chrome.runtime.sendMessage({ action: 'run-action', text, actionMeta: action });
            if (ctx.state.currentSelectionPopup !== popup) return;
            resultEl.classList.remove('llm-translate-loading');
            if (res.error) {
              resultEl.textContent = '';
              const errorSpan = document.createElement('span');
              errorSpan.className = 'llm-translate-error';
              errorSpan.textContent = 'Error: ' + res.error;
              resultEl.appendChild(errorSpan);
            } else {
              translatedText = res.result || '';
              resultEl.textContent = translatedText;
              if (typeof LOG !== 'undefined') LOG.info('Selection', 'AI action result', { action: action.id || action.name, textLength: text.length });
            }
          } catch (err) {
            if (ctx.state.currentSelectionPopup !== popup) return;
            resultEl.classList.remove('llm-translate-loading');
            resultEl.textContent = '';
            const errorSpan = document.createElement('span');
            errorSpan.className = 'llm-translate-error';
            errorSpan.textContent = 'Error: ' + err.message;
            resultEl.appendChild(errorSpan);
          }
        });
        container.appendChild(btn);
      });
    }
    renderAiActionButtons();

    popup.addEventListener('mousedown', armAutoHide);
    armAutoHide();

    chrome.runtime.sendMessage({ action: 'translate', text }).then(function(res) {
      if (ctx.state.currentSelectionPopup === popup) {
        translatedText = res.translated || '--';
        const resultEl = popup.querySelector('.llm-popup-result');
        resultEl.textContent = translatedText;
        resultEl.classList.remove('llm-translate-loading');
        if (typeof LOG !== 'undefined') LOG.info('Selection', 'Selection translated', { textLength: text.length });
      }
    }).catch(function(err) {
      if (ctx.state.currentSelectionPopup === popup) {
        const resultEl = popup.querySelector('.llm-popup-result');
        resultEl.textContent = '';
        const errorSpan = document.createElement('span');
        errorSpan.className = 'llm-translate-error';
        errorSpan.textContent = 'Error: ' + err.message;
        resultEl.appendChild(errorSpan);
        resultEl.classList.remove('llm-translate-loading');
        if (ctx.fn.safeLog) ctx.fn.safeLog('error', 'Selection', 'Selection failed: ' + err.message);
      }
    });
  }

  function positionPopup(popup, x, y) {
    const width = Math.min(460, Math.max(320, innerWidth - POPUP_MARGIN * 2));
    popup.style.width = width + 'px';
    popup.style.left = Math.max(POPUP_MARGIN, Math.min(x, innerWidth - width - POPUP_MARGIN)) + 'px';
    popup.style.top = Math.max(POPUP_MARGIN, Math.min(y, innerHeight - 250)) + 'px';
  }

  function makePopupDraggable(popup) {
    const header = popup.querySelector('.llm-popup-header');
    if (!header) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function onMouseMove(ev) {
      if (!dragging || ctx.state.currentSelectionPopup !== popup) return;
      const maxLeft = Math.max(POPUP_MARGIN, innerWidth - popup.offsetWidth - POPUP_MARGIN);
      const maxTop = Math.max(POPUP_MARGIN, innerHeight - popup.offsetHeight - POPUP_MARGIN);
      popup.style.left = Math.max(POPUP_MARGIN, Math.min(startLeft + ev.clientX - startX, maxLeft)) + 'px';
      popup.style.top = Math.max(POPUP_MARGIN, Math.min(startTop + ev.clientY - startY, maxTop)) + 'px';
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging = false;
      popup.classList.remove('llm-popup-dragging');
    }

    function onMouseDown(ev) {
      if (ev.target.closest('button')) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startLeft = popup.offsetLeft;
      startTop = popup.offsetTop;
      popup.classList.add('llm-popup-dragging');
      ev.preventDefault();
    }

    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    popup._llmCleanupDraggable = function() {
      header.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  function hideSelectionPopup() {
    const popup = ctx.state.currentSelectionPopup;
    if (popup) {
      if (typeof popup._llmCleanupDraggable === 'function') popup._llmCleanupDraggable();
      popup.remove();
      ctx.state.currentSelectionPopup = null;
    }
  }

  Object.assign(ctx.fn, {
    onMouseUp,
    showSelectionPopup,
    hideSelectionPopup
  });
})();
