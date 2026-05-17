/**
 * Utility functions for storage and DOM helpers
 */

const STORAGE_KEYS = {
  SETTINGS: 'llm-translate-settings',
  CACHE: 'llm-translate-cache',
  STATE: 'llm-translate-state',
  PROVIDER_STATUS: 'llm-translate-provider-status'
};

// Simple storage wrapper with defaults
// Default: DeepSeek v4 API (user just needs to fill API key)
const DEFAULT_SETTINGS = {
  provider: 'deepseek',
  apiKey: '',
  apiKeys: { deepseek:'', zhipu:'', openai:'', anthropic:'', ollama:'', hunyuan:'', lmstudio:'', custom:'', google:'', gemini:'', openrouter:'', qwen:'', siliconflow:'', deepl:'', baidu:'', microsoft:'' },
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  targetLang: 'zh-CN',
  sourceLang: 'auto',
  displayMode: 'bilingual', // 'bilingual' | 'replace'
  enableHover: true,
  hoverKey: 'shift',          // 'shift' | 'ctrl' | 'alt' | 'none' (direct hover)
  hoverMode: 'key',           // 'key' = hold key, 'direct' = hover to translate, 'off' = disabled
  enableFab: true,
  fabPosition: null,          // { left, top } viewport position for the floating action button
  enableInputBox: true,
  enableSelection: true,
  enableSubtitle: true,
  subtitleMode: 'bilingual',     // 'bilingual' | 'translation'
  subtitleStyle: 'cinema',        // 'cinema' | 'outline' | 'paper'
  subtitleTrackPreference: 'manual', // 'manual' | 'auto' | 'any'
  subtitleSkipTargetLang: true,
  subtitleTranslateScope: 'nearby', // 'nearby' | 'full'
  subtitlePosition: 12,          // overlay bottom offset in percent
  subtitleFontSize: 14,
  autoTranslate: false,         // auto translate page on load
  translateMainOnly: false,     // translate main content area only
  translationPosition: 'after', // 'after' = translation after original, 'before' = before
  fontSize: 94,                 // translation font size as % of original (50-150)
  minTextLength: 2,             // minimum characters to translate
  extraExcludeSelector: '',     // additional CSS selector for elements to skip
  siteRules: '',                // optional JSON array of site rules
  systemPrompt: 'You are a professional translator. Translate the given text accurately while preserving the original meaning and tone. Only return the translated text without explanations.',
  userPromptTemplate: 'Translate the following text from {{sourceLang}} to {{targetLang}}:\n\n{{text}}',
  excludedSites: [],
  largeTextMode: true,
  maxCharsPerRequest: 12000,
  temperature: 0,
  maxConcurrency: 8,
  useStream: true,
  streamRenderMode: 'single',
  thinkingMode: 'disabled',
  translationTheme: 'none',
  translationStylePreset: 'balanced', // 'balanced' | 'natural' | 'faithful' | 'subtitle' | 'technical' | 'novel'
  customTranslationCss: '',
  glossary: '',                    // custom term replacements: "regex,replacement" per line
  terms: [],                       // structured term replacements: [{ pattern, replacement, regex }]
  siteTerms: [],                   // site-bound replacements: [{ domains, pattern, replacement, regex }]
  aiTerms: [],                     // AI context terms: [{ term, definition, context }]
  uiTheme: 'auto',                  // 'auto' | 'light' | 'dark' | 'ocean' | 'violet' | 'amber' | 'slate'
  privacyMasking: true,             // mask sensitive data before sending text to translation APIs
  maskEmail: true,
  maskPhone: true,
  maskCreditCard: true,
  maskSecrets: true,
  maskUrls: false,
  maskVerificationCodes: true,
  maskPrivateKeys: true,
  keyboardShortcuts: {             // customizable keyboard shortcuts
    translatePage: 'alt+t',
    toggleHover: 'alt+h',
    toggleStyle: 'alt+s'
  }
};

async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  } catch (e) {
    console.warn('[wisemon-translate] storage.sync failed, falling back to local:', e);
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  }
}

