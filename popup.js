(async function() {
  I18N.init();

  /* ---- DOM refs ---- */
  const $ = (id) => document.getElementById(id);

  const btnTranslate = $('btn-translate');
  const btnRestore = $('btn-restore');
  const btnToggleMode = $('btn-toggle-mode');
  const btnTranslateBottom = $('btn-translate-bottom');
  const btnHoverToggle = $('btn-hover-toggle');
  const btnSidePanel = $('btn-side-panel');
  const statusText = $('status-text');
  const statusDot = $('status-dot');
  const actionCard = $('action-card');
  const modeLabel = $('mode-label');
  const hoverToggleLabel = $('hover-toggle-label');
  const modeBilingual = $('mode-bilingual');
  const modeReplace = $('mode-replace');
  const linkOptions = $('link-options');
  const targetLangSelect = $('target-lang-select');
  const langSwitch = $('lang-switch');
  const langSwitchText = $('lang-switch-text');
  const providerDesc = $('provider-desc');
  const appVersion = $('app-version');
  const scTranslateBtn = $('sc-translate-btn');
  const scHoverBtn = $('sc-hover-btn');
  const engineName = $('engine-name');
  const providerHealth = $('provider-health');
  const openDiagnostics = $('open-diagnostics');
  const providerPresetSelect = $('provider-preset-select');
  const modelInput = $('model-input');
  const subtitleEnable = $('subtitle-enable');
  const subtitleModeSelect = $('subtitle-mode-select');
  const subtitleStyleSelect = $('subtitle-style-select');
  const subtitleTrackSelect = $('subtitle-track-select');
  const subtitleScopeSelect = $('subtitle-scope-select');
  const siteCard = $('site-card');
  const siteHostEl = $('site-host');
  const siteTermsChip = $('site-terms-chip');
  const siteRulesChip = $('site-rules-chip');
  const siteExcludedChip = $('site-excluded-chip');
  const addSiteTerms = $('add-site-terms');
  const excludeSite = $('exclude-site');
  const openSiteSettings = $('open-site-settings');
  const advancedSummary = $('advanced-summary');

  /* ---- State ---- */
  let settings = null;
  let pageTranslated = false;
  let currentTabInfo = null;
  let currentHost = '';

  /* ---- Init ---- */
  I18N.localizeContainer(document.querySelector('.popup-root'));
  if (globalThis.CustomSelect) CustomSelect.initAll(document);
  langSwitchText.textContent = I18N.lang === 'zh-CN' ? 'EN' : '\u4e2d';

  // Read version from manifest
  try {
    const manifest = chrome.runtime.getManifest();
    if (appVersion) appVersion.textContent = 'v' + manifest.version;
  } catch(e) {}

  await loadSettings();
  applyUiTheme(settings?.uiTheme || 'auto');
  await loadCurrentSite();
  await checkPageStatus();

  /* ---- Load settings ---- */
  async function loadSettings() {
    const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
    settings = res.settings || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS : {});
    applySettingsToUI();
  }

  function applySettingsToUI() {
    if (!settings) return;
    applyUiTheme(settings.uiTheme || 'auto');
    // Target language
    if (targetLangSelect) targetLangSelect.value = settings.targetLang || 'zh-CN';
    // Display mode
    updateModeUI();
    // Provider subtitle
    updateProviderSubtitle();
    updateInsightCards();
    updateProviderHealth();
    updateQuickConfigUI();
    // Hover toggle state
    updateHoverToggleUI();
    // Shortcut kbd display
    if (scTranslateBtn) {
      const translateKbd = (settings.keyboardShortcuts && settings.keyboardShortcuts.translatePage) || 'alt+t';
      const hoverKbd = (settings.keyboardShortcuts && settings.keyboardShortcuts.toggleHover) || 'alt+h';
      scTranslateBtn.querySelector('kbd').textContent = formatKbd(translateKbd);
      scHoverBtn.querySelector('kbd').textContent = formatKbd(hoverKbd);
    }
  }

  function determinePresetFromSettings(s) {
    if (!s) return 'deepseek-v4-flash';
    if (s.provider === 'deepseek') return s.model === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
    if (s.provider === 'zhipu') return 'glm-4.7-flash';
    return s.provider || 'custom';
  }

  function updateQuickConfigUI() {
    if (providerPresetSelect) providerPresetSelect.value = determinePresetFromSettings(settings);
    if (modelInput) modelInput.value = settings.model || '';
    if (subtitleEnable) subtitleEnable.checked = settings.enableSubtitle !== false;
    if (subtitleModeSelect) subtitleModeSelect.value = settings.subtitleMode || 'bilingual';
    if (subtitleStyleSelect) subtitleStyleSelect.value = settings.subtitleStyle || 'cinema';
    if (subtitleTrackSelect) subtitleTrackSelect.value = settings.subtitleTrackPreference || 'manual';
    if (subtitleScopeSelect) subtitleScopeSelect.value = settings.subtitleTranslateScope || 'nearby';
    if (globalThis.CustomSelect) CustomSelect.refreshAll(document);
    updateAdvancedSummary();
  }

  function updateAdvancedSummary() {
    if (!advancedSummary || !settings) return;
    const provider = typeof getProviderName === 'function' ? getProviderName(settings.provider) : (settings.provider || 'Provider');
    const subtitle = settings.enableSubtitle === false
      ? I18N.t('popup_sub_off')
      : ((settings.subtitleMode || 'bilingual') === 'translation' ? I18N.t('popup_sub_translation') : I18N.t('popup_sub_bilingual'));
    advancedSummary.textContent = provider + ' · ' + subtitle;
  }

  async function saveSettingsAndNotify() {
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    updateProviderSubtitle();
    updateInsightCards();
    updateProviderHealth();
    updateAdvancedSummary();
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'update-theme', settings }).catch(function(){});
    }
  }

  async function loadCurrentSite() {
    try {
      currentTabInfo = await getCurrentTab();
      currentHost = getTabHost(currentTabInfo);
    } catch (e) {
      currentTabInfo = null;
      currentHost = '';
    }
    updateSiteCard();
  }

  function getTabHost(tab) {
    try {
      const url = new URL(tab?.url || '');
      if (!/^https?:$/.test(url.protocol)) return '';
      return url.hostname;
    } catch (e) {
      return '';
    }
  }

  function updateSiteCard() {
    if (!siteCard) return;
    const hasHost = !!currentHost;
    siteCard.classList.toggle('is-disabled', !hasHost);
    if (siteHostEl) siteHostEl.textContent = hasHost ? currentHost : 'No active website';
    const siteTerms = getMatchingSiteTerms();
    const siteRule = hasHost && typeof getSiteRule === 'function' ? getSiteRule(currentTabInfo?.url || '', settings) : null;
    const excluded = hasHost && isCurrentHostExcluded();
    setChip(siteTermsChip, 'popup_terms_label', siteTerms.length ? siteTerms.length + ' ' + I18N.t('popup_bound') : I18N.t('popup_none'), siteTerms.length ? 'ok' : '');
    setChip(siteRulesChip, 'popup_rules_label', siteRule?.matchedIds?.length ? siteRule.matchedIds.length + ' ' + I18N.t('popup_matched') : I18N.t('popup_none'), siteRule?.matchedIds?.length ? 'ok' : '');
    setChip(siteExcludedChip, 'popup_excluded_label', excluded ? I18N.t('popup_yes') : I18N.t('popup_no'), excluded ? 'warn' : '');
    if (addSiteTerms) addSiteTerms.disabled = !hasHost;
    if (excludeSite) {
      excludeSite.disabled = !hasHost || excluded;
      excludeSite.textContent = excluded ? I18N.t('popup_already_excluded') : I18N.t('popup_exclude_action');
    }
    if (openSiteSettings) openSiteSettings.disabled = !hasHost;
  }

  function setChip(el, label, value, tone) {
    if (!el) return;
    el.textContent = I18N.t(label) + ': ' + value;
    el.classList.remove('is-ok', 'is-warn');
    if (tone === 'ok') el.classList.add('is-ok');
    if (tone === 'warn') el.classList.add('is-warn');
  }

  function getMatchingSiteTerms() {
    const siteTerms = Array.isArray(settings?.siteTerms) ? settings.siteTerms : [];
    if (!currentHost) return [];
    return siteTerms.filter(function(term) {
      const domains = String(term.domains || '').split(/[\n,]+/).map(function(item) { return item.trim().toLowerCase(); }).filter(Boolean);
      return domains.some(function(domain) {
        const clean = domain.replace(/^\*\./, '');
        return currentHost === clean || currentHost.endsWith('.' + clean);
      });
    });
  }

  function isCurrentHostExcluded() {
    const sites = Array.isArray(settings?.excludedSites) ? settings.excludedSites : [];
    const host = currentHost.toLowerCase();
    return sites.some(function(site) {
      const clean = String(site || '').trim().toLowerCase().replace(/^\*\./, '');
      return clean && (host === clean || host.endsWith('.' + clean));
    });
  }

  async function openOptionsSection(section) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('options.html#' + section) });
  }

  function applyUiTheme(theme) {
    document.documentElement.classList.remove('t-light', 't-dark');
    if (theme === 'light') document.documentElement.classList.add('t-light');
    if (theme === 'dark') document.documentElement.classList.add('t-dark');
  }

  function formatKbd(str) {
    return str.split('+').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('+');
  }

  function updateProviderSubtitle() {
    if (!providerDesc) return;
    const name = typeof getProviderName === 'function'
      ? getProviderName(settings.provider)
      : (settings.provider || 'Unknown');
    const modelShort = settings.model ? settings.model.replace(/^(deepseek-|glm-|claude-)/, '') : '';
    const hasKey = typeof getEffectiveApiKey === 'function'
      ? getEffectiveApiKey(settings)
      : (settings.apiKey || (settings.apiKeys && settings.apiKeys[settings.provider]));
    const needsKey = typeof providerNeedsApiKey === 'function'
      ? providerNeedsApiKey(settings.provider)
      : (settings.provider !== 'ollama' && settings.provider !== 'hunyuan' && settings.provider !== 'lmstudio' && settings.provider !== 'custom' && settings.provider !== 'google');
    // Only show (No Key) for providers that actually need it
    const keyWarning = (needsKey && !hasKey) ? ' - ' + I18N.t('no_api_key') : '';
    providerDesc.textContent = modelShort ? (name + ' · ' + modelShort + keyWarning) : (name + keyWarning);
    providerDesc.title = (needsKey && !hasKey) ? I18N.t('api_key_missing_title') : '';
    providerDesc.style.color = (needsKey && !hasKey) ? 'var(--s-error)' : '';
  }

  function updateInsightCards() {
    if (!settings) return;
    if (engineName) {
      engineName.textContent = typeof getProviderName === 'function'
        ? getProviderName(settings.provider)
        : (settings.provider || '-');
    }
  }

  async function updateProviderHealth() {
    if (!providerHealth || !settings) return;
    try {
      const res = await chrome.runtime.sendMessage({ action: 'get-provider-status' });
      const status = (res.status || {})[settings.provider];
      if (!status) {
        providerHealth.textContent = I18N.t('provider_health_untested');
        providerHealth.style.color = 'var(--text-muted)';
        return;
      }
      providerHealth.textContent = status.ok ? I18N.t('provider_health_ok') : I18N.t('provider_health_error');
      providerHealth.title = status.message || '';
      providerHealth.style.color = status.ok ? 'var(--s-success)' : 'var(--s-error)';
    } catch (e) {
      providerHealth.textContent = I18N.t('provider_health_unknown');
    }
  }

  function updateModeUI() {
    if (settings.displayMode === 'replace') {
      modeReplace.classList.add('active');
      modeReplace.setAttribute('aria-checked', 'true');
      modeBilingual.classList.remove('active');
      modeBilingual.setAttribute('aria-checked', 'false');
      if (modeLabel) modeLabel.textContent = I18N.t('mode_replace_short') || I18N.t('mode_replace');
    } else {
      modeBilingual.classList.add('active');
      modeBilingual.setAttribute('aria-checked', 'true');
      modeReplace.classList.remove('active');
      modeReplace.setAttribute('aria-checked', 'false');
      if (modeLabel) modeLabel.textContent = I18N.t('mode_bilingual_short') || I18N.t('mode_bilingual');
    }
  }

  function updateHoverToggleUI() {
    if (!hoverToggleLabel || !btnHoverToggle) return;
    if (settings.enableHover) {
      hoverToggleLabel.textContent = I18N.t('hover_on');
      btnHoverToggle.classList.add('is-active');
    } else {
      hoverToggleLabel.textContent = I18N.t('hover_off_short');
      btnHoverToggle.classList.remove('is-active');
    }
  }

  /* ---- Tab helpers ---- */
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function sendTabMessage(msg, retries = 2) {
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await chrome.tabs.sendMessage(tab.id, msg);
        } catch (err) {
          if (attempt < retries) {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId: tab.id }).catch(function(){});
            await wait(400 + attempt * 200);
          } else {
            // Last attempt: inject then try one final time
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId: tab.id }).catch(function(){});
            await wait(600);
            return await chrome.tabs.sendMessage(tab.id, msg);
          }
        }
      }
    }
    return null;
  }

  async function checkPageStatus() {
    try {
      const res = await sendTabMessage({ action: 'get-status' });
      pageTranslated = res && res.pageTranslated || false;
      updatePageStatusUI();
    } catch (e) {
      statusText.textContent = I18N.t('status_ready');
      actionCard.classList.remove('is-translated');
    }
  }

  function updatePageStatusUI() {
    if (pageTranslated) {
      btnTranslate.classList.add('hidden');
      btnRestore.classList.remove('hidden');
      statusDot.className = 'pop-status-dot';
      statusText.textContent = I18N.t('status_translated');
      actionCard.classList.add('is-translated');
    } else {
      btnTranslate.classList.remove('hidden');
      btnRestore.classList.add('hidden');
      statusDot.className = 'pop-status-dot';
      statusText.textContent = I18N.t('status_ready');
      actionCard.classList.remove('is-translated');
    }
  }

  function setStatus(state) {
    statusDot.className = 'pop-status-dot ' + state;
    if (state === 'is-translating') {
      statusText.textContent = I18N.t('status_translating');
    } else if (state === 'is-error') {
      statusText.textContent = I18N.t('status_error');
    }
  }

  /* ---- Translate ---- */
  btnTranslate.addEventListener('click', async () => {
    btnTranslate.disabled = true;
    setStatus('is-translating');
    try {
      const res = await sendTabMessage({ action: 'translate-page' });
      if (res && res.success) {
        pageTranslated = res.pageTranslated !== undefined ? res.pageTranslated : true;
        updateProviderHealth();
        updatePageStatusUI();
      } else {
        statusText.textContent = (res && res.error) || I18N.t('status_error');
        if (typeof LOG !== 'undefined') LOG.warn('Popup', 'Translate page returned no success', res || {});
        updateProviderHealth();
        setStatus('is-error');
        setTimeout(updatePageStatusUI, 3000);
      }
    } catch (e) {
      statusText.textContent = I18N.t('cannot_translate') + ': ' + (e.message || '');
      setStatus('is-error');
      setTimeout(updatePageStatusUI, 3000);
    } finally {
      btnTranslate.disabled = false;
    }
  });

  /* ---- Restore ---- */
  btnRestore.addEventListener('click', async () => {
    btnRestore.disabled = true;
    setStatus('is-translating');
    try {
      const res = await sendTabMessage({ action: 'toggle-translation' });
      if (res && res.success) {
        pageTranslated = res.pageTranslated !== undefined ? res.pageTranslated : false;
        updatePageStatusUI();
      } else {
        statusText.textContent = (res && res.error) || I18N.t('status_error');
        setStatus('is-error');
        setTimeout(updatePageStatusUI, 3000);
      }
    } catch (e) {
      statusText.textContent = I18N.t('cannot_translate') + ': ' + (e.message || '');
      setStatus('is-error');
      setTimeout(updatePageStatusUI, 3000);
    } finally {
      btnRestore.disabled = false;
    }
  });

  /* ---- Quick toggle mode ---- */
  btnToggleMode.addEventListener('click', async () => {
    settings.displayMode = settings.displayMode === 'replace' ? 'bilingual' : 'replace';
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    updateModeUI();
    updateInsightCards();
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'update-theme', ...settings }).catch(function(){});
    }
  });

  if (providerPresetSelect) {
    providerPresetSelect.addEventListener('change', async () => {
      const preset = (typeof PROVIDER_PRESETS !== 'undefined' && PROVIDER_PRESETS[providerPresetSelect.value]) || null;
      if (!preset) return;
      settings.provider = preset.provider;
      settings.baseURL = preset.baseURL;
      settings.model = preset.model;
      if (preset.thinkingMode) settings.thinkingMode = preset.thinkingMode;
      if (modelInput) modelInput.value = settings.model || '';
      await saveSettingsAndNotify();
    });
  }

  if (modelInput) {
    modelInput.addEventListener('change', async () => {
      settings.model = modelInput.value.trim();
      await saveSettingsAndNotify();
    });
  }

  async function saveSubtitleSetting(key, value) {
    settings[key] = value;
    await saveSettingsAndNotify();
  }

  if (subtitleEnable) subtitleEnable.addEventListener('change', () => saveSubtitleSetting('enableSubtitle', subtitleEnable.checked));
  if (subtitleModeSelect) subtitleModeSelect.addEventListener('change', () => saveSubtitleSetting('subtitleMode', subtitleModeSelect.value));
  if (subtitleStyleSelect) subtitleStyleSelect.addEventListener('change', () => saveSubtitleSetting('subtitleStyle', subtitleStyleSelect.value));
  if (subtitleTrackSelect) subtitleTrackSelect.addEventListener('change', () => saveSubtitleSetting('subtitleTrackPreference', subtitleTrackSelect.value));
  if (subtitleScopeSelect) subtitleScopeSelect.addEventListener('change', () => saveSubtitleSetting('subtitleTranslateScope', subtitleScopeSelect.value));

  /* ---- Translate to bottom ---- */
  btnTranslateBottom.addEventListener('click', async () => {
    btnTranslateBottom.disabled = true;
    setStatus('is-translating');
    try {
      const res = await sendTabMessage({ action: 'translate-to-bottom' });
      if (res && res.success) {
        pageTranslated = true;
        updatePageStatusUI();
      }
    } catch (e) {
      setStatus('is-error');
      setTimeout(updatePageStatusUI, 3000);
    } finally {
      btnTranslateBottom.disabled = false;
    }
  });

  /* ---- Hover toggle ---- */
  btnHoverToggle.addEventListener('click', async () => {
    settings.enableHover = !settings.enableHover;
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    updateHoverToggleUI();
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle-hover' }).catch(function(){});
    }
  });

  if (btnSidePanel) {
    btnSidePanel.addEventListener('click', async () => {
      try {
        const tab = await getCurrentTab();
        if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } else {
          await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
        }
      } catch (e) {
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
      }
    });
  }

  /* ---- Segmented mode buttons ---- */
  modeBilingual.addEventListener('click', async () => {
    if (settings.displayMode === 'bilingual') return;
    settings.displayMode = 'bilingual';
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    updateModeUI();
    updateInsightCards();
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'update-theme', ...settings }).catch(function(){});
    }
  });

  modeReplace.addEventListener('click', async () => {
    if (settings.displayMode === 'replace') return;
    settings.displayMode = 'replace';
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    updateModeUI();
    updateInsightCards();
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'update-theme', ...settings }).catch(function(){});
    }
  });

  /* ---- Target language change ---- */
  targetLangSelect.addEventListener('change', async () => {
    settings.targetLang = targetLangSelect.value;
    await chrome.runtime.sendMessage({ action: 'set-settings', settings });
    const tab = await getCurrentTab();
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'update-theme', ...settings }).catch(function(){});
    }
    // Re-translate if page was translated
    if (pageTranslated && tab && tab.id) {
      pageTranslated = false;
      updatePageStatusUI();
      setStatus('is-translating');
      const res = await sendTabMessage({ action: 'toggle-translation' });
      if (res && res.success) {
        await wait(400);
        const res2 = await sendTabMessage({ action: 'translate-page' });
        if (res2 && res2.success) {
          pageTranslated = true;
          updateProviderHealth();
        }
      }
      updatePageStatusUI();
    }
  });

  /* ---- UI Language switch ---- */
  langSwitch.addEventListener('click', function() {
    var newLang = I18N.lang === 'zh-CN' ? 'en' : 'zh-CN';
    I18N.setLang(newLang);
    I18N.localizeContainer(document.querySelector('.popup-root'));
    if (globalThis.CustomSelect) CustomSelect.refreshAll(document);
    langSwitchText.textContent = newLang === 'zh-CN' ? 'EN' : '\u4e2d';
    updatePageStatusUI();
    updateProviderSubtitle();
    updateSiteCard();
  });

  if (addSiteTerms) {
    addSiteTerms.addEventListener('click', async () => {
      if (!currentHost) return;
      const terms = Array.isArray(settings.siteTerms) ? settings.siteTerms.slice() : [];
      const exists = getMatchingSiteTerms().length > 0;
      if (!exists) {
        terms.push({ domains: currentHost, pattern: '', replacement: '', regex: false });
        settings.siteTerms = terms;
        await saveSettingsAndNotify();
      }
      updateSiteCard();
      await openOptionsSection('glossary');
    });
  }

  if (excludeSite) {
    excludeSite.addEventListener('click', async () => {
      if (!currentHost || isCurrentHostExcluded()) return;
      const excluded = Array.isArray(settings.excludedSites) ? settings.excludedSites.slice() : [];
      excluded.push(currentHost);
      settings.excludedSites = [...new Set(excluded)];
      await saveSettingsAndNotify();
      updateSiteCard();
    });
  }

  if (openSiteSettings) {
    openSiteSettings.addEventListener('click', async () => {
      await openOptionsSection('sites');
    });
  }

  /* ---- Shortcut buttons: open browser shortcut settings ---- */
  scTranslateBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
  scHoverBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  if (openDiagnostics) {
    openDiagnostics.addEventListener('click', function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html#logs') });
      if (typeof LOG !== 'undefined') LOG.info('Popup', 'Diagnostics opened from popup');
    });
  }

  /* ---- Settings link ---- */
  linkOptions.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

})();
