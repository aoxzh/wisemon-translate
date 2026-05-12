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
  const insightMode = $('insight-mode');
  const providerHealth = $('provider-health');
  const openDiagnostics = $('open-diagnostics');

  /* ---- State ---- */
  let settings = null;
  let pageTranslated = false;

  /* ---- Init ---- */
  I18N.localizeContainer(document.querySelector('.popup-root'));
  langSwitchText.textContent = I18N.lang === 'zh-CN' ? 'EN' : '中';

  // Read version from manifest
  try {
    const manifest = chrome.runtime.getManifest();
    if (appVersion) appVersion.textContent = 'v' + manifest.version;
  } catch(e) {}

  await loadSettings();
  applyUiTheme(settings?.uiTheme || 'auto');
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
      : (settings.provider !== 'ollama' && settings.provider !== 'custom' && settings.provider !== 'google');
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
    if (insightMode) insightMode.textContent = settings.displayMode === 'replace' ? I18N.t('mode_replace') : I18N.t('mode_bilingual');
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
    langSwitchText.textContent = newLang === 'zh-CN' ? 'EN' : '中';
    updatePageStatusUI();
    updateProviderSubtitle();
  });

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
