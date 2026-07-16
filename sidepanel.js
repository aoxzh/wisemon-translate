(async function() {
  I18N.init();
  const $ = id => document.getElementById(id);
  const sourceText = $('source-text');
  const targetLang = $('target-lang');
  const translateBtn = $('translate-text');
  const resultText = $('result-text');
  const copyBtn = $('copy-result');
  const openOptions = $('open-options');
  const openLogs = $('open-logs');
  const useSelection = $('use-selection');
  const usePage = $('use-page');
  const clearText = $('clear-text');
  const speakSource = $('speak-source');
  const speakResult = $('speak-result');
  const clearHistory = $('clear-history');
  const historyList = $('history-list');
  const readerFile = $('reader-file');
  const importFile = $('import-file');
  const extractReadable = $('extract-readable');
  const stopTranslate = $('stop-translate');
  const readerProgress = $('reader-progress');
  const readerProgressBar = $('reader-progress-bar');
  const readerProgressText = $('reader-progress-text');
  const readerResult = $('reader-result');
  const toggleReaderLayout = $('toggle-reader-layout');
  const retryFailed = $('retry-failed');
  const saveResult = $('save-result');
  const saveHtml = $('save-html');
  const saveMarkdown = $('save-markdown');
  const chapterNav = $('chapter-nav');
  const buildChapters = $('build-chapters');
  const resumeTranslate = $('resume-translate');
  const HISTORY_KEY = 'llm-translate-sidepanel-history';
  const embedded = new URLSearchParams(location.search).has('embed');

  let settings = typeof DEFAULT_SETTINGS !== 'undefined' ? { ...DEFAULT_SETTINGS } : {};
  let history = [];
  let stopRequested = false;
  let readerLayout = 'bilingual';
  let readerSegments = [];
  let readerMode = 'text';
  let readerSourceSignature = '';
  I18N.localizeContainer(document);
  document.querySelector('.side-root')?.classList.toggle('is-embedded', embedded);
  try {
    const res = await chrome.runtime.sendMessage({ action: 'get-settings' });
    settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };
    window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
    window.__LLM_CTX__.state.settings = settings;
    targetLang.value = settings.targetLang || 'zh-CN';
    applyUiTheme(settings.uiTheme || 'auto');
  } catch(e) {}
  await loadHistory();
  await loadDraft();

  function applyUiTheme(theme) {
    document.documentElement.classList.remove('t-light', 't-dark', 't-ocean', 't-violet', 't-amber', 't-slate');
    if (theme === 'light') document.documentElement.classList.add('t-light');
    if (theme === 'dark') document.documentElement.classList.add('t-dark');
    if (theme === 'ocean') document.documentElement.classList.add('t-ocean');
    if (theme === 'violet') document.documentElement.classList.add('t-violet');
    if (theme === 'amber') document.documentElement.classList.add('t-amber');
    if (theme === 'slate') document.documentElement.classList.add('t-slate');
  }

  translateBtn.addEventListener('click', async () => {
    const text = sourceText.value.trim();
    if (!text) return;
    stopRequested = false;
    translateBtn.disabled = true;
    stopTranslate.disabled = false;
    resultText.textContent = I18N.t('sidepanel_translating');
    readerResult.hidden = true;
    resultText.hidden = false;
    try {
      ensureReaderSegments();
      if (readerSegments.length > 1 || text.length > 12000) {
        const translated = await translateReaderSegments(readerSegments, { resume: false });
        resultText.textContent = translated;
        await addHistory(text, translated);
      } else {
        const res = await chrome.runtime.sendMessage({ action: 'translate', text, targetLang: targetLang.value });
        if (res.error) throw new Error(res.error);
        resultText.textContent = res.translated || '';
        if (readerSegments[0]) {
          readerSegments[0].translated = res.translated || '';
          readerSegments[0].status = 'done';
          renderChapterNav();
        }
        await saveDraft();
        await addHistory(text, res.translated || '');
      }
      if (typeof LOG !== 'undefined') LOG.info('SidePanel', 'Reader text translated', { textLength: text.length });
    } catch (err) {
      resultText.hidden = false;
      readerResult.hidden = true;
      resultText.textContent = stopRequested ? 'Stopped.' : I18N.t('sidepanel_failed_prefix') + err.message;
      if (typeof LOG !== 'undefined') LOG.error('SidePanel', `Long text translation failed: ${err.message}`, { textLength: text.length });
    } finally {
      translateBtn.disabled = false;
      stopTranslate.disabled = true;
      updateProgress(0, 0, true);
    }
  });

  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(getTranslatedOutput() || resultText.textContent || '');
  });

  saveResult.addEventListener('click', () => {
    downloadText('translated-reader.txt', getTranslatedOutput() || resultText.textContent || '', 'text/plain;charset=utf-8');
  });

  saveHtml.addEventListener('click', () => {
    downloadText('translated-reader.html', buildHtmlExport(), 'text/html;charset=utf-8');
  });

  saveMarkdown.addEventListener('click', () => {
    downloadText('translated-reader.md', buildMarkdownExport(), 'text/markdown;charset=utf-8');
  });

  toggleReaderLayout.addEventListener('click', () => {
    readerLayout = readerLayout === 'bilingual' ? 'translation-only' : 'bilingual';
    toggleReaderLayout.textContent = readerLayout === 'bilingual' ? 'Bilingual' : 'Translation';
    readerResult.classList.toggle('translation-only', readerLayout === 'translation-only');
    saveDraft();
  });

  stopTranslate.addEventListener('click', () => {
    stopRequested = true;
  });

  buildChapters.addEventListener('click', async () => {
    rebuildReaderSegmentsFromText();
    renderReaderShell();
    await saveDraft();
  });

  resumeTranslate.addEventListener('click', async () => {
    ensureReaderSegments();
    if (!readerSegments.length) return;
    stopRequested = false;
    translateBtn.disabled = true;
    stopTranslate.disabled = false;
    try {
      const translated = await translateReaderSegments(readerSegments, { resume: true });
      resultText.textContent = translated;
      await addHistory(sourceText.value.trim(), translated);
    } catch (err) {
      resultText.hidden = false;
      readerResult.hidden = true;
      resultText.textContent = stopRequested ? 'Stopped.' : I18N.t('sidepanel_failed_prefix') + err.message;
    } finally {
      translateBtn.disabled = false;
      stopTranslate.disabled = true;
      updateProgress(0, 0, true);
    }
  });

  if (retryFailed) {
    retryFailed.addEventListener('click', async () => {
      ensureReaderSegments();
      const failed = readerSegments.filter(segment => segment.status === 'error' || !segment.translated);
      if (!failed.length) return;
      stopRequested = false;
      translateBtn.disabled = true;
      stopTranslate.disabled = false;
      try {
        await retryReaderSegments(failed);
        const translated = getTranslatedOutput();
        resultText.textContent = translated;
        await addHistory(sourceText.value.trim(), translated);
      } catch (err) {
        resultText.hidden = false;
        resultText.textContent = stopRequested ? 'Stopped.' : I18N.t('sidepanel_failed_prefix') + err.message;
      } finally {
        translateBtn.disabled = false;
        stopTranslate.disabled = true;
        updateProgress(0, 0, true);
      }
    });
  }

  chapterNav.addEventListener('change', () => {
    const id = chapterNav.value;
    if (!id) return;
    document.querySelector('[data-segment-id="' + CSS.escape(id) + '"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  importFile.addEventListener('click', async () => {
    const file = readerFile.files && readerFile.files[0];
    if (!file) return;
    resultText.textContent = 'Importing...';
    try {
      const imported = await readReaderFile(file);
      sourceText.value = imported.text;
      readerSegments = imported.segments || buildReaderSegments(imported.text, imported.mode || 'text');
      readerMode = imported.mode || 'text';
      readerSourceSignature = getSourceSignature();
      renderReaderShell();
      resultText.textContent = 'Imported ' + file.name + ' (' + sourceText.value.length + ' chars).';
      await saveDraft();
    } catch (err) {
      resultText.textContent = 'Import failed: ' + err.message;
    }
  });

  extractReadable.addEventListener('click', async () => {
    const text = await getActiveTabText('get-page-text');
    if (text) {
      sourceText.value = text;
      rebuildReaderSegmentsFromText();
      resultText.textContent = 'Extracted page text (' + text.length + ' chars).';
      await saveDraft();
    }
  });

  useSelection.addEventListener('click', async () => {
    const text = await getActiveTabText('get-selection-text');
    if (text) {
      sourceText.value = text;
      rebuildReaderSegmentsFromText();
    }
  });

  usePage.addEventListener('click', async () => {
    const text = await getActiveTabText('get-page-text');
    if (text) {
      sourceText.value = text;
      rebuildReaderSegmentsFromText();
    }
  });

  clearText.addEventListener('click', () => {
    sourceText.value = '';
    readerSegments = [];
    readerMode = 'text';
    readerSourceSignature = '';
    renderChapterNav();
    resultText.textContent = I18N.t('sidepanel_no_result');
    resultText.hidden = false;
    readerResult.hidden = true;
    chrome.storage.local.remove('llm-translate-sidepanel-draft');
  });

  if (speakSource) {
    speakSource.addEventListener('click', () => {
      const lang = settings.sourceLang && settings.sourceLang !== 'auto' ? settings.sourceLang : settings.targetLang;
      window.__LLM_TTS__?.speak(sourceText.value, lang);
    });
  }

  if (speakResult) {
    speakResult.addEventListener('click', () => {
      window.__LLM_TTS__?.speak(resultText.textContent, targetLang.value || settings.targetLang);
    });
  }

  clearHistory.addEventListener('click', async () => {
    history = [];
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
    renderHistory();
  });

  openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
  openLogs.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('options.html#logs') }));

  sourceText.addEventListener('input', debounce(async () => {
    rebuildReaderSegmentsFromText();
    await saveDraft();
  }, 600));

  async function readReaderFile(file) {
    const name = (file.name || '').toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      return await readPdfFile(file);
    }
    const text = await file.text();
    if (file.type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      doc.querySelectorAll('script,style,noscript,template,nav,header,footer,aside').forEach(el => el.remove());
      const extracted = (doc.body?.innerText || doc.documentElement?.innerText || text).replace(/\n{3,}/g, '\n\n').trim();
      return { text: extracted, segments: buildReaderSegments(extracted, 'html'), mode: 'html' };
    }
    const extracted = text.trim();
    return { text: extracted, segments: buildReaderSegments(extracted, 'text'), mode: 'text' };
  }

  async function readPdfFile(file) {
    const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.mjs');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
      if (text) pages.push({ pageNo, text });
      updateProgress(pageNo, pdf.numPages);
    }
    updateProgress(0, 0, true);
    const segments = pages.map(page => ({
      id: 'page-' + page.pageNo,
      title: 'Page ' + page.pageNo,
      source: page.text,
      translated: '',
      status: 'pending',
      type: 'pdf-page',
      pageNo: page.pageNo
    }));
    return {
      text: segments.map(item => item.title + '\n' + item.source).join('\n\n').trim(),
      segments,
      mode: 'pdf'
    };
  }

  function rebuildReaderSegmentsFromText() {
    readerMode = 'text';
    readerSegments = buildReaderSegments(sourceText.value || '', readerMode);
    readerSourceSignature = getSourceSignature();
    renderChapterNav();
  }

  function ensureReaderSegments() {
    if (!readerSegments.length || readerSourceSignature !== getSourceSignature()) {
      rebuildReaderSegmentsFromText();
    }
  }

  function getSourceSignature() {
    return String(sourceText.value || '').trim();
  }

  function buildReaderSegments(text, mode) {
    const blocks = segmentReaderText(text);
    return blocks.map((block, index) => {
      const heading = detectSegmentTitle(block, index);
      return {
        id: 'seg-' + Date.now().toString(36) + '-' + index,
        title: heading.title,
        source: heading.source,
        translated: '',
        status: 'pending',
        type: mode === 'pdf' ? 'pdf-page' : 'chapter',
        level: heading.level || 2,
        pageNo: null
      };
    });
  }

  function detectSegmentTitle(block, index) {
    const lines = String(block || '').split('\n').map(line => line.trim()).filter(Boolean);
    const first = lines[0] || ('Section ' + (index + 1));
    const isHeading = lines.length > 1 && first.length <= 90 && (
      /^#{1,6}\s+/.test(first) ||
      /^(chapter|section|part|book)\s+[\w\divxlcdm-]+/i.test(first) ||
      /^第.{1,12}[章节卷部篇]/.test(first)
    );
    if (isHeading) {
      const levelMatch = first.match(/^(#{1,6})\s+/);
      const level = levelMatch ? Math.min(6, Math.max(2, levelMatch[1].length + 1)) : 2;
      return { title: first.replace(/^#{1,6}\s+/, ''), source: lines.slice(1).join('\n') || block, level };
    }
    return { title: 'Section ' + (index + 1), source: block, level: 2 };
  }

  function segmentReaderText(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!normalized) return [];
    const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    const segments = [];
    const maxChars = Math.max(1800, Math.min(Number(settings.maxCharsPerRequest || 6000), 6000));
    let current = '';
    for (const paragraph of paragraphs) {
      if (paragraph.length > maxChars) {
        if (current) segments.push(current);
        const chunks = typeof splitTextIntoChunks === 'function' ? splitTextIntoChunks(paragraph, maxChars) : [paragraph];
        segments.push(...chunks);
        current = '';
      } else if (current && current.length + paragraph.length + 2 > maxChars) {
        segments.push(current);
        current = paragraph;
      } else {
        current = current ? current + '\n\n' + paragraph : paragraph;
      }
    }
    if (current) segments.push(current);
    return segments.length ? segments : [normalized];
  }

  async function translateReaderSegments(segments, opts = {}) {
    const resume = !!opts.resume;
    renderReaderShell();
    const total = segments.length;
    let done = segments.filter(segment => segment.status === 'done' || segment.translated).length;
    updateProgress(done, total);
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (stopRequested) break;
      if (resume && segment.translated) {
        segment.status = 'done';
        updateSegmentNode(segment);
        continue;
      }
      segment.status = 'translating';
      updateSegmentNode(segment);
      renderChapterNav();
      const res = await chrome.runtime.sendMessage({
        action: 'translate',
        text: segment.source,
        targetLang: targetLang.value
      });
      if (res.error) {
        segment.status = 'error';
        updateSegmentNode(segment, res.error);
        await saveDraft();
        throw new Error(res.error);
      }
      segment.translated = res.translated || '';
      segment.status = 'done';
      done = segments.filter(item => item.status === 'done' || item.translated).length;
      resultText.textContent = getTranslatedOutput();
      updateSegmentNode(segment);
      renderChapterNav();
      updateProgress(done, total);
      await saveDraft();
    }
    return getTranslatedOutput();
  }

  async function retryReaderSegments(segments) {
    renderReaderShell();
    updateProgress(0, segments.length);
    for (let i = 0; i < segments.length; i++) {
      if (stopRequested) break;
      const segment = segments[i];
      segment.status = 'translating';
      updateSegmentNode(segment);
      const res = await chrome.runtime.sendMessage({
        action: 'translate',
        text: segment.source,
        targetLang: targetLang.value
      });
      if (res.error) {
        segment.status = 'error';
        updateSegmentNode(segment, res.error);
      } else {
        segment.translated = res.translated || '';
        segment.status = segment.translated ? 'done' : 'error';
        updateSegmentNode(segment, segment.translated ? '' : 'Empty translation');
      }
      updateProgress(i + 1, segments.length);
      renderChapterNav();
      await saveDraft();
    }
  }

  function renderReaderShell() {
    readerResult.innerHTML = '';
    readerResult.hidden = false;
    resultText.hidden = true;
    readerResult.classList.toggle('translation-only', readerLayout === 'translation-only');
    readerResult.classList.toggle('pdf-layout', readerMode === 'pdf');
    readerSegments.forEach(segment => {
      readerResult.appendChild(createSegmentNode(segment));
    });
    renderChapterNav();
  }

  function createSegmentNode(segment) {
    const row = document.createElement('section');
    row.className = 'side-segment';
    row.dataset.segmentId = segment.id;
    row.innerHTML = '<div class="side-segment-head"><strong></strong><span></span></div><div class="side-segment-source"></div><div class="side-segment-translation"></div>';
    updateSegmentNode(segment, '', row);
    return row;
  }

  function updateSegmentNode(segment, errorText, node) {
    const row = node || readerResult.querySelector('[data-segment-id="' + CSS.escape(segment.id) + '"]');
    if (!row) return;
    row.classList.toggle('is-pending', !segment.translated);
    row.classList.toggle('is-translating', segment.status === 'translating');
    row.classList.toggle('is-error', segment.status === 'error');
    row.querySelector('.side-segment-head strong').textContent = segment.title || 'Section';
    row.querySelector('.side-segment-head span').textContent = getSegmentStatusLabel(segment);
    row.querySelector('.side-segment-source').textContent = segment.source || '';
    const translation = row.querySelector('.side-segment-translation');
    if (segment.status === 'translating') {
      translation.textContent = 'Translating...';
    } else if (segment.status === 'error') {
      translation.textContent = 'Failed: ' + (errorText || 'Translation error');
    } else {
      translation.textContent = segment.translated || 'Pending';
    }
  }

  function renderChapterNav() {
    if (!chapterNav) return;
    chapterNav.innerHTML = '';
    if (!readerSegments.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No chapters';
      chapterNav.appendChild(option);
      return;
    }
    readerSegments.forEach((segment, index) => {
      const option = document.createElement('option');
      option.value = segment.id;
      option.textContent = getStatusMark(segment) + ' ' + (segment.title || ('Section ' + (index + 1)));
      chapterNav.appendChild(option);
    });
  }

  function getStatusMark(segment) {
    if (segment.status === 'done' || segment.translated) return '✓';
    if (segment.status === 'translating') return '…';
    if (segment.status === 'error') return '!';
    return '○';
  }

  function getSegmentStatusLabel(segment) {
    if (segment.status === 'done' || segment.translated) return 'Done';
    if (segment.status === 'translating') return 'Translating';
    if (segment.status === 'error') return 'Error';
    return 'Pending';
  }

  function getTranslatedOutput() {
    return readerSegments
      .map(segment => segment.translated || '')
      .filter(Boolean)
      .join('\n\n');
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text || ''], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildHtmlExport() {
    const title = readerMode === 'pdf' ? 'PDF Translation' : 'Reader Translation';
    const body = readerSegments.map(segment => {
      return [
        '<section class="segment">',
        '<h' + getExportHeadingLevel(segment) + '>' + escapeHtml(segment.title || 'Section') + '</h' + getExportHeadingLevel(segment) + '>',
        '<div class="columns">',
        '<article><h3>Original</h3><p>' + escapeHtml(segment.source || '').replace(/\n/g, '<br>') + '</p></article>',
        '<article><h3>Translation</h3><p>' + escapeHtml(segment.translated || '').replace(/\n/g, '<br>') + '</p></article>',
        '</div>',
        '</section>'
      ].join('');
    }).join('\n');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:32px;line-height:1.65;color:#1f252b}' +
      '.segment{break-inside:avoid;border-bottom:1px solid #ddd;padding:0 0 24px;margin:0 0 24px}' +
      'h1{font-size:24px}h2{font-size:19px}h3{font-size:16px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}' +
      'article{white-space:normal}h3{font-size:12px;text-transform:uppercase;color:#667085}' +
      '@media(max-width:720px){.columns{grid-template-columns:1fr}}' +
      '</style></head><body><h1>' + title + '</h1>' + body + '</body></html>';
  }

  function buildMarkdownExport() {
    const lines = ['# ' + (readerMode === 'pdf' ? 'PDF Translation' : 'Reader Translation'), ''];
    readerSegments.forEach(segment => {
      lines.push('#'.repeat(Math.max(2, Math.min(6, segment.level || 2))) + ' ' + sanitizeMarkdownHeading(segment.title || 'Section'), '');
      lines.push('### Original', '');
      lines.push(segment.source || '', '');
      lines.push('### Translation', '');
      lines.push(segment.translated || '', '');
    });
    return lines.join('\n');
  }

  function getExportHeadingLevel(segment) {
    return Math.max(2, Math.min(6, Number(segment.level || 2)));
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function sanitizeMarkdownHeading(text) {
    return String(text || '').replace(/\s+/g, ' ').replace(/^#+\s*/, '').trim() || 'Section';
  }

  function updateProgress(done, total, hide) {
    if (!readerProgress) return;
    if (hide || !total) {
      readerProgress.hidden = true;
      if (readerProgressBar) readerProgressBar.style.width = '0%';
      if (readerProgressText) readerProgressText.textContent = '0 / 0';
      return;
    }
    readerProgress.hidden = false;
    const pct = Math.max(0, Math.min(100, Math.round(done / total * 100)));
    if (readerProgressBar) readerProgressBar.style.width = pct + '%';
    if (readerProgressText) readerProgressText.textContent = done + ' / ' + total;
  }

  async function saveDraft() {
    await chrome.storage.local.set({
      'llm-translate-sidepanel-draft': {
        text: sourceText.value || '',
        translated: resultText.textContent || '',
        readerSegments,
        readerMode,
        readerLayout,
        readerSourceSignature
      }
    });
  }

  function debounce(fn, ms) {
    let timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  async function getActiveTabText(action) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) return '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { action });
          return res?.text || '';
        } catch (err) {
          if (attempt < 2) {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId: tab.id }).catch(() => {});
            await new Promise(r => setTimeout(r, 400 + attempt * 200));
          }
        }
      }
      return '';
    } catch (err) {
      if (typeof LOG !== 'undefined') LOG.warn('SidePanel', `Failed to read tab text: ${err.message}`);
      return '';
    }
  }

  async function loadHistory() {
    try {
      const res = await chrome.storage.local.get(HISTORY_KEY);
      history = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
      renderHistory();
    } catch (e) {}
  }

  async function loadDraft() {
    try {
      const res = await chrome.storage.local.get('llm-translate-sidepanel-draft');
      const draft = res['llm-translate-sidepanel-draft'];
      if (draft?.text) {
        sourceText.value = draft.text;
        if (draft.translated) resultText.textContent = draft.translated;
        if (Array.isArray(draft.readerSegments)) {
          readerSegments = draft.readerSegments.map((segment, index) => normalizeSegment(segment, index));
          readerMode = draft.readerMode || 'text';
          readerLayout = draft.readerLayout || 'bilingual';
          readerSourceSignature = draft.readerSourceSignature || getSourceSignature();
          toggleReaderLayout.textContent = readerLayout === 'bilingual' ? 'Bilingual' : 'Translation';
          renderReaderShell();
        } else {
          rebuildReaderSegmentsFromText();
        }
      }
    } catch (e) {}
  }

  async function addHistory(source, translated) {
    history.unshift({
      source,
      translated,
      ts: Date.now(),
      targetLang: targetLang.value
    });
    history = history.slice(0, 20);
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;
    if (!history.length) {
      historyList.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'side-result';
      empty.textContent = I18N.t('sidepanel_no_history');
      historyList.appendChild(empty);
      return;
    }
    historyList.innerHTML = '';
    history.forEach(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'side-history-item';
      const title = document.createElement('strong');
      title.textContent = item.source.slice(0, 90);
      const meta = document.createElement('span');
      meta.textContent = new Date(item.ts).toLocaleString() + ' · ' + item.targetLang;
      row.append(title, meta);
      row.addEventListener('click', () => {
        sourceText.value = item.source;
        resultText.textContent = item.translated;
        readerMode = 'text';
        readerSegments = buildReaderSegments(item.source, readerMode);
        const translatedParts = String(item.translated || '').split(/\n{2,}/);
        readerSegments.forEach((segment, index) => {
          segment.translated = translatedParts[index] || '';
          segment.status = segment.translated ? 'done' : 'pending';
        });
        readerSourceSignature = getSourceSignature();
        renderReaderShell();
      });
      historyList.appendChild(row);
    });
  }

  function normalizeSegment(segment, index) {
    const source = typeof segment === 'string' ? segment : (segment?.source || '');
    return {
      id: segment?.id || ('seg-' + Date.now().toString(36) + '-' + index),
      title: segment?.title || ('Section ' + (index + 1)),
      source,
      translated: segment?.translated || '',
      status: segment?.status || (segment?.translated ? 'done' : 'pending'),
      type: segment?.type || 'chapter',
      level: segment?.level || 2,
      pageNo: segment?.pageNo || null
    };
  }
})();
