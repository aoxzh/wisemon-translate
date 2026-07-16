const test = require('node:test');
const assert = require('node:assert/strict');

function createStorageArea(initial = {}) {
  const data = { ...initial };
  return {
    data,
    async get(key) {
      if (typeof key === 'string') return { [key]: data[key] };
      return { ...data };
    },
    async set(payload) {
      Object.assign(data, payload);
    },
    async remove(key) {
      for (const item of Array.isArray(key) ? key : [key]) delete data[item];
    }
  };
}

function loadUtilsWithStorage({ sync = {}, local = {} } = {}) {
  const modulePath = require.resolve('../src/lib/utils.js');
  delete require.cache[modulePath];
  const storageListeners = new Set();
  global.chrome = {
    storage: {
      sync: createStorageArea(sync),
      local: createStorageArea(local),
      onChanged: {
        addListener(listener) { storageListeners.add(listener); },
        removeListener(listener) { storageListeners.delete(listener); },
        emit(changes, areaName = 'local') {
          for (const listener of storageListeners) listener(changes, areaName);
        }
      }
    }
  };
  return require(modulePath);
}

test('settings migrate from sync to local storage and remove the synced copy', async () => {
  const key = 'llm-translate-settings';
  const utils = loadUtilsWithStorage({
    sync: { [key]: { provider: 'openai', apiKey: 'private-key', targetLang: 'ja' } }
  });

  const settings = await utils.getSettings();

  assert.equal(settings.provider, 'openai');
  assert.equal(settings.apiKey, 'private-key');
  assert.equal(global.chrome.storage.local.data[key].apiKey, 'private-key');
  assert.equal(global.chrome.storage.sync.data[key], undefined);
});

test('saving settings writes locally and purges any legacy synced settings', async () => {
  const key = 'llm-translate-settings';
  const utils = loadUtilsWithStorage({ sync: { [key]: { targetLang: 'de' } } });

  await utils.setSettings({ targetLang: 'fr', apiKey: 'local-secret' });

  assert.deepEqual(global.chrome.storage.local.data[key], { targetLang: 'fr', apiKey: 'local-secret' });
  assert.equal(global.chrome.storage.sync.data[key], undefined);
});

