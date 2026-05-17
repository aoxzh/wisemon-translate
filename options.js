/**
 * Options Page Logic - v2.0
 * Bug-fixed, redesigned to match new provider card UI
 */

const PRESETS = typeof PROVIDER_PRESETS !== 'undefined' ? PROVIDER_PRESETS : {};

let currentSettings = {};
let currentPreset = 'deepseek-v4-flash';

function $(id) { return document.getElementById(id); }
const getVal = (id) => { const el = $(id); return el ? el.value : ''; };
const setVal = (id, value) => {
  const el = $(id);
  if (!el) return;
  el.value = value !== null && value !== undefined ? value : '';
  if (globalThis.CustomSelect) CustomSelect.refreshAll(document);
};
const isChecked = (id) => { const el = $(id); return el ? el.checked : false; };
const setChecked = (id, v) => { const el = $(id); if (el) el.checked = !!v; };

async function init() {
  I18N.init();

  // Read version from manifest
  try {
    let manifest = chrome.runtime.getManifest();
    let versionEl = $('opt-version');
    let aboutVersionEl = $('about-version');
    if (versionEl) versionEl.textContent = 'v' + manifest.version;
    if (aboutVersionEl) aboutVersionEl.textContent = 'Version ' + manifest.version;
  } catch(e) {}

  let res = await chrome.runtime.sendMessage({ action: 'get-settings' });
  currentSettings = Object.assign({}, DEFAULT_SETTINGS, res.settings);
  applyUiTheme(currentSettings.uiTheme || 'auto');

  // Determine preset
  syncProviderCardText();
  determinePreset(currentSettings);

  populateFields(currentSettings);
  setupNavigation();
  setupEventListeners();
  setupOnboarding();
  I18N.localizeContainer(document.querySelector('.opt-page'));
  if (globalThis.CustomSelect) CustomSelect.initAll(document);
  if ($('lang-switch-text')) {
    $('lang-switch-text').textContent = I18N.lang === 'zh-CN' ? 'EN' : '\u4e2d';
  }
}

async function setupOnboarding() {
  let card = $('onboarding-card');
  if (!card) return;
  try {
    let res = await chrome.runtime.sendMessage({ action: 'get-state' });
    let state = res.state || {};
    if (state.onboardingSeen === false) card.hidden = false;
  } catch(e) {}

  let start = $('onboarding-start');
  let dismiss = $('onboarding-dismiss');
  if (start) {
    start.addEventListener('click', function() {
      card.hidden = true;
      history.replaceState(null, '', '#api');
      let apiLink = document.querySelector('.opt-nav a[data-section="api"]');
      if (apiLink) apiLink.click();
      chrome.runtime.sendMessage({ action: 'set-state', state: { onboardingSeen: true } }).catch(function(){});
    });
  }
  if (dismiss) {
    dismiss.addEventListener('click', function() {
      card.hidden = true;
      chrome.runtime.sendMessage({ action: 'set-state', state: { onboardingSeen: true } }).catch(function(){});
    });
  }
}

function applyUiTheme(theme) {
  document.documentElement.classList.remove('t-light', 't-dark', 't-ocean', 't-violet', 't-amber', 't-slate');
  if (theme === 'light') document.documentElement.classList.add('t-light');
  if (theme === 'dark') document.documentElement.classList.add('t-dark');
  if (theme === 'ocean') document.documentElement.classList.add('t-ocean');
  if (theme === 'violet') document.documentElement.classList.add('t-violet');
  if (theme === 'amber') document.documentElement.classList.add('t-amber');
  if (theme === 'slate') document.documentElement.classList.add('t-slate');
}

function determinePreset(s) {
  if (s.provider === 'deepseek') {
    currentPreset = s.model === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
  } else if (s.provider === 'zhipu' || s.model === 'glm-4.7-flash') {
    currentPreset = 'glm-4.7-flash';
  } else if (s.provider === 'openai') {
    currentPreset = 'openai';
  } else if (s.provider === 'gemini') {
    currentPreset = 'gemini';
  } else if (s.provider === 'openrouter') {
    currentPreset = 'openrouter';
  } else if (s.provider === 'qwen') {
    currentPreset = 'qwen';
  } else if (s.provider === 'siliconflow') {
    currentPreset = 'siliconflow';
  } else if (s.provider === 'anthropic') {
    currentPreset = 'anthropic';
  } else if (s.provider === 'ollama') {
    currentPreset = 'ollama';
  } else if (s.provider === 'hunyuan') {
    currentPreset = 'hunyuan';
  } else if (s.provider === 'lmstudio') {
    currentPreset = 'lmstudio';
  } else if (s.provider === 'google') {
    currentPreset = 'google';
  } else if (s.provider === 'deepl') {
    currentPreset = 'deepl';
  } else if (s.provider === 'baidu') {
    currentPreset = 'baidu';
  } else if (s.provider === 'microsoft') {
    currentPreset = 'microsoft';
  } else {
    currentPreset = 'custom';
  }
}

