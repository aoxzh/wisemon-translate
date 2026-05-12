(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

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
      const themes = ['none','underline','dashedBorder','solidBorder','dividingLine','blockquote','card','paper','background','highlight','marker','grey','italic','bold','weakening','mask','opacity','wavy','nativeUnderline','nativeDashed','nativeDotted','thinDashed','marker2','blurReveal'];
      const idx = themes.indexOf(settings.translationTheme || 'none');
      const newTheme = themes[(idx + 1) % themes.length];
      settings.translationTheme = newTheme;
      ctx.fn.applyPageState(ctx.state.pageTranslated ? (settings.displayMode === 'replace' ? 'translation' : 'dual') : 'dual');
      ctx.fn.showToast('Style: ' + newTheme, 1500);
      if (typeof LOG !== 'undefined') LOG.info('Content', 'Theme: ' + settings.translationTheme);
    }
  }

  Object.assign(ctx.fn, {
    checkCombo,
    onKeyCombo
  });
})();
