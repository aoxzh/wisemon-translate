/**
 * Background Service Worker
 * Handles API requests, context menus, keyboard shortcuts, and logging
 */

// ---- Load shared libraries ----
// For Chrome MV3, use importScripts (classic worker, not module)
// For Firefox, these are loaded via manifest background.scripts
(function loadLibs() {
  const LIBS = [
    'src/lib/i18n.js',
    'src/lib/i18n-locales/common.js',
    'src/lib/i18n-locales/options.js',
    'src/lib/i18n-locales/themes.js',
    'src/lib/utils.js',
    'src/lib/providers.js',
    'src/lib/logger.js',
    'src/lib/batch-queue.js',
    'src/lib/site-rules.js',
    'src/lib/llm-api.js',
    'src/lib/provider-loader.js',
    'src/lib/providers/google.js',
    'src/lib/providers/deepl.js',
    'src/lib/providers/baidu.js',
    'src/lib/providers/microsoft.js'
  ];
  if (typeof importScripts === 'function') {
    try {
      importScripts.apply(null, LIBS);
      console.log('[Wisemon] Libraries loaded via importScripts');
    } catch (e) {
      console.error('[Wisemon] importScripts FAILED:', e.message);
      // Try individual loads for debugging
      LIBS.forEach(f => {
        try { importScripts(f); } catch (e2) { console.error('  Failed:', f, e2.message); }
      });
    }
  } else {
    console.log('[Wisemon] importScripts not available — libraries must be preloaded');
  }
})();

// ---- Safety guards ----
function _safeLog(level, tag, msg, data) {
  try {
    if (typeof LOG !== 'undefined') {
      LOG[level](tag, msg, data);
    } else {
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn(`[${tag}] ${msg}`, data || '');
    }
  } catch (e) { /* never crash on logging */ }
}

let _flushLogsTimer = null;
let _flushLogsPending = false;
async function _flushLogs() {
  if (_flushLogsPending) return;
  _flushLogsPending = true;
  try {
    if (typeof LOG !== 'undefined' && typeof LOG.flush === 'function') {
      await LOG.flush();
    }
  } catch (e) { /* never crash */ }
  // Reset after a debounce window so rapid errors batch together
  if (_flushLogsTimer) clearTimeout(_flushLogsTimer);
  _flushLogsTimer = setTimeout(() => { _flushLogsTimer = null; _flushLogsPending = false; }, 500);
}

function _safeApi(settings) {
  if (typeof LLMAPI === 'undefined') {
    throw new Error('LLMAPI not loaded. Extension may need reloading. Check chrome://extensions/');
  }
  return new LLMAPI(settings);
}

let currentSettings = null;
const CONTENT_MAIN_FILES = [
  'src/lib/i18n.js',
  'src/lib/i18n-locales/common.js',
  'src/lib/i18n-locales/options.js',
  'src/lib/i18n-locales/themes.js',
  'src/lib/utils.js',
  'src/lib/providers.js',
  'src/lib/logger.js',
  'src/lib/batch-queue.js',
  'src/lib/site-rules.js',
  'src/lib/llm-api.js',
  'src/lib/provider-loader.js',
  ...(typeof LLM_PROVIDER_FILES !== 'undefined' ? LLM_PROVIDER_FILES : [
    'src/lib/providers/google.js',
    'src/lib/providers/deepl.js',
    'src/lib/providers/baidu.js',
    'src/lib/providers/microsoft.js'
  ]),
  'src/content/content-core.js',
  'src/content/content-observers.js',
  'src/content/content-input.js',
  'src/content/content-subtitle.js',
  'src/content/content-ocr.js',
  'src/content/content-glossary.js',
  'src/content/content-shortcuts.js',
  'src/content/content-ui.js',
  'src/content/content-selection.js',
  'src/content/content-fab.js',
  'src/content/content-main.js'
];