async function setSettings(settings) {
  const payload = { [STORAGE_KEYS.SETTINGS]: settings };
  try {
    await chrome.storage.sync.set(payload);
  } catch (e) {
    await chrome.storage.local.set(payload);
  }
}

async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
  return result[STORAGE_KEYS.STATE] || {};
}

async function setState(state) {
  await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}

async function getProviderStatus() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PROVIDER_STATUS);
  return result[STORAGE_KEYS.PROVIDER_STATUS] || {};
}

async function setProviderStatus(provider, status) {
  const all = await getProviderStatus();
  all[provider || 'unknown'] = { ...status, ts: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEYS.PROVIDER_STATUS]: all });
  return all;
}

function isExcludedSite(url, excludedSites) {
  if (!excludedSites || excludedSites.length === 0) return false;
  const hostname = new URL(url).hostname;
  return excludedSites.some(site => {
    const s = site.trim();
    return s && (hostname === s || hostname.endsWith('.' + s));
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// Text segmentation: split long text into chunks
function splitTextIntoChunks(text, maxChars) {
  const chunks = [];
  let current = '';
  const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  for (const sentence of sentences) {
    // Hard split for individual segments that exceed maxChars with no punctuation
    if (sentence.length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars).trim());
      }
      current = '';
      continue;
    }
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// Generate a unique id
function generateId() {
  return 'llm-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- Translation Cache ----
const CACHE_KEY = 'llm-translate-cache';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCachedTranslation(key) {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_MAX_AGE_MS) return null;
    return entry.text;
  } catch (e) { return null; }
}

async function setCachedTranslation(key, text) {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    cache[key] = { text, ts: Date.now() };
    // Limit cache size to ~500 entries to avoid storage quota issues
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      keys.sort((a, b) => cache[a].ts - cache[b].ts);
      for (let i = 0; i < keys.length - 500; i++) delete cache[keys[i]];
    }
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch (e) { /* ignore */ }
}

async function clearTranslationCache() {
  try {
    await chrome.storage.local.remove(CACHE_KEY);
  } catch (e) { /* ignore */ }
}

async function getTranslationCacheStats() {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    const entries = Object.values(cache);
    return {
      count: entries.length,
      oldestTs: entries.reduce((min, item) => item?.ts && item.ts < min ? item.ts : min, Date.now()),
      newestTs: entries.reduce((max, item) => item?.ts && item.ts > max ? item.ts : max, 0),
      approxBytes: JSON.stringify(cache).length
    };
  } catch (e) {
    return { count: 0, oldestTs: 0, newestTs: 0, approxBytes: 0, error: e.message };
  }
}

function getEffectiveApiKey(settings) {
  if (!settings) return '';
  const provider = settings.provider || DEFAULT_SETTINGS.provider;
  if (settings.apiKeys && Object.prototype.hasOwnProperty.call(settings.apiKeys, provider)) {
    return settings.apiKeys[provider] || '';
  }
  return settings.apiKey || '';
}

function providerNeedsApiKey(provider) {
  if (typeof providerNeedsApiKeyShared === 'function') return providerNeedsApiKeyShared(provider);
  return provider !== 'ollama' && provider !== 'hunyuan' && provider !== 'lmstudio' && provider !== 'custom' && provider !== 'google';
}

const PROVIDER_LANGUAGE_MAPS = {
  deepl: {
    autoSource: '',
    codes: {
      'zh-CN': 'ZH',
      'zh-TW': 'ZH',
      en: 'EN',
      ja: 'JA',
      ko: 'KO',
      fr: 'FR',
      de: 'DE',
      es: 'ES',
      ru: 'RU',
      pt: 'PT',
      ar: 'AR'
    }
  },
  baidu: {
    autoSource: 'auto',
    codes: {
      'zh-CN': 'zh',
      'zh-TW': 'cht',
      en: 'en',
      ja: 'jp',
      ko: 'kor',
      fr: 'fra',
      de: 'de',
      es: 'spa',
      ru: 'ru',
      pt: 'pt',
      ar: 'ara'
    }
  },
  microsoft: {
    autoSource: '',
    codes: {
      'zh-CN': 'zh-Hans',
      'zh-TW': 'zh-Hant',
      en: 'en',
      ja: 'ja',
      ko: 'ko',
      fr: 'fr',
      de: 'de',
      es: 'es',
      ru: 'ru',
      pt: 'pt',
      ar: 'ar'
    }
  }
};