function populateFields(s) {
  // Provider cards
  let radio = document.querySelector('input[name="provider-preset"][value="' + currentPreset + '"]');
  if (radio) radio.checked = true;
  updateProviderCards();

  // API fields
  setVal('baseURL', s.baseURL);
  let provider = s.provider || 'deepseek';
  let savedKey = (s.apiKeys && s.apiKeys[provider]) || s.apiKey || '';
  setVal('apiKey', savedKey);
  setVal('model', s.model || 'deepseek-v4-flash');
  setVal('thinkingMode', s.thinkingMode || 'disabled');
  setVal('temperature', typeof s.temperature === 'number' ? s.temperature : 0);
  if ($('tempValue')) $('tempValue').textContent = typeof s.temperature === 'number' ? s.temperature : 0;
  setVal('maxConcurrency', s.maxConcurrency || 8);

  let thinkingField = $('thinkingField');
  if (thinkingField) {
    thinkingField.style.display = (s.provider === 'deepseek' || s.provider === 'zhipu') ? 'block' : 'none';
  }
  updateApiKeyRequirement(provider);
  updateTempFieldState();

  // Translation
  setVal('targetLang', s.targetLang || 'zh-CN');
  setVal('sourceLang', s.sourceLang || 'auto');
  setVal('displayMode', s.displayMode || 'bilingual');
  setVal('translationTheme', normalizeTranslationThemeOption(s.translationTheme));
  setVal('translationStylePreset', s.translationStylePreset || 'balanced');
  setVal('customTranslationCss', s.customTranslationCss || '');
  setVal('maxChars', s.maxCharsPerRequest || 12000);
  setChecked('largeTextMode', s.largeTextMode !== false);
  setChecked('useStream', s.useStream !== false && (s.streamRenderMode || 'single') !== 'disabled');
  setVal('uiTheme', s.uiTheme || 'auto');
  applyUiTheme(s.uiTheme || 'auto');

  // Features
  setChecked('privacyMasking', s.privacyMasking !== false);
  setChecked('maskEmail', s.maskEmail !== false);
  setChecked('maskPhone', s.maskPhone !== false);
  setChecked('maskCreditCard', s.maskCreditCard !== false);
  setChecked('maskSecrets', s.maskSecrets !== false);
  setChecked('maskVerificationCodes', s.maskVerificationCodes !== false);
  setChecked('maskPrivateKeys', s.maskPrivateKeys !== false);
  setChecked('maskUrls', !!s.maskUrls);
  setChecked('enableHover', s.enableHover);
  setVal('hoverMode', s.hoverMode || 'key');
  setVal('hoverKey', s.hoverKey || 'shift');
  setChecked('enableFab', s.enableFab !== false);
  setChecked('enableInputBox', s.enableInputBox);
  setChecked('enableSelection', s.enableSelection);
  setChecked('enableSubtitle', s.enableSubtitle !== false);
  setVal('subtitleMode', s.subtitleMode || 'bilingual');
  setVal('subtitleStyle', s.subtitleStyle || 'cinema');
  setVal('subtitleTrackPreference', s.subtitleTrackPreference || 'manual');
  setVal('subtitleTranslateScope', s.subtitleTranslateScope || 'nearby');
  setChecked('subtitleSkipTargetLang', s.subtitleSkipTargetLang !== false);
  setVal('subtitlePosition', s.subtitlePosition || 12);
  setVal('subtitleFontSize', s.subtitleFontSize || 14);
  setChecked('autoTranslate', s.autoTranslate);
  setChecked('translateMainOnly', s.translateMainOnly);
  setVal('translationPosition', s.translationPosition || 'after');
  setVal('fontSize', s.fontSize || 94);
  setVal('minTextLength', s.minTextLength || 2);
  setVal('extraExcludeSelector', s.extraExcludeSelector || '');

  setVal('systemPrompt', s.systemPrompt || '');
  setVal('userPromptTemplate', s.userPromptTemplate || '');

  // Excluded sites - only ONE textarea now
  let sitesVal = (s.excludedSites || []).join('\n');
  setVal('excludedSites', sitesVal);
  setVal('siteRules', s.siteRules || '');

  // Glossary
  setVal('glossary', s.glossary || '');
  renderTermRows(s.terms || []);
  renderSiteTermRows(s.siteTerms || []);
  setVal('aiTermsText', formatAiTermsText(s.aiTerms || []));

  // Display shortcuts (read-only from manifest)
  updateShortcutDisplay(s);
}

// ---- Glossary: Structured Terms Helpers ----

function renderTermRows(terms) {
  var list = $('terms-list');
  if (!list) return;
  list.innerHTML = '';

  if (!terms || terms.length === 0) {
    // Add one empty row as starter
    addTermRow(list, { pattern: '', replacement: '', regex: false });
    return;
  }

  for (var i = 0; i < terms.length; i++) {
    addTermRow(list, terms[i]);
  }
  // Always keep one empty row at the bottom for adding
  addTermRow(list, { pattern: '', replacement: '', regex: false });
}

function addTermRow(list, term) {
  var row = document.createElement('div');
  row.className = 'opt-term-row';

  var patternInput = document.createElement('input');
  patternInput.type = 'text';
  patternInput.placeholder = 'Pattern';
  patternInput.value = term.pattern || '';
  patternInput.setAttribute('data-key', 'pattern');

  var arrow = document.createElement('span');
  arrow.className = 'opt-term-arrow';
  arrow.textContent = '\u2192'; // right arrow →

  var replInput = document.createElement('input');
  replInput.type = 'text';
  replInput.placeholder = 'Replacement';
  replInput.value = term.replacement || '';
  replInput.setAttribute('data-key', 'replacement');

  var checkLabel = document.createElement('label');
  checkLabel.className = 'opt-term-check';
  var checkInput = document.createElement('input');
  checkInput.type = 'checkbox';
  checkInput.checked = !!term.regex;
  checkInput.setAttribute('data-key', 'regex');
  checkLabel.appendChild(checkInput);
  checkLabel.appendChild(document.createTextNode(' Regex'));

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'opt-term-remove';
  removeBtn.textContent = '\u00D7'; // ×
  removeBtn.title = 'Remove term';
  removeBtn.addEventListener('click', function() {
    row.remove();
  });

  row.appendChild(patternInput);
  row.appendChild(arrow);
  row.appendChild(replInput);
  row.appendChild(checkLabel);
  row.appendChild(removeBtn);

  list.appendChild(row);
}

