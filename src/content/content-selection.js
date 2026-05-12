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
    showSelectionPopup(text, e.clientX, e.clientY);
  }

  function showSelectionPopup(text, x, y) {
    hideSelectionPopup();
    const escapeHtml = ctx.fn.escapeHtml;
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
      '<div class="llm-popup-actions">' +
        '<button type="button" data-action="copy-source">Copy Source</button>' +
        '<button type="button" data-action="copy-result">Copy Result</button>' +
        '<button type="button" data-action="open-side">Side Panel</button>' +
      '</div>';
    positionPopup(popup, (x || innerWidth / 2) + 10, (y || 80) + 10);
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
    });

    popup.addEventListener('mousedown', armAutoHide);
    armAutoHide();

    chrome.runtime.sendMessage({ action: 'translate', text }).then(function(res) {
      if (ctx.state.currentSelectionPopup === popup) {
        translatedText = res.translated || '--';
        popup.querySelector('.llm-popup-result').innerHTML = escapeHtml(translatedText);
        popup.querySelector('.llm-popup-result').classList.remove('llm-translate-loading');
        if (typeof LOG !== 'undefined') LOG.info('Selection', 'Selection translated', { textLength: text.length });
      }
    }).catch(function(err) {
      if (ctx.state.currentSelectionPopup === popup) {
        popup.querySelector('.llm-popup-result').innerHTML = '<span class="llm-translate-error">Error: ' + escapeHtml(err.message) + '</span>';
        popup.querySelector('.llm-popup-result').classList.remove('llm-translate-loading');
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

    header.addEventListener('mousedown', function(ev) {
      if (ev.target.closest('button')) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startLeft = popup.offsetLeft;
      startTop = popup.offsetTop;
      popup.classList.add('llm-popup-dragging');
      ev.preventDefault();
    });

    document.addEventListener('mousemove', function(ev) {
      if (!dragging || ctx.state.currentSelectionPopup !== popup) return;
      const maxLeft = Math.max(POPUP_MARGIN, innerWidth - popup.offsetWidth - POPUP_MARGIN);
      const maxTop = Math.max(POPUP_MARGIN, innerHeight - popup.offsetHeight - POPUP_MARGIN);
      popup.style.left = Math.max(POPUP_MARGIN, Math.min(startLeft + ev.clientX - startX, maxLeft)) + 'px';
      popup.style.top = Math.max(POPUP_MARGIN, Math.min(startTop + ev.clientY - startY, maxTop)) + 'px';
    });

    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      popup.classList.remove('llm-popup-dragging');
    });
  }

  function hideSelectionPopup() {
    if (ctx.state.currentSelectionPopup) {
      ctx.state.currentSelectionPopup.remove();
      ctx.state.currentSelectionPopup = null;
    }
  }

  Object.assign(ctx.fn, {
    onMouseUp,
    showSelectionPopup,
    hideSelectionPopup
  });
})();
