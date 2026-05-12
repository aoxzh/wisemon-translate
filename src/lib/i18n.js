/**
 * Internationalization runtime.
 * Message data is loaded from src/lib/i18n-locales/*.js in script order.
 */
(function() {
  const SUPPORTED_LANGS = ['zh-CN', 'en', 'ja', 'ko', 'de', 'fr', 'es'];
  const STORAGE_KEY = 'llm-translate-ui-lang';

  function detectLang() {
    const navLang = (typeof navigator !== 'undefined'
      ? (navigator.language || navigator.userLanguage || 'en')
      : 'en').toLowerCase();
    if (navLang.startsWith('zh')) return 'zh-CN';
    if (navLang.startsWith('ja')) return 'ja';
    if (SUPPORTED_LANGS.includes(navLang)) return navLang;
    const short = navLang.split('-')[0];
    return SUPPORTED_LANGS.includes(short) ? short : 'en';
  }

  function mergeMessageParts() {
    const parts = globalThis.I18N_MESSAGE_PARTS || [];
    return Object.assign({}, ...parts);
  }

  function localizeField(el, attr, key) {
    const value = I18N.t(key);
    if (attr === 'text') el.textContent = value;
    else if (attr === 'placeholder') el.placeholder = value;
    else if (attr === 'title') el.title = value;
  }

  const I18N = {
    _lang: detectLang(),
    _messages: {},

    get lang() {
      return this._lang;
    },

    get commonLangs() {
      return globalThis.I18N_COMMON_LANGS || [];
    },

    refreshMessages() {
      this._messages = mergeMessageParts();
      return this._messages;
    },

    setLang(lang) {
      if (SUPPORTED_LANGS.includes(lang)) this._lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, this._lang);
      } catch (e) {}
    },

    t(key) {
      const entry = this._messages[key];
      if (!entry) return key;
      return entry[this._lang] || entry.en || key;
    },

    localizeContainer(container) {
      const root = container || document;
      root.querySelectorAll('[data-i18n]').forEach(el => {
        localizeField(el, 'text', el.getAttribute('data-i18n'));
      });
      root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        localizeField(el, 'placeholder', el.getAttribute('data-i18n-placeholder'));
      });
      root.querySelectorAll('[data-i18n-title]').forEach(el => {
        localizeField(el, 'title', el.getAttribute('data-i18n-title'));
      });
    },

    init() {
      this.refreshMessages();
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (SUPPORTED_LANGS.includes(saved)) this._lang = saved;
      } catch (e) {}
    }
  };

  if (typeof globalThis !== 'undefined') globalThis.I18N = I18N;
  if (typeof module !== 'undefined' && module.exports) module.exports = { I18N, SUPPORTED_LANGS };
})();