const CONTENT_CSS_FILES = [
  'src/content/inline-styles.css'
];

// ---- Init ----
async function init() {
  _safeLog('info', 'Background', 'Service worker starting');
  _safeLog('info', 'Background', `LOGGER available: ${typeof LOG !== 'undefined'}, LLMAPI: ${typeof LLMAPI !== 'undefined'}`);

  currentSettings = typeof normalizeSettings === 'function' ? normalizeSettings(await getSettings()) : await getSettings();

  _safeLog('info', 'Background', 'Settings loaded', {
    provider: currentSettings.provider,
    model: currentSettings.model,
    baseURL: currentSettings.baseURL,
    hasApiKey: !!(typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(currentSettings) : currentSettings.apiKey),
    targetLang: currentSettings.targetLang
  });

  if (typeof I18N !== 'undefined') I18N.init();
  setupContextMenus();

  _safeLog('info', 'Background', 'Init complete');
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'translate-page',
      title: typeof I18N !== 'undefined' ? I18N.t('ctx_translate_page') : 'Translate this page',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'translate-selection',
      title: typeof I18N !== 'undefined' ? I18N.t('ctx_translate_selection') : 'Translate selection',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'translate-input',
      title: typeof I18N !== 'undefined' ? I18N.t('ctx_translate_input') : 'Translate input',
      contexts: ['editable']
    });
    chrome.contextMenus.create({
      id: 'ocr-image',
      title: '🔍 OCR & Translate Image',
      contexts: ['image']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const send = async (msg) => {
    await ensureContentMain(tab.id);
    return chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  };
  if (info.menuItemId === 'translate-page') {
    send({ action: 'translate-page' });
  } else if (info.menuItemId === 'translate-selection') {
    send({ action: 'translate-selection', text: info.selectionText });
  } else if (info.menuItemId === 'translate-input') {
    send({ action: 'translate-input' });
  } else if (info.menuItemId === 'ocr-image') {
    const imageUrl = info.srcUrl || info.linkUrl;
    if (imageUrl) send({ action: 'ocr-image', imageUrl });
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  const send = async (msg) => {
    await ensureContentMain(tab.id);
    return chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  };
  if (command === 'toggle-translation') send({ action: 'toggle-translation' });
  else if (command === 'toggle-hover') send({ action: 'toggle-hover' });
  else if (command === 'toggle-only-translation') send({ action: 'toggle-only-translation' });
  else if (command === 'translate-to-bottom') send({ action: 'translate-to-bottom' });
});

async function ensureContentMain(tabId, frameId) {
  if (!chrome.scripting || !tabId) return false;
  try {
    const target = frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId };
    const existing = await chrome.scripting.executeScript({
      target,
      func: () => window.__LLM_TRANSLATE_MAIN_STATUS__ || ''
    });
    const status = existing?.find(item => item.result)?.result || '';
    if (status === 'ready') return true;
    if (status === 'loading') {
      const ready = await waitForContentReady(tabId, frameId);
      if (ready) return true;
    }
    await chrome.scripting.executeScript({
      target,
      files: CONTENT_MAIN_FILES
    });
    // Inject CSS separately (cannot include .css files in executeScript)
    try {
      await chrome.scripting.insertCSS({
        target: frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId },
        files: CONTENT_CSS_FILES
      });
      _safeLog('debug', 'Background', 'Content CSS injected', { tabId, frameId });
    } catch (e) {
      _safeLog('warn', 'Background', 'Content CSS injection skipped: ' + e.message, { tabId, frameId });
    }
    // Inject Shadow DOM patcher into MAIN world to detect web components
    try {
      await chrome.scripting.executeScript({
        target: frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId },
        files: ['src/injectors/shadowroot-patcher.js'],
        world: 'MAIN'
      });
      _safeLog('debug', 'Background', 'Shadow root patcher injected', { tabId, frameId });
    } catch (e) {
      _safeLog('warn', 'Background', 'Shadow root patcher injection skipped: ' + e.message, { tabId, frameId });
    }
    try {
      await chrome.scripting.executeScript({
        target: frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId },
        files: ['src/injectors/youtube-subtitle-injector.js'],
        world: 'MAIN'
      });
      _safeLog('debug', 'Background', 'YouTube subtitle injector injected', { tabId, frameId });
    } catch (e) {
      _safeLog('debug', 'Background', 'YouTube subtitle injector skipped: ' + e.message, { tabId, frameId });
    }
    _safeLog('debug', 'Background', 'Content main injected', { tabId, frameId });
    return await waitForContentReady(tabId, frameId);
  } catch (err) {
    _safeLog('warn', 'Background', `Content main injection failed: ${err.message}`, { tabId, frameId });
    return false;
  }
}

