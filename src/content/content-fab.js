(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  const FAB_MARGIN = 8;

  function clampFabPosition(position, fabElement) {
    const width = fabElement?.offsetWidth || 44;
    const height = fabElement?.offsetHeight || 44;
    const left = Number(position?.left);
    const top = Number(position?.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return {
      left: Math.max(FAB_MARGIN, Math.min(window.innerWidth - width - FAB_MARGIN, left)),
      top: Math.max(FAB_MARGIN, Math.min(window.innerHeight - height - FAB_MARGIN, top))
    };
  }

  function applyFabPosition(fabElement) {
    const position = clampFabPosition(ctx.state.settings?.fabPosition, fabElement);
    if (!position) {
      fabElement.style.left = '';
      fabElement.style.top = '';
      fabElement.style.right = '';
      fabElement.style.bottom = '';
      return;
    }
    fabElement.style.left = position.left + 'px';
    fabElement.style.top = position.top + 'px';
    fabElement.style.right = 'auto';
    fabElement.style.bottom = 'auto';
  }

  function persistFabPosition(fabElement) {
    const position = clampFabPosition({
      left: parseFloat(fabElement.style.left),
      top: parseFloat(fabElement.style.top)
    }, fabElement);
    if (!position) return;
    const settings = ctx.state.settings || {};
    settings.fabPosition = position;
    ctx.state.settings = settings;
    chrome.runtime.sendMessage({ action: 'set-settings', settings }).catch(function() {});
  }

  function removeFab() {
    if (ctx.state.fabElement) {
      ctx.state.fabElement.remove();
      ctx.state.fabElement = null;
      ctx.state.fabProgress = null;
    }
  }

  function updateFabFromSettings() {
    if (ctx.state.settings?.enableFab === false) {
      removeFab();
      return;
    }
    createFab();
    if (ctx.state.fabElement) applyFabPosition(ctx.state.fabElement);
  }

  function createFab() {
    if (ctx.state.settings?.enableFab === false) return;
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
    applyFabPosition(fabElement);

    let dragState = null;
    const mainButton = fabElement.querySelector('#llm-fab-main');

    mainButton.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      const rect = fabElement.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false
      };
      try { mainButton.setPointerCapture(event.pointerId); } catch (e) {}
    });

    mainButton.addEventListener('pointermove', event => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) < 4) return;
      dragState.moved = true;
      const next = clampFabPosition({ left: dragState.left + dx, top: dragState.top + dy }, fabElement);
      if (!next) return;
      fabElement.classList.add('llm-fab-dragging');
      fabElement.style.left = next.left + 'px';
      fabElement.style.top = next.top + 'px';
      fabElement.style.right = 'auto';
      fabElement.style.bottom = 'auto';
      fabElement.querySelector('#llm-fab-menu').style.display = 'none';
      event.preventDefault();
    });

    function endDrag(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const wasMoved = dragState.moved;
      dragState = null;
      fabElement.classList.remove('llm-fab-dragging');
      try { mainButton.releasePointerCapture(event.pointerId); } catch (e) {}
      if (wasMoved) {
        ctx.state.fabSuppressClick = true;
        setTimeout(() => { ctx.state.fabSuppressClick = false; }, 0);
        persistFabPosition(fabElement);
      }
    }

    mainButton.addEventListener('pointerup', endDrag);
    mainButton.addEventListener('pointercancel', endDrag);

    mainButton.addEventListener('click', () => {
      if (ctx.state.fabSuppressClick) return;
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
    removeFab,
    updateFabFromSettings,
    updateFabProgress
  });
})();
