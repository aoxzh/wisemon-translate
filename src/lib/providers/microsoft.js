/**
 * Microsoft Translator provider adapter for LLMAPI.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  LLMAPI.prototype.translateWithMicrosoft = async function(text, sourceLang, targetLang, options = {}) {
    const tag = 'Microsoft';
    if (!text || !text.trim()) return '';
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(this.settings) : this.settings.apiKey;
    if (!apiKey) throw new Error('Microsoft Translator API Key is required. Get one at https://portal.azure.com');
    const model = 'microsoft-standard';
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, model) : null;
    if (cacheKey && !options.noCache) {
      const cached = typeof getCachedTranslation === 'function' ? await getCachedTranslation(cacheKey) : null;
      if (cached) return cached;
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, this.settings)
      : { text, map: [] };
    const sl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('microsoft', sourceLang || 'auto', 'source')
      : (sourceLang && sourceLang !== 'auto' ? sourceLang : '');
    const tl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('microsoft', targetLang || 'zh-CN', 'target')
      : (targetLang || 'zh-Hans');
    const apiUrl = (this.settings.baseURL || 'https://api.cognitive.microsofttranslator.com').replace(/\/+$/, '') +
      '/translate?api-version=3.0&to=' + encodeURIComponent(tl) +
      (sl ? '&from=' + encodeURIComponent(sl) : '');
    const startTime = Date.now();
    this._log('info', tag, 'Microsoft request queued', this._usagePayload(null, masked.text, {
      sourceLang: sl,
      targetLang: tl,
      maskedCount: masked.map?.length || 0
    }));
    let lastError = null;
    const timeout = options.timeout ?? 15000;
    for (let attempt = 0; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': this.settings.region || 'global'
          },
          body: JSON.stringify([{ Text: masked.text }]),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          this._logResponse(tag, apiUrl, response.status, duration, errorText);
          if (response.status === 401) {
            throw new Error('[401 Unauthorized] Invalid Microsoft Translator API Key. Check your key in Azure Portal.');
          }
          if (response.status === 403) {
            throw new Error('[403 Forbidden] Microsoft Translator access denied. Check subscription tier and region.');
          }
          if (response.status === 429 && attempt < 2) {
            this._log('warn', tag, 'Microsoft rate limited, retry ' + (attempt + 1) + '/2');
            await this._sleep(2000 * Math.pow(2, attempt));
            continue;
          }
          throw new Error('Microsoft Translator API Error ' + response.status + ': ' + errorText.slice(0, 200));
        }
        const data = await response.json();
        let translated = data?.[0]?.translations?.[0]?.text || '';
        translated = typeof restoreSensitiveData === 'function' ? restoreSensitiveData(translated, masked.map) : translated;
        translated = translated.trim();
        if (!translated) throw new Error('Empty translation response from Microsoft Translator');
        this._log('info', tag, 'Translation OK (' + duration + 'ms, ' + text.length + '->' + translated.length + ' chars)');
        this._log('info', tag, 'Microsoft usage estimate', this._usagePayload(null, masked.text, {
          sourceLang: sl,
          targetLang: tl,
          durationMs: duration,
          outputChars: translated.length,
          estimatedOutputTokens: this._estimateTokens(translated)
        }));
        if (cacheKey && typeof setCachedTranslation === 'function') await setCachedTranslation(cacheKey, translated);
        return translated;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error('Microsoft request timeout (' + timeout + 'ms)');
          if (attempt < 2) { await this._sleep(1500 * Math.pow(2, attempt)); continue; }
          throw lastError;
        }
        if (err.message && err.message.match(/^\[(401|403)\]/)) throw err;
        if (attempt < 2) {
          this._log('warn', tag, 'Microsoft request failed (attempt ' + (attempt + 1) + '/3): ' + err.message);
          await this._sleep(1500 * Math.pow(2, attempt));
        }
      }
    }
    throw lastError || new Error('Microsoft Translator failed after retries');
  };
})();
