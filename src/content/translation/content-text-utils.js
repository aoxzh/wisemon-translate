(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getDirectText(el) {
    if (!(el instanceof Element)) return '';
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += ' ' + (child.nodeValue || '');
      }
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function getVisibleText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim();
  }

  function hasDirectTextNode(el) {
    if (!(el instanceof Element)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue)) return true;
    }
    return false;
  }

  function cleanTextForTranslation(text) {
    if (!text) return '';
    text = text.replace(/\{[^{}]*"[^"]+"\s*:\s*[^,{}]+\}/g, '');
    text = text.replace(/\{\{[0-9]+\}\}/g, '');
    text = text.replace(/[A-Za-z0-9+\/=]{40,}/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function cleanTranslatedText(text) {
    if (!text) return '';
    text = extractJsonTextArtifact(text) || text;
    text = text.replace(/<llm-tag n="\d+"\/>/g, '');
    text = text.replace(/\{\{[0-9]+\}\}/g, '');
    text = text.replace(/\{[^{}]*"[^"]+"\s*:\s*[0-9.]+\}/g, '');
    text = text.replace(/\["[A-Z0-9]+"\]/g, '');
    text = text.replace(/ue\.count\([^)]*\)/g, '');
    text = text.replace(/P\.when\([^)]*\)/g, '');
    text = text.replace(/\.execute\([^)]*\)/g, '');
    text = text.replace(/^\s*[\{\[][\s\S]*[\}\]]\s*$/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function extractJsonTextArtifact(text) {
    var raw = String(text || '').trim();
    if (!/^[[{]/.test(raw) || !/"?(?:id|text|translations)"?\s*:/.test(raw)) return '';
    var candidates = [raw, raw.replace(/,\s*$/, ''), '[' + raw.replace(/,\s*$/, '') + ']'];
    for (var i = 0; i < candidates.length; i++) {
      try {
        var parsed = JSON.parse(candidates[i]);
        var items = Array.isArray(parsed?.translations) ? parsed.translations : (Array.isArray(parsed) ? parsed : [parsed]);
        var parts = [];
        for (var j = 0; j < items.length; j++) {
          if (items[j] && typeof items[j].text === 'string') parts.push(items[j].text);
        }
        if (parts.length) return parts.join('\n');
      } catch (e) {}
    }
    return '';
  }

  function createInvalidTextChecker(constants) {
    return function isInvalidText(text) {
      if (!text || text.length < 2) return true;
      if (ctx.fn.adaptiveScanner?.isLowValueText(text)) return true;
      const normalized = String(text).replace(/\s+/g, '').trim();
      const hasLetterOrNumber = /[\p{L}\p{N}]/u.test(normalized);
      const hasTranslatableScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}A-Za-z]/u.test(normalized);
      if (!hasLetterOrNumber || !hasTranslatableScript) return true;
      if (/^[\d\s\p{P}\p{S}_]+$/u.test(text) && text.length < 30) return true;
      for (const re of constants.SKIP_PATTERNS) {
        if (re.test(text)) return true;
      }
      for (const re of constants.NON_CONTENT_PATTERNS) {
        if (re.test(text)) return true;
      }
      const letters = (text.match(/[a-zA-Z一-鿿぀-ゟ゠-ヿ가-힯]/g) || []).length;
      if (letters < text.length * 0.15 && text.length > 20) return true;
      if (/[A-Za-z0-9+\/=]{60,}/.test(text)) return true;
      return false;
    };
  }

  Object.assign(ctx.fn, {
    textUtils: {
      getDirectText,
      getVisibleText,
      hasDirectTextNode,
      cleanTextForTranslation,
      cleanTranslatedText,
      extractJsonTextArtifact,
      createInvalidTextChecker
    }
  });
})();
