(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const YT_EVENT = 'llm-youtube-subtitle-response';
  const YT_BUTTON_ID = 'llm-youtube-subtitle-button';
  const YT_NATIVE_CAPTION = '#ytp-caption-window-container';

  function setupVideoSubtitleTranslation() {
    if (ctx.state.settings?.enableSubtitle === false) return;
    if (isYouTubeHost()) {
      setupYouTubeSubtitleRouteWatcher();
      return;
    }
    setupTextTrackFallback();
  }

  function isYouTubeHost() {
    return /(^|\.)youtube\.com$/.test(location.hostname);
  }

  function isYouTubeWatchPage() {
    return isYouTubeHost() && location.pathname === '/watch' && !!getYouTubeVideoId();
  }

  function setupYouTubeSubtitleRouteWatcher() {
    const state = getYouTubeState();
    if (!state.routeWatcherStarted) {
      state.routeWatcherStarted = true;
      window.addEventListener('yt-navigate-finish', onYouTubeRouteChanged);
      window.addEventListener('yt-page-data-updated', onYouTubeRouteChanged);
      window.addEventListener('popstate', onYouTubeRouteChanged);
      setInterval(onYouTubeRouteChanged, 1500);
    }
    onYouTubeRouteChanged();
  }

  function onYouTubeRouteChanged() {
    const state = getYouTubeState();
    const nextVideoId = getYouTubeVideoId();
    if (!isYouTubeWatchPage()) {
      hideYouTubeSubtitleOverlay();
      return;
    }
    if (!state.started) setupYouTubeSubtitleTranslation();
    if (nextVideoId && state.lastRouteVideoId !== nextVideoId) {
      state.lastRouteVideoId = nextVideoId;
      resetYouTubeSubtitleState();
    } else {
      waitForYouTubeControls();
      requestYouTubeCaption();
    }
  }

  function setupYouTubeSubtitleTranslation() {
    const state = getYouTubeState();
    state.started = true;
    injectYouTubeSubtitleHook();
    if (!state.messageListenerStarted) {
      state.messageListenerStarted = true;
      window.addEventListener('message', handleYouTubeSubtitleMessage);
    }
    waitForYouTubeControls();
    requestYouTubeCaption();
  }

  function getYouTubeState() {
    if (!ctx.state.youtubeSubtitle) {
      ctx.state.youtubeSubtitle = {
        enabled: true,
        sourceUrl: '',
        videoId: '',
        kind: '',
        lang: '',
        sourceLang: 'auto',
        items: [],
        overlay: null,
        button: null,
        menu: null,
        video: null,
        currentIndex: -1,
        translationTimer: null,
        prefetchTimer: null,
        status: 'Waiting',
        translatedCount: 0,
        started: false,
        routeWatcherStarted: false,
        messageListenerStarted: false,
        lastRouteVideoId: ''
      };
    }
    return ctx.state.youtubeSubtitle;
  }

  function injectYouTubeSubtitleHook() {
    if (document.getElementById('llm-youtube-subtitle-injector')) return;
    const script = document.createElement('script');
    script.id = 'llm-youtube-subtitle-injector';
    script.src = chrome.runtime.getURL('src/injectors/youtube-subtitle-injector.js');
    script.onload = function() { script.remove(); };
    (document.head || document.documentElement).appendChild(script);
  }

  function waitForYouTubeControls() {
    const mount = function() {
      const controls = document.querySelector('.ytp-right-controls, .ytp-chrome-controls .ytp-right-controls');
      const video = document.querySelector('#movie_player video, .html5-video-player video, video');
      if (!controls || !video) return false;
      const state = getYouTubeState();
      state.video = video;
      if (!document.getElementById(YT_BUTTON_ID)) {
        createYouTubeButton(controls);
      }
      attachYouTubeVideoListeners(video);
      return true;
    };
    if (mount()) return;
    const observer = new MutationObserver(function() {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function() {
      observer.disconnect();
      ensureYouTubeFloatingFallbackButton();
    }, 12000);
  }

  function createYouTubeButton(controls) {
    const state = getYouTubeState();
    const host = document.createElement('div');
    host.className = 'llm-youtube-subtitle-host';
    const button = document.createElement('button');
    button.id = YT_BUTTON_ID;
    button.className = 'ytp-button llm-youtube-subtitle-button';
    button.type = 'button';
    button.title = 'LLM bilingual subtitles';
    button.setAttribute('aria-label', 'LLM bilingual subtitles');
    button.textContent = 'T';
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      toggleYouTubeSubtitles();
    });
    host.appendChild(button);
    controls.prepend(host);
    state.button = button;
    renderYouTubeButton();
  }

  function ensureYouTubeFloatingFallbackButton() {
    if (!isYouTubeWatchPage() || document.getElementById(YT_BUTTON_ID)) return;
    const state = getYouTubeState();
    const button = document.createElement('button');
    button.id = YT_BUTTON_ID;
    button.className = 'llm-youtube-subtitle-floating llm-youtube-subtitle-button';
    button.type = 'button';
    button.title = 'LLM bilingual subtitles';
    button.textContent = 'T';
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      toggleYouTubeSubtitles();
    });
    document.body.appendChild(button);
    state.button = button;
    state.video = document.querySelector('#movie_player video, .html5-video-player video, video');
    if (state.video) attachYouTubeVideoListeners(state.video);
    renderYouTubeButton();
  }

  function attachYouTubeVideoListeners(video) {
    if (video.__llmSubtitleListenersAttached) return;
    video.__llmSubtitleListenersAttached = true;
    video.addEventListener('timeupdate', updateYouTubeSubtitleForTime);
    video.addEventListener('seeked', function() {
      getYouTubeState().currentIndex = -1;
      updateYouTubeSubtitleForTime();
    });
    video.addEventListener('emptied', hideYouTubeSubtitleOverlay);
  }

  function toggleYouTubeSubtitles() {
    const state = getYouTubeState();
    state.enabled = !state.enabled;
    if (!state.enabled) {
      hideYouTubeSubtitleOverlay();
      showNativeYouTubeCaption();
      state.status = 'Off';
    } else {
      hideNativeYouTubeCaption();
      state.status = state.items.length ? 'On' : 'Waiting';
      requestYouTubeCaption();
      updateYouTubeSubtitleForTime();
    }
    renderYouTubeButton();
  }

  function requestYouTubeCaption() {
    clickYouTubeCaptionButton();
    fetchYouTubeCaptionsFromPage().catch(function(err) {
      ctx.fn.safeLog?.('debug', 'Content', 'YouTube caption fetch skipped: ' + err.message);
    });
  }

  function clickYouTubeCaptionButton() {
    const button = document.querySelector('.ytp-subtitles-button');
    if (!button) return;
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
  }

  async function fetchYouTubeCaptionsFromPage() {
    const videoId = getYouTubeVideoId();
    if (!videoId) return;
    const state = getYouTubeState();
    if (state.videoId === videoId && state.items.length) return;
    const res = await fetch('https://www.youtube.com/watch?v=' + encodeURIComponent(videoId), { credentials: 'include' });
    const html = await res.text();
    const player = parseInitialPlayerResponse(html);
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const track = chooseCaptionTrack(tracks);
    if (!track?.baseUrl) return;
    const url = new URL(track.baseUrl);
    url.searchParams.set('fmt', 'json3');
    const captionRes = await fetch(url.href, { credentials: 'include' });
    if (!captionRes.ok) return;
    handleYouTubeSubtitleResponse(url.href, await captionRes.text());
  }

  function parseInitialPlayerResponse(html) {
    const patterns = [
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
      /"playerResponse"\s*:\s*"(.+?)"\s*,\s*"watchEndpoint"/s
    ];
    const direct = html.match(patterns[0]);
    if (direct) {
      try { return JSON.parse(direct[1]); } catch (e) {}
    }
    const encoded = html.match(patterns[1]);
    if (encoded) {
      try { return JSON.parse(JSON.parse('"' + encoded[1] + '"')); } catch (e) {}
    }
    return null;
  }

  function chooseCaptionTrack(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return null;
    const settings = ctx.state.settings || {};
    const target = normalizeLang(settings.targetLang || '');
    const manual = tracks.find(function(track) { return !track.kind && normalizeLang(track.languageCode) !== target; });
    if (manual) return manual;
    const asr = tracks.find(function(track) { return track.kind === 'asr' && normalizeLang(track.languageCode) !== target; });
    if (asr) return asr;
    return tracks.find(function(track) { return normalizeLang(track.languageCode) !== target; }) || tracks[0];
  }

  function handleYouTubeSubtitleMessage(event) {
    const data = event.data || {};
    if (data.source !== 'llm-translate' || data.type !== YT_EVENT) return;
    handleYouTubeSubtitleResponse(data.url, data.responseText);
  }

  function handleYouTubeSubtitleResponse(url, responseText) {
    if (!url || !responseText) return;
    let parsedUrl;
    try { parsedUrl = new URL(url, location.href); } catch (e) { return; }
    const videoId = parsedUrl.searchParams.get('v') || getYouTubeVideoId();
    if (videoId && getYouTubeVideoId() && videoId !== getYouTubeVideoId()) return;
    const items = parseYouTubeJson3(responseText);
    if (!items.length) return;
    const state = getYouTubeState();
    const sourceLang = parsedUrl.searchParams.get('lang') || 'auto';
    const kind = parsedUrl.searchParams.get('kind') || '';
    if (state.videoId === videoId && state.lang === sourceLang && state.kind === kind && state.items.length) return;
    state.videoId = videoId || '';
    state.sourceUrl = parsedUrl.href;
    state.lang = sourceLang;
    state.kind = kind;
    state.sourceLang = sourceLang;
    state.items = groupYouTubeSubtitleItems(items, sourceLang, kind);
    state.currentIndex = -1;
    state.translatedCount = state.items.filter(function(item) { return item.translation; }).length;
    state.status = state.items.length ? 'Ready' : 'Waiting';
    hideNativeYouTubeCaption();
    ensureYouTubeSubtitleOverlay();
    updateYouTubeSubtitleForTime();
    renderYouTubeButton();
  }

  function parseYouTubeJson3(text) {
    let json;
    try { json = JSON.parse(text); } catch (e) { return []; }
    const events = Array.isArray(json.events) ? json.events : [];
    const items = [];
    events.forEach(function(event) {
      const start = Number(event.tStartMs || 0);
      const duration = Number(event.dDurationMs || 0);
      if (!Array.isArray(event.segs)) return;
      let textValue = '';
      event.segs.forEach(function(seg) {
        textValue += seg.utf8 || '';
      });
      textValue = cleanSubtitleText(textValue);
      if (!textValue) return;
      items.push({
        start,
        end: start + Math.max(duration, 800),
        text: textValue,
        translation: '',
        isTranslating: false,
        failed: false
      });
    });
    return items;
  }

  function groupYouTubeSubtitleItems(items, lang, kind) {
    if (kind !== 'asr') return items;
    const noSpace = /^(zh|ja|ko|th|lo|km|my)/i.test(lang || '');
    if (noSpace) return groupNoSpaceSubtitles(items);
    return groupSpaceSubtitles(items);
  }

  function groupNoSpaceSubtitles(items) {
    const grouped = [];
    let current = null;
    items.forEach(function(item) {
      if (!current) current = { ...item };
      else {
        current.text += item.text;
        current.end = item.end;
      }
      if (current.text.length >= 32 || item.text.endsWith('。') || item.text.endsWith('！') || item.text.endsWith('？')) {
        grouped.push(current);
        current = null;
      }
    });
    if (current) grouped.push(current);
    return grouped;
  }

  function groupSpaceSubtitles(items) {
    const grouped = [];
    let current = null;
    let words = 0;
    items.forEach(function(item) {
      const gap = current ? item.start - current.end : 0;
      const shouldBreak = current && (
        /[.!?)]$/.test(current.text) ||
        gap > 1000 ||
        words >= 18 ||
        current.text.length >= 140
      );
      if (shouldBreak) {
        grouped.push(current);
        current = null;
        words = 0;
      }
      if (!current) current = { ...item };
      else {
        current.text = (current.text + ' ' + item.text).replace(/\s+/g, ' ').trim();
        current.end = item.end;
      }
      words += item.text.split(/\s+/).filter(Boolean).length;
    });
    if (current) grouped.push(current);
    return grouped;
  }

  function ensureYouTubeSubtitleOverlay() {
    const state = getYouTubeState();
    if (state.overlay?.isConnected) return;
    const video = state.video || document.querySelector('#movie_player video, .html5-video-player video, video');
    if (!video) return;
    state.video = video;
    const container = document.querySelector('.html5-video-player') || video.parentElement || document.body;
    if (container !== document.body) container.classList.add('llm-video-subtitle-host');
    const overlay = document.createElement('div');
    overlay.className = 'llm-video-subtitle-overlay llm-youtube-subtitle-overlay';
    overlay.innerHTML = '<div class="llm-sub-original"></div><div class="llm-sub-translated"></div><div class="llm-sub-status"></div>';
    container.appendChild(overlay);
    state.overlay = overlay;
  }

  function updateYouTubeSubtitleForTime() {
    const state = getYouTubeState();
    if (!state.enabled) return;
    const video = state.video || document.querySelector('#movie_player video, .html5-video-player video, video');
    if (!video || !state.items.length) return;
    state.video = video;
    ensureYouTubeSubtitleOverlay();
    const now = video.currentTime * 1000;
    const index = findSubtitleIndex(state.items, now);
    if (index !== state.currentIndex) {
      state.currentIndex = index;
      renderCurrentYouTubeSubtitle();
    }
    scheduleYouTubePrefetch();
  }

  function findSubtitleIndex(items, now) {
    let left = 0;
    let right = items.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = items[mid];
      if (now >= item.start && now <= item.end) return mid;
      if (now < item.start) right = mid - 1;
      else left = mid + 1;
    }
    return -1;
  }

  function renderCurrentYouTubeSubtitle() {
    const state = getYouTubeState();
    const item = state.items[state.currentIndex];
    if (!state.overlay) return;
    if (!item) {
      state.overlay.style.display = 'none';
      return;
    }
    state.overlay.style.display = '';
    renderVideoSubtitle(state, item.text, item.translation || (item.isTranslating ? 'Translating...' : ''));
    if (!item.translation && !item.isTranslating) translateYouTubeItem(item);
  }

  function scheduleYouTubePrefetch() {
    const state = getYouTubeState();
    if (state.prefetchTimer) return;
    state.prefetchTimer = setTimeout(function() {
      state.prefetchTimer = null;
      prefetchYouTubeItems().catch(function(err) {
        ctx.fn.safeLog?.('warn', 'Content', 'YouTube subtitle prefetch failed: ' + err.message);
      });
    }, 700);
  }

  async function prefetchYouTubeItems() {
    const state = getYouTubeState();
    if (!state.video || !state.items.length) return;
    const now = state.video.currentTime * 1000;
    const targets = state.items.filter(function(item) {
      return item.start >= now && item.start <= now + 90000 && !item.translation && !item.isTranslating;
    }).slice(0, 10);
    if (!targets.length) return;
    targets.forEach(function(item) { item.isTranslating = true; });
    const texts = targets.map(function(item) { return item.text; });
    const res = await chrome.runtime.sendMessage({ action: 'translate-batch', texts: texts });
    if (res.error) throw new Error(res.error);
    (res.results || []).forEach(function(raw, index) {
      const item = targets[index];
      item.translation = typeof ctx.fn.cleanTranslatedText === 'function' ? ctx.fn.cleanTranslatedText(raw) : (raw || '');
      item.isTranslating = false;
      item.failed = !item.translation;
    });
    state.translatedCount = state.items.filter(function(item) { return item.translation; }).length;
    renderYouTubeButton();
    renderCurrentYouTubeSubtitle();
  }

  async function translateYouTubeItem(item) {
    item.isTranslating = true;
    renderCurrentYouTubeSubtitle();
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'translate',
        text: item.text,
        sourceLang: getYouTubeState().sourceLang || 'auto',
        targetLang: ctx.state.settings?.targetLang
      });
      if (res.error) throw new Error(res.error);
      item.translation = res.translated || '';
      item.failed = !item.translation;
    } catch (err) {
      item.translation = '';
      item.failed = true;
      ctx.fn.safeLog?.('warn', 'Content', 'YouTube subtitle translate failed: ' + err.message);
    } finally {
      item.isTranslating = false;
      getYouTubeState().translatedCount = getYouTubeState().items.filter(function(sub) { return sub.translation; }).length;
      renderYouTubeButton();
      renderCurrentYouTubeSubtitle();
    }
  }

  function renderYouTubeButton() {
    const state = getYouTubeState();
    const button = state.button || document.getElementById(YT_BUTTON_ID);
    if (!button) return;
    const total = state.items.length;
    const done = state.translatedCount || 0;
    button.classList.toggle('llm-active', !!state.enabled);
    button.dataset.status = total ? Math.round(done / total * 100) + '%' : state.status;
    button.title = 'LLM bilingual subtitles: ' + (total ? done + ' / ' + total : state.status);
  }

  function downloadYouTubeVtt() {
    const state = getYouTubeState();
    if (!state.items.length) return;
    const content = buildVtt(state.items);
    const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youtube-bilingual-subtitles-' + (state.videoId || Date.now()) + '.vtt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  function buildVtt(items) {
    return ['WEBVTT'].concat(items.map(function(item, index) {
      return [
        String(index + 1),
        formatVttTime(item.start) + ' --> ' + formatVttTime(item.end),
        item.text || '',
        item.translation || ''
      ].join('\n');
    })).join('\n\n');
  }

  function formatVttTime(ms) {
    const value = Math.max(0, Math.round(ms || 0));
    const hours = Math.floor(value / 3600000);
    const minutes = Math.floor(value % 3600000 / 60000);
    const seconds = Math.floor(value % 60000 / 1000);
    const millis = value % 1000;
    return String(hours).padStart(2, '0') + ':' +
      String(minutes).padStart(2, '0') + ':' +
      String(seconds).padStart(2, '0') + '.' +
      String(millis).padStart(3, '0');
  }

  function resetYouTubeSubtitleState() {
    const state = getYouTubeState();
    hideYouTubeSubtitleOverlay();
    state.sourceUrl = '';
    state.videoId = '';
    state.kind = '';
    state.lang = '';
    state.items = [];
    state.currentIndex = -1;
    state.translatedCount = 0;
    state.status = 'Waiting';
    renderYouTubeButton();
    setTimeout(function() {
      waitForYouTubeControls();
      requestYouTubeCaption();
    }, 800);
  }

  function hideNativeYouTubeCaption() {
    const native = document.querySelector(YT_NATIVE_CAPTION);
    if (native) native.style.display = 'none';
  }

  function showNativeYouTubeCaption() {
    const native = document.querySelector(YT_NATIVE_CAPTION);
    if (native) native.style.display = '';
  }

  function getYouTubeVideoId() {
    try { return new URL(location.href).searchParams.get('v') || ''; } catch (e) { return ''; }
  }

  function cleanSubtitleText(text) {
    return String(text || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeLang(lang) {
    return String(lang || '').toLowerCase().split('-')[0];
  }

  function setupTextTrackFallback() {
    document.querySelectorAll('video').forEach(attachSubtitleOverlay);
    if (ctx.state.subtitleObserver) return;
    ctx.state.subtitleObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'VIDEO') attachSubtitleOverlay(node);
          if (node.querySelectorAll) node.querySelectorAll('video').forEach(attachSubtitleOverlay);
        });
      });
    });
    ctx.state.subtitleObserver.observe(document.body, { childList: true, subtree: true });
  }

  function attachSubtitleOverlay(video) {
    if (ctx.state.subtitleState.has(video)) return;
    const state = { overlay: null, translated: '', lastText: '', timer: null };
    ctx.state.subtitleState.set(video, state);
    const update = function() { updateVideoSubtitle(video); };
    video.addEventListener('timeupdate', update);
    video.addEventListener('seeked', update);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('emptied', function() { hideVideoSubtitle(video); });
  }

  function scheduleSubtitlePrefetch(video) {
    scheduleSubtitlePrefetchFn(video);
  }

  function scheduleSubtitlePrefetchFn(video) {
    const state = ctx.state.subtitleState.get(video);
    if (!state || state._prefetchScheduled) return;
    state._prefetchScheduled = true;
    setTimeout(function() {
      state._prefetchScheduled = false;
      prefetchUpcomingSubtitles(video).catch(function(err) {
        if (typeof LOG !== 'undefined') LOG.debug('Content', 'Subtitle prefetch skipped: ' + err.message);
      });
    }, 1000);
  }

  async function updateVideoSubtitle(video) {
    const state = ctx.state.subtitleState.get(video);
    if (!state) return;
    let text = '';
    const tracks = Array.from(video.textTracks || []);
    for (let t = 0; t < tracks.length; t++) {
      const cues = tracks[t].activeCues;
      if (!cues || cues.length === 0) continue;
      text = Array.from(cues).map(function(cue) { return cue.text || ''; }).join('\n').trim();
      if (text) break;
    }
    if (!text) { hideVideoSubtitle(video); return; }
    ensureVideoSubtitleOverlay(video, state);
    if (text === state.lastText) return;
    state.lastText = text;
    if (state.timer) clearTimeout(state.timer);
    renderVideoSubtitle(state, text, '');
    state.timer = setTimeout(function() { translateVideoSubtitle(video, text); }, 120);
    scheduleSubtitlePrefetchFn(video);
  }

  function ensureVideoSubtitleOverlay(video, state) {
    if (state.overlay?.parentNode) return;
    const overlay = document.createElement('div');
    overlay.className = 'llm-video-subtitle-overlay';
    overlay.innerHTML = '<div class="llm-sub-original"></div><div class="llm-sub-translated"></div>';
    const parent = video.parentElement || document.body;
    if (parent !== document.body) parent.classList.add('llm-video-subtitle-host');
    parent.appendChild(overlay);
    state.overlay = overlay;
  }

  function renderVideoSubtitle(state, original, translated) {
    if (!state.overlay) return;
    const settings = ctx.state.settings || {};
    state.overlay.style.display = (settings.subtitleMode === 'translation' && !translated) ? 'none' : '';
    state.overlay.style.bottom = Math.max(4, Math.min(30, Number(settings.subtitlePosition || 12))) + '%';
    state.overlay.style.fontSize = Math.max(11, Math.min(24, Number(settings.subtitleFontSize || 14))) + 'px';
    const origEl = state.overlay.querySelector('.llm-sub-original');
    const transEl = state.overlay.querySelector('.llm-sub-translated');
    if (origEl) {
      origEl.style.display = settings.subtitleMode === 'translation' ? 'none' : '';
      origEl.textContent = original || '';
    }
    if (transEl) transEl.textContent = translated || '';
  }

  function hideVideoSubtitle(video) {
    const state = ctx.state.subtitleState.get(video);
    if (!state?.overlay) return;
    state.overlay.style.display = 'none';
  }

  function hideYouTubeSubtitleOverlay() {
    const state = getYouTubeState();
    if (state.overlay) state.overlay.style.display = 'none';
  }

  async function translateVideoSubtitle(video, text) {
    const state = ctx.state.subtitleState.get(video);
    if (!state || state.lastText !== text) return;
    try {
      const settings = ctx.state.settings || {};
      const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model || 'subtitle') : text;
      if (ctx.state.subtitleCache.has(cacheKey)) {
        state.translated = ctx.state.subtitleCache.get(cacheKey);
        renderVideoSubtitle(state, text, state.translated);
        return;
      }
      const res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
      if (state.lastText !== text) return;
      state.translated = res.translated || '';
      if (state.translated) ctx.state.subtitleCache.set(cacheKey, state.translated);
      renderVideoSubtitle(state, text, state.translated);
    } catch (err) {
      ctx.fn.safeLog?.('warn', 'Content', 'Subtitle translate failed: ' + err.message);
    }
  }

  async function prefetchUpcomingSubtitles(video) {
    const settings = ctx.state.settings || {};
    const cues = [];
    const now = video.currentTime;
    const tracks = Array.from(video.textTracks || []);
    for (let t = 0; t < tracks.length; t++) {
      if (!tracks[t].cues) continue;
      const all = Array.from(tracks[t].cues || []);
      for (let c = 0; c < all.length; c++) {
        const cue = all[c];
        if (cue.startTime > now && cue.startTime < now + 75) {
          const text = String(cue.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (!text) continue;
          const key = typeof makeCacheKey === 'function' ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model || 'subtitle') : text;
          if (!ctx.state.subtitleCache.has(key)) cues.push({ text, key });
          if (cues.length >= 8) break;
        }
      }
      if (cues.length >= 8) break;
    }
    if (!cues.length) return;
    const res = await chrome.runtime.sendMessage({ action: 'translate-batch', texts: cues.map(function(c) { return c.text; }) });
    if (Array.isArray(res.results)) {
      res.results.forEach(function(r, i) {
        const cleaned = typeof ctx.fn.cleanTranslatedText === 'function' ? ctx.fn.cleanTranslatedText(r) : r;
        if (cleaned) ctx.state.subtitleCache.set(cues[i].key, cleaned);
      });
    }
    if (typeof LOG !== 'undefined') LOG.debug('Content', 'Subtitle prefetch complete', { count: cues.length });
  }

  Object.assign(ctx.fn, {
    setupVideoSubtitleTranslation,
    scheduleSubtitlePrefetch,
    handleSubtitlePrefetch: scheduleSubtitlePrefetchFn,
    downloadYouTubeVtt
  });
})();
