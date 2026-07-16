/**
 * DeepL provider adapter for LLMAPI.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  LLMAPI.prototype.translateWithDeepL = async function(text, sourceLang, targetLang, options = {}) {
    const tag = 'DeepL';
    if (!text || !text.trim()) return '';
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(this.settings) : this.settings.apiKey;
    if (!apiKey) throw new Error('DeepL API Key is required. Get one at https://www.deepl.com/pro-api');
    const model = 'deepl-free';
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, model, this.settings) : null;
    if (cacheKey && !options.noCache) {
      const cached = typeof getCachedTranslation === 'function' ? await getCachedTranslation(cacheKey) : null;
      if (cached) return cached;
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, this.settings)
      : { text, map: [] };
    const sl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('deepl', sourceLang || 'auto', 'source')
      : (sourceLang && sourceLang !== 'auto' ? sourceLang.toUpperCase() : '');
    const tl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('deepl', targetLang || 'zh-CN', 'target')
      : (targetLang || 'ZH').toUpperCase();
    const apiUrl = (this.settings.baseURL || 'https://api-free.deepl.com/v2').replace(/\/+$/, '') + '/translate';
    const startTime = Date.now();
    this._log('info', tag, 'DeepL request queued', this._usagePayload(null, masked.text, {
      sourceLang: sl,
      targetLang: tl,
      maskedCount: masked.map?.length || 0
    }));
    let lastError = null;
    const timeout = options.timeout ?? 15000;
    for (let attempt = 0; attempt <= 2; attempt++) {
      const requestScope = this._createRequestScope(timeout, options.signal);
      try {
        const body = 'text=' + encodeURIComponent(masked.text) +
          '&target_lang=' + encodeURIComponent(tl) +
          (sl ? '&source_lang=' + encodeURIComponent(sl) : '');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'DeepL-Auth-Key ' + apiKey
          },
          body: body,
          signal: requestScope.controller.signal
        });
        const duration = Date.now() - startTime;
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          this._logResponse(tag, apiUrl, response.status, duration, errorText);
          if (response.status === 403) {
            throw new Error('[403 Forbidden] Invalid DeepL API Key. Check your key at https://www.deepl.com/account/summary');
          }
          if (response.status === 456) {
            throw new Error('[456 Quota Exceeded] DeepL free tier quota reached. Upgrade to DeepL Pro or wait for quota reset.');
          }
          if (response.status === 429 && attempt < 2) {
            this._log('warn', tag, 'DeepL rate limited, retry ' + (attempt + 1) + '/2');
            await this._sleep(2000 * Math.pow(2, attempt), options.signal);
            continue;
          }
          throw new Error('DeepL API Error ' + response.status + ': ' + errorText.slice(0, 200));
        }
        const data = await response.json();
        let translated = data.translations?.[0]?.text || '';
        translated = typeof restoreSensitiveData === 'function' ? restoreSensitiveData(translated, masked.map) : translated;
        translated = translated.trim();
        if (!translated) throw new Error('Empty translation response from DeepL');
        this._log('info', tag, 'Translation OK (' + duration + 'ms, ' + text.length + '->' + translated.length + ' chars)');
        this._log('info', tag, 'DeepL usage estimate', this._usagePayload(null, masked.text, {
          sourceLang: sl,
          targetLang: tl,
          durationMs: duration,
          outputChars: translated.length,
          estimatedOutputTokens: this._estimateTokens(translated)
        }));
        if (cacheKey && typeof setCachedTranslation === 'function') await setCachedTranslation(cacheKey, translated);
        return translated;
      } catch (err) {
        lastError = err;
        if (options.signal?.aborted) throw err;
        if (err.name === 'AbortError') {
          lastError = new Error('DeepL request timeout (' + timeout + 'ms)');
          if (attempt < 2) { await this._sleep(1500 * Math.pow(2, attempt), options.signal); continue; }
          throw lastError;
        }
        if (err.message && err.message.match(/^\[(403|456)\]/)) throw err;
        if (attempt < 2) {
          this._log('warn', tag, 'DeepL request failed (attempt ' + (attempt + 1) + '/3): ' + err.message);
          await this._sleep(1500 * Math.pow(2, attempt), options.signal);
        }
      } finally {
        requestScope.cleanup();
      }
    }
    throw lastError || new Error('DeepL translation failed after retries');
  };
})();
