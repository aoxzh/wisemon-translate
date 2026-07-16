/**
 * Language detection wrappers used by the content engine.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getPageLanguageHint() {
    return ctx.fn.language?.getPageLanguageHint?.() || '';
  }

  function heuristicDetectLang(text) {
    return ctx.fn.language?.heuristicDetectLang?.(text) || '';
  }

  function getLanguageProfile(text) {
    return ctx.fn.language?.getLanguageProfile?.(text) || { total: 1, kana: 0, hangul: 0, han: 0, latin: 0, cjk: 0, latinRatio: 0, cjkRatio: 0 };
  }

  function normalizeTargetLang(targetLang) {
    return ctx.fn.language?.normalizeTargetLang?.(targetLang) || '';
  }

  function hasMeaningfulMixedLanguage(text, targetLang) {
    return !!ctx.fn.language?.hasMeaningfulMixedLanguage?.(text, targetLang);
  }

  function shouldSkipTranslation(text, targetLang) {
    return !!ctx.fn.language?.shouldSkipTranslation?.(text, targetLang);
  }

  Object.assign(ctx.fn, {
    getPageLanguageHint,
    heuristicDetectLang,
    getLanguageProfile,
    normalizeTargetLang,
    hasMeaningfulMixedLanguage,
    shouldSkipTranslation
  });
})();
