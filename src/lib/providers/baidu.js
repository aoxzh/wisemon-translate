/**
 * Baidu Translate provider adapter for LLMAPI.
 */
(function() {
  if (typeof LLMAPI === 'undefined') return;

  function md5(str) {
      function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
      }
      function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
      }
      function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
      function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
      function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
      function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
      function md5blk(s) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
      }
      function md5blkArray(a) {
        var n = a.length, b = [], i;
        for (i = 0; i < n; i += 4) {
          b[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return b;
      }
      function md51(s) {
        var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, tail, tab;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        var len = s.length;
        var buf = [];
        for (i = 0; i < len; i++) buf.push(s.charCodeAt(i));
        buf.push(0x80);
        var padLen = (len < 56) ? (56 - len - 1) : (120 - len - 1);
        for (i = 0; i < padLen; i++) buf.push(0);
        var bitLen = n * 8;
        buf.push(bitLen & 0xff, (bitLen >>> 8) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 24) & 0xff, 0, 0, 0, 0);
        md5cycle(state, md5blkArray(buf.slice(0, 64)));
        if (buf.length > 64) md5cycle(state, md5blkArray(buf.slice(64, 128)));
        return state;
      }
      function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
      function hex_chr(val) {
        var hex = '0123456789abcdef', str = '', j;
        for (j = 0; j < 4; j++) {
          str += hex.charAt((val >> (j * 8 + 4)) & 0x0F) + hex.charAt((val >> (j * 8)) & 0x0F);
        }
        return str;
      }
      return md51(str).map(hex_chr).join('');
    }

  LLMAPI.prototype.translateWithBaidu = async function(text, sourceLang, targetLang, options = {}) {
    const tag = 'Baidu';
    if (!text || !text.trim()) return '';
    const apiKey = typeof getEffectiveApiKey === 'function' ? getEffectiveApiKey(this.settings) : this.settings.apiKey;
    if (!apiKey) throw new Error('Baidu API Key (secret key) is required. Get one at https://fanyi-api.baidu.com');
    const model = 'baidu-standard';
    const cacheKey = typeof makeCacheKey === 'function' ? makeCacheKey(text, sourceLang, targetLang, model) : null;
    if (cacheKey && !options.noCache) {
      const cached = typeof getCachedTranslation === 'function' ? await getCachedTranslation(cacheKey) : null;
      if (cached) return cached;
    }

    const masked = typeof maskSensitiveData === 'function'
      ? maskSensitiveData(text, this.settings)
      : { text, map: [] };
    const sl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('baidu', sourceLang || 'auto', 'source')
      : (sourceLang && sourceLang !== 'auto' ? sourceLang : 'auto');
    const tl = typeof normalizeProviderLanguage === 'function'
      ? normalizeProviderLanguage('baidu', targetLang || 'zh-CN', 'target')
      : (targetLang || 'zh');
    const appid = this.settings.baiduAppId || this.settings.model || 'baidu-standard';
    const salt = String(Date.now()) + String(Math.floor(Math.random() * 100000));
    const sign = md5(appid + masked.text + salt + apiKey);
    const apiUrl = (this.settings.baseURL || 'https://fanyi-api.baidu.com/api/trans/vip').replace(/\/+$/, '') + '/translate';
    const params = 'q=' + encodeURIComponent(masked.text) +
      '&from=' + encodeURIComponent(sl) + '&to=' + encodeURIComponent(tl) +
      '&appid=' + encodeURIComponent(appid) + '&salt=' + encodeURIComponent(salt) + '&sign=' + encodeURIComponent(sign);
    const startTime = Date.now();
    this._log('info', tag, 'Baidu request queued', this._usagePayload(null, masked.text, {
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
        const response = await fetch(apiUrl + '?' + params, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          this._logResponse(tag, apiUrl, response.status, duration, errorText);
          if (response.status === 429 && attempt < 2) {
            this._log('warn', tag, 'Baidu rate limited, retry ' + (attempt + 1) + '/2');
            await this._sleep(2000 * Math.pow(2, attempt));
            continue;
          }
          throw new Error('Baidu API Error ' + response.status + ': ' + errorText.slice(0, 200));
        }
        const data = await response.json();
        if (data.error_code) {
          const errMap = { '54001': 'Invalid signing (MD5 mismatch — check appid and secret key)', '54003': 'Access frequency limited', '54004': 'Insufficient balance', '54005': 'Query too long', '52001': 'Request timeout', '52002': 'System error', '52003': 'Unauthorized user' };
          throw new Error('Baidu error ' + data.error_code + ': ' + (errMap[data.error_code] || data.error_msg || 'Unknown error'));
        }
        let translated = data.trans_result?.[0]?.dst || '';
        translated = typeof restoreSensitiveData === 'function' ? restoreSensitiveData(translated, masked.map) : translated;
        translated = translated.trim();
        if (!translated) throw new Error('Empty translation response from Baidu');
        this._log('info', tag, 'Translation OK (' + duration + 'ms, ' + text.length + '->' + translated.length + ' chars)');
        this._log('info', tag, 'Baidu usage estimate', this._usagePayload(null, masked.text, {
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
          lastError = new Error('Baidu request timeout (' + timeout + 'ms)');
          if (attempt < 2) { await this._sleep(1500 * Math.pow(2, attempt)); continue; }
          throw lastError;
        }
        if (err.message && err.message.indexOf('Baidu error') === 0) throw err;
        if (attempt < 2) {
          this._log('warn', tag, 'Baidu request failed (attempt ' + (attempt + 1) + '/3): ' + err.message);
          await this._sleep(1500 * Math.pow(2, attempt));
        }
      }
    }
    throw lastError || new Error('Baidu translation failed after retries');
  };
})();