test('translation cache keys isolate provider, prompt, style, glossary and page context', () => {
  const utils = loadUtilsWithStorage();
  const base = { provider: 'openai', baseURL: 'https://api.openai.com/v1', translationStylePreset: 'balanced' };
  const key = utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', base);

  assert.notEqual(key, utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', { ...base, provider: 'custom' }));
  assert.notEqual(key, utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', { ...base, systemPrompt: 'Different prompt' }));
  assert.notEqual(key, utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', { ...base, translationStylePreset: 'technical' }));
  assert.notEqual(key, utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', { ...base, glossary: 'hello,您好' }));
  assert.notEqual(key, utils.makeCacheKey('hello', 'auto', 'zh-CN', 'shared-model', { ...base, context: 'Different article' }));
});

test('page context is privacy-masked before it is added to an LLM prompt', () => {
  const utils = loadUtilsWithStorage();
  global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
  global.maskSensitiveData = utils.maskSensitiveData;
  global.normalizeSettings = value => value;
  const apiPath = require.resolve('../src/lib/llm-api.js');
  delete require.cache[apiPath];
  const { LLMAPI } = require(apiPath);
  const api = new LLMAPI({ ...utils.DEFAULT_SETTINGS, provider: 'openai' });

  const section = api._buildContextSection('Contact alice@example.com and use token=abcdefghijklmnop');

  assert.doesNotMatch(section, /alice@example\.com/);
  assert.doesNotMatch(section, /abcdefghijklmnop/);
  assert.match(section, /__LLMT_CTX_MASK_/);
});

test('persistent logs redact source previews, credentials and sensitive URL details', async () => {
  const utils = loadUtilsWithStorage();
  global.maskSensitiveData = utils.maskSensitiveData;
  const loggerPath = require.resolve('../src/lib/logger.js');
  delete require.cache[loggerPath];
  const { LOG } = require(loggerPath);

  LOG.info('Privacy', 'request', {
    textPreview: 'Contact alice@example.com',
    apiKey: 'sk-private-secret-value',
    pageUrl: 'https://example.com/private/order/123?token=secret'
  });
  await LOG.flush();

  const entries = global.chrome.storage.local.data['llm-translate-logs'];
  assert.equal(entries.length, 1);
  assert.doesNotMatch(entries[0].data, /alice@example\.com|sk-private-secret-value|\/private\/order|token=secret/);
  assert.match(entries[0].data, /REDACTED/);
  assert.match(entries[0].data, /https:\/\/example\.com/);
});

test('Anthropic provider uses the native Messages API contract', async () => {
  const utils = loadUtilsWithStorage();
  global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
  global.getEffectiveApiKey = utils.getEffectiveApiKey;
  global.makeCacheKey = utils.makeCacheKey;
  global.getCachedTranslation = async () => null;
  global.setCachedTranslation = async () => {};
  global.maskSensitiveData = utils.maskSensitiveData;
  global.restoreSensitiveData = utils.restoreSensitiveData;
  global.normalizeSettings = value => value;
  global.LOG = { debug() {}, info() {}, warn() {}, error() {} };
  const providersPath = require.resolve('../src/lib/providers.js');
  delete require.cache[providersPath];
  global.getProviderCapabilities = require(providersPath).getProviderCapabilities;
  const apiPath = require.resolve('../src/lib/llm-api.js');
  delete require.cache[apiPath];
  const { LLMAPI } = require(apiPath);
  global.LLMAPI = LLMAPI;
  const batchPath = require.resolve('../src/lib/llm-adapters/batch.js');
  delete require.cache[batchPath];
  require(batchPath);
  const adapterPath = require.resolve('../src/lib/providers/anthropic.js');
  delete require.cache[adapterPath];
  require(adapterPath);

  let captured;
  global.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      async json() {
        return { content: [{ type: 'text', text: '你好' }], model: 'claude-test', usage: { input_tokens: 8, output_tokens: 2 } };
      }
    };
  };

  const api = new LLMAPI({
    ...utils.DEFAULT_SETTINGS,
    provider: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-test',
    apiKeys: { ...utils.DEFAULT_SETTINGS.apiKeys, anthropic: 'anthropic-secret' },
    useStream: false
  });
  const result = await api.translate('Hello', 'en', 'zh-CN');

  assert.equal(result, '你好');
  assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(captured.options.headers['x-api-key'], 'anthropic-secret');
  assert.equal(captured.options.headers['anthropic-version'], '2023-06-01');
  assert.equal(captured.options.headers.Authorization, undefined);
  assert.equal(captured.body.messages[0].role, 'user');
  assert.match(captured.body.system, /professional translator/);
});

test('site rule subscriptions apply immediately after add and disappear immediately after removal', async () => {
  loadUtilsWithStorage();
  global.fetch = async () => ({
    ok: true,
    headers: { get() { return null; } },
    async text() { return JSON.stringify([{
      id: 'remote-example', matches: ['example.test'], includeSelectors: ['article'],
      injectedCss: ['body{background:url(https://tracker.test/pixel)}', '.safe-rule{color:red}']
    }]); }
  });
  const rulesPath = require.resolve('../src/lib/site-rules.js');
  delete require.cache[rulesPath];
  const rules = require(rulesPath);

  await rules.addSiteRuleSubscription('https://rules.example/subscription.json');
  const added = await rules.getSiteRule('https://example.test/article', {});
  assert.ok(added.matchedIds.includes('remote-example'));
  assert.deepEqual(added.injectedCss, ['.safe-rule{color:red}']);

  await rules.removeSiteRuleSubscription('https://rules.example/subscription.json');
  const removed = await rules.getSiteRule('https://example.test/article', {});
  assert.ok(!removed.matchedIds.includes('remote-example'));
});

test('site rule subscription cache invalidates across extension contexts', async () => {
  loadUtilsWithStorage();
  const rulesPath = require.resolve('../src/lib/site-rules.js');
  delete require.cache[rulesPath];
  const rules = require(rulesPath);
  await rules.getSiteRule('https://cross-context.test/article', {});

  const key = 'llm-site-rule-subscriptions-v1';
  const subscriptions = [{ url: 'https://rules.test/list.json', rules: [{
    id: 'cross-context-rule', matches: ['cross-context.test'], includeSelectors: ['article']
  }] }];
  global.chrome.storage.local.data[key] = subscriptions;
  global.chrome.storage.onChanged.emit({ [key]: { oldValue: [], newValue: subscriptions } });

  const updated = await rules.getSiteRule('https://cross-context.test/article', {});
  assert.ok(updated.matchedIds.includes('cross-context-rule'));
});

test('an external abort signal cancels an in-flight OpenAI-compatible request immediately', async () => {
  const utils = loadUtilsWithStorage();
  global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
  global.getEffectiveApiKey = utils.getEffectiveApiKey;
  global.makeCacheKey = utils.makeCacheKey;
  global.getCachedTranslation = async () => null;
  global.maskSensitiveData = utils.maskSensitiveData;
  global.normalizeSettings = value => value;
  global.LOG = { debug() {}, info() {}, warn() {}, error() {} };
  const apiPath = require.resolve('../src/lib/llm-api.js');
  delete require.cache[apiPath];
  const { LLMAPI } = require(apiPath);
  const batchPath = require.resolve('../src/lib/llm-adapters/batch.js');
  global.LLMAPI = LLMAPI;
  delete require.cache[batchPath];
  require(batchPath);

  let requestSignal;
  global.fetch = async (_url, options) => {
    requestSignal = options.signal;
    return await new Promise((resolve, reject) => {
      if (options.signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  };
  const external = new AbortController();
  const api = new LLMAPI({ ...utils.DEFAULT_SETTINGS, provider: 'custom', baseURL: 'https://example.test/v1', model: 'test', useStream: false });
  const pending = api.translate('Hello', 'en', 'zh-CN', { signal: external.signal, timeout: 2000, retries: 0 });
  external.abort();

  const outcome = await Promise.race([
    pending.then(() => 'resolved', err => err.name),
    new Promise(resolve => setTimeout(() => resolve('still-pending'), 100))
  ]);
  assert.equal(outcome, 'AbortError');
  assert.equal(requestSignal.aborted, true);
});

test('an external abort signal interrupts retry backoff immediately', async () => {
  const utils = loadUtilsWithStorage();
  global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
  global.getEffectiveApiKey = utils.getEffectiveApiKey;
  global.makeCacheKey = utils.makeCacheKey;
  global.getCachedTranslation = async () => null;
  global.maskSensitiveData = utils.maskSensitiveData;
  global.normalizeSettings = value => value;
  global.LOG = { debug() {}, info() {}, warn() {}, error() {} };
  const apiPath = require.resolve('../src/lib/llm-api.js');
  delete require.cache[apiPath];
  const { LLMAPI } = require(apiPath);
  global.LLMAPI = LLMAPI;
  const batchPath = require.resolve('../src/lib/llm-adapters/batch.js');
  delete require.cache[batchPath];
  require(batchPath);
  global.fetch = async () => ({ ok: false, status: 429, async text() { return '{"error":{"message":"slow down"}}'; } });

  const external = new AbortController();
  const api = new LLMAPI({ ...utils.DEFAULT_SETTINGS, provider: 'custom', baseURL: 'https://example.test/v1', model: 'test', useStream: false });
  const pending = api.translate('Hello', 'en', 'zh-CN', { signal: external.signal, retries: 2 });
  setTimeout(() => external.abort(), 10);
  const outcome = await Promise.race([
    pending.then(() => 'resolved', err => err.name),
    new Promise(resolve => setTimeout(() => resolve('still-pending'), 100))
  ]);
  assert.equal(outcome, 'AbortError');
});

test('internal request timeout follows the timeout error path', async () => {
  const utils = loadUtilsWithStorage();
  global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
  global.getEffectiveApiKey = utils.getEffectiveApiKey;
  global.makeCacheKey = utils.makeCacheKey;
  global.getCachedTranslation = async () => null;
  global.maskSensitiveData = utils.maskSensitiveData;
  global.normalizeSettings = value => value;
  global.LOG = { debug() {}, info() {}, warn() {}, error() {} };
  const apiPath = require.resolve('../src/lib/llm-api.js');
  delete require.cache[apiPath];
  const { LLMAPI } = require(apiPath);
  global.LLMAPI = LLMAPI;
  const batchPath = require.resolve('../src/lib/llm-adapters/batch.js');
  delete require.cache[batchPath];
  require(batchPath);
  global.fetch = async (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  });

  const api = new LLMAPI({ ...utils.DEFAULT_SETTINGS, provider: 'custom', baseURL: 'https://example.test/v1', model: 'test', useStream: false });
  await assert.rejects(
    api.translate('Hello', 'en', 'zh-CN', { timeout: 5, retries: 0 }),
    /Request timeout \(5ms\)/
  );
});

test('vocabulary can be cleared as a complete collection', async () => {
  const utils = loadUtilsWithStorage();
  await utils.addVocabulary({ term: 'hello', translation: '你好' });
  await utils.addVocabulary({ term: 'world', translation: '世界' });
  assert.equal((await utils.getVocabulary()).length, 2);
  await utils.clearVocabulary();
  assert.deepEqual(await utils.getVocabulary(), []);
});

test('TTS applies the configured voice, rate and pitch', async () => {
  const spoken = [];
  global.window = { __LLM_CTX__: { state: { settings: { ttsVoice: 'voice-ja', ttsRate: 1.4, ttsPitch: 0.8 } }, fn: {}, features: {} } };
  global.speechSynthesis = {
    getVoices() { return [{ name: 'Japanese Voice', voiceURI: 'voice-ja', lang: 'ja-JP' }]; },
    speak(utterance) { spoken.push(utterance); },
    cancel() {}
  };
  global.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  const ttsPath = require.resolve('../src/lib/tts.js');
  delete require.cache[ttsPath];
  require(ttsPath);

  await global.window.__LLM_TTS__.speak('こんにちは', 'ja');

  assert.equal(spoken[0].voice.voiceURI, 'voice-ja');
  assert.equal(spoken[0].rate, 1.4);
  assert.equal(spoken[0].pitch, 0.8);
  delete global.window;
});

test('settings export excludes all provider credentials', () => {
  const utils = loadUtilsWithStorage();
  const exported = utils.sanitizeSettingsForExport({
    provider: 'baidu', apiKey: 'legacy-secret', apiKeys: { openai: 'openai-secret' }, baiduAppId: 'private-app-id', targetLang: 'ja'
  });
  assert.equal(exported.apiKey, '');
  assert.deepEqual(exported.apiKeys, {});
  assert.equal(exported.baiduAppId, '');
  assert.equal(exported.targetLang, 'ja');
});

test('provider capabilities are defined from one shared metadata source', () => {
  const providersPath = require.resolve('../src/lib/providers.js');
  delete require.cache[providersPath];
  const { getProviderCapabilities } = require(providersPath);

  assert.deepEqual(getProviderCapabilities('anthropic'), {
    nativeMethod: 'translateWithAnthropic',
    supportsMultiText: false,
    supportsJsonResponse: false,
    openAiCompatible: false
  });
  assert.equal(getProviderCapabilities('google').supportsMultiText, true);
  assert.equal(getProviderCapabilities('custom').openAiCompatible, true);
});
