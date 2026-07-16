/** Bilibili subtitle metadata interceptor — page context. */
(function() {
  'use strict';
  if (window.__LLM_BILIBILI_SUBTITLE_INJECTED__) return;
  window.__LLM_BILIBILI_SUBTITLE_INJECTED__ = true;
  const EVENT_NAME = 'llm-bilibili-subtitle-data';

  function findTracks(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 5) return null;
    const tracks = value?.data?.subtitle?.subtitles || value?.subtitle?.subtitles;
    if (Array.isArray(tracks) && tracks.length) return tracks;
    for (const child of Object.values(value)) {
      const found = findTracks(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function dispatch(value) {
    const tracks = findTracks(value);
    if (tracks) window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { tracks } }));
  }

  try { dispatch(window.__playinfo__); dispatch(window.__INITIAL_STATE__); } catch (e) {}
  try {
    const originalFetch = window.fetch;
    window.fetch = async function() {
      const response = await originalFetch.apply(this, arguments);
      try {
        const url = typeof arguments[0] === 'string' ? arguments[0] : arguments[0]?.url;
        if (/\/x\/player\/(?:wbi\/)?v2|subtitle/i.test(String(url || ''))) response.clone().json().then(dispatch).catch(function() {});
      } catch (e) {}
      return response;
    };
  } catch (e) {}
  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__llmBilibiliUrl = String(url || '');
      return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      if (/\/x\/player\/(?:wbi\/)?v2|subtitle/i.test(this.__llmBilibiliUrl || '')) {
        this.addEventListener('load', function() { try { dispatch(JSON.parse(this.responseText)); } catch (e) {} }, { once: true });
      }
      return originalSend.apply(this, arguments);
    };
  } catch (e) {}
})();
