/**
 * LLM API wrapper - OpenAI-compatible format
 * Supports DeepSeek v4, OpenAI, Anthropic, Ollama, and any compatible API
 *
 * DeepSeek v4 API (from official docs https://api-docs.deepseek.com/):
 * - Base URL: https://api.deepseek.com  (no /v1 suffix for new API)
 * - Models: deepseek-v4-flash (fast), deepseek-v4-pro (powerful)
 * - Thinking mode: ENABLED by default → must explicitly disable for translation
 * - When thinking=enabled: temperature/top_p/presence_penalty are NOT supported
 * - CoT returned via reasoning_content field (alongside content)
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout
 * - Concurrent batch processing (configurable parallelism)
 * - Comprehensive logging via LOGGER
 */

const LLM_API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 800,          // base delay, multiplied by 2^n
  RETRY_DELAY_FREE_MS: 3000,    // longer delay for free/rate-limited APIs
  REQUEST_TIMEOUT_MS: 30000,
  MAX_CONCURRENCY: 5,
  FREE_API_CONCURRENCY: 1,      // free APIs can't handle parallel requests
  COOLDOWN_MS: 15000,           // cooldown after rate limit hit
};

// Known API URL mappings and their rate-limiting profiles
const API_URL_MAP = {
  'api.deepseek.com': { chatPath: '/chat/completions', needsV1: false, free: false },
  'open.bigmodel.cn': { chatPath: '/chat/completions', needsV1: false, free: true },
};

class LLMAPI {
  constructor(settings) {
    this.settings = typeof normalizeSettings === 'function' ? normalizeSettings(settings) : settings;
    this.concurrency = this.settings.maxConcurrency || LLM_API_CONFIG.MAX_CONCURRENCY;
    this._rateLimitCooldown = 0;
    this._isFreeAPI = this._checkIsFreeAPI(this.settings.baseURL);
    if (this._isFreeAPI && this.concurrency > LLM_API_CONFIG.FREE_API_CONCURRENCY) {
      this.concurrency = LLM_API_CONFIG.FREE_API_CONCURRENCY;
    }
  }

  _isDeepSeekFlash() {
    return this.settings.provider === 'deepseek' && this.settings.model === 'deepseek-v4-flash';
  }

  _checkIsFreeAPI(baseURL) {
    try {
      const hostname = new URL(baseURL).hostname;
      return API_URL_MAP[hostname]?.free || false;
    } catch(e) { return false; }
  }

  /**
   * Build AI terms section to inject into the system prompt.
   * Format: Term + Definition + optional Context per term.
   * @returns {string} Empty string if no AI terms configured
   */
  _buildAiTermsSection() {
    var aiTerms = this.settings.aiTerms;
    if (!aiTerms || !Array.isArray(aiTerms) || aiTerms.length === 0) return '';
    var lines = ['\n\nThe following domain-specific terms should be translated according to their definitions:'];
    for (var i = 0; i < aiTerms.length; i++) {
      var t = aiTerms[i];
      if (!t || !t.term) continue;
      lines.push('Term: ' + t.term);
      if (t.definition) lines.push('Definition: ' + t.definition);
      if (t.context) lines.push('Context: ' + t.context);
    }
    return lines.join('\n');
  }

  _buildStylePresetSection() {
    var preset = this.settings.translationStylePreset || 'balanced';
    var presets = {
      balanced: '',
      natural: '\n\nTranslation style: natural and fluent. Prefer idiomatic target-language phrasing while preserving meaning.',
      faithful: '\n\nTranslation style: faithful. Preserve source structure, terminology, and nuance as closely as possible.',
      subtitle: '\n\nTranslation style: subtitle dialogue. Keep lines concise, conversational, and easy to read on screen.',
      technical: '\n\nTranslation style: technical documentation. Preserve product names, commands, code, units, and exact terminology.',
      novel: '\n\nTranslation style: literary prose. Preserve atmosphere, voice, and narrative rhythm without adding commentary.'
    };
    return presets[preset] || '';
  }

  /**
   * Build the full chat completions URL from baseURL
   * DeepSeek v4: https://api.deepseek.com → https://api.deepseek.com/chat/completions
   * OpenAI compat: https://api.openai.com/v1 → https://api.openai.com/v1/chat/completions
   */
  _buildURL(baseURL) {
    const clean = baseURL.replace(/\/+$/, '');
    // Check if this is a known API that doesn't need /v1
    try {
      const hostname = new URL(clean).hostname;
      const mapping = API_URL_MAP[hostname];
      if (mapping && !mapping.needsV1) {
        return clean + mapping.chatPath;
      }
    } catch (e) { /* invalid URL, just append */ }
    return clean + '/chat/completions';
  }

