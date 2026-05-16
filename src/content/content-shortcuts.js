(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const THEME_CYCLE = [
    'none',
    'grey',
    'weakening',
    'underline',
    'nativeDashed',
    'nativeDotted',
    'wavy',
    'divider',
    'blockquote',
    'background',
    'highlight',
    'marker',
    'italic',
    'bold',
    'subtle',
    'card',
    'paper',
    'dashedBorder',
    'solidBorder',
    'mask',
    'opacity'
  ];

  const THEME_LABELS = {
    none: 'Clean',
    grey: 'Grey Text',
    weakening: 'Faded',
    underline: 'Underline',
    nativeDashed: 'Dashed Underline',
    nativeDotted: 'Dotted Underline',
    wavy: 'Wavy Underline',
    divider: 'Divider Line',
    blockquote: 'Blockquote',
    background: 'Soft Background',
    highlight: 'Highlight',
    marker: 'Marker',
    italic: 'Italic',
    bold: 'Bold',
    subtle: 'Subtle Line',
    card: 'Card',
    paper: 'Paper',
    dashedBorder: 'Dashed Border',
    solidBorder: 'Solid Border',
    mask: 'Blur Reveal',
    opacity: 'Opacity Reveal'
  };

  function checkCombo(e, comboStr) {
    if (!comboStr) return false;
    const parts = comboStr.toLowerCase().split('+').map(s => s.trim());
    const mods = { ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey };
    let keyMatch = false;
    for (const p of parts) {
      if (p === 'ctrl' || p === 'cmd') { if (!mods.ctrl) return false; }
      else if (p === 'alt') { if (!mods.alt) return false; }
      else if (p === 'shift') { if (!mods.shift) return false; }
      else if (e.key.toLowerCase() === p) keyMatch = true;
    }
    return keyMatch;
  }

  function onKeyCombo(e) {
    const settings = ctx.state.settings || {};
    if (!settings.keyboardShortcuts) return;
    const sc = settings.keyboardShortcuts;
    if (sc.translatePage && checkCombo(e, sc.translatePage)) {
      e.preventDefault();
      ctx.fn.togglePageTranslation();
      return;
    }
    if (sc.toggleHover && checkCombo(e, sc.toggleHover)) {
      e.preventDefault();
      ctx.state.hoverEnabled = !ctx.state.hoverEnabled;
      if (typeof LOG !== 'undefined') LOG.info('Content', 'Hover mode: ' + (ctx.state.hoverEnabled ? 'ON' : 'OFF'));
      return;
    }
    if (sc.toggleStyle && checkCombo(e, sc.toggleStyle)) {
      e.preventDefault();
      const idx = THEME_CYCLE.indexOf(settings.translationTheme || 'none');
      const newTheme = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
      settings.translationTheme = newTheme;
      ctx.fn.applyPageState(ctx.state.pageTranslated ? (settings.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
      chrome.runtime.sendMessage({ action: 'set-settings', settings }).catch(function(){});
      const prefix = typeof I18N !== 'undefined' ? I18N.t('theme_changed') : 'Style';
      ctx.fn.showToast(prefix + ': ' + (THEME_LABELS[newTheme] || newTheme), 1500);
      if (typeof LOG !== 'undefined') LOG.info('Content', 'Theme: ' + settings.translationTheme);
    }
  }

  Object.assign(ctx.fn, {
    checkCombo,
    getThemeCycle: () => THEME_CYCLE.slice(),
    onKeyCombo
  });
})();