async function waitForContentReady(tabId, frameId, timeoutMs = 6000) {
  const target = frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId };
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await chrome.scripting.executeScript({
        target,
        func: () => window.__LLM_TRANSLATE_MAIN_STATUS__ || ''
      });
      const status = result?.find(item => item.result)?.result || '';
      if (status === 'ready') return true;
      if (status === 'error') return false;
    } catch (e) {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  _safeLog('warn', 'Background', 'Content main did not become ready in time', { tabId, frameId });
  return false;
}

function applyRequestSiteContext(settings, pageUrl) {
  if (typeof getSiteRule !== 'function' || !pageUrl) return settings;
  const rule = getSiteRule(pageUrl, settings);
  if (!rule?.contextHint && !rule?.systemPrompt && !rule?.userPromptTemplate) return settings;
  const next = { ...settings };
  if (rule.contextHint) {
    const base = rule.systemPrompt || settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt;
    next.systemPrompt = `${base}\n\nSite context:\n${rule.contextHint}`;
  } else if (rule.systemPrompt) {
    next.systemPrompt = rule.systemPrompt;
  }
  if (rule.userPromptTemplate) next.userPromptTemplate = rule.userPromptTemplate;
  _safeLog('debug', 'Rules', 'Applied site translation context', {
    pageUrl,
    matchedIds: rule.matchedIds,
    hasContextHint: !!rule.contextHint
  });
  return next;
}

function estimateTokens(text) {
  const str = String(text || '');
  const cjk = (str.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const rest = Math.max(0, str.length - cjk);
  return Math.ceil(cjk * 1.1 + rest / 4);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(err => {
      _safeLog('error', 'Background', `Message handler error: ${err.message}`, err.stack);
      sendResponse({ error: err.message || 'Unknown error' });
    });
  return true; // async keepalive
});

