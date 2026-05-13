(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function createFab() {
    if (ctx.state.fabElement) return;
    const fabElement = document.createElement('div');
    fabElement.id = 'llm-fab';
    fabElement.innerHTML = `
      <button id="llm-fab-main" title="wisemon-translate">T<span id="llm-fab-progress"></span></button>
      <div id="llm-fab-menu">
        <button id="llm-fab-translate" title="Translate Page">TP</button>
        <button id="llm-fab-restore" title="Restore Original">RO</button>
        <button id="llm-fab-scroll" title="Translate All Visible">TV</button>
        <button id="llm-fab-style" title="Toggle Bilingual/Translation Only">DM</button>
      </div>`;
    document.body.appendChild(fabElement);

    ctx.state.fabElement = fabElement;
    ctx.state.fabProgress = fabElement.querySelector('#llm-fab-progress');

    fabElement.querySelector('#llm-fab-main').addEventListener('click', () => {
      const menu = fabElement.querySelector('#llm-fab-menu');
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    });
    fabElement.querySelector('#llm-fab-translate').addEventListener('click', async () => {
      ctx.fn.togglePageTranslation().catch(err => ctx.fn.safeLog?.('error', 'Content', 'Toggle translation failed:', err));
      fabElement.querySelector('#llm-fab-menu').style.display = 'none';
    });
    fabElement.querySelector('#llm-fab-restore').addEventListener('click', () => {
      ctx.fn.restoreOriginal();
      ctx.fn.stopObservers();
      ctx.state.pageTranslated = false;
      fabElement.querySelector('#llm-fab-menu').style.display = 'none';
    });
    fabElement.querySelector('#llm-fab-scroll').addEventListener('click', () => {
      if (!ctx.state.pageTranslated) {
        ctx.fn.togglePageTranslation().catch(err => ctx.fn.safeLog?.('error', 'Content', 'Toggle translation failed:', err));
        return;
      }
      ctx.fn.scanNode(document.body);
      document.querySelectorAll(`[${ctx.state.attrProcessed || 'data-llm-done'}="true"]`).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 300 && rect.bottom > -300 && !ctx.fn.processedElements.has(el)) {
          ctx.fn.scheduleProcessViewBatch([el]);
        }
      });
      fabElement.querySelector('#llm-fab-menu').style.display = 'none';
    });
    fabElement.querySelector('#llm-fab-style').addEventListener('click', () => {
      const settings = ctx.state.settings || {};
      const cur = settings.displayMode || 'bilingual';
      settings.displayMode = cur === 'bilingual' ? 'replace' : 'bilingual';
      chrome.runtime.sendMessage({ action: 'set-settings', settings });
      if (ctx.state.pageTranslated) {
        ctx.fn.applyPageState(settings.displayMode === 'replace' ? 'translation' : 'dual');
        document.querySelectorAll('.llm-original-hidden').forEach(el => {
          settings.displayMode === 'replace' ? el.classList.add('llm-original-hidden') : el.classList.remove('llm-original-hidden');
        });
      }
      fabElement.querySelector('#llm-fab-menu').style.display = 'none';
    });
  }

  function updateFabProgress(done, total) {
    ctx.state.fabDone = done;
    ctx.state.fabTotal = total;
    const fabProgress = ctx.state.fabProgress;
    if (!fabProgress) return;
    if (total <= 0) {
      fabProgress.style.display = 'none';
      return;
    }
    fabProgress.style.display = 'block';
    fabProgress.textContent = done + '/' + total;
    if (done >= total) setTimeout(() => { fabProgress.style.display = 'none'; }, 1500);
  }

  Object.assign(ctx.fn, {
    createFab,
    updateFabProgress
  });
})();
