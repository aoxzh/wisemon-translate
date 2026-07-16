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

  _createRequestScope(timeout, externalSignal) {
    const controller = new AbortController();
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted) abortFromExternal();
    else externalSignal?.addEventListener?.('abort', abortFromExternal, { once: true });
    // Keep AbortError for fetch compatibility; external cancellation is
    // distinguished by checking externalSignal.aborted in the catch path.
    const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'AbortError')), timeout);
    return {
      controller,
      cleanup() {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener?.('abort', abortFromExternal);
      }
    };
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

  _buildContextSection(context) {
    if (!context || String(context).trim().length === 0) return '';
    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(String(context), this.settings)
      : { text: String(context) };
    const safeContext = masked.text.replace(/__LLMT_MASK_/g, '__LLMT_CTX_MASK_');
    return '\n\nUse the following page context to guide terminology, style, and disambiguation. Do not translate the context itself; only use it to improve the translation of the requested text.\n\n' + safeContext.trim();
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
    // Fully mask credentials; never log even a partial API key.
    if (safeHeaders['Authorization']) {
      safeHeaders['Authorization'] = '[REDACTED]';
    }
    if (safeHeaders['api-key']) {
      safeHeaders['api-key'] = '[REDACTED]';
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
    const systemMsg = (options.systemPrompt || this.settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt) + this._buildStylePresetSection() + this._buildAiTermsSection() + this._buildContextSection(options.context);
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
    const capabilities = typeof getProviderCapabilities === 'function'
      ? getProviderCapabilities(this.settings.provider)
      : { nativeMethod: '' };
    if (capabilities.nativeMethod) {
      const translateNative = this[capabilities.nativeMethod];
      if (typeof translateNative !== 'function') throw new Error(`Provider adapter is not loaded: ${this.settings.provider}`);
      return translateNative.call(this, text, sourceLang, targetLang, options);
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
    const cacheKey = typeof makeCacheKey === 'function'
      ? makeCacheKey(text, sourceLang, targetLang, model, { ...this.settings, context: options.context || '', systemPrompt: options.systemPrompt || this.settings.systemPrompt, userPromptTemplate: options.userPromptTemplate || this.settings.userPromptTemplate })
      : null;
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
      messages: this._buildMessagesForProvider(requestText, sourceLang, targetLang, { context: options.context }),
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
        const requestScope = this._createRequestScope(timeout, options.signal);

        let response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: requestScope.controller.signal
          });
        } finally {
          requestScope.cleanup();
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
              await this._sleep(delay, options.signal);
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
              await this._sleep(delay, options.signal);
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
          const fallbackScope = this._createRequestScope(timeout, options.signal);
          try {
            const fallbackResponse = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({ ...body, stream: false }),
              signal: fallbackScope.controller.signal
            });
            if (!fallbackResponse.ok) {
              const fallbackErrorText = await fallbackResponse.text().catch(() => 'Unable to read fallback error response');
              throw new Error(`Non-stream fallback failed ${fallbackResponse.status}: ${fallbackErrorText.slice(0, 200)}`);
            }
            responseResult = await this._parseChatCompletionResponse(fallbackResponse, requestText);
            translatedStream = responseResult.content || '';
            translated = translatedStream.trim();
          } catch (fallbackErr) {
            throw fallbackErr;
          } finally {
            fallbackScope.cleanup();
          }
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
          this._log('error', tag, 'Empty translation response', { streamContentLength: translatedStream.length });
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

        // User/run cancellation is not a timeout and must never be retried.
        if (options.signal?.aborted) throw err;

        // Timeout
        if (err.name === 'AbortError') {
          this._log('error', tag, `Request timeout after ${timeout}ms`, { url });
          lastError = new Error(`Request timeout (${timeout}ms). The API did not respond. Try a faster model (deepseek-v4-flash) or check network.`);
          if (attempt < maxRetries) {
            const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
            this._log('info', tag, `Retrying after timeout in ${delay}ms...`);
            await this._sleep(delay, options.signal);
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
            await this._sleep(delay, options.signal);
            continue;
          }
          throw lastError;
        }

        // Unknown error — retry
        this._log('error', tag, `Request failed (attempt ${attempt + 1}): ${err.message}`, { duration });
        if (attempt < maxRetries) {
          const delay = LLM_API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
          await this._sleep(delay, options.signal);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Translation failed after all retries');
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

  _sleep(ms, signal) {
    if (signal?.aborted) return Promise.reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(finish, ms);
      function finish() {
        signal?.removeEventListener('abort', abort);
        resolve();
      }
      function abort() {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      }
      signal?.addEventListener('abort', abort, { once: true });
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LLMAPI, LLM_API_CONFIG };
}
