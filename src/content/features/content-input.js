(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getDeepActiveElement() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  function getEditableText(el) {
    if (!el) return '';
    if (el.value !== undefined) return el.value || '';
    return el.innerText || el.textContent || '';
  }

  function getEditableRawText(el) {
    if (!el) return '';
    if (el.value !== undefined) return el.value || '';
    return el.textContent || el.innerText || '';
  }

  function setNativeValue(el, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    const prototype = Object.getPrototypeOf(el);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(el, value);
    } else if (valueSetter) {
      valueSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  async function replaceEditableText(el, value) {
    el.focus();
    await new Promise(function(r) { setTimeout(r, 20); });
    if (el.value !== undefined) { setNativeValue(el, value); return true; }
    const isRichEditor = el.isContentEditable || el.getAttribute('contenteditable') === 'true';
    if (isRichEditor) {
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', value);
        const pasteEvt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true, composed: true });
        el.dispatchEvent(pasteEvt);
        await new Promise(function(r) { setTimeout(r, 80); });
        if (getEditableText(el).includes(value.trim())) return true;
      } catch (e) {}
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.addRange(range);
        if (document.execCommand('insertText', false, value)) return true;
      } catch (e) {}
    }
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }));
    return true;
  }

  async function translateInputElement(el, text) {
    const sourceText = (text || getEditableText(el)).trim();
    if (!sourceText) return;
    try {
      if (typeof LOG !== 'undefined') LOG.info('Input', 'Translating editable text', { tagName: el.tagName, contentEditable: !!el.isContentEditable, textLength: sourceText.length });
      const res = await chrome.runtime.sendMessage({ action: 'translate', text: sourceText });
      if (res.error) throw new Error(res.error);
      await replaceEditableText(el, res.translated);
      ctx.fn.showToast('Input translated', 1600);
    } catch (err) {
      ctx.fn.safeLog?.('error', 'Input', 'Input translate failed: ' + err.message, { tagName: el?.tagName, textLength: sourceText.length });
      ctx.fn.showToast('Input translation failed. Check Logs.', 2500);
    }
  }

  function getExplicitInputTrigger(value) {
    const raw = String(value || '');
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\/tr(?:\s+|$)/i.test(trimmed)) {
      return trimmed.replace(/^\/tr\s*/i, '').trim();
    }
    if (/(?:^|\s)\/tr$/i.test(trimmed)) {
      return trimmed.replace(/(?:^|\s)\/tr$/i, '').trim();
    }
    return null;
  }

  async function onEditableKeyDown(e) {
    const settings = ctx.state.settings || {};
    if (!settings.enableInputBox || e.key !== ' ') return;
    const el = e.target;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) return;

    let state = ctx.state.inputState.get(el);
    if (!state) {
      state = { lastValue: getEditableRawText(el), translating: false, trailingSpaceCount: 0 };
      ctx.state.inputState.set(el, state);
    }

    state.trailingSpaceCount = (state.trailingSpaceCount || 0) + 1;
    if (state.translating || state.trailingSpaceCount < 3) return;

    const text = getEditableRawText(el).replace(/\s+$/, '').trim();
    if (!text) return;

    state.translating = true;
    state.trailingSpaceCount = 0;
    try {
      await translateInputElement(el, text);
    } finally {
      state.translating = false;
      state.lastValue = getEditableRawText(el);
    }
  }

  async function onInput(e) {
    const settings = ctx.state.settings || {};
    if (!settings.enableInputBox) return;
    const el = e.target;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) return;
    let state = ctx.state.inputState.get(el);
    if (!state) {
      state = { lastValue: getEditableRawText(el), translating: false };
      ctx.state.inputState.set(el, state);
    }
    const val = getEditableRawText(el);
    const explicitText = getExplicitInputTrigger(val);
    const tripleSpaceText = val.endsWith('   ') && !state.lastValue.endsWith('   ') ? val.trimEnd() : null;
    const triggerText = explicitText || tripleSpaceText;
    if (triggerText && !state.translating) {
      const text = triggerText.trim();
      if (text) {
        state.translating = true;
        try { await translateInputElement(el, text); }
        finally { state.translating = false; }
      }
    }
    if (!/\s$/.test(val)) state.trailingSpaceCount = 0;
    state.lastValue = getEditableRawText(el);
  }

  Object.assign(ctx.fn, {
    getDeepActiveElement,
    getEditableText,
    getEditableRawText,
    getExplicitInputTrigger,
    onEditableKeyDown,
    onInput,
    translateInputElement
  });
})();
