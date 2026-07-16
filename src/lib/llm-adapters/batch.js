/**
 * LLM batch / long-text / multi-text adapters.
 * Loaded after llm-api.js to keep the core translation wrapper focused.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  /**
   * Batch translate with concurrent execution
   * @param {string[]} texts
   * @param {string} sourceLang
   * @param {string} targetLang
   * @param {function} [onProgress] - (completed, total)
   * @returns {Promise<string[]>}
   */
  LLMAPI.prototype.translateBatch = async function(texts, sourceLang, targetLang, options = {}) {
    // Backward compatibility: 4th argument used to be onProgress callback
    let onProgress = null;
    if (typeof options === 'function') {
      onProgress = options;
      options = {};
    } else {
      onProgress = options.onProgress || null;
    }
    const context = options.context || '';
    const translateOptions = {
      ...(context ? { context } : {}),
      ...(options.signal ? { signal: options.signal } : {})
    };

    if (!texts || texts.length === 0) return [];
    if (texts.length === 1) {
      try {
        const result = await this.translate(texts[0], sourceLang, targetLang, translateOptions);
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
    const capabilities = typeof getProviderCapabilities === 'function'
      ? getProviderCapabilities(this.settings.provider)
      : { supportsMultiText: true };
    const useMultiTextBatch = capabilities.supportsMultiText
      && this.settings.maxCharsPerRequest >= 2000 && total > 1;
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
            const translated = await this.translate(item.text, sourceLang, targetLang, translateOptions);
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
            const batchResults = await this.translateMultiText(batchTexts, sourceLang, targetLang, translateOptions);
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
                const translated = await this.translate(item.text, sourceLang, targetLang, translateOptions);
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
            const translated = await this.translate(text, sourceLang, targetLang, translateOptions);
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
  };

  LLMAPI.prototype._runWithConcurrency = async function(items, limit, worker) {
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
  };

  LLMAPI.prototype._getLongTextChunkSize = function() {
    const configured = Number(this.settings.maxCharsPerRequest || 12000);
    const provider = this.settings.provider || '';
    if (['google', 'deepl', 'baidu', 'microsoft'].includes(provider)) {
      return Math.max(1200, Math.min(configured, 4000));
    }
    if (this._isDeepSeekFlash()) {
      return Math.max(4000, Math.min(configured, 12000));
    }
    return Math.max(3000, Math.min(configured, this.settings.largeTextMode ? 9000 : 6000));
  };

  LLMAPI.prototype._shouldSplitLongText = function(text) {
    const value = String(text || '');
    if (!value.trim()) return false;
    return value.length > this._getLongTextChunkSize();
  };

  LLMAPI.prototype._splitLongText = function(text, maxChars) {
    if (typeof splitTextIntoChunks === 'function') {
      return splitTextIntoChunks(text, maxChars).filter(Boolean);
    }
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
    return chunks;
  };

  LLMAPI.prototype.translateLongText = async function(text, sourceLang, targetLang, options = {}) {
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
    const cacheKey = typeof makeCacheKey === 'function'
      ? makeCacheKey(text, sourceLang, targetLang, this.settings.model, { ...this.settings, context: options.context || '' })
      : null;
    if (joined && cacheKey && !options.noCache && typeof setCachedTranslation === 'function') {
      await setCachedTranslation(cacheKey, joined);
    }
    return joined;
  };

  LLMAPI.prototype._extractJsonObject = function(text) {
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
  };

  LLMAPI.prototype._extractJsonValue = function(text) {
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
  };

  LLMAPI.prototype._looksLikeJsonArtifact = function(text) {
    const value = String(text || '').trim();
    return /^[[{]/.test(value) && /"?(?:id|text|translations)"?\s*:/.test(value);
  };

  LLMAPI.prototype._normalizeTranslationValue = function(value, maskedItem) {
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
  };

  LLMAPI.prototype._supportsJsonResponseFormat = function() {
    return typeof getProviderCapabilities === 'function'
      ? getProviderCapabilities(this.settings.provider).supportsJsonResponse
      : true;
  };

  /**
   * Translate multiple texts in a single API call
   * Uses a numbered separator format that the LLM can understand
   */
  LLMAPI.prototype.translateMultiText = async function(texts, sourceLang, targetLang, options = {}) {
    if (this.settings.provider === 'google') {
      return this.translateBatchWithGoogle(texts, sourceLang, targetLang, options);
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

    const multiSystemMsg = (systemPrompt || DEFAULT_SETTINGS.systemPrompt) + this._buildStylePresetSection() + this._buildAiTermsSection() + this._buildContextSection(options.context) +
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
    const requestScope = this._createRequestScope(this._getRequestTimeout(combinedText, texts.length), options.signal);

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
        signal: requestScope.controller.signal
      });
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
          signal: requestScope.controller.signal
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
          responseLength: raw.length
        });
        for (const idx of missing) {
          try {
            results[idx] = await this.translate(texts[idx], sourceLang, targetLang, { ...options, noCache: true });
          } catch (err) {
            results[idx] = `[Translation Error: ${err.message}]`;
          }
        }
      }

      return results;
    } catch (err) {
      throw err;
    } finally {
      requestScope.cleanup();
    }
  };

  LLMAPI.prototype._cleanTranslatedText = function(text) {
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
  };
})();
