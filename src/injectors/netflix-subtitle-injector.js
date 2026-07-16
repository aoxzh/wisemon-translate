/**
 * Netflix subtitle interceptor — runs in the PAGE context.
 * Hooks JSON.parse to capture the timedtexttracks manifest that Netflix ships
 * with its player bootstrap/manifest responses.
 */
(function() {
  'use strict';

  if (window.__LLM_NETFLIX_SUBTITLE_INJECTED__) return;
  window.__LLM_NETFLIX_SUBTITLE_INJECTED__ = true;

  const EVENT_NAME = 'llm-netflix-subtitle-data';

  function dispatch(type, data) {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { type: type, data: data }
      }));
    } catch (e) {}
  }

  try {
    const originalParse = JSON.parse;
    JSON.parse = function(text) {
      const data = originalParse.apply(this, arguments);
      try {
        if (data && typeof data === 'object') {
          const result = data.result || data;
          if (result && result.timedtexttracks && result.movieId) {
            dispatch('tracks', result);
          }
        }
      } catch (e) {}
      return data;
    };
  } catch (e) {}

  // Some manifests arrive via fetch response bodies; expose them too.
  try {
    const originalFetch = window.fetch;
    window.fetch = async function() {
      const response = await originalFetch.apply(this, arguments);
      try {
        const url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url);
        if (typeof url === 'string' && /manifest|licensedManifest|timedtexttracks/i.test(url)) {
          const clone = response.clone();
          clone.json().then(function(data) {
            const result = data && (data.result || data);
            if (result && result.timedtexttracks && result.movieId) {
              dispatch('tracks', result);
            }
          }).catch(function() {});
        }
      } catch (e) {}
      return response;
    };
  } catch (e) {}
})();
