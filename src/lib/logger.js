/**
 * Logger Module - Pure storage-based logging for all contexts
 *
 * DESIGN: All log entries are written directly to chrome.storage.local.
 * No local caching, no instance synchronization needed.
 * Every context (background, content script, options page) reads/writes
 * the same storage key — logs are always consistent.
 *
 * Usage:
 *   LOG.info('Tag', 'message', optionalData);
 *   LOG.error('Tag', 'error message', { detail: '...' });
 *
 * View: Open Settings → Logs tab
 */

(function() {
  const STORAGE_KEY = 'llm-translate-logs';
  const MAX_ENTRIES = 1000;
  const BATCH_FLUSH_MS = 500; // debounced flush to avoid excessive storage writes under load

  let _writeQueue = [];
  let _flushTimer = null;
  let _storageAvailable = null; // null=unknown, true/false after check
  let _consoleEnabled = true;
  let _minLevel = 'DEBUG';

  function _fmtTime() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  }

  function _safeStr(obj) {
    if (obj === undefined || obj === null) return null;
    if (typeof obj === 'string') return obj;
    try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
  }

  function _makeEntry(level, tag, message, data) {
    return {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      time: _fmtTime(),
      level,
      tag,
      message,
      data: _safeStr(data)
    };
  }

  function _hasRuntime() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  function _isBackgroundContext() {
    return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
  }

  // Immediately flush pending writes
  async function _flush() {
    if (_writeQueue.length === 0) return;
    const batch = _writeQueue.splice(0);
    try {
      // Read existing logs, append new ones, trim, write back
      const result = await chrome.storage.local.get(STORAGE_KEY);
      let logs = result[STORAGE_KEY] || [];
      logs = logs.concat(batch);
      if (logs.length > MAX_ENTRIES) logs = logs.slice(-MAX_ENTRIES);
      await chrome.storage.local.set({ [STORAGE_KEY]: logs });
      _storageAvailable = true;
    } catch (e) {
      _storageAvailable = false;
    }
  }

  async function _writeEntries(entries) {
    if (!entries || entries.length === 0) return;
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      let logs = result[STORAGE_KEY] || [];
      logs = logs.concat(entries);
      if (logs.length > MAX_ENTRIES) logs = logs.slice(-MAX_ENTRIES);
      await chrome.storage.local.set({ [STORAGE_KEY]: logs });
      _storageAvailable = true;
    } catch (e) {
      _storageAvailable = false;
      throw e;
    }
  }

  function _scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      _flush();
    }, BATCH_FLUSH_MS);
  }

  function _add(level, tag, message, data) {
    // Min level check
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    if (levels[level] < (levels[_minLevel] || 0)) return;

    const entry = _makeEntry(level, tag, message, data);

    // Console output for immediate visibility (always)
    if (_consoleEnabled) {
      const fn = level === 'ERROR' ? console.error :
                 level === 'WARN'  ? console.warn  : console.log;
      const dataStr = entry.data ? ' ' + entry.data : '';
      fn(`[wisemon-translate][${entry.time}][${level}][${tag}] ${message}${dataStr}`);
    }

    // Queue for storage persistence
    if (_hasRuntime() && !_isBackgroundContext()) {
      chrome.runtime.sendMessage({ action: 'append-log', entry }).catch(() => {
        _writeQueue.push(entry);
        _scheduleFlush();
      });
    } else {
      _writeQueue.push(entry);
      _scheduleFlush();
    }
  }

  // Flush before page unload (for content script / popup)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => _flush());
  }

  // ---- Public API (assigned to global LOG) ----

  const LOG = {
    debug(tag, msg, data) { _add('DEBUG', tag, msg, data); },
    info(tag, msg, data)  { _add('INFO', tag, msg, data); },
    warn(tag, msg, data)  { _add('WARN', tag, msg, data); },
    error(tag, msg, data) { _add('ERROR', tag, msg, data); },

    setMinLevel(level) { _minLevel = level; },
    setConsole(on) { _consoleEnabled = on; },

    /** Read logs directly from storage (always fresh) */
    async getLogs(filter = {}) {
      try {
        await _flush();
        const result = await chrome.storage.local.get(STORAGE_KEY);
        let logs = result[STORAGE_KEY] || [];

        if (filter.level) {
          const lvls = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
          const min = lvls[filter.level];
          if (min !== undefined) logs = logs.filter(l => (lvls[l.level] || 0) >= min);
        }
        if (filter.tag) {
          logs = logs.filter(l => l.tag && l.tag.toLowerCase().includes(filter.tag.toLowerCase()));
        }
        if (filter.search) {
          const s = filter.search.toLowerCase();
          logs = logs.filter(l =>
            (l.message && l.message.toLowerCase().includes(s)) ||
            (l.data && l.data.toLowerCase().includes(s))
          );
        }
        if (filter.since) {
          logs = logs.filter(l => l.timestamp >= filter.since);
        }
        return logs.reverse(); // newest first
      } catch (e) {
        return [];
      }
    },

    async clearLogs() {
      try {
        await chrome.storage.local.remove(STORAGE_KEY);
        _writeQueue = [];
      } catch (e) { /* ignore */ }
    },

    /** Flush pending writes immediately */
    async flush() { await _flush(); },

    async append(entryOrEntries) {
      const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
      await _writeEntries(entries.filter(Boolean));
    }
  };

  // Export as global
  if (typeof globalThis !== 'undefined') globalThis.LOG = LOG;
  if (typeof window !== 'undefined') window.LOG = LOG;
  if (typeof self !== 'undefined') self.LOG = LOG;

  // Also keep backward-compatible global name
  if (typeof globalThis !== 'undefined') globalThis.LOGGER = { ...LOG, init: async () => {} };
  if (typeof window !== 'undefined') window.LOGGER = { ...LOG, init: async () => {} };
  if (typeof self !== 'undefined') self.LOGGER = { ...LOG, init: async () => {} };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOG, LOGGER: LOG };
  }
})();