function readTermRows() {
  var list = $('terms-list');
  if (!list) return [];
  var rows = list.querySelectorAll('.opt-term-row');
  var terms = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var patternEl = row.querySelector('input[data-key="pattern"]');
    var replEl = row.querySelector('input[data-key="replacement"]');
    var regexEl = row.querySelector('input[data-key="regex"]');
    var pattern = (patternEl ? patternEl.value : '').trim();
    var repl = (replEl ? replEl.value : '').trim();
    if (pattern && repl) {
      terms.push({
        pattern: pattern,
        replacement: repl,
        regex: regexEl ? regexEl.checked : false
      });
    }
  }
  return terms;
}

function renderSiteTermRows(siteTerms) {
  var list = $('site-terms-list');
  if (!list) return;
  list.innerHTML = '';
  if (!siteTerms || siteTerms.length === 0) {
    addSiteTermRow(list, { domains: '', pattern: '', replacement: '', regex: false });
    return;
  }
  for (var i = 0; i < siteTerms.length; i++) addSiteTermRow(list, siteTerms[i]);
  addSiteTermRow(list, { domains: '', pattern: '', replacement: '', regex: false });
}

function addSiteTermRow(list, term) {
  var row = document.createElement('div');
  row.className = 'opt-site-term-row';
  var domainsInput = document.createElement('input');
  domainsInput.type = 'text';
  domainsInput.placeholder = 'example.com, docs.example.com';
  domainsInput.value = term.domains || '';
  domainsInput.setAttribute('data-key', 'domains');
  var patternInput = document.createElement('input');
  patternInput.type = 'text';
  patternInput.placeholder = 'Pattern';
  patternInput.value = term.pattern || '';
  patternInput.setAttribute('data-key', 'pattern');
  var replInput = document.createElement('input');
  replInput.type = 'text';
  replInput.placeholder = 'Replacement';
  replInput.value = term.replacement || '';
  replInput.setAttribute('data-key', 'replacement');
  var checkLabel = document.createElement('label');
  checkLabel.className = 'opt-term-check';
  var checkInput = document.createElement('input');
  checkInput.type = 'checkbox';
  checkInput.checked = !!term.regex;
  checkInput.setAttribute('data-key', 'regex');
  checkLabel.appendChild(checkInput);
  checkLabel.appendChild(document.createTextNode(' Regex'));
  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'opt-term-remove';
  removeBtn.textContent = '\u00D7';
  removeBtn.title = 'Remove site term';
  removeBtn.addEventListener('click', function() { row.remove(); });
  row.appendChild(domainsInput);
  row.appendChild(patternInput);
  row.appendChild(replInput);
  row.appendChild(checkLabel);
  row.appendChild(removeBtn);
  list.appendChild(row);
}

function readSiteTermRows() {
  var list = $('site-terms-list');
  if (!list) return [];
  var rows = list.querySelectorAll('.opt-site-term-row');
  var terms = [];
  rows.forEach(function(row) {
    var domains = row.querySelector('[data-key="domains"]')?.value.trim() || '';
    var pattern = row.querySelector('[data-key="pattern"]')?.value.trim() || '';
    var replacement = row.querySelector('[data-key="replacement"]')?.value.trim() || '';
    if (!domains || !pattern || !replacement) return;
    terms.push({
      domains: domains,
      pattern: pattern,
      replacement: replacement,
      regex: !!row.querySelector('[data-key="regex"]')?.checked
    });
  });
  return terms;
}

function formatAiTermsText(aiTerms) {
  if (!aiTerms || aiTerms.length === 0) return '';
  var lines = [];
  for (var i = 0; i < aiTerms.length; i++) {
    var t = aiTerms[i];
    if (!t || !t.term) continue;
    var line = t.term;
    if (t.definition) line += ': ' + t.definition;
    if (t.context) line += ' (' + t.context + ')';
    lines.push(line);
  }
  return lines.join('\n');
}

function parseAiTermsText(text) {
  if (!text || !text.trim()) return [];
  var lines = text.split('\n');
  var aiTerms = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    // Parse "Term: definition (context)" or "Term: definition"
    var term = '';
    var definition = '';
    var context = '';

    // Extract optional context in parentheses at end
    var contextMatch = line.match(/\(([^)]+)\)\s*$/);
    if (contextMatch) {
      context = contextMatch[1].trim();
      line = line.slice(0, contextMatch.index).trim();
    }

    var colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      term = line.slice(0, colonIdx).trim();
      definition = line.slice(colonIdx + 1).trim();
    } else {
      // No colon — treat entire line as term
      term = line;
    }

    if (term) {
      aiTerms.push({ term: term, definition: definition, context: context });
    }
  }
  return aiTerms;
}

function updateShortcutDisplay(s) {
  let sc = s.keyboardShortcuts || {};
  if ($('display-sc-translate')) $('display-sc-translate').textContent = formatKbd(sc.translatePage || 'alt+t');
  if ($('display-sc-hover')) $('display-sc-hover').textContent = formatKbd(sc.toggleHover || 'alt+h');
  if ($('display-sc-style')) $('display-sc-style').textContent = formatKbd(sc.toggleStyle || 'alt+s');
}