  /**
   * Translate a single text
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {object} [options] - { retries, timeout }
   * @returns {Promise<string>}
   */
  _log(level, tag, msg, data) {
    try {
      if (typeof LOG !== 'undefined') LOG[level](tag, msg, data);
      else console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[${tag}] ${msg}`, data || '');
    } catch (e) { /* never crash */ }
  }

  _logRequest(tag, url, method, headers, body) {
    const safeHeaders = { ...headers };
    if (safeHeaders['Authorization']) {
      safeHeaders['Authorization'] = safeHeaders['Authorization'].slice(0, 20) + '...[REDACTED]';
    }
    this._log('info', tag, `${method} ${url}`, { headers: safeHeaders, body });
  }

  _logResponse(tag, url, status, duration, body) {
    const level = status >= 400 ? 'error' : (status >= 300 ? 'warn' : 'info');
    const bodyStr = typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body).slice(0, 500);
    this._log(level, tag, `${status} ${url} (${duration}ms)`, bodyStr);
  }

  _estimateTokens(text) {
    const str = String(text || '');
    if (!str) return 0;
    const cjk = (str.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
    const rest = Math.max(0, str.length - cjk);
    return Math.ceil(cjk * 1.1 + rest / 4);
  }

  _usagePayload(usage, fallbackText, extra = {}) {
    return {
      provider: this.settings.provider,
      model: this.settings.model,
      sourceLang: extra.sourceLang,
      targetLang: extra.targetLang,
      inputChars: String(fallbackText || '').length,
      estimatedInputTokens: this._estimateTokens(fallbackText),
      promptTokens: usage?.prompt_tokens ?? usage?.input_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? usage?.output_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      ...extra
    };
  }

  _getLanguageName(lang) {
    const names = {
      'zh-CN': 'Chinese',
      'zh-TW': 'Traditional Chinese',
      en: 'English',
      ja: 'Japanese',
      ko: 'Korean',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      ru: 'Russian',
      pt: 'Portuguese',
      ar: 'Arabic',
      it: 'Italian',
      vi: 'Vietnamese',
      th: 'Thai',
      tr: 'Turkish',
      nl: 'Dutch',
      pl: 'Polish',
      cs: 'Czech',
      hi: 'Hindi'
    };
    if (!lang || lang === 'auto') return 'the target language';
    return names[lang] || lang;
  }

  _buildMessagesForProvider(requestText, sourceLang, targetLang, options = {}) {
    if (this.settings.provider === 'hunyuan' && !options.multiText) {
      const targetName = this._getLanguageName(targetLang);
      const content = targetLang === 'zh-CN' || targetLang === 'zh-TW'
        ? `将以下文本翻译为${targetName}，注意只需要输出翻译后的结果，不要额外解释：\n\n${requestText}`
        : `Translate the following segment into ${targetName}, without additional explanation.\n\n${requestText}`;
      return [{ role: 'user', content }];
    }

    const template = options.userPromptTemplate || this.settings.userPromptTemplate || DEFAULT_SETTINGS.userPromptTemplate;
    const prompt = template
      .replace(/\{\{sourceLang\}\}/g, sourceLang === 'auto' ? 'the detected language' : sourceLang)
      .replace(/\{\{targetLang\}\}/g, targetLang)
      .replace(/\{\{text\}\}/g, requestText);
    const systemMsg = (options.systemPrompt || this.settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt) + this._buildStylePresetSection() + this._buildAiTermsSection();
    return [
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt }
    ];
  }

  async _parseSSEStream(response, options = {}) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let usage = null;
    let model = null;
    let reasoningContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.startsWith('data:')) continue;

          const dataStr = line.slice('data:'.length).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const chunk = JSON.parse(dataStr);
            if (chunk.model) model = chunk.model;
            if (chunk.usage) usage = chunk.usage;

            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              content += delta.content;
              if (typeof options.onDelta === 'function') {
                try { options.onDelta(delta.content, content); } catch (e) {}
              }
            }
            if (delta?.reasoning_content) reasoningContent += delta.reasoning_content;
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (e) {}
    }
    // Flush decoder buffered bytes for final partial character
    buffer += decoder.decode();
    // Process any remaining complete lines in buffer
    const remainingLines = buffer.split('\n');
    for (let i = 0; i < remainingLines.length; i++) {
      const line = remainingLines[i].trim();
      if (!line || !line.startsWith('data:')) continue;
      const dataStr = line.slice('data:'.length).trim();
      if (dataStr === '[DONE]') continue;
      try {
        const chunk = JSON.parse(dataStr);
        if (chunk.model) model = chunk.model;
        if (chunk.usage) usage = chunk.usage;
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          if (typeof options.onDelta === 'function') {
            try { options.onDelta(delta.content, content); } catch (e) {}
          }
        }
        if (delta?.reasoning_content) reasoningContent += delta.reasoning_content;
      } catch (e) { /* skip malformed */ }
    }

    if (reasoningContent) {
      this._log('info', 'API', `Model used thinking mode — reasoning: ${reasoningContent.length} chars, answer: ${content.length} chars`);
    }

    return { content, usage, model, reasoningContent };
  }

  _shouldUseStreaming() {
    return this.settings.useStream === true && this.settings.streamRenderMode !== 'disabled';
  }

  async _parseChatCompletionResponse(response, requestTextForLog, options = {}) {
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const streamResult = await this._parseSSEStream(response, options);
      return {
        content: streamResult.content || '',
        usage: streamResult.usage,
        model: streamResult.model,
        finishReason: null,
        streamed: true,
        rawStreamContent: streamResult.content || ''
      };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    return {
      content,
      usage: data.usage,
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason || null,
      streamed: false,
      rawStreamContent: '',
      requestTextForLog
    };
  }

  async translate(text, sourceLang, targetLang, options = {}) {
    if (text && !options.noSplit && this._shouldSplitLongText(text)) {
      return this.translateLongText(text, sourceLang, targetLang, options);
    }
    if (this.settings.provider === 'google') {
      return this.translateWithGoogle(text, sourceLang, targetLang, options);
    }
    if (this.settings.provider === 'deepl') {
      return this.translateWithDeepL(text, sourceLang, targetLang, options);
    }
    if (this.settings.provider === 'baidu') {
      return this.translateWithBaidu(text, sourceLang, targetLang, options);
    }
    if (this.settings.provider === 'microsoft') {
      return this.translateWithMicrosoft(text, sourceLang, targetLang, options);
    }
    const { baseURL, model, systemPrompt, userPromptTemplate, temperature } = this.settings;
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(this.settings) : this.settings.apiKey;
    const tag = 'API';

    // --- Validation ---
    if (!baseURL) {
      this._log('error', tag, 'API Base URL is not configured');
      throw new Error('API Base URL is not configured. Please set it in Settings.');
    }
    if (!model) {
      this._log('error', tag, 'Model name is not configured');
      throw new Error('Model name is not configured. Please set it in Settings.');
    }
    if (!text || !text.trim()) {
      this._log('warn', tag, 'Empty text provided for translation');
      return '';
    }

    // --- Cache check ---
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, model) : null;
    if (cacheKey && !options.noCache) {
      const cached = typeof getCachedTranslation === 'function' ? await getCachedTranslation(cacheKey) : null;
      if (cached) {
        this._log('info', tag, `Cache hit (${text.length} chars)`);
        return cached;
      }
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, this.settings)
      : { text, map: [] };
    const requestText = masked.text;

    // Determine if this is a model that supports thinking mode
    const isDeepSeekV4 = model && (model.startsWith('deepseek-v4') || model === 'deepseek-chat' || model === 'deepseek-reasoner');
    const isGLM = model && model.startsWith('glm-');
    const supportsThinking = isDeepSeekV4 || isGLM;
    const thinkingMode = this.settings.thinkingMode || 'disabled';

    // --- Build request body ---
    const body = {
      model: model,
      messages: this._buildMessagesForProvider(requestText, sourceLang, targetLang),
      stream: this._shouldUseStreaming(),
      max_tokens: this._getMaxTokensForRequest(requestText)
    };

    // Thinking mode control (DeepSeek V4 & 智谱 GLM both support it)
    // For translation: disable thinking to avoid CoT overhead and enable temperature
    if (supportsThinking) {
      body.thinking = { type: thinkingMode };
      if (thinkingMode === 'disabled') {
        body.temperature = typeof temperature === 'number' ? temperature : 0.3;
      }
      this._log('debug', tag, `${model} thinking mode: ${thinkingMode}`);
    } else {
      body.temperature = typeof temperature === 'number' ? temperature : 0.3;
    }

    const url = this._buildURL(baseURL);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      this._log('warn', tag, 'No API Key provided — request may be rejected with 401');
    }

    // --- Retry loop ---
    const maxRetries = options.retries ?? (this._isDeepSeekFlash() ? 1 : LLM_API_CONFIG.MAX_RETRIES);
    const timeout = options.timeout ?? (this._isDeepSeekFlash() ? 22000 : LLM_API_CONFIG.REQUEST_TIMEOUT_MS);
    let lastError = null;
    this._log('info', tag, 'Translation request queued', this._usagePayload(null, requestText, {
      sourceLang,
      targetLang,
      maskedCount: masked.map?.length || 0,
      cacheKey: cacheKey || ''
    }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        this._logRequest(tag, url, 'POST', headers,
          attempt > 0 ? `(retry ${attempt}/${maxRetries}) model=${model} text_len=${text.length} thinking=${thinkingMode}` : `model=${model} text_len=${text.length} thinking=${thinkingMode}`);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          this._logResponse(tag, url, response.status, duration, errorText);

          // Parse structured error if available
          let errorMsg = `API Error ${response.status}`;
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.error?.message) {
              errorMsg += `: ${errJson.error.message}`;
            } else if (errJson.message) {
              errorMsg += `: ${errJson.message}`;
            } else if (errJson.error?.code) {
              errorMsg += `: code=${errJson.error.code}`;
            }
          } catch {
            errorMsg += `: ${errorText.slice(0, 200)}`;
          }

          // Non-retryable errors
          if (response.status === 401) {
            throw new Error(`[401 Unauthorized] Invalid or missing API Key. Please check your API Key in Settings. (${errorMsg})`);
          }
          if (response.status === 402) {
            throw new Error(`[402 Payment Required] API account balance may be insufficient. Please top up. (${errorMsg})`);
          }
          if (response.status === 403) {
            throw new Error(`[403 Forbidden] Access denied. Check API Key permissions, region, or model availability. (${errorMsg})`);
          }
          if (response.status === 404) {
            throw new Error(`[404 Not Found] Endpoint or model not found. Check Base URL (DeepSeek v4: https://api.deepseek.com) and Model name. (${errorMsg})`);
          }
          if (response.status === 429) {
            lastError = new Error(`[429 Rate Limited] ${errorMsg}`);
            this._log('warn', tag, `Rate limited, attempt ${attempt+1}/${maxRetries+1}`);
            const baseDelay = this._isFreeAPI ? LLM_API_CONFIG.RETRY_DELAY_FREE_MS : LLM_API_CONFIG.RETRY_DELAY_MS;
            if (attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt);
              this._log('info', tag, `Cooling down ${delay}ms...`);
              await this._sleep(delay);
              continue;
            }
            throw lastError;
          }
          if (response.status >= 500) {
            lastError = new Error(`[${response.status} Server Error] ${errorMsg}`);
            this._log('warn', tag, `Server error, attempt ${attempt + 1}/${maxRetries + 1}`);
            if (attempt < maxRetries) {
              const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
              this._log('info', tag, `Retrying in ${delay}ms...`);
              await this._sleep(delay);
              continue;
            }
            throw lastError;
          }

          throw new Error(errorMsg);
        }

