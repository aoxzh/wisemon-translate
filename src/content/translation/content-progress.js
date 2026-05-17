(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  const TASK_STATES = {
    IDLE: 'idle',
    SCANNING: 'scanning',
    QUEUED: 'queued',
    TRANSLATING: 'translating',
    SETTLING: 'settling',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELED: 'canceled'
  };

  function createTranslationTask() {
    let snapshot = {
      state: TASK_STATES.IDLE,
      runId: 0,
      reason: '',
      updatedAt: Date.now()
    };

    function setState(state, detail) {
      snapshot = {
        ...snapshot,
        ...(detail || {}),
        state,
        updatedAt: Date.now()
      };
      ctx.state.translationTask = snapshot;
      return snapshot;
    }

    function getSnapshot(stats, totals) {
      const queued = stats?.queued || 0;
      const succeeded = stats?.succeeded || 0;
      const failed = stats?.failed || 0;
      const totalProcessed = totals?.totalProcessed || 0;
      const totalObserved = totals?.totalObserved || 0;
      const pending = Math.max(0, queued - succeeded - failed);
      const denominator = Math.max(totalObserved, queued, totalProcessed, 0);
      return {
        ...snapshot,
        queued,
        succeeded,
        failed,
        pending,
        totalObserved,
        totalProcessed,
        denominator
      };
    }

    return {
      states: TASK_STATES,
      setState,
      getSnapshot
    };
  }

  ctx.fn.createTranslationTask = createTranslationTask;
  ctx.fn.translationTaskStates = TASK_STATES;
})();