function formatKbd(str) {
  if (!str) return '';
  return str.split('+').map(function(p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join('+');
}

function updateProviderCards() {
  let cards = document.querySelectorAll('.opt-provider-card');
  cards.forEach(function(card) {
    let radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      card.style.borderColor = 'var(--p-main)';
      card.style.background = 'var(--p-light)';
      card.style.boxShadow = '0 0 0 3px rgba(var(--p-main-rgb), 0.12)';
    } else {
      card.style.borderColor = '';
      card.style.background = '';
      card.style.boxShadow = '';
    }
  });
}

function normalizeTranslationThemeOption(theme) {
  const allowed = ['none', 'grey', 'weakening', 'underline', 'nativeUnderline', 'nativeDashed', 'nativeDotted', 'thinDashed', 'wavy', 'dashed', 'divider', 'dividingLine', 'blockquote', 'background', 'highlight', 'marker', 'marker2', 'italic', 'bold', 'subtle', 'card', 'paper', 'dashedBorder', 'solidBorder', 'mask', 'opacity'];
  if (allowed.includes(theme)) return theme;
  const legacyMap = {
    blurReveal: 'mask',
    grey: 'none',
    dividingLine: 'divider'
  };
  return legacyMap[theme] || 'none';
}

function syncProviderCardText() {
  let cards = document.querySelectorAll('.opt-provider-card');
  cards.forEach(function(card) {
    let preset = PRESETS[card.getAttribute('data-preset')];
    if (!preset) return;
    let name = card.querySelector('.opt-pc-name');
    let desc = card.querySelector('.opt-pc-desc');
    if (name) name.textContent = preset.label || preset.provider || '';
    if (desc) desc.textContent = preset.description || '';
  });
}

function updateSubtitlePreview() {
  const preview = $('subtitlePreview');
  if (!preview) return;
  const style = ['cinema', 'outline', 'paper'].includes(getVal('subtitleStyle')) ? getVal('subtitleStyle') : 'cinema';
  preview.className = 'opt-subtitle-preview llm-subtitle-style-' + style;
  preview.dataset.subtitleMode = getVal('subtitleMode') === 'translation' ? 'translation' : 'bilingual';
  preview.style.fontSize = Math.max(11, Math.min(24, parseInt(getVal('subtitleFontSize'), 10) || 14)) + 'px';
  const original = preview.querySelector('.llm-sub-original');
  if (original) original.style.display = getVal('subtitleMode') === 'translation' ? 'none' : '';
}

async function diagnoseLocalProvider(settings) {
  const provider = settings.provider || '';
  const localProviders = new Set(['ollama', 'hunyuan', 'lmstudio', 'custom']);
  if (!localProviders.has(provider) || !isLocalBaseUrl(settings.baseURL)) return null;
  const modelsUrl = buildModelsUrl(settings.baseURL || '');
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, 5000);
  try {
    const headers = {};
    if (settings.apiKey) headers.Authorization = 'Bearer ' + settings.apiKey;
    const res = await fetch(modelsUrl, { method: 'GET', headers: headers, signal: controller.signal });
    if (res.status === 404) {
      return { ok: false, message: 'Local check: /v1/models returned 404. Confirm the base URL includes /v1 and the server exposes an OpenAI-compatible models endpoint. The extension only connects to localhost; it does not install or run models.' };
    }
    if (!res.ok) {
      return { ok: false, message: 'Local check: /v1/models returned HTTP ' + res.status + '. Confirm the service is running, CORS is enabled for browser requests, and the model server accepts this endpoint.' };
    }
    const data = await res.json().catch(function() { return null; });
    const models = Array.isArray(data?.data) ? data.data.map(function(item) { return item.id || item.name || ''; }).filter(Boolean) : [];
    if (!models.length) {
      return { ok: true, message: 'Local check: server responded, but no model names were listed. If translation fails, verify the model field exactly matches the model server.' };
    }
    if (settings.model && !models.includes(settings.model)) {
      return { ok: false, message: 'Local check: server is reachable, but model "' + settings.model + '" was not listed. Available: ' + models.slice(0, 6).join(', ') + (models.length > 6 ? '...' : '') + '.' };
    }
    return { ok: true, message: 'Local check: server is reachable and model is listed. Requests go directly from the browser to ' + new URL(settings.baseURL).origin + '; this extension is not a proxy.' };
  } catch (err) {
    const timedOut = err && err.name === 'AbortError';
    return {
      ok: false,
      message: timedOut
        ? 'Local check: /v1/models timed out. Start the local model server first, then retry. This extension does not download, install, or launch local programs.'
        : 'Local check: could not reach /v1/models. The service may be stopped, the port may be wrong, or browser CORS may be blocking requests. This extension only connects to the endpoint you configure.'
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildModelsUrl(baseURL) {
  const clean = String(baseURL || '').replace(/\/+$/, '');
  return clean.replace(/\/chat\/completions$/, '').replace(/\/completions$/, '') + '/models';
}

function isLocalBaseUrl(baseURL) {
  try {
    const url = new URL(baseURL);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch (e) {
    return false;
  }
}

function readSettingsFromUI() {
  let provider = getProviderFromPreset(currentPreset);
  let newApiKey = getVal('apiKey').trim();
  let apiKeys = Object.assign({}, (currentSettings.apiKeys || {}));
  if (newApiKey) apiKeys[provider] = newApiKey;

  // Excluded sites - only read from the single textarea
  let sitesStr = getVal('excludedSites') || '';
  let excludedSites = sitesStr.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);

  return {
    provider: provider,
    baseURL: getVal('baseURL').trim(),
    apiKey: newApiKey,
    apiKeys: apiKeys,
    model: getVal('model').trim(),
    temperature: (function(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; })(getVal('temperature')),
    maxConcurrency: (function(v) { const n = parseInt(v); return isNaN(n) ? 8 : n; })(getVal('maxConcurrency')),
    thinkingMode: getVal('thinkingMode') || 'disabled',
    targetLang: getVal('targetLang').trim() || 'zh-CN',
    sourceLang: getVal('sourceLang').trim() || 'auto',
    displayMode: getVal('displayMode') || 'bilingual',
    translationTheme: normalizeTranslationThemeOption(getVal('translationTheme')),
    translationStylePreset: getVal('translationStylePreset') || 'balanced',
    customTranslationCss: getVal('customTranslationCss').trim() || '',
    largeTextMode: isChecked('largeTextMode'),
    maxCharsPerRequest: (function(v) { const n = parseInt(v); return isNaN(n) ? 12000 : n; })(getVal('maxChars')),
    useStream: isChecked('useStream'),
    streamRenderMode: isChecked('useStream') ? 'single' : 'disabled',
    uiTheme: getVal('uiTheme') || 'auto',
    enableHover: isChecked('enableHover'),
    hoverMode: getVal('hoverMode') || 'key',
    hoverKey: getVal('hoverKey') || 'shift',
    enableFab: isChecked('enableFab'),
    fabPosition: currentSettings.fabPosition || null,
    enableInputBox: isChecked('enableInputBox'),
    enableSelection: isChecked('enableSelection'),
    enableSubtitle: isChecked('enableSubtitle'),
    subtitleMode: getVal('subtitleMode') || 'bilingual',
    subtitleStyle: getVal('subtitleStyle') || 'cinema',
    subtitleTrackPreference: getVal('subtitleTrackPreference') || 'manual',
    subtitleTranslateScope: getVal('subtitleTranslateScope') || 'nearby',
    subtitleSkipTargetLang: isChecked('subtitleSkipTargetLang'),
    subtitlePosition: (function(v) { const n = parseInt(v); return isNaN(n) ? 12 : Math.max(4, Math.min(30, n)); })(getVal('subtitlePosition')),
    subtitleFontSize: (function(v) { const n = parseInt(v); return isNaN(n) ? 14 : Math.max(11, Math.min(24, n)); })(getVal('subtitleFontSize')),
    autoTranslate: isChecked('autoTranslate'),
    translateMainOnly: isChecked('translateMainOnly'),
    translationPosition: getVal('translationPosition') || 'after',
    fontSize: (function(v) { const n = parseInt(v); return isNaN(n) ? 94 : n; })(getVal('fontSize')),
    minTextLength: (function(v) { const n = parseInt(v); return isNaN(n) ? 2 : n; })(getVal('minTextLength')),
    extraExcludeSelector: getVal('extraExcludeSelector').trim() || '',
    siteRules: getVal('siteRules').trim() || '',
    systemPrompt: getVal('systemPrompt').trim(),
    userPromptTemplate: getVal('userPromptTemplate').trim(),
    excludedSites: excludedSites,
    glossary: getVal('glossary').trim(),
    terms: readTermRows(),
    siteTerms: readSiteTermRows(),
    aiTerms: parseAiTermsText(getVal('aiTermsText')),
    privacyMasking: isChecked('privacyMasking'),
    maskEmail: isChecked('maskEmail'),
    maskPhone: isChecked('maskPhone'),
    maskCreditCard: isChecked('maskCreditCard'),
    maskSecrets: isChecked('maskSecrets'),
    maskVerificationCodes: isChecked('maskVerificationCodes'),
    maskPrivateKeys: isChecked('maskPrivateKeys'),
    maskUrls: isChecked('maskUrls'),
    keyboardShortcuts: currentSettings.keyboardShortcuts || {
      translatePage: 'alt+t',
      toggleHover: 'alt+h',
      toggleStyle: 'alt+s'
    }
  };
}

function setupNavigation() {
  let navLinks = document.querySelectorAll('.opt-nav a');
  let panels = document.querySelectorAll('.opt-panel');

  function activateSection(sectionId) {
    navLinks.forEach(function(l) { l.classList.remove('active'); });
    panels.forEach(function(p) { p.classList.remove('active'); });
    let link = document.querySelector('.opt-nav a[data-section="' + sectionId + '"]');
    let panel = document.getElementById(sectionId);
    if (link) link.classList.add('active');
    if (panel) panel.classList.add('active');
    document.querySelector('.opt-main')?.classList.toggle('is-reader-wide', sectionId === 'reader');
    if (sectionId === 'logs') refreshLogPanel();
  }

  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      let sectionId = link.getAttribute('data-section');
      history.replaceState(null, '', '#' + sectionId);
      activateSection(sectionId);
    });
  });

  let initial = (location.hash || '').replace('#', '');
  if (initial && document.getElementById(initial)) activateSection(initial);

  window.addEventListener('hashchange', function() {
    let next = (location.hash || '').replace('#', '');
    if (next && document.getElementById(next)) activateSection(next);
  });
}

