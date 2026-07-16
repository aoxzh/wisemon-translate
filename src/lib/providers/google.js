/**
 * Google Translate provider adapter for LLMAPI.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  LLMAPI.prototype.translateWithGoogle = async function(text, sourceLang, targetLang, options = {}) {
    const tag = 'Google';
    if (!text || !text.trim()) return '';
    const model = 'google-free';
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, model, this.settings) : null;
    if (cacheKey && !options.noCache) {
      const cached = typeof getCachedTranslation === 'function' ? await getCachedTranslation(cacheKey) : null;
      if (cached) return cached;
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, this.settings)
      : { text, map: [] };
    const sl = sourceLang && sourceLang !== 'auto' ? sourceLang : 'auto';
    const tl = targetLang || 'zh-CN';
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=' +
      encodeURIComponent(sl) + '&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(masked.text);
    const startTime = Date.now();
    this._log('info', tag, 'Google request queued', this._usagePayload(null, masked.text, {
      sourceLang: sl,
      targetLang: tl,
      maskedCount: masked.map?.length || 0
    }));
    let lastError = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      const requestScope = this._createRequestScope(options.timeout ?? LLM_API_CONFIG.REQUEST_TIMEOUT_MS, options.signal);
      try {
        const response = await fetch(url, { signal: requestScope.controller.signal });
        if (response.status === 429 && attempt < 2) {
          this._log('warn', tag, `Google rate limited, retry ${attempt + 1}/2`);
          await this._sleep(2000 * Math.pow(2, attempt), options.signal);
          continue;
        }
        if (!response.ok) throw new Error(`Google Translate HTTP ${response.status}`);
        const data = await response.json();
        let translated = Array.isArray(data?.[0]) ? data[0].map(part => part?.[0] || '').join('') : '';
        translated = typeof restoreSensitiveData === 'function' ? restoreSensitiveData(translated, masked.map) : translated;
        translated = translated.trim();
        if (!translated) throw new Error('Empty translation response from Google Translate');
        this._log('info', tag, `Translation OK (${Date.now() - startTime}ms, ${text.length}->${translated.length} chars)`);
        this._log('info', tag, 'Google usage estimate', this._usagePayload(null, masked.text, {
          sourceLang: sl,
          targetLang: tl,
          durationMs: Date.now() - startTime,
          outputChars: translated.length,
          estimatedOutputTokens: this._estimateTokens(translated)
        }));
        if (cacheKey && typeof setCachedTranslation === 'function') await setCachedTranslation(cacheKey, translated);
        return translated;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') throw err;
        if (attempt < 2) {
          this._log('warn', tag, `Google request failed (attempt ${attempt + 1}/3): ${err.message}`);
          await this._sleep(1500 * Math.pow(2, attempt), options.signal);
        }
      } finally {
        requestScope.cleanup();
      }
    }
    throw lastError || new Error('Google Translate failed after retries');
  };

  LLMAPI.prototype.translateBatchWithGoogle = async function(texts, sourceLang, targetLang, options = {}) {
    const results = [];
    for (const text of texts) {
      try {
        results.push(await this.translateWithGoogle(text, sourceLang, targetLang, options));
      } catch (err) {
        results.push(`[Translation Error: ${err.message}]`);
      }
    }
    return results;
  };
})();