async function handleMessage(request, sender) {
  if (request.action === 'append-log') {
    if (typeof LOG !== 'undefined' && request.entry) {
      await LOG.append(request.entry);
    }
    return { success: true };
  }

  if (request.action === 'inject-content-main') {
    const tabId = request.tabId || sender?.tab?.id;
    const frameId = sender?.frameId;
    const success = await ensureContentMain(tabId, frameId);
    return { success };
  }

  if (request.action === 'open-sidepanel') {
    try {
      const tab = sender?.tab;
      if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
      }
      return { success: true };
    } catch (err) {
      _safeLog('warn', 'Background', `Open side panel failed: ${err.message}`);
      return { error: err.message };
    }
  }

  if (request.action === 'translation-progress') {
    return {
      success: true,
      translatedCount: request.translatedCount || 0,
      totalVisibleCount: request.totalVisibleCount || 0
    };
  }

  _safeLog('debug', 'Background', `Action: ${request.action}`);

  // ---- Translate single text ----
  if (request.action === 'translate') {
    const settings = typeof normalizeSettings === 'function' ? normalizeSettings(await getSettings()) : await getSettings();
    const effectiveSettings = applyRequestSiteContext(settings, sender?.tab?.url);
    if (request.targetLang) effectiveSettings.targetLang = request.targetLang;
    if (request.sourceLang) effectiveSettings.sourceLang = request.sourceLang;
    const api = _safeApi(effectiveSettings);
    const text = request.text || '';
    const tStart = Date.now();
    _safeLog('info', 'Translate', 'Single translation requested', {
      provider: effectiveSettings.provider,
      model: effectiveSettings.model,
      baseURL: effectiveSettings.baseURL,
      sourceLang: effectiveSettings.sourceLang,
      targetLang: effectiveSettings.targetLang,
      textLength: text.length,
      textPreview: text.slice(0, 120),
      estimatedTokens: estimateTokens(text),
      pageUrl: sender?.tab?.url || ''
    });
    try {
      const translated = await api.translate(text, effectiveSettings.sourceLang, effectiveSettings.targetLang);
      const duration = Date.now() - tStart;
      _safeLog('info', 'Translate', `Single translation OK (${duration}ms) → ${translated?.length || 0} chars`);
      if (typeof setProviderStatus === 'function') {
        await setProviderStatus(effectiveSettings.provider, {
          ok: true,
          model: effectiveSettings.model,
          message: `Last translation succeeded (${duration}ms, ${translated?.length || 0} chars)`,
          textLength: text.length,
          durationMs: duration
        });
      }
      return { translated };
    } catch (err) {
      if (typeof setProviderStatus === 'function') {
        await setProviderStatus(effectiveSettings.provider, {
          ok: false,
          model: effectiveSettings.model,
          message: err.message || 'Translation failed',
          textLength: text.length
        });
      }
      _safeLog('error', 'Translate', err.message || 'Single translation failed', {
          provider: effectiveSettings.provider,
          model: effectiveSettings.model,
          sourceLang: effectiveSettings.sourceLang,
          targetLang: effectiveSettings.targetLang,
        textLength: text.length,
        pageUrl: sender?.tab?.url || '',
        stack: err.stack
      });
      await _flushLogs();
      return { error: err.message || 'Translation failed' };
    }
  }

  // ---- Translate batch ----
  if (request.action === 'translate-batch') {
    const settings = typeof normalizeSettings === 'function' ? normalizeSettings(await getSettings()) : await getSettings();
    const effectiveSettings = applyRequestSiteContext(settings, sender?.tab?.url);
    if (request.targetLang) effectiveSettings.targetLang = request.targetLang;
    if (request.sourceLang) effectiveSettings.sourceLang = request.sourceLang;
    const api = _safeApi(effectiveSettings);
    const texts = request.texts || [];
    const totalTextLength = texts.reduce((sum, t) => sum + String(t || '').length, 0);
    const tStart = Date.now();
    _safeLog('info', 'Translate', `Batch translation requested: ${texts.length} texts`, {
      provider: effectiveSettings.provider,
      model: effectiveSettings.model,
      baseURL: effectiveSettings.baseURL,
      sourceLang: effectiveSettings.sourceLang,
      targetLang: effectiveSettings.targetLang,
      count: texts.length,
      totalTextLength,
      textPreviews: texts.slice(0, 3).map(t => String(t || '').slice(0, 80)),
      estimatedTokens: estimateTokens(texts.join('\n')),
      pageUrl: sender?.tab?.url || ''
    });
    try {
      const results = await api.translateBatch(texts, effectiveSettings.sourceLang, effectiveSettings.targetLang);
      const duration = Date.now() - tStart;
      const failed = results.filter(r => typeof r === 'string' && r.startsWith('[Translation Error:')).length;
      const succeeded = texts.length - failed;
      _safeLog('info', 'Translate', `Batch OK (${duration}ms): ${succeeded}/${texts.length} succeeded, ${failed} failed`);
      if (typeof setProviderStatus === 'function') {
        await setProviderStatus(effectiveSettings.provider, {
          ok: failed === 0,
          model: effectiveSettings.model,
          message: failed ? `${failed}/${texts.length} items failed (${duration}ms)` : `Last batch succeeded (${duration}ms, ${texts.length} items)`,
          count: texts.length,
          failed,
          durationMs: duration
        });
      }
      if (failed) {
        _safeLog('warn', 'Translate', `Batch completed with ${failed}/${texts.length} failures`, {
          provider: effectiveSettings.provider,
          model: effectiveSettings.model,
          pageUrl: sender?.tab?.url || ''
        });
      }
      return { results };
    } catch (err) {
      const duration = Date.now() - tStart;
      _safeLog('error', 'Translate', err.message || 'Batch translation failed', {
        provider: effectiveSettings.provider,
        model: effectiveSettings.model,
        baseURL: effectiveSettings.baseURL,
        sourceLang: effectiveSettings.sourceLang,
        targetLang: effectiveSettings.targetLang,
        count: texts.length,
        totalTextLength,
        durationMs: duration,
        pageUrl: sender?.tab?.url || '',
        stack: err.stack
      });
      if (typeof setProviderStatus === 'function') {
        await setProviderStatus(effectiveSettings.provider, {
          ok: false,
          model: effectiveSettings.model,
          message: err.message || 'Batch translation failed',
          count: texts.length
        });
      }
      await _flushLogs();
      return { error: err.message || 'Batch translation failed' };
    }
  }

  // ---- Settings ----
  if (request.action === 'get-settings') {
    const settings = await getSettings();
    return { settings: typeof normalizeSettings === 'function' ? normalizeSettings(settings) : settings };
  }

  if (request.action === 'set-settings') {
    const settings = typeof normalizeSettings === 'function' ? normalizeSettings(request.settings) : request.settings;
    await setSettings(settings);
    currentSettings = settings;
    _safeLog('info', 'Background', 'Settings saved', { model: request.settings.model });
    return { success: true };
  }

  // ---- State ----
  if (request.action === 'get-state') {
    return { state: await getState() };
  }

  if (request.action === 'get-provider-status') {
    return { status: typeof getProviderStatus === 'function' ? await getProviderStatus() : {} };
  }

  if (request.action === 'set-state') {
    await setState({ ...(await getState()), ...(request.state || {}) });
    return { success: true };
  }

  // ---- Fetch image (for OCR CORS bypass) ----
  if (request.action === 'fetch-image') {
    try {
      const resp = await fetch(request.url);
      const blob = await resp.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      });
      const base64 = dataUrl.split(',')[1];
      return { data: base64 };
    } catch(e) {
      return { error: e.message };
    }
  }

  // ---- Logs (read directly from storage for cross-context consistency) ----
  if (request.action === 'get-logs') {
    try {
      const logs = typeof LOG !== 'undefined'
        ? await LOG.getLogs(request.filter || {})
        : [];
      return { logs };
    } catch (e) {
      return { logs: [], error: e.message };
    }
  }

  if (request.action === 'clear-cache') {
    try {
      await chrome.storage.local.remove('llm-translate-cache');
      if (typeof clearTranslationCache === 'function') await clearTranslationCache();
      _safeLog('info', 'Background', 'Translation cache cleared');
      return { success: true };
    } catch(e) {
      return { error: e.message };
    }
  }

  if (request.action === 'clear-logs') {
    try {
      if (typeof LOG !== 'undefined') await LOG.clearLogs();
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  return { error: 'Unknown action: ' + request.action };
}

init().catch(err => {
  console.error('[Wisemon] Service worker init failed:', err.message || err);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await setState({ ...(await getState()), onboardingSeen: false });
      chrome.runtime.openOptionsPage();
      _safeLog('info', 'Background', 'Opened onboarding after install');
    } catch (e) {
      _safeLog('warn', 'Background', `Failed to open onboarding: ${e.message}`);
    }
  }
});