        // Parse streaming or JSON response. Some OpenAI-compatible providers
        // silently ignore/alter stream responses, so empty streamed content gets
        // one non-stream fallback before the request is treated as failed.
        let responseResult = await this._parseChatCompletionResponse(response, requestText, options);
        let translatedStream = responseResult.content || '';
        let translated = translatedStream.trim();
        if (!translated && body.stream === true) {
          this._log('warn', tag, 'Stream returned empty content; retrying once without stream', {
            model,
            textLength: requestText.length
          });
          const fallbackResponse = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...body, stream: false }),
            signal: controller.signal
          });
          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text().catch(() => 'Unable to read fallback error response');
            throw new Error(`Non-stream fallback failed ${fallbackResponse.status}: ${fallbackErrorText.slice(0, 200)}`);
          }
          responseResult = await this._parseChatCompletionResponse(fallbackResponse, requestText);
          translatedStream = responseResult.content || '';
          translated = translatedStream.trim();
        }
        if (responseResult.finishReason === 'length' && !options.noSplit) {
          this._log('warn', tag, 'Response hit max output length; retrying as split long text', {
            model,
            textLength: requestText.length,
            outputChars: translated.length
          });
          return await this.translateLongText(text, sourceLang, targetLang, { ...options, noCache: true });
        }
        if (typeof restoreSensitiveData === 'function') {
          translated = restoreSensitiveData(translated, masked.map);
        }
        const data = { usage: responseResult.usage, model: responseResult.model };

        this._log('info', tag, `Translation OK (${duration}ms, ${text.length}→${translated.length} chars, tokens: ${data.usage?.total_tokens || '?'})`);
        this._log('info', tag, 'Translation usage', this._usagePayload(data.usage, requestText, {
          sourceLang,
          targetLang,
          durationMs: duration,
          outputChars: translated.length,
          estimatedOutputTokens: this._estimateTokens(translated)
        }));

        if (!translated) {
          this._log('error', tag, 'Empty translation response', { streamContent: translatedStream.slice(0, 300) });
          throw new Error('Empty translation response from API — the model returned no content. Try disabling thinking mode in Settings.');
        }
        // Save to cache
        if (cacheKey && typeof setCachedTranslation === 'function') {
          await setCachedTranslation(cacheKey, translated);
        }
        return translated;

      } catch (err) {
        lastError = err;
        const duration = Date.now() - startTime;

        // Don't retry auth/permission errors
        if (err.message && err.message.match(/^\[(401|402|403|404)\]/)) {
          throw err;
        }

        // Timeout
        if (err.name === 'AbortError') {
          this._log('error', tag, `Request timeout after ${timeout}ms`, { url });
          lastError = new Error(`Request timeout (${timeout}ms). The API did not respond. Try a faster model (deepseek-v4-flash) or check network.`);
          if (attempt < maxRetries) {
            const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
            this._log('info', tag, `Retrying after timeout in ${delay}ms...`);
            await this._sleep(delay);
            continue;
          }
          throw lastError;
        }

        // Network error
        if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          this._log('error', tag, `Network error: ${err.message}`, { url });
          lastError = new Error(`Network error: Cannot connect to ${url}. Check Base URL, network, firewall. (${err.message})`);
          if (attempt < maxRetries) {
            const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
            this._log('info', tag, `Retrying after network error in ${delay}ms...`);
            await this._sleep(delay);
            continue;
          }
          throw lastError;
        }

        // Unknown error — retry
        this._log('error', tag, `Request failed (attempt ${attempt + 1}): ${err.message}`, { duration });
        if (attempt < maxRetries) {
          const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
          await this._sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Translation failed after all retries');
  }

  /**
   * Batch translate with concurrent execution
   * @param {string[]} texts
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {function} [onProgress] - (completed, total)
   * @returns {Promise<string[]>}
   */
  async translateBatch(texts, sourceLang, targetLang, onProgress) {
    if (!texts || texts.length === 0) return [];
    if (texts.length === 1) {
      try {
        const result = await this.translate(texts[0], sourceLang, targetLang);
        if (onProgress) onProgress(1, 1);
        return [result];
      } catch (err) {
        this._log('error', 'Batch', `Single item failed: ${err.message}`, { textLength: texts[0]?.length || 0 });
        if (onProgress) onProgress(1, 1);
        return [`[Translation Error: ${err.message}]`];
      }
    }

    const total = texts.length;
    let completed = 0;
    const results = new Array(total);
    const errors = [];

    this._log('info', 'Batch', `Starting: ${total} texts, concurrency=${this.concurrency}, model=${this.settings.model}`, {
      provider: this.settings.provider,
      totalChars: texts.reduce((sum, t) => sum + String(t || '').length, 0),
      estimatedInputTokens: this._estimateTokens(texts.join('\n')),
      sourceLang,
      targetLang
    });

    // Try multi-text batching: combine multiple texts into a single API call
    // if total length is reasonable and API supports it
    const useMultiTextBatch = this.settings.provider !== 'hunyuan' && this.settings.maxCharsPerRequest >= 2000 && total > 1;
    const maxBatchSize = this._isDeepSeekFlash() ? Math.min(Math.max(this.concurrency || 8, 8), 24) : Math.min(Math.max(this.concurrency || 8, 6), 16);

    if (useMultiTextBatch) {
      // Group texts into batches where combined length is within limits
      const batches = [];
      let currentBatch = [];
      let currentLen = 0;
      const maxChars = this._isDeepSeekFlash()
        ? Math.min(Math.max(this.settings.maxCharsPerRequest || 16000, 12000), 16000)
        : (this.settings.largeTextMode ? Math.min(Math.max(this.settings.maxCharsPerRequest || 12000, 9000), 12000) : (this.settings.maxCharsPerRequest || 12000));

      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        // Account for separator overhead (~20 chars per item)
        if (currentBatch.length > 0 && (currentLen + t.length + 30 > maxChars || currentBatch.length >= maxBatchSize)) {
          batches.push(currentBatch);
          currentBatch = [];
          currentLen = 0;
        }
        currentBatch.push({ text: t, index: i });
        currentLen += t.length + 30;
      }
      if (currentBatch.length > 0) batches.push(currentBatch);

      const batchConcurrency = this._isDeepSeekFlash()
        ? Math.max(2, Math.min(Math.ceil((this.concurrency || 8) / 2), 5, batches.length))
        : Math.max(1, Math.min(Math.ceil((this.concurrency || 8) / 3), 4, batches.length));
      this._log('info', 'Batch', `Grouped into ${batches.length} multi-text batches, batchConcurrency=${batchConcurrency}`);

      await this._runWithConcurrency(batches, batchConcurrency, async (batch) => {
        if (batch.length === 1) {
          // Single item, use normal translate
          const item = batch[0];
          try {
            const translated = await this.translate(item.text, sourceLang, targetLang);
            results[item.index] = translated;
          } catch (err) {
            results[item.index] = `[Translation Error: ${err.message}]`;
            errors.push({ index: item.index, error: err.message });
            this._log('error', 'Batch', `Item ${item.index + 1}/${total} failed: ${err.message}`, { textLength: item.text.length });
          } finally {
            completed++;
            if (onProgress) try { onProgress(completed, total); } catch (e) {}
          }
        } else {
          // Multi-text single request
          let multiTextOk = false;
          try {
            const batchTexts = batch.map(b => b.text);
            const batchResults = await this.translateMultiText(batchTexts, sourceLang, targetLang);
            batch.forEach((item, idx) => {
              const raw = batchResults[idx];
              if (raw && !raw.startsWith('[Translation Error:')) {
                results[item.index] = raw;
              } else {
                results[item.index] = raw || `[Translation Error: Empty result]`;
                errors.push({ index: item.index, error: 'Empty or error result' });
              }
            });
            multiTextOk = true;
          } catch (err) {
            this._log('warn', 'Batch', `Multi-text batch failed (${batch.length} items), falling back to individual: ${err.message}`);
            for (const item of batch) {
              try {
                const translated = await this.translate(item.text, sourceLang, targetLang);
                results[item.index] = translated;
              } catch (e2) {
                results[item.index] = `[Translation Error: ${e2.message}]`;
                errors.push({ index: item.index, error: e2.message });
                this._log('error', 'Batch', `Fallback item ${item.index + 1}/${total} failed: ${e2.message}`, { textLength: item.text.length });
              } finally {
                completed++;
                if (onProgress) try { onProgress(completed, total); } catch (e) {}
              }
            }
          } finally {
            // For successful multi-text: batch completed as a whole, update progress
            if (multiTextOk) {
              completed += batch.length;
              if (onProgress) {
                try { onProgress(completed, total); } catch (e) {}
              }
            }
          }
        }
      });
    } else {
      // Original per-item concurrent approach
      for (let i = 0; i < total; i += this.concurrency) {
        const chunk = texts.slice(i, i + this.concurrency);
        const chunkStartIdx = i;

        const chunkPromises = chunk.map(async (text, chunkIdx) => {
          const globalIdx = chunkStartIdx + chunkIdx;
          try {
            const translated = await this.translate(text, sourceLang, targetLang);
            results[globalIdx] = translated;
          } catch (err) {
            this._log('error', 'Batch', `Item ${globalIdx + 1}/${total} failed: ${err.message}`, { textLength: text.length });
            results[globalIdx] = `[Translation Error: ${err.message}]`;
            errors.push({ index: globalIdx, error: err.message });
          } finally {
            completed++;
            if (onProgress) {
              try { onProgress(completed, total); } catch (e) { /* ignore */ }
            }
          }
        });

        await Promise.all(chunkPromises);
      }
    }

    const succeeded = total - errors.length;
    this._log('info', 'Batch', `Complete: ${succeeded}/${total} OK, ${errors.length} failed`);
    if (errors.length > 0) {
      this._log('warn', 'Batch', 'Failed items:', errors);
    }

    return results;
  }

  _getMaxTokensForRequest(text) {
    const estimated = this._estimateTokens(text);
    if (this._isDeepSeekFlash()) {
      return Math.max(768, Math.min(12000, Math.ceil(estimated * 1.45) + 512));
    }
    return Math.max(1024, Math.min(16000, Math.ceil(estimated * 1.8) + 768));
  }

  _getRequestTimeout(text, itemCount = 1) {
    const chars = String(text || '').length;
    const dynamic = LLM_API_CONFIG.REQUEST_TIMEOUT_MS + Math.ceil(chars / 1000) * 2500 + Math.max(0, itemCount - 1) * 600;
    return Math.min(120000, Math.max(LLM_API_CONFIG.REQUEST_TIMEOUT_MS, dynamic));
  }

  async _runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(limit || 1, items.length));
    const runners = Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await worker(items[index], index);
      }
    });
    await Promise.all(runners);
    return results;
  }

  _getLongTextChunkSize() {
    const configured = Number(this.settings.maxCharsPerRequest || 12000);
    const provider = this.settings.provider || '';
    if (['google', 'deepl', 'baidu', 'microsoft'].includes(provider)) {
      return Math.max(1200, Math.min(configured, 4000));
    }
    if (this._isDeepSeekFlash()) {
      return Math.max(4000, Math.min(configured, 12000));
    }
    return Math.max(3000, Math.min(configured, this.settings.largeTextMode ? 9000 : 6000));
  }

  _shouldSplitLongText(text) {
    const value = String(text || '');
    if (!value.trim()) return false;
    return value.length > this._getLongTextChunkSize();
  }

  _splitLongText(text, maxChars) {
    if (typeof splitTextIntoChunks === 'function') {
      return splitTextIntoChunks(text, maxChars).filter(Boolean);
    }
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
    return chunks;
  }

  async translateLongText(text, sourceLang, targetLang, options = {}) {
    const chunkSize = this._getLongTextChunkSize();
    const chunks = this._splitLongText(String(text || ''), chunkSize);
    if (chunks.length <= 1) {
      return await this.translate(text, sourceLang, targetLang, { ...options, noSplit: true });
    }

    this._log('info', 'LongText', `Splitting long text into ${chunks.length} chunks`, {
      provider: this.settings.provider,
      model: this.settings.model,
      inputChars: String(text || '').length,
      chunkSize
    });

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const translated = await this.translate(chunk, sourceLang, targetLang, {
          ...options,
          noSplit: true,
          noCache: options.noCache
        });
        results.push(translated);
      } catch (err) {
        if (chunk.length > 1200) {
          this._log('warn', 'LongText', `Chunk ${i + 1}/${chunks.length} failed; splitting smaller: ${err.message}`, {
            chunkLength: chunk.length
          });
          const smaller = this._splitLongText(chunk, Math.max(800, Math.floor(chunkSize / 2)));
          for (const part of smaller) {
            results.push(await this.translate(part, sourceLang, targetLang, {
              ...options,
              noSplit: true,
              noCache: true
            }));
          }
        } else {
          throw err;
        }
      }
    }
    const joined = results.filter(Boolean).join('\n\n').trim();
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, this.settings.model) : null;
    if (joined && cacheKey && !options.noCache && typeof setCachedTranslation === 'function') {
      await setCachedTranslation(cacheKey, joined);
    }
    return joined;
  }

  _extractJsonObject(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1].trim() : raw;
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(body.slice(start, end + 1));
    } catch (e) {
      return null;
    }
  }

  _extractJsonValue(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1].trim() : raw;
    for (const candidate of [body, body.replace(/,\s*$/, '')]) {
      try {
        return JSON.parse(candidate);
      } catch (e) { /* try wrapped forms below */ }
    }
    try {
      return JSON.parse('[' + body.replace(/,\s*$/, '') + ']');
    } catch (e) {
      return null;
    }
  }

  _looksLikeJsonArtifact(text) {
    const value = String(text || '').trim();
    return /^[[{]/.test(value) && /"?(?:id|text|translations)"?\s*:/.test(value);
  }

  _normalizeTranslationValue(value, maskedItem) {
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (value && typeof value === 'object' && typeof value.text === 'string') {
      text = value.text;
    }
    text = this._cleanTranslatedText(String(text || '').trim());
    if (!text || this._looksLikeJsonArtifact(text)) return '';
    if (typeof restoreSensitiveData === 'function' && maskedItem) {
      text = restoreSensitiveData(text, maskedItem.map);
    }
    return text;
  }

  _supportsJsonResponseFormat() {
    return !['anthropic', 'hunyuan', 'google', 'deepl', 'baidu', 'microsoft'].includes(this.settings.provider);
  }

  /**
   * Translate multiple texts in a single API call
   * Uses a numbered separator format that the LLM can understand
   */
  async translateMultiText(texts, sourceLang, targetLang) {
    if (this.settings.provider === 'google') {
      return this.translateBatchWithGoogle(texts, sourceLang, targetLang);
    }
    const { baseURL, model, systemPrompt, userPromptTemplate, temperature } = this.settings;
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(this.settings) : this.settings.apiKey;
    const tag = 'API';

    if (!baseURL || !model || !texts || texts.length === 0) {
      throw new Error('Invalid multi-text translation parameters');
    }

    // Build combined prompt with numbered markers
    const maskedItems = typeof maskSensitiveData === 'function'
      ? texts.map(t => maskSensitiveData(t, this.settings))
      : texts.map(t => ({ text: t, map: [] }));
    const combinedText = maskedItems.map((item, i) => `<item id="${i + 1}">${item.text}</item>`).join('\n');

    const multiSystemMsg = (systemPrompt || DEFAULT_SETTINGS.systemPrompt) + this._buildStylePresetSection() + this._buildAiTermsSection() +
      '\n\nYou are translating multiple passages. Return ONLY one valid JSON object in this exact shape: {"translations":[{"id":1,"text":"translated text"}]}. Include every input id exactly once. The top-level value must be an object with a translations array, not a raw array and not separate objects. Do not add markdown, comments, explanations, or trailing commas.';

    const prompt = (userPromptTemplate || DEFAULT_SETTINGS.userPromptTemplate)
      .replace(/\{\{sourceLang\}\}/g, sourceLang === 'auto' ? 'the detected language' : sourceLang)
      .replace(/\{\{targetLang\}\}/g, targetLang)
      .replace(/\{\{text\}\}/g, combinedText);

    const isDeepSeekV4 = model && (model.startsWith('deepseek-v4') || model === 'deepseek-chat' || model === 'deepseek-reasoner');
    const isGLM = model && model.startsWith('glm-');
    const supportsThinking = isDeepSeekV4 || isGLM;
    const thinkingMode = this.settings.thinkingMode || 'disabled';

    const body = {
      model: model,
      messages: [
        { role: 'system', content: multiSystemMsg },
        { role: 'user', content: prompt }
      ],
      stream: false,
      max_tokens: this._getMaxTokensForRequest(combinedText)
    };
    if (this._supportsJsonResponseFormat()) {
      body.response_format = { type: 'json_object' };
    }

    if (supportsThinking) {
      body.thinking = { type: thinkingMode };
      if (thinkingMode === 'disabled') {
        body.temperature = typeof temperature === 'number' ? temperature : 0.3;
      }
    } else {
      body.temperature = typeof temperature === 'number' ? temperature : 0.3;
    }

    const url = this._buildURL(baseURL);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._getRequestTimeout(combinedText, texts.length));

    try {
      this._log('info', tag, 'Multi-text request queued', this._usagePayload(null, combinedText, {
        sourceLang,
        targetLang,
        itemCount: texts.length,
        maskedCount: maskedItems.reduce((sum, item) => sum + (item.map?.length || 0), 0)
      }));
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`API Error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      // Multi-text returns strict JSON, so streaming is disabled to avoid partial JSON overhead.
      let responseResult = await this._parseChatCompletionResponse(response, combinedText);
      if (!responseResult.content && body.stream === true) {
        this._log('warn', tag, 'Multi-text stream returned empty content; retrying once without stream', {
          model,
          itemCount: texts.length
        });
        const fallbackResponse = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, stream: false }),
          signal: controller.signal
        });
        if (!fallbackResponse.ok) {
          const fallbackErrorText = await fallbackResponse.text().catch(() => 'Unable to read fallback error response');
          throw new Error(`Non-stream fallback failed ${fallbackResponse.status}: ${fallbackErrorText.slice(0, 200)}`);
        }
        responseResult = await this._parseChatCompletionResponse(fallbackResponse, combinedText);
      }
      const raw = (responseResult.content || '').trim();

      this._log('info', tag, `Multi-text batch OK (${duration}ms, ${texts.length} items)`);
      this._log('info', tag, 'Multi-text usage', this._usagePayload(responseResult.usage, combinedText, {
        sourceLang,
        targetLang,
        itemCount: texts.length,
        durationMs: duration,
        outputChars: raw.length,
        estimatedOutputTokens: this._estimateTokens(raw)
      }));

      const results = new Array(texts.length).fill('');

      const parsed = this._extractJsonValue(raw);
      let translations = [];
      if (Array.isArray(parsed?.translations)) translations = parsed.translations;
      else if (Array.isArray(parsed)) translations = parsed;
      else if (parsed && typeof parsed === 'object' && parsed.id !== undefined && parsed.text !== undefined) translations = [parsed];
      for (const item of translations) {
        const idx = parseInt(item?.id, 10) - 1;
        if (idx >= 0 && idx < texts.length) {
          results[idx] = this._normalizeTranslationValue(item, maskedItems[idx]);
        }
      }

      if (results.every(r => !r)) {
        const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\n\[\d+\]|$)/g;
        let match;
        while ((match = regex.exec(raw)) !== null) {
          const idx = parseInt(match[1], 10) - 1;
          if (idx >= 0 && idx < texts.length) {
            results[idx] = this._normalizeTranslationValue(match[2], maskedItems[idx]);
          }
        }
      }

      if (results.every(r => !r)) {
        const lines = raw.split('\n').filter(l => l.trim());
        for (let i = 0; i < Math.min(lines.length, texts.length); i++) {
          results[i] = this._normalizeTranslationValue(lines[i].replace(/^\[\d+\]\s*/, '').trim(), maskedItems[i]);
        }
      }

      const missing = [];
      for (let i = 0; i < texts.length; i++) {
        if (!results[i] || this._looksLikeJsonArtifact(results[i])) {
          results[i] = '';
          missing.push(i);
        }
      }
      if (missing.length > 0) {
        this._log('warn', tag, `Multi-text parse missing ${missing.length}/${texts.length}; retrying missing items individually`, {
          missingIndexes: missing,
          rawPreview: raw.slice(0, 500)
        });
        for (const idx of missing) {
          try {
            results[idx] = await this.translate(texts[idx], sourceLang, targetLang, { noCache: true });
          } catch (err) {
            results[idx] = `[Translation Error: ${err.message}]`;
          }
        }
      }

      return results;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  _cleanTranslatedText(text) {
    if (!text) return '';
    text = text.replace(/<llm-tag n="\d+"\/>/g, '');
    text = text.replace(/\{\{[0-9]+\}\}/g, '');
    text = text.replace(/\{[^{}]*"[^"]+"\s*:\s*[0-9.]+\}/g, '');
    text = text.replace(/\["[A-Z0-9]+"\]/g, '');
    text = text.replace(/ue\.count\([^)]*\)/g, '');
    text = text.replace(/P\.when\([^)]*\)/g, '');
    text = text.replace(/\.execute\([^)]*\)/g, '');
    text = text.replace(/^\s*[\{\[]\s*[\s\S]*[\}\]]\s*$/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LLMAPI, LLM_API_CONFIG };
}