function setupEventListeners() {
  // Provider cards
  let cards = document.querySelectorAll('.opt-provider-card');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      let radio = card.querySelector('input[type="radio"]');
      if (!radio) return;
      radio.checked = true;
      onPresetChange(radio.value);
      updateProviderCards();
    });
  });

  // Temperature slider
  $('temperature').addEventListener('input', function() {
    $('tempValue').textContent = this.value;
  });

  // Thinking mode -> temp field state
  let thinkingModeSelect = $('thinkingMode');
  if (thinkingModeSelect) {
    thinkingModeSelect.addEventListener('change', updateTempFieldState);
  }
  if ($('uiTheme')) {
    $('uiTheme').addEventListener('change', function() {
      applyUiTheme(this.value || 'auto');
    });
  }
  ['subtitleMode', 'subtitleStyle', 'subtitlePosition', 'subtitleFontSize'].forEach(function(id) {
    const el = $(id);
    if (el) el.addEventListener('input', updateSubtitlePreview);
    if (el) el.addEventListener('change', updateSubtitlePreview);
  });

  // Toggle API key visibility
  $('toggle-key-vis').addEventListener('click', function() {
    let el = $('apiKey');
    let btn = $('toggle-key-vis');
    if (el.type === 'password') {
      el.type = 'text';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      btn.title = 'Hide';
    } else {
      el.type = 'password';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      btn.title = 'Show';
    }
  });

  // Hover subfield
  let hoverCheck = $('enableHover');
  let hoverSubfield = $('hoverSubfield');
  let hoverModeSelect = $('hoverMode');
  let hoverKeySelect = $('hoverKey');
  let privacyCheck = $('privacyMasking');
  let privacySubfield = $('privacySubfield');
  let subtitleCheck = $('enableSubtitle');
  let subtitleSubfield = $('subtitleSubfield');

  function updateHoverFields() {
    let show = hoverCheck.checked;
    hoverSubfield.style.display = show ? 'flex' : 'none';
    if (hoverKeySelect) {
      hoverKeySelect.parentElement.style.display = (show && hoverModeSelect && hoverModeSelect.value === 'key') ? 'flex' : 'none';
    }
  }
  hoverCheck.addEventListener('change', updateHoverFields);
  if (hoverModeSelect) hoverModeSelect.addEventListener('change', updateHoverFields);
  updateHoverFields();

  function updatePrivacyFields() {
    if (!privacyCheck || !privacySubfield) return;
    privacySubfield.style.display = privacyCheck.checked ? 'grid' : 'none';
  }
  if (privacyCheck) privacyCheck.addEventListener('change', updatePrivacyFields);
  updatePrivacyFields();

  function updateSubtitleFields() {
    if (!subtitleCheck || !subtitleSubfield) return;
    subtitleSubfield.hidden = !subtitleCheck.checked;
    updateSubtitlePreview();
  }
  if (subtitleCheck) subtitleCheck.addEventListener('change', updateSubtitleFields);
  updateSubtitleFields();

  // ---- Glossary: Structured Terms UI ----
  var addTermBtn = $('add-term-row');
  if (addTermBtn) {
    addTermBtn.addEventListener('click', function() {
      var list = $('terms-list');
      if (list) addTermRow(list, { pattern: '', replacement: '', regex: false });
    });
  }

  var importTermsBtn = $('import-terms-json');
  var importTermsFile = $('terms-import-file');
  if (importTermsBtn && importTermsFile) {
    importTermsBtn.addEventListener('click', function() {
      importTermsFile.click();
    });
    importTermsFile.addEventListener('change', function() {
      var file = importTermsFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          var terms = Array.isArray(data) ? data : (data.terms || []);
          renderTermRows(terms);
          if (data.aiTerms) setVal('aiTermsText', formatAiTermsText(data.aiTerms));
          showStatus('save-status', I18N.t('status_imported_terms').replace('{{count}}', String(terms.length)), 'success');
        } catch(err) {
          showStatus('save-status', I18N.t('status_invalid_json'), 'error');
        }
      };
      reader.readAsText(file);
      importTermsFile.value = '';
    });
  }

  var exportTermsBtn = $('export-terms-json');
  if (exportTermsBtn) {
    exportTermsBtn.addEventListener('click', function() {
      var terms = readTermRows();
      var aiTerms = parseAiTermsText(getVal('aiTermsText'));
      var exportData = { terms: terms, aiTerms: aiTerms };
      var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'llm-translate-glossary.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  var addSiteTermBtn = $('add-site-term-row');
  if (addSiteTermBtn) {
    addSiteTermBtn.addEventListener('click', function() {
      var list = $('site-terms-list');
      if (list) addSiteTermRow(list, { domains: '', pattern: '', replacement: '', regex: false });
    });
  }

  // Save
  $('save-settings').addEventListener('click', async function() {
    let saveBtn = $('save-settings');
    saveBtn.disabled = true;
    let settings = readSettingsFromUI();
    try {
      await chrome.runtime.sendMessage({ action: 'set-settings', settings: settings });
      currentSettings = settings;
      showStatus('save-status', I18N.t('save_success'), 'success');
      // Push theme/style changes to web page tabs (not this options page)
      try {
        let allTabs = await chrome.tabs.query({ currentWindow: true, url: ['http://*/*', 'https://*/*'] });
        for (let tab of allTabs) {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { action: 'update-theme', settings: settings }).catch(function(){});
        }
      } catch(e) {}
    } catch(err) {
      showStatus('save-status', I18N.t('save_error') + ': ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Reset
  $('reset-settings').addEventListener('click', async function() {
    if (!confirm(I18N.t('reset_confirm'))) return;
    currentSettings = Object.assign({}, DEFAULT_SETTINGS);
    determinePreset(currentSettings);
    populateFields(currentSettings);
    await chrome.runtime.sendMessage({ action: 'set-settings', settings: currentSettings });
    showStatus('save-status', I18N.t('reset_success'), 'success');
  });

  // Test connection
  $('test-connection').addEventListener('click', async function() {
    let testBtn = $('test-connection');
    testBtn.disabled = true;
    let settings = readSettingsFromUI();
    let resultEl = $('test-result');
    let diagnosticEl = $('provider-diagnostic');
    resultEl.textContent = I18N.t('test_testing');
    resultEl.className = 'opt-status-badge';
    if (diagnosticEl) {
      diagnosticEl.hidden = true;
      diagnosticEl.className = 'opt-diagnostic';
      diagnosticEl.textContent = '';
    }

    try {
      const diagnostic = await diagnoseLocalProvider(settings);
      if (diagnosticEl && diagnostic) {
        diagnosticEl.hidden = false;
        diagnosticEl.classList.add(diagnostic.ok ? 'success' : 'warn');
        diagnosticEl.textContent = diagnostic.message;
      }
      let api = new LLMAPI(settings);
      let translated = await api.translate('Hello', 'en', 'zh-CN');
      resultEl.textContent = I18N.t('test_success') + ' -> ' + translated;
      resultEl.className = 'opt-status-badge success';
    } catch(err) {
      resultEl.textContent = I18N.t('test_failed_prefix') + err.message;
      resultEl.className = 'opt-status-badge error';
    } finally {
      testBtn.disabled = false;
    }
  });

  // Log viewer
  $('log-level-filter').addEventListener('change', function() { refreshLogPanel(); });
  $('log-search').addEventListener('input', debounce(function() { refreshLogPanel(); }, 300));
  $('log-refresh').addEventListener('click', function() { refreshLogPanel(); });
  $('log-copy').addEventListener('click', async function() {
    let logs = await getFilteredLogsForPanel();
    let text = logs.map(formatLogLine).join('\n');
    await navigator.clipboard.writeText(text);
    showStatus('save-status', I18N.t('status_logs_copied'), 'success');
  });
  $('log-export').addEventListener('click', async function() {
    let logs = await getFilteredLogsForPanel();
    let blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'llm-translate-logs.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  $('log-clear').addEventListener('click', async function() {
    if (typeof LOG !== 'undefined') await LOG.clearLogs();
    else await chrome.runtime.sendMessage({ action: 'clear-logs' });
    refreshLogPanel();
  });

  // Open shortcuts page
  let openShortcutsBtn = $('open-shortcuts');
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  // Auto-refresh logs
  let logRefreshInterval = null;
  let observer = new MutationObserver(function() {
    let logsPanel = $('logs');
    if (logsPanel && logsPanel.classList.contains('active')) {
      if (!logRefreshInterval) {
        refreshLogPanel();
        logRefreshInterval = setInterval(refreshLogPanel, 2000);
      }
    } else {
      if (logRefreshInterval) { clearInterval(logRefreshInterval); logRefreshInterval = null; }
    }
  });
  let logsPanel = $('logs');
  if (logsPanel) observer.observe(logsPanel, { attributes: true, attributeFilter: ['class'] });

  // Export
  $('export-settings').addEventListener('click', async function() {
    let res = await chrome.runtime.sendMessage({ action: 'get-settings' });
    let blob = new Blob([JSON.stringify(res.settings, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url; a.download = 'llm-translate-settings.json'; a.click();
    URL.revokeObjectURL(url);
    showStatus('data-status', I18N.t('status_settings_exported'), 'success');
  });

  // Import
  $('import-settings').addEventListener('click', function() { $('import-file').click(); });
  $('import-file').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (!file) return;
    try {
      let text = await file.text();
      let imported = JSON.parse(text);
      await chrome.runtime.sendMessage({ action: 'set-settings', settings: imported });
      currentSettings = Object.assign({}, DEFAULT_SETTINGS, imported);
      determinePreset(currentSettings);
      populateFields(currentSettings);
      showStatus('data-status', I18N.t('import_success'), 'success');
    } catch(err) {
      showStatus('data-status', I18N.t('import_failed') + ': ' + err.message, 'error');
    }
  });

  // Clear cache (with i18n confirm)
  $('clear-cache').addEventListener('click', async function() {
    let msg = I18N.t('clear_cache_confirm') || 'Clear all translation cache and reset all translated pages?';
    if (!confirm(msg)) return;
    try {
      await chrome.runtime.sendMessage({ action: 'clear-cache' });
      try {
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-translation' }).catch(function(){});
        }
      } catch(e) {}
      showStatus('data-status', I18N.t('cache_cleared') || 'Cache cleared', 'success');
    } catch(err) {
      showStatus('data-status', 'Failed: ' + err.message, 'error');
    }
  });

  // UI Language switch
  $('lang-switch').addEventListener('click', function() {
    let newLang = I18N.lang === 'zh-CN' ? 'en' : 'zh-CN';
    I18N.setLang(newLang);
    I18N.localizeContainer(document.querySelector('.opt-page'));
    if (globalThis.CustomSelect) CustomSelect.refreshAll(document);
    $('lang-switch-text').textContent = newLang === 'zh-CN' ? 'EN' : '\u4e2d';
    populateFields(currentSettings);
  });
}

function onPresetChange(presetVal) {
  let oldPreset = currentPreset;
  currentPreset = presetVal;
  let preset = PRESETS[presetVal];
  if (!preset) return;

  // Save current key to old provider
  let oldProvider = getProviderFromPreset(oldPreset);
  let currentKey = getVal('apiKey').trim();
  if (oldProvider && currentSettings.apiKeys) {
    currentSettings.apiKeys[oldProvider] = currentKey;
  }

  setVal('baseURL', preset.baseURL);
  setVal('model', preset.model);
  if (preset.thinkingMode !== undefined) setVal('thinkingMode', preset.thinkingMode);
  if (preset.provider === 'deepseek') {
    setChecked('largeTextMode', true);
    setVal('maxChars', preset.model === 'deepseek-v4-flash' ? '16000' : '12000');
    setVal('maxConcurrency', preset.model === 'deepseek-v4-flash' ? '8' : '6');
  } else if (preset.provider === 'hunyuan') {
    setChecked('largeTextMode', true);
    setVal('maxChars', '4000');
    setVal('maxConcurrency', '1');
  }

  // Load saved key for new provider
  let newProvider = getProviderFromPreset(presetVal);
  let savedKey = (currentSettings.apiKeys && currentSettings.apiKeys[newProvider]) || preset.apiKey || '';
  setVal('apiKey', savedKey);
  updateApiKeyRequirement(newProvider);

  // Toggle thinking field
  let thinkingField = $('thinkingField');
  if (thinkingField) {
    thinkingField.style.display = (newProvider === 'deepseek' || newProvider === 'zhipu') ? 'block' : 'none';
  }
  updateTempFieldState();
  updateProviderCards();
}

function updateApiKeyRequirement(provider) {
  let keyInput = $('apiKey');
  if (!keyInput) return;
  let needsKey = typeof providerNeedsApiKey === 'function' ? providerNeedsApiKey(provider) : provider !== 'ollama' && provider !== 'hunyuan' && provider !== 'lmstudio' && provider !== 'custom' && provider !== 'google';
  keyInput.placeholder = needsKey ? 'sk-...' : 'Optional';
}

function updateTempFieldState() {
  let thinkingMode = getVal('thinkingMode');
  let tempEl = $('temperature');
  let tempLabel = document.querySelector('label[for="temperature"]');
  if (thinkingMode === 'enabled') {
    if (tempEl) { tempEl.disabled = true; tempEl.style.opacity = '0.5'; }
    if (tempLabel) tempLabel.textContent = (I18N.t('temperature_label') || 'Temperature') + ' (disabled)';
  } else {
    if (tempEl) { tempEl.disabled = false; tempEl.style.opacity = '1'; }
    if (tempLabel) tempLabel.textContent = I18N.t('temperature_label') || 'Temperature';
  }
}

const _statusTimers = {};
function showStatus(elId, text, type) {
  let el = $(elId);
  if (!el) return;
  if (_statusTimers[elId]) clearTimeout(_statusTimers[elId]);
  el.textContent = text;
  el.className = 'opt-status-badge ' + type;
  _statusTimers[elId] = setTimeout(function() { el.textContent = ''; el.className = 'opt-status-badge'; }, 3000);
}

// ---- Log Panel ----
async function refreshLogPanel() {
  let logContainer = $('log-entries');
  if (!logContainer) return;

  let autoScroll = ($('log-auto-scroll') && $('log-auto-scroll').checked !== undefined) ? $('log-auto-scroll').checked : true;

  try {
    let logs = await getFilteredLogsForPanel();
    updateLogSummary(logs);

    if (logs.length === 0) {
      logContainer.innerHTML = '<div class="opt-log-empty">' + (I18N.t('log_empty') || 'No logs yet.') + '</div>';
      return;
    }

    let prevScrollTop = logContainer.scrollTop;
    let wasAtBottom = (prevScrollTop + logContainer.clientHeight) >= (logContainer.scrollHeight - 10);

    logContainer.innerHTML = logs.map(function(l) {
      let levelClass = 'log-' + (l.level || 'info').toUpperCase();
      let dataDisplay = l.data ? '<div class="log-data">' + escapeHtmlLog(l.data) + '</div>' : '';
      return '<div class="log-entry ' + levelClass + '">' +
        '<span class="log-time">' + escapeHtmlLog(l.time || '') + '</span>' +
        '<span class="log-level">' + escapeHtmlLog(l.level || '') + '</span>' +
        '<span class="log-tag">[' + escapeHtmlLog(l.tag || '') + ']</span>' +
        '<span class="log-msg">' + escapeHtmlLog(l.message || '') + '</span>' +
        dataDisplay + '</div>';
    }).join('');

    if (autoScroll && wasAtBottom) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  } catch(err) {
    logContainer.innerHTML = '<div class="opt-log-empty">Error: ' + escapeHtmlLog(err.message) + '</div>';
  }
}

async function getFilteredLogsForPanel() {
  let levelFilter = ($('log-level-filter') && $('log-level-filter').value) || 'ALL';
  let searchFilter = ($('log-search') && $('log-search').value) || '';
  let filter = {};
  if (levelFilter !== 'ALL') filter.level = levelFilter;
  if (searchFilter) filter.search = searchFilter;
  let res = await chrome.runtime.sendMessage({ action: 'get-logs', filter: filter });
  return res.logs || [];
}

function updateLogSummary(logs) {
  let total = logs.length;
  let errors = logs.filter(l => l.level === 'ERROR').length;
  let warns = logs.filter(l => l.level === 'WARN').length;
  let api = logs.filter(l => ['API', 'Batch', 'Translate', 'Google', 'TranslateQueue'].includes(l.tag)).length;
  if ($('log-count-total')) $('log-count-total').textContent = total;
  if ($('log-count-error')) $('log-count-error').textContent = errors;
  if ($('log-count-warn')) $('log-count-warn').textContent = warns;
  if ($('log-count-api')) $('log-count-api').textContent = api;
}

function formatLogLine(l) {
  return '[' + (l.time || '') + '] [' + (l.level || '') + '] [' + (l.tag || '') + '] ' + (l.message || '') + (l.data ? ' ' + l.data : '');
}

function escapeHtmlLog(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
