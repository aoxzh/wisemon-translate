/**
 * Lightweight language heuristics for content translation.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function getPageLanguageHint(doc = document, loc = location) {
    const lang = (doc.documentElement.lang || doc.querySelector('meta[http-equiv="content-language"]')?.content || '').toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('es')) return 'es';
    if (loc.hostname.endsWith('.jp')) return 'ja';
    if (loc.hostname.endsWith('.cn') || loc.hostname.endsWith('.tw')) return 'zh';
    if (loc.hostname.endsWith('.kr')) return 'ko';

    const bodyText = (doc.body?.innerText || '').slice(0, 8000);
    if (!bodyText) return '';
    const kana = (bodyText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    if (kana > 25) return 'ja';
    const hangul = (bodyText.match(/[\uac00-\ud7af]/g) || []).length;
    if (hangul > 50) return 'ko';
    const cjk = (bodyText.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinChars = (bodyText.match(/[a-zA-Z]/g) || []).length;
    if (cjk > latinChars && cjk > 80) return 'zh';
    if (latinChars > cjk && latinChars > 100) return 'en';
    return '';
  }

  function heuristicDetectLang(text, pageLang) {
    if (!text || text.length < 3) return '';
    const hint = pageLang || getPageLanguageHint();
    const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    const hasHangul = /[\uac00-\ud7af]/.test(text);
    const hasCJK = /[\u4e00-\u9fff]/.test(text);
    const hasLatin = /[a-zA-Z]{3,}/.test(text);

    if (hasKana) return 'ja';
    if (hasHangul) return 'ko';

    const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    if (hasCJK && cjkCount > totalChars * 0.4) return 'zh';
    if (hasLatin && latinCount > totalChars * 0.6) return 'en';
    if (hasCJK && cjkCount > totalChars * 0.2) return hint === 'zh' ? 'zh' : 'zh';
    if (hasLatin && latinCount > totalChars * 0.2) {
      if (['en', 'fr', 'de', 'es'].includes(hint)) return hint;
      return 'en';
    }
    if (text.length < 30 && hint) return hint;
    return '';
  }

  function getLanguageProfile(text) {
    const value = String(text || '');
    const compact = value.replace(/\s/g, '');
    const total = compact.length || 1;
    const kana = (value.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const hangul = (value.match(/[\uac00-\ud7af]/g) || []).length;
    const han = (value.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (value.match(/[a-zA-Z]/g) || []).length;
    return {
      total,
      kana,
      hangul,
      han,
      latin,
      cjk: kana + hangul + han,
      latinRatio: latin / total,
      cjkRatio: (kana + hangul + han) / total
    };
  }

  function normalizeTargetLang(targetLang) {
    const lang = String(targetLang || '').toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('es')) return 'es';
    return lang.split('-')[0] || '';
  }

  function hasMeaningfulMixedLanguage(text, targetLang) {
    const target = normalizeTargetLang(targetLang);
    const p = getLanguageProfile(text);
    const minForeign = Math.max(4, Math.floor(p.total * 0.12));

    if (target === 'ja') return p.latin >= minForeign || p.hangul >= minForeign;
    if (target === 'zh') return p.latin >= minForeign || p.kana >= 2 || p.hangul >= minForeign;
    if (target === 'ko') return p.latin >= minForeign || p.kana >= 2 || p.han >= minForeign;
    if (target === 'en') return p.cjk >= minForeign;
    return p.cjk >= minForeign && p.latin >= minForeign;
  }

  function shouldSkipTranslation(text, targetLang) {
    const detected = heuristicDetectLang(text);
    if (!detected || !targetLang) return false;
    const target = normalizeTargetLang(targetLang);
    if (hasMeaningfulMixedLanguage(text, targetLang)) return false;

    const isCJKTarget = target === 'zh' || target === 'ja' || target === 'ko';
    const isLatinTarget = target === 'en' || target === 'fr' || target === 'de' || target === 'es' || target === 'pt' || target === 'ru' || target === 'ar';
    const isCJKSource = detected === 'zh' || detected === 'ja' || detected === 'ko';
    const isLatinSource = detected === 'en' || detected === 'fr' || detected === 'de' || detected === 'es';

    if (target === 'zh' && detected === 'zh') return true;
    if (target === 'ja' && detected === 'ja') return true;
    if (target === 'ko' && detected === 'ko') return true;
    if (target === detected) return true;
    if ((isCJKTarget && isLatinSource) || (isLatinTarget && isCJKSource)) return false;

    const pageLang = getPageLanguageHint();
    if (text.length < 40 && pageLang && pageLang === target) return true;
    return false;
  }

  ctx.fn.language = {
    getPageLanguageHint,
    heuristicDetectLang,
    getLanguageProfile,
    normalizeTargetLang,
    hasMeaningfulMixedLanguage,
    shouldSkipTranslation
  };
})();
