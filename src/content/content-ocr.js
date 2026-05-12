(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  async function loadTesseract() {
    if (ctx.state.tesseractLoaded && ctx.state.tesseractWorker) return ctx.state.tesseractWorker;
    if (ctx.state.tesseractLoading) {
      for (let i = 0; i < 50; i++) {
        if (ctx.state.tesseractLoaded) return ctx.state.tesseractWorker;
        await new Promise(function(r) { setTimeout(r, 200); });
      }
      throw new Error('Tesseract load timeout');
    }
    ctx.state.tesseractLoading = true;
    try {
      const Tesseract = await new Promise(function(resolve, reject) {
        if (window.Tesseract) { resolve(window.Tesseract); ctx.state.tesseractLoading = false; return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = function() { resolve(window.Tesseract); };
        script.onerror = function() { reject(new Error('Failed to load Tesseract.js CDN')); };
        document.head.appendChild(script);
      });
      if (!Tesseract) throw new Error('Tesseract not available');
      ctx.state.tesseractWorker = await Tesseract.createWorker('eng+jpn+chi_sim', 1, {
        logger: function(m) {
          if (typeof LOG !== 'undefined') LOG.debug('OCR', 'Progress: ' + Math.round(m.progress * 100) + '%');
        }
      });
      ctx.state.tesseractLoaded = true;
      if (typeof LOG !== 'undefined') LOG.info('OCR', 'Tesseract worker ready (eng+jpn+chi_sim)');
      return ctx.state.tesseractWorker;
    } catch (e) {
      ctx.state.tesseractLoading = false;
      ctx.fn.safeLog?.('error', 'OCR', 'Tesseract load failed: ' + e.message);
      throw e;
    }
  }

  async function handleOcrImage(imageUrl) {
    if (!imageUrl) return { error: 'No image URL provided' };
    try {
      ctx.fn.showToast('OCR: recognizing text...', 3000);
      const worker = await loadTesseract();
      const resp = await chrome.runtime.sendMessage({ action: 'fetch-image', url: imageUrl });
      if (resp.error) throw new Error('Image fetch failed: ' + resp.error);
      const result = await worker.recognize('data:image/png;base64,' + resp.data);
      const text = (result?.data?.text || '').trim();
      if (!text) return { error: 'No text found in image' };
      const trans = await chrome.runtime.sendMessage({ action: 'translate', text: text });
      ctx.fn.showToast('OCR: ' + (trans.translated || text).slice(0, 100), 4000);
      return { text, translated: trans.translated || text };
    } catch (e) {
      ctx.fn.safeLog?.('error', 'OCR', 'OCR failed: ' + e.message);
      return { error: e.message };
    }
  }

  Object.assign(ctx.fn, {
    handleOcrImage
  });
})();
