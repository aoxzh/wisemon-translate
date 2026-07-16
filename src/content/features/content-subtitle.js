(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const YT_EVENT = 'llm-youtube-subtitle-response';
  const YT_BUTTON_ID = 'llm-youtube-subtitle-button';
  const YT_PANEL_BUTTON_ID = 'llm-youtube-transcript-button';
  const YT_NATIVE_CAPTION = '#ytp-caption-window-container';
  const YT_CACHE_KEY = 'llm-youtube-subtitle-cache-v1';

  function setupVideoSubtitleTranslation() {
    if (ctx.state.settings?.enableSubtitle === false) return;
    if (isYouTubeHost()) {
      setupYouTubeSubtitleRouteWatcher();
      return;
    }
    if (isNetflixHost()) {
      setupNetflixSubtitleRouteWatcher();
      return;
    }
    setupTextTrackFallback();
  }

  function isYouTubeHost() {
    return /(^|\.)youtube\.com$/.test(location.hostname);
  }

  function isNetflixHost() {
    return /(^|\.)netflix\.com$/.test(location.hostname);
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
        tracks: [],
        selectedTrackKey: '',
        items: [],
        overlay: null,
        button: null,
        panelButton: null,
        transcriptPanel: null,
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
      if (!document.getElementById(YT_PANEL_BUTTON_ID)) {
        createYouTubePanelButton(controls);
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
    button.addEventListener('contextmenu', function(event) {
      event.preventDefault();
      event.stopPropagation();
      downloadYouTubeVtt();
    });
    host.appendChild(button);
    controls.prepend(host);
    state.button = button;
    renderYouTubeButton();
  }

  function createYouTubePanelButton(controls) {
    const state = getYouTubeState();
    const button = document.createElement('button');
    button.id = YT_PANEL_BUTTON_ID;
    button.className = 'ytp-button llm-youtube-transcript-button';
    button.type = 'button';
    button.title = 'Transcript panel';
    button.setAttribute('aria-label', 'Transcript panel');
    button.textContent = 'TXT';
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      toggleYouTubeTranscriptPanel();
    });
    controls.prepend(button);
    state.panelButton = button;
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
    button.addEventListener('contextmenu', function(event) {
      event.preventDefault();
      event.stopPropagation();
      downloadYouTubeVtt();
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
    state.tracks = normalizeCaptionTracks(tracks);
    const track = chooseCaptionTrack(tracks);
    if (!track?.baseUrl) return;
    state.selectedTrackKey = getTrackKey(track);
    const url = new URL(track.baseUrl);
    url.searchParams.set('fmt', 'json3');
    const captionRes = await fetch(url.href, { credentials: 'include' });
    if (!captionRes.ok) return;
    handleYouTubeSubtitleResponse(url.href, await captionRes.text());
    renderYouTubeTranscriptPanel();
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
    const state = getYouTubeState();
    const candidates = settings.subtitleSkipTargetLang === false
      ? tracks.slice()
      : tracks.filter(function(track) { return normalizeLang(track.languageCode) !== target; });
    const pool = candidates.length ? candidates : tracks;
    if (state.selectedTrackKey) {
      const selected = pool.find(function(track) { return getTrackKey(track) === state.selectedTrackKey; });
      if (selected) return selected;
    }
    const preference = settings.subtitleTrackPreference || 'manual';
    if (preference === 'auto') {
      return pool.find(function(track) { return track.kind === 'asr'; }) || pool.find(function(track) { return !track.kind; }) || pool[0];
    }
    if (preference === 'any') return pool[0];
    return pool.find(function(track) { return !track.kind; }) || pool.find(function(track) { return track.kind === 'asr'; }) || pool[0];
  }

  function normalizeCaptionTracks(tracks) {
    return (Array.isArray(tracks) ? tracks : []).map(function(track) {
      return {
        key: getTrackKey(track),
        languageCode: track.languageCode || '',
        kind: track.kind || '',
        name: track.name?.simpleText || track.name?.runs?.map(function(run) { return run.text; }).join('') || track.languageCode || 'Caption',
        baseUrl: track.baseUrl || ''
      };
    });
  }

  function getTrackKey(track) {
    return [track.languageCode || '', track.kind || 'manual', track.vssId || '', track.name?.simpleText || ''].join('|');
  }

  function handleYouTubeSubtitleMessage(event) {
    const data = event.data || {};
    if (data.source !== 'llm-translate' || data.type !== YT_EVENT) return;
    handleYouTubeSubtitleResponse(data.url, data.responseText);
  }

  async function handleYouTubeSubtitleResponse(url, responseText) {
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
    await restoreYouTubeSubtitleCache(state);
    state.currentIndex = -1;
    state.translatedCount = state.items.filter(function(item) { return item.translation; }).length;
    state.status = state.items.length ? 'Ready' : 'Waiting';
    hideNativeYouTubeCaption();
    ensureYouTubeSubtitleOverlay();
    updateYouTubeSubtitleForTime();
    renderYouTubeButton();
    renderYouTubeTranscriptPanel();
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
    const fullMode = (ctx.state.settings || {}).subtitleTranslateScope === 'full';
    const targets = state.items.filter(function(item) {
      if (item.translation || item.isTranslating) return false;
      return fullMode || (item.start >= now && item.start <= now + 90000);
    }).slice(0, fullMode ? 24 : 10);
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
    saveYouTubeSubtitleCache(state);
    state.translatedCount = state.items.filter(function(item) { return item.translation; }).length;
    renderYouTubeButton();
    renderCurrentYouTubeSubtitle();
    renderYouTubeTranscriptPanel();
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
      if (item.translation) saveYouTubeSubtitleCache(getYouTubeState());
    } catch (err) {
      item.translation = '';
      item.failed = true;
      ctx.fn.safeLog?.('warn', 'Content', 'YouTube subtitle translate failed: ' + err.message);
    } finally {
      item.isTranslating = false;
      getYouTubeState().translatedCount = getYouTubeState().items.filter(function(sub) { return sub.translation; }).length;
      renderYouTubeButton();
      renderCurrentYouTubeSubtitle();
      renderYouTubeTranscriptPanel();
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

  function toggleYouTubeTranscriptPanel() {
    const state = getYouTubeState();
    ensureYouTubeTranscriptPanel();
    const panel = state.transcriptPanel;
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      requestYouTubeCaption();
      renderYouTubeTranscriptPanel();
    }
  }

  function ensureYouTubeTranscriptPanel() {
    const state = getYouTubeState();
    if (state.transcriptPanel?.isConnected) return;
    const panel = document.createElement('aside');
    panel.className = 'llm-youtube-transcript-panel';
    panel.hidden = true;
    panel.innerHTML = [
      '<div class="llm-yt-panel-head"><strong>Bilingual transcript</strong><button type="button" class="llm-yt-panel-close" aria-label="Close">×</button></div>',
      '<div class="llm-yt-panel-tools">',
      '<select class="llm-yt-track-select" aria-label="Subtitle track"></select>',
      '<input class="llm-yt-search" type="search" placeholder="Search subtitles">',
      '</div>',
      '<div class="llm-yt-panel-actions"><button type="button" data-action="copy">Copy</button><button type="button" data-action="export">Export VTT</button></div>',
      '<div class="llm-yt-list"></div>'
    ].join('');
    panel.querySelector('.llm-yt-panel-close').addEventListener('click', function() { panel.hidden = true; });
    panel.querySelector('.llm-yt-search').addEventListener('input', renderYouTubeTranscriptPanel);
    panel.querySelector('.llm-yt-track-select').addEventListener('change', function(event) {
      state.selectedTrackKey = event.target.value;
      state.items = [];
      state.currentIndex = -1;
      requestYouTubeCaption();
    });
    panel.querySelector('[data-action="copy"]').addEventListener('click', function() {
      const text = buildTranscriptText(state.items);
      navigator.clipboard?.writeText(text).catch(function(){});
    });
    panel.querySelector('[data-action="export"]').addEventListener('click', downloadYouTubeVtt);
    document.body.appendChild(panel);
    state.transcriptPanel = panel;
  }

  function renderYouTubeTranscriptPanel() {
    const state = getYouTubeState();
    const panel = state.transcriptPanel;
    if (!panel || panel.hidden) return;
    const select = panel.querySelector('.llm-yt-track-select');
    if (select) {
      const current = state.selectedTrackKey || getTrackKey({ languageCode: state.lang, kind: state.kind });
      select.innerHTML = '';
      state.tracks.forEach(function(track) {
        const option = document.createElement('option');
        option.value = track.key;
        option.textContent = track.name + ' · ' + (track.kind === 'asr' ? 'Auto' : 'Manual') + ' · ' + track.languageCode;
        option.selected = track.key === current;
        select.appendChild(option);
      });
      select.disabled = !state.tracks.length;
    }
    const query = panel.querySelector('.llm-yt-search')?.value.trim().toLowerCase() || '';
    const list = panel.querySelector('.llm-yt-list');
    if (!list) return;
    list.innerHTML = '';
    const items = state.items.filter(function(item) {
      if (!query) return true;
      return (item.text + '\n' + (item.translation || '')).toLowerCase().includes(query);
    });
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'llm-yt-empty';
      empty.textContent = state.items.length ? 'No matching subtitles.' : 'No subtitles loaded yet.';
      list.appendChild(empty);
      return;
    }
    items.forEach(function(item) {
      const row = document.createElement('div');
      row.className = 'llm-yt-row';
      const time = document.createElement('time');
      time.textContent = formatPanelTime(item.start);
      const source = document.createElement('div');
      source.className = 'llm-yt-source';
      source.textContent = item.text || '';
      const translated = document.createElement('div');
      translated.className = 'llm-yt-translated';
      translated.textContent = item.translation || (item.isTranslating ? 'Translating...' : '');
      row.appendChild(time);
      row.appendChild(source);
      row.appendChild(translated);
      list.appendChild(row);
    });
  }

  function buildTranscriptText(items) {
    return (items || []).map(function(item) {
      return [formatPanelTime(item.start), item.text || '', item.translation || ''].filter(Boolean).join('\n');
    }).join('\n\n');
  }

  function formatPanelTime(ms) {
    const total = Math.floor(Math.max(0, ms || 0) / 1000);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  async function restoreYouTubeSubtitleCache(state) {
    const cacheKey = getYouTubeSubtitleCacheKey(state);
    if (!cacheKey) return;
    try {
      const result = await chrome.storage.local.get(YT_CACHE_KEY);
      const cache = result[YT_CACHE_KEY] || {};
      const entry = cache[cacheKey];
      if (!entry || !Array.isArray(entry.translations)) return;
      state.items.forEach(function(item, index) {
        const cached = entry.translations[index];
        if (cached && cached.source === item.text && cached.translation) {
          item.translation = cached.translation;
          item.failed = false;
        }
      });
    } catch (e) {}
  }

  async function saveYouTubeSubtitleCache(state) {
    const cacheKey = getYouTubeSubtitleCacheKey(state);
    if (!cacheKey || !state.items.length) return;
    try {
      const result = await chrome.storage.local.get(YT_CACHE_KEY);
      const cache = result[YT_CACHE_KEY] || {};
      cache[cacheKey] = {
        ts: Date.now(),
        videoId: state.videoId,
        lang: state.lang,
        kind: state.kind,
        targetLang: ctx.state.settings?.targetLang || '',
        model: ctx.state.settings?.model || '',
        translations: state.items.map(function(item) {
          return { source: item.text || '', translation: item.translation || '' };
        })
      };
      const keys = Object.keys(cache);
      if (keys.length > 40) {
        keys.sort(function(a, b) { return (cache[a].ts || 0) - (cache[b].ts || 0); });
        keys.slice(0, keys.length - 40).forEach(function(key) { delete cache[key]; });
      }
      await chrome.storage.local.set({ [YT_CACHE_KEY]: cache });
    } catch (e) {}
  }

  function getYouTubeSubtitleCacheKey(state) {
    if (!state.videoId || !state.lang) return '';
    const settings = ctx.state.settings || {};
    return [state.videoId, state.lang, state.kind || 'manual', settings.targetLang || '', settings.model || '', settings.provider || ''].join('|');
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
    state.tracks = [];
    state.selectedTrackKey = '';
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

  // ---- Netflix subtitle support ----
  const NF_EVENT = 'llm-netflix-subtitle-data';

  function setupNetflixSubtitleRouteWatcher() {
    const state = getNetflixState();
    if (!state.routeWatcherStarted) {
      state.routeWatcherStarted = true;
      window.addEventListener(NF_EVENT, onNetflixSubtitleData);
      window.addEventListener('popstate', onNetflixRouteChanged);
      setInterval(onNetflixRouteChanged, 1500);
    }
    onNetflixRouteChanged();
  }

  function onNetflixRouteChanged() {
    if (!isNetflixWatchPage()) {
      hideNetflixSubtitleOverlay();
      return;
    }
    const state = getNetflixState();
    if (!state.started) {
      setupNetflixSubtitleTranslation();
    } else {
      const video = findNetflixVideo();
      if (video) attachNetflixVideo(video);
    }
  }

  function isNetflixWatchPage() {
    return isNetflixHost() && /^\/watch\/\d+/.test(location.pathname);
  }

  function setupNetflixSubtitleTranslation() {
    const state = getNetflixState();
    state.started = true;
    injectNetflixSubtitleHook();
    findAndAttachNetflixVideo();
  }

  function injectNetflixSubtitleHook() {
    if (document.getElementById('llm-netflix-subtitle-injector')) return;
    const script = document.createElement('script');
    script.id = 'llm-netflix-subtitle-injector';
    script.src = chrome.runtime.getURL('src/injectors/netflix-subtitle-injector.js');
    script.onload = function() { script.remove(); };
    (document.head || document.documentElement).appendChild(script);
  }

  function getNetflixState() {
    if (!ctx.state.netflixSubtitle) {
      ctx.state.netflixSubtitle = {
        started: false,
        routeWatcherStarted: false,
        tracks: [],
        selectedTrack: null,
        items: [],
        video: null,
        currentIndex: -1,
        overlay: null,
        enabled: true,
        lastText: '',
        lastTranslated: '',
        status: 'Waiting'
      };
    }
    return ctx.state.netflixSubtitle;
  }

  function onNetflixSubtitleData(event) {
    const detail = event.detail || {};
    if (detail.type !== 'tracks') return;
    const result = detail.data || {};
    const tracks = normalizeNetflixTracks(result.timedtexttracks || []);
    if (!tracks.length) return;
    const state = getNetflixState();
    state.tracks = tracks;
    if (!state.selectedTrack) state.selectedTrack = chooseNetflixTrack(tracks);
    if (state.selectedTrack) loadNetflixTrack(state.selectedTrack);
  }

  function normalizeNetflixTracks(tracks) {
    const formatsOrder = ['webvtt-lssdh-ios8', 'imsc1.1', 'dfxp-ls-sdh', 'simplesdh'];
    return tracks.filter(function(t) { return !t.isNoneTrack; }).map(function(t) {
      const formats = {};
      const downloadables = t.ttDownloadables || {};
      formatsOrder.forEach(function(fmt) {
        const dl = downloadables[fmt];
        if (!dl) return;
        const urls = dl.downloadUrls ? Object.values(dl.downloadUrls) : (dl.urls ? dl.urls.map(function(u) { return u.url; }) : []);
        if (urls.length) formats[fmt] = urls;
      });
      return {
        id: t.trackId || t.id,
        language: t.language || '',
        languageDescription: t.languageDescription || '',
        rawType: t.rawTrackType || '',
        isForced: !!t.isForcedNarrative,
        formats: formats
      };
    }).filter(function(t) { return Object.keys(t.formats).length > 0; });
  }

  function chooseNetflixTrack(tracks) {
    const settings = ctx.state.settings || {};
    const target = normalizeLang(settings.targetLang);
    const source = settings.sourceLang === 'auto' ? '' : normalizeLang(settings.sourceLang);
    let candidates = tracks.filter(function(t) { return !t.isForced; });
    if (!candidates.length) candidates = tracks;
    if (source) {
      const match = candidates.find(function(t) { return normalizeLang(t.language) === source; });
      if (match) return match;
    }
    if (target) {
      const match = candidates.find(function(t) { return normalizeLang(t.language) !== target; });
      if (match) return match;
    }
    return candidates[0];
  }

  async function loadNetflixTrack(track) {
    const state = getNetflixState();
    state.items = [];
    const order = ['webvtt-lssdh-ios8', 'imsc1.1', 'dfxp-ls-sdh', 'simplesdh'];
    let urls = null;
    for (let i = 0; i < order.length; i++) {
      if (track.formats[order[i]]) { urls = track.formats[order[i]]; break; }
    }
    if (!urls || !urls.length) return;
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i], { mode: 'cors', credentials: 'omit' });
        if (!res.ok) continue;
        const text = await res.text();
        state.items = parseWebVTT(text);
        break;
      } catch (e) {}
    }
  }

  function parseWebVTT(text) {
    const cues = [];
    const lines = String(text).split(/\r?\n/);
    let i = 0;
    if (lines[i] && lines[i].indexOf('WEBVTT') !== -1) i++;
    while (i < lines.length) {
      if (!lines[i].trim()) { i++; continue; }
      if (i + 1 < lines.length && lines[i + 1].indexOf(' --> ') !== -1) {
        i++;
      }
      const timeLine = lines[i];
      if (!timeLine || timeLine.indexOf(' --> ') === -1) { i++; continue; }
      const parts = timeLine.split(' --> ');
      const start = parseVTTTimestamp(parts[0]);
      const end = parseVTTTimestamp(parts[1]);
      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim()) {
        textLines.push(lines[i]);
        i++;
      }
      if (start !== null && end !== null) {
        cues.push({ start: start, end: end, text: cleanSubtitleText(textLines.join('\n')) });
      }
    }
    return cues;
  }

  function parseVTTTimestamp(ts) {
    const m = String(ts).trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/);
    if (!m) return null;
    const h = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2], 10);
    const sec = parseInt(m[3], 10);
    const ms = parseInt(m[4], 10);
    return h * 3600 + min * 60 + sec + ms / 1000;
  }

  function findAndAttachNetflixVideo() {
    const video = findNetflixVideo();
    if (video) {
      attachNetflixVideo(video);
      return;
    }
    const observer = new MutationObserver(function() {
      const v = findNetflixVideo();
      if (v) {
        observer.disconnect();
        attachNetflixVideo(v);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function() { observer.disconnect(); }, 12000);
  }

  function findNetflixVideo() {
    return document.querySelector('video');
  }

  function attachNetflixVideo(video) {
    const state = getNetflixState();
    if (state.video === video) return;
    state.video = video;
    video.addEventListener('timeupdate', updateNetflixSubtitleForTime);
    video.addEventListener('seeked', function() {
      state.currentIndex = -1;
      updateNetflixSubtitleForTime();
    });
    video.addEventListener('emptied', hideNetflixSubtitleOverlay);
  }

  function updateNetflixSubtitleForTime() {
    const state = getNetflixState();
    const video = state.video;
    if (!video || !state.enabled || !state.items.length) {
      hideNetflixSubtitleOverlay();
      return;
    }
    const t = video.currentTime;
    let idx = -1;
    for (let i = 0; i < state.items.length; i++) {
      if (state.items[i].start <= t && state.items[i].end > t) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      hideNetflixSubtitleOverlay();
      return;
    }
    const cue = state.items[idx];
    if (state.currentIndex === idx) {
      if (state.overlay && state.overlay.style.display === 'none') state.overlay.style.display = '';
      return;
    }
    state.currentIndex = idx;
    const text = cue.text;
    ensureNetflixSubtitleOverlay();
    renderNetflixSubtitle(text, state.lastTranslated);
    if (text !== state.lastText) {
      state.lastText = text;
      translateNetflixSubtitle(text);
    }
  }

  function ensureNetflixSubtitleOverlay() {
    const state = getNetflixState();
    if (state.overlay && state.overlay.parentNode) return;
    const video = state.video || findNetflixVideo();
    const parent = video && video.parentElement ? video.parentElement : document.body;
    parent.classList.add('llm-video-subtitle-host');
    const overlay = document.createElement('div');
    overlay.className = 'llm-video-subtitle-overlay';
    overlay.innerHTML = '<div class="llm-sub-original"></div><div class="llm-sub-translated"></div>';
    parent.appendChild(overlay);
    state.overlay = overlay;
  }

  function renderNetflixSubtitle(original, translated) {
    const state = getNetflixState();
    if (!state.overlay) return;
    const settings = ctx.state.settings || {};
    const style = normalizeSubtitleStyle(settings.subtitleStyle);
    state.overlay.classList.remove('llm-subtitle-style-cinema', 'llm-subtitle-style-outline', 'llm-subtitle-style-paper');
    state.overlay.classList.add('llm-subtitle-style-' + style);
    state.overlay.dataset.subtitleMode = settings.subtitleMode === 'translation' ? 'translation' : 'bilingual';
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

  async function translateNetflixSubtitle(text) {
    const state = getNetflixState();
    if (!state || state.lastText !== text) return;
    try {
      const settings = ctx.state.settings || {};
      const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, settings.sourceLang, settings.targetLang, settings.model || 'subtitle') : text;
      if (ctx.state.subtitleCache.has(cacheKey)) {
        state.lastTranslated = ctx.state.subtitleCache.get(cacheKey);
        renderNetflixSubtitle(text, state.lastTranslated);
        return;
      }
      const res = await chrome.runtime.sendMessage({ action: 'translate', text: text });
      if (state.lastText !== text) return;
      state.lastTranslated = res.translated || '';
      if (state.lastTranslated) ctx.state.subtitleCache.set(cacheKey, state.lastTranslated);
      renderNetflixSubtitle(text, state.lastTranslated);
    } catch (err) {
      ctx.fn.safeLog?.('warn', 'Content', 'Netflix subtitle translate failed: ' + err.message);
    }
  }

  function hideNetflixSubtitleOverlay() {
    const state = getNetflixState();
    if (state.overlay) state.overlay.style.display = 'none';
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
    const style = normalizeSubtitleStyle(settings.subtitleStyle);
    state.overlay.classList.remove('llm-subtitle-style-cinema', 'llm-subtitle-style-outline', 'llm-subtitle-style-paper');
    state.overlay.classList.add('llm-subtitle-style-' + style);
    state.overlay.dataset.subtitleMode = settings.subtitleMode === 'translation' ? 'translation' : 'bilingual';
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

  function normalizeSubtitleStyle(style) {
    return ['cinema', 'outline', 'paper'].includes(style) ? style : 'cinema';
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
