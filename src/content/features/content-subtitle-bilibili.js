/** Bilibili timed subtitle adapter. */
(function() {
  'use strict';
  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const EVENT_NAME = 'llm-bilibili-subtitle-data';

  function state() {
    return ctx.state.bilibiliSubtitle ||= {
      started: false, tracks: [], items: [], video: null, overlay: null,
      index: -1, lastText: '', translated: '', routeUrl: ''
    };
  }

  function setupBilibiliSubtitleTranslation() {
    if (!/(^|\.)bilibili\.com$/.test(location.hostname) || ctx.state.settings?.enableSubtitle === false) return;
    const current = state();
    if (!current.started) {
      current.started = true;
      window.addEventListener(EVENT_NAME, onTrackData);
      setInterval(checkRoute, 1200);
    }
    injectHook();
    checkRoute();
  }

  function injectHook() {
    if (document.getElementById('llm-bilibili-subtitle-injector')) return;
    const script = document.createElement('script');
    script.id = 'llm-bilibili-subtitle-injector';
    script.src = chrome.runtime.getURL('src/injectors/bilibili-subtitle-injector.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  function checkRoute() {
    const current = state();
    if (current.routeUrl !== location.href) {
      current.routeUrl = location.href;
      Object.assign(current, { items: [], index: -1, lastText: '', translated: '' });
      injectHook();
    }
    attachVideo();
  }

  async function onTrackData(event) {
    const tracks = Array.isArray(event.detail?.tracks) ? event.detail.tracks : [];
    if (!tracks.length) return;
    const current = state();
    current.tracks = tracks;
    const settings = ctx.state.settings || {};
    const target = String(settings.targetLang || '').toLowerCase().split('-')[0];
    const selected = tracks.find(track => !String(track.lan || track.lang || '').toLowerCase().startsWith(target)) || tracks[0];
    const rawUrl = selected.subtitle_url || selected.subtitleUrl || selected.url;
    if (!rawUrl) return;
    const url = String(rawUrl).startsWith('//') ? 'https:' + rawUrl : String(rawUrl);
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      current.items = (data.body || []).map(item => ({
        start: Number(item.from), end: Number(item.to), text: String(item.content || '').replace(/<[^>]+>/g, '').trim()
      })).filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.text);
      attachVideo();
    } catch (error) {
      ctx.fn.safeLog?.('warn', 'Subtitle', 'Bilibili subtitle load failed: ' + error.message);
    }
  }

  function attachVideo() {
    const current = state();
    const video = document.querySelector('video');
    if (!video || current.video === video) return;
    current.video = video;
    video.addEventListener('timeupdate', update);
    video.addEventListener('seeked', update);
    video.addEventListener('emptied', hide);
  }

  function update() {
    const current = state();
    if (!current.video || !current.items.length) return hide();
    const time = current.video.currentTime;
    const index = current.items.findIndex(item => item.start <= time && item.end > time);
    if (index < 0) return hide();
    const cue = current.items[index];
    ensureOverlay();
    if (index === current.index) { current.overlay.style.display = ''; return; }
    current.index = index;
    current.lastText = cue.text;
    current.translated = '';
    render(cue.text, '');
    translate(cue.text);
  }

  function ensureOverlay() {
    const current = state();
    if (current.overlay?.isConnected) return;
    const parent = current.video?.parentElement || document.body;
    parent.classList.add('llm-video-subtitle-host');
    const overlay = document.createElement('div');
    overlay.className = 'llm-video-subtitle-overlay';
    overlay.innerHTML = '<div class="llm-sub-original"></div><div class="llm-sub-translated"></div>';
    parent.appendChild(overlay);
    current.overlay = overlay;
  }

  function render(original, translated) {
    const current = state();
    const settings = ctx.state.settings || {};
    if (!current.overlay) return;
    const style = ['cinema', 'outline', 'paper'].includes(settings.subtitleStyle) ? settings.subtitleStyle : 'cinema';
    current.overlay.className = 'llm-video-subtitle-overlay llm-subtitle-style-' + style;
    current.overlay.dataset.subtitleMode = settings.subtitleMode === 'translation' ? 'translation' : 'bilingual';
    current.overlay.style.bottom = Math.max(4, Math.min(30, Number(settings.subtitlePosition || 12))) + '%';
    current.overlay.style.fontSize = Math.max(11, Math.min(24, Number(settings.subtitleFontSize || 14))) + 'px';
    const originalEl = current.overlay.querySelector('.llm-sub-original');
    const translatedEl = current.overlay.querySelector('.llm-sub-translated');
    originalEl.style.display = settings.subtitleMode === 'translation' ? 'none' : '';
    originalEl.textContent = original;
    translatedEl.textContent = translated;
    current.overlay.style.display = '';
  }

  async function translate(text) {
    const current = state();
    const settings = ctx.state.settings || {};
    const key = typeof makeCacheKey === 'function'
      ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model || 'subtitle', settings)
      : text;
    if (ctx.state.subtitleCache?.has(key)) {
      current.translated = ctx.state.subtitleCache.get(key);
      return render(text, current.translated);
    }
    try {
      const response = await chrome.runtime.sendMessage({ action: 'translate', text });
      if (current.lastText !== text) return;
      current.translated = response.translated || '';
      if (current.translated) ctx.state.subtitleCache?.set(key, current.translated);
      render(text, current.translated);
    } catch (error) {
      ctx.fn.safeLog?.('warn', 'Subtitle', 'Bilibili subtitle translation failed: ' + error.message);
    }
  }

  function hide() { if (state().overlay) state().overlay.style.display = 'none'; }
  ctx.fn.setupBilibiliSubtitleTranslation = setupBilibiliSubtitleTranslation;
})();
