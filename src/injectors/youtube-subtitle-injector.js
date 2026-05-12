(function() {
  'use strict';

  if (window.__LLM_YOUTUBE_SUBTITLE_INJECTED__) return;
  window.__LLM_YOUTUBE_SUBTITLE_INJECTED__ = true;

  const EVENT_NAME = 'llm-youtube-subtitle-response';

  function isTimedTextUrl(url) {
    return typeof url === 'string' && /(?:^|\/)api\/timedtext\?/.test(url);
  }

  function postTimedText(url, responseText) {
    if (!url || !responseText) return;
    window.postMessage({
      source: 'llm-translate',
      type: EVENT_NAME,
      url,
      responseText
    }, '*');
  }

  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__llmTimedTextUrl = typeof url === 'string' ? url : (url && url.href);
      return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      if (isTimedTextUrl(this.__llmTimedTextUrl)) {
        this.addEventListener('load', function() {
          try {
            if (this.status >= 200 && this.status < 300) {
              postTimedText(this.__llmTimedTextUrl, this.responseText || '');
            }
          } catch (e) {}
        });
      }
      return originalSend.apply(this, arguments);
    };
  } catch (e) {}

  try {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : (input && input.url);
      const response = await originalFetch.apply(this, arguments);
      if (isTimedTextUrl(url)) {
        try {
          const clone = response.clone();
          const text = await clone.text();
          postTimedText(url, text);
        } catch (e) {}
      }
      return response;
    };
  } catch (e) {}
})();