function normalizeProviderLanguage(provider, lang, role = 'target') {
  const value = lang || (role === 'target' ? DEFAULT_SETTINGS.targetLang : DEFAULT_SETTINGS.sourceLang);
  const map = PROVIDER_LANGUAGE_MAPS[provider];
  if (!map) return value;
  if (value === 'auto') return role === 'source' ? map.autoSource : map.codes[DEFAULT_SETTINGS.targetLang];
  return map.codes[value] || value;
}

function normalizeSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  merged.apiKeys = { ...DEFAULT_SETTINGS.apiKeys, ...(merged.apiKeys || {}) };
  merged.keyboardShortcuts = { ...DEFAULT_SETTINGS.keyboardShortcuts, ...(merged.keyboardShortcuts || {}) };
  merged.apiKey = getEffectiveApiKey(merged);
  return merged;
}

function isLikelyCreditCard(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (doubleDigit) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function maskSensitiveData(text, settings) {
  const config = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (!config.privacyMasking || !text) return { text, map: [] };

  const map = [];
  let masked = String(text);
  const addMask = (value, type) => {
    const token = `__LLMT_MASK_${map.length + 1}_${type}__`;
    map.push({ token, value });
    return token;
  };

  if (config.maskEmail) {
    masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, v => addMask(v, 'EMAIL'));
  }

  if (config.maskSecrets) {
    masked = masked.replace(/\b(?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*["']?([A-Za-z0-9._~+/=-]{8,})["']?/gi, v => addMask(v, 'SECRET'));
    masked = masked.replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b/g, v => addMask(v, 'KEY'));
  }

  if (config.maskPrivateKeys) {
    masked = masked.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, v => addMask(v, 'PRIVATE_KEY'));
  }

  if (config.maskUrls) {
    masked = masked.replace(/\bhttps?:\/\/[^\s<>"']+/gi, v => addMask(v, 'URL'));
  }

  if (config.maskVerificationCodes) {
    masked = masked.replace(/\b(?:code|otp|verification code|验证码|認証コード|确认码|確認コード)\s*[:：]?\s*([A-Z0-9-]{4,10})\b/gi, v => addMask(v, 'CODE'));
  }

  if (config.maskCreditCard) {
    masked = masked.replace(/\b(?:\d[ -]*?){13,19}\b/g, v => isLikelyCreditCard(v) ? addMask(v, 'CARD') : v);
  }

  if (config.maskPhone) {
    masked = masked.replace(/(?<![\w@])(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}(?![\w@])/g, v => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15 ? addMask(v, 'PHONE') : v;
    });
  }

  return { text: masked, map };
}

function restoreSensitiveData(text, map) {
  if (!text || !Array.isArray(map) || map.length === 0) return text;
  let restored = String(text);
  for (const item of map) {
    restored = restored.split(item.token).join(item.value);
  }
  return restored;
}

function makeCacheKey(text, sourceLang, targetLang, model) {
  // FNV-1a 64-bit keeps cache keys compact while sharply reducing collisions.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const str = (text || '') + '|' + (sourceLang || '') + '|' + (targetLang || '') + '|' + (model || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return 'c_' + hash.toString(36);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    getSettings,
    setSettings,
    getState,
    setState,
    getProviderStatus,
    setProviderStatus,
    isExcludedSite,
    debounce,
    throttle,
    splitTextIntoChunks,
    generateId,
    getCachedTranslation,
    setCachedTranslation,
    clearTranslationCache,
    getTranslationCacheStats,
    getEffectiveApiKey,
    providerNeedsApiKey,
    PROVIDER_LANGUAGE_MAPS,
    normalizeProviderLanguage,
    normalizeSettings,
    isLikelyCreditCard,
    maskSensitiveData,
    restoreSensitiveData,
    makeCacheKey
  };
}
