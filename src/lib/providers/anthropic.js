/**
 * Anthropic native Messages API adapter.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  function buildAnthropicUrl(baseURL) {
    const clean = String(baseURL || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    return clean.endsWith('/messages') ? clean : clean + '/messages';
  }

  LLMAPI.prototype.translateWithAnthropic = async function(text, sourceLang, targetLang, options = {}) {
    const settings = this.settings;
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(settings) : settings.apiKey;
    if (!apiKey) throw new Error('Anthropic API Key is required.');
    if (!text || !String(text).trim()) return '';

    const cacheKey = typeof makeCacheKey === 'function'
      ? makeCacheKey(text, sourceLang, targetLang, settings.model, { ...settings, context: options.context || '' })
      : null;
    if (cacheKey && !options.noCache && typeof getCachedTranslation === 'function') {
      const cached = await getCachedTranslation(cacheKey);
      if (cached) return cached;
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, settings)
      : { text, map: [] };
    const messages = this._buildMessagesForProvider(masked.text, sourceLang, targetLang, options);
    const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n');
    const body = {
      model: settings.model,
      max_tokens: this._getMaxTokensForRequest(masked.text),
      system,
      messages: messages.filter(message => message.role !== 'system').map(message => ({ role: message.role, content: message.content })),
      temperature: typeof settings.temperature === 'number' ? settings.temperature : 0
    };
    const headers = {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    const url = buildAnthropicUrl(settings.baseURL);
    const maxRetries = options.retries ?? 2;
    const timeout = options.timeout ?? this._getRequestTimeout(masked.text, 1);
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const requestScope = this._createRequestScope(timeout, options.signal);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: requestScope.controller.signal
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read Anthropic error response');
          const error = new Error(`Anthropic API Error ${response.status}: ${errorText.slice(0, 200)}`);
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            lastError = error;
            await this._sleep(500 * Math.pow(2, attempt), options.signal);
            continue;
          }
          throw error;
        }
        const data = await response.json();
        let translated = (data.content || [])
          .filter(block => block && block.type === 'text')
          .map(block => block.text || '')
          .join('')
          .trim();
        if (typeof restoreSensitiveData === 'function') translated = restoreSensitiveData(translated, masked.map);
        translated = this._cleanTranslatedText(translated);
        if (!translated) throw new Error('Anthropic returned an empty translation');
        if (cacheKey && !options.noCache && typeof setCachedTranslation === 'function') {
          await setCachedTranslation(cacheKey, translated);
        }
        return translated;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' || options.signal?.aborted || attempt >= maxRetries) throw err;
      } finally {
        requestScope.cleanup();
      }
    }
    throw lastError || new Error('Anthropic translation failed');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildAnthropicUrl };
})();
