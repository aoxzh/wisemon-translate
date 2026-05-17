/**
 * Lightweight batch queue.
 * Groups nearby translation work by item count and total payload length.
 */
(function() {
  function createBatchQueue(worker, options = {}) {
    const batchInterval = options.batchInterval || 80;
    const batchSize = options.batchSize || 8;
    const batchLength = options.batchLength || 4000;
    const maxParallelBatches = Math.max(1, options.maxParallelBatches || 1);
    const tag = options.tag || 'BatchQueue';

    const queue = [];
    let timer = null;
    let running = 0;
    let destroyed = false;

    function schedule() {
      if (destroyed || running >= maxParallelBatches || timer || queue.length === 0) return;
      if (queue.length >= batchSize) {
        timer = setTimeout(process, 0);
      } else {
        timer = setTimeout(process, batchInterval);
      }
    }

    async function process() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (destroyed || running >= maxParallelBatches || queue.length === 0) return;
      running++;

      const batch = [];
      let totalLength = 0;
      while (queue.length && batch.length < batchSize) {
        const next = queue[0];
        const nextLength = String(next.payload || '').length;
        if (batch.length > 0 && totalLength + nextLength > batchLength) break;
        totalLength += nextLength;
        batch.push(queue.shift());
      }

      try {
        if (typeof LOG !== 'undefined') {
          LOG.debug(tag, `Processing ${batch.length} queued items`, { totalLength });
        }
        const payloads = batch.map(item => item.payload);
        const results = await worker(payloads, batch[0]?.args || {});
        batch.forEach((item, index) => {
          const result = Array.isArray(results) ? results[index] : undefined;
          if (result !== undefined && result !== null) item.resolve(result);
          else item.resolve('[Translation Error: Missing batch result]');
        });
        if (typeof LOG !== 'undefined') {
          LOG.debug(tag, `Completed ${batch.length} queued items`, { totalLength });
        }
      } catch (err) {
        if (typeof LOG !== 'undefined') {
          LOG.warn(tag, `Queued batch failed: ${err.message}`, { count: batch.length, totalLength });
        }
        batch.forEach(item => item.reject(err));
      } finally {
        running--;
        schedule();
      }

      if (queue.length > 0) schedule();
    }

    function add(payload, args = {}) {
      if (destroyed) return Promise.reject(new Error('Queue was destroyed'));
      return new Promise((resolve, reject) => {
        queue.push({ payload, args, resolve, reject });
        schedule();
      });
    }

    function clear(reason = 'Queue cleared') {
      const count = queue.length;
      while (queue.length) {
        queue.shift().reject(new Error(reason));
      }
      if (count > 0 && typeof LOG !== 'undefined') {
        LOG.info(tag, `Canceled ${count} queued items`, { reason });
      }
    }

    function destroy() {
      destroyed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      clear('Queue destroyed');
    }

    return { add, clear, destroy, size: () => queue.length };
  }

  if (typeof globalThis !== 'undefined') globalThis.createBatchQueue = createBatchQueue;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createBatchQueue };
})();
