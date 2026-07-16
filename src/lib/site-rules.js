/**
 * Site rules loader.
 * Built-in rules are loaded from src/lib/site-rules.json so they can grow
 * without inflating this module. Remote/user rule subscriptions are still
 * merged on top.
 */
(function() {
  const SUBSCRIPTIONS_STORAGE_KEY = 'llm-site-rule-subscriptions-v1';
  let subscriptionCache = [];
  let builtInRules = [];
  let builtInRulesPromise = null;

  async function loadBuiltInRules() {
    if (builtInRulesPromise) return builtInRulesPromise;
    builtInRulesPromise = (async () => {
      try {
        if (typeof require !== 'undefined' && typeof module !== 'undefined' && module.exports) {
          builtInRules = require('./site-rules.json');
        } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          const url = chrome.runtime.getURL('src/lib/site-rules.json');
          const resp = await fetch(url, { cache: 'force-cache' });
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          builtInRules = await resp.json();
        } else {
          builtInRules = [];
        }
      } catch (e) {
        builtInRules = [];
        if (typeof LOG !== 'undefined') LOG.error('Rules', 'Failed to load built-in site rules', e.message);
      }
      return builtInRules;
    })();
    return builtInRulesPromise;
  }

  function hostPath(url) {
    try {
      const u = new URL(url || location.href);
      return `${u.hostname}${u.pathname}`.toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function normalizePattern(pattern) {
    return String(pattern || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }

  function patternMatches(url, pattern) {
    const target = hostPath(url);
    const p = normalizePattern(pattern);
    if (!p) return false;
    if (p.includes('*')) {
      const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}`).test(target);
    }
    if (target === p || target.startsWith(p + '/') || target.endsWith('.' + p) || target.includes('/' + p)) return true;
    if (!p.includes('/')) {
      const host = target.split('/')[0];
      return host === p || host.endsWith('.' + p);
    }
    return false;
  }

  function parseUserRules(raw) {
    if (!raw || !String(raw).trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      if (typeof LOG !== 'undefined') LOG.warn('Rules', `Invalid user site rules: ${e.message}`);
      return [];
    }
  }

  function mergeArray(a, b) {
    return [...new Set([...(a || []), ...(b || [])].filter(Boolean))];
  }

  function mergeRule(base, next) {
    const merged = { ...base, ...next };
    merged.excludeSelectors = mergeArray(base.excludeSelectors, next.excludeSelectors);
    merged.includeSelectors = mergeArray(base.includeSelectors, next.includeSelectors);
    merged.mainSelectors = mergeArray(base.mainSelectors, next.mainSelectors);
    merged.injectedCss = mergeArray(base.injectedCss, next.injectedCss);
    if (base.contextHint && next.contextHint) {
      merged.contextHint = base.contextHint + '\n' + next.contextHint;
    }
    return merged;
  }

  // ---- Remote rule subscriptions ----
  let subscriptionCachePromise = null;

  function invalidateSubscriptionCache() {
    subscriptionCachePromise = null;
  }

  function handleSubscriptionStorageChange(changes, areaName) {
    if (areaName !== 'local' || !changes?.[SUBSCRIPTIONS_STORAGE_KEY]) return;
    invalidateSubscriptionCache();
    const nextValue = changes[SUBSCRIPTIONS_STORAGE_KEY].newValue;
    subscriptionCache = Array.isArray(nextValue)
      ? nextValue.flatMap(sub => Array.isArray(sub.rules) ? sub.rules : [])
      : [];
    try {
      if (typeof globalThis.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent('llm-site-rules-changed'));
      }
    } catch (e) { /* non-window extension context */ }
  }

  function isValidRule(rule) {
    if (!rule || typeof rule !== 'object') return false;
    if (!rule.id || typeof rule.id !== 'string' || rule.id.length > 100) return false;
    const matches = Array.isArray(rule.matches) ? rule.matches : [rule.matches];
    if (matches.length > 50 || !matches.some(m => typeof m === 'string' && m.trim() && m.length <= 500)) return false;
    return true;
  }

  function sanitizeStringArray(value, maxItems, maxLength) {
    if (!Array.isArray(value)) return undefined;
    return value.filter(item => typeof item === 'string' && item.length <= maxLength).slice(0, maxItems);
  }

  function sanitizeRule(rule) {
    const safeCss = Array.isArray(rule.injectedCss)
      ? rule.injectedCss.filter(value => typeof value === 'string' && value.length <= 10000 && !/@import|url\s*\(|expression\s*\(|-moz-binding/i.test(value)).slice(0, 20)
      : undefined;
    return {
      id: String(rule.id),
      matches: sanitizeStringArray(Array.isArray(rule.matches) ? rule.matches : [rule.matches], 50, 500),
      excludeSelectors: sanitizeStringArray(rule.excludeSelectors, 100, 1000),
      includeSelectors: sanitizeStringArray(rule.includeSelectors, 100, 1000),
      mainSelectors: sanitizeStringArray(rule.mainSelectors, 100, 1000),
      injectedCss: safeCss,
      contextHint: typeof rule.contextHint === 'string' ? rule.contextHint.slice(0, 4000) : undefined,
      disableAutoTranslate: !!rule.disableAutoTranslate,
      privacyMode: rule.privacyMode === 'strict' ? 'strict' : undefined,
      preferSubtitleOverlay: !!rule.preferSubtitleOverlay,
      source: 'subscription'
    };
  }

  async function loadSubscriptionCache() {
    if (subscriptionCachePromise) return subscriptionCachePromise;
    subscriptionCachePromise = (async () => {
      try {
        const result = await chrome.storage.local.get(SUBSCRIPTIONS_STORAGE_KEY);
        const subs = Array.isArray(result[SUBSCRIPTIONS_STORAGE_KEY]) ? result[SUBSCRIPTIONS_STORAGE_KEY] : [];
        subscriptionCache = subs.flatMap(function(sub) {
          return Array.isArray(sub.rules) ? sub.rules : [];
        });
      } catch (e) {
        subscriptionCache = [];
      }
    })();
    return subscriptionCachePromise;
  }

  async function getSiteRuleSubscriptions() {
    try {
      const result = await chrome.storage.local.get(SUBSCRIPTIONS_STORAGE_KEY);
      return Array.isArray(result[SUBSCRIPTIONS_STORAGE_KEY]) ? result[SUBSCRIPTIONS_STORAGE_KEY] : [];
    } catch (e) {
      return [];
    }
  }

  async function fetchSubscriptionRules(url) {
    const parsedUrl = new URL(url);
    const isLocalHttp = parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== 'https:' && !isLocalHttp) throw new Error('Subscription URL must use HTTPS (HTTP is allowed only for localhost)');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(parsedUrl.href, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const declaredLength = Number(response.headers?.get?.('content-length') || 0);
    if (declaredLength > 1024 * 1024) throw new Error('Subscription exceeds the 1 MB limit');
    const raw = await response.text();
    if (raw.length > 1024 * 1024) throw new Error('Subscription exceeds the 1 MB limit');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Subscription must be a JSON array');
    const valid = data.filter(isValidRule).map(sanitizeRule);
    if (!valid.length) throw new Error('No valid rules found');
    return valid;
  }

  async function addSiteRuleSubscription(url) {
    const normalized = String(url || '').trim();
    if (!normalized) throw new Error('URL is required');
    const subs = await getSiteRuleSubscriptions();
    if (subs.some(s => s.url === normalized)) throw new Error('Subscription already exists');
    const rules = await fetchSubscriptionRules(normalized);
    const subscription = { url: normalized, rules: rules, ts: Date.now(), status: 'ok', count: rules.length };
    subs.push(subscription);
    await chrome.storage.local.set({ [SUBSCRIPTIONS_STORAGE_KEY]: subs });
    invalidateSubscriptionCache();
    await loadSubscriptionCache();
    return subscription;
  }

  async function removeSiteRuleSubscription(url) {
    const normalized = String(url || '').trim();
    let subs = await getSiteRuleSubscriptions();
    subs = subs.filter(s => s.url !== normalized);
    await chrome.storage.local.set({ [SUBSCRIPTIONS_STORAGE_KEY]: subs });
    invalidateSubscriptionCache();
    await loadSubscriptionCache();
  }

  async function refreshSiteRuleSubscriptions() {
    const subs = await getSiteRuleSubscriptions();
    const results = [];
    for (const sub of subs) {
      try {
        const rules = await fetchSubscriptionRules(sub.url);
        sub.rules = rules;
        sub.ts = Date.now();
        sub.status = 'ok';
        sub.count = rules.length;
        results.push({ url: sub.url, success: true, count: rules.length });
      } catch (e) {
        sub.ts = Date.now();
        sub.status = 'error';
        sub.error = e.message;
        results.push({ url: sub.url, success: false, error: e.message });
      }
    }
    await chrome.storage.local.set({ [SUBSCRIPTIONS_STORAGE_KEY]: subs });
    invalidateSubscriptionCache();
    await loadSubscriptionCache();
    return results;
  }

  async function getSiteRule(url, settings = {}) {
    await loadBuiltInRules();
    await loadSubscriptionCache();
    const userRules = parseUserRules(settings.siteRules);
    const allRules = [...builtInRules, ...subscriptionCache, ...userRules];
    let matched = { id: 'default', excludeSelectors: [], includeSelectors: [], mainSelectors: [], injectedCss: [] };
    const matchedIds = [];
    for (const rule of allRules) {
      const patterns = Array.isArray(rule.matches) ? rule.matches : [rule.matches];
      if (patterns.some(pattern => patternMatches(url, pattern))) {
        matched = mergeRule(matched, rule);
        matchedIds.push(rule.id || patterns[0]);
      }
    }
    matched.matchedIds = matchedIds;
    return matched;
  }

  // Initialize cache on load
  loadSubscriptionCache().catch(function() {});
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(handleSubscriptionStorageChange);
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.initSiteRules = loadBuiltInRules;
    globalThis.getSiteRule = getSiteRule;
    globalThis.patternMatchesSiteRule = patternMatches;
    globalThis.getSiteRuleSubscriptions = getSiteRuleSubscriptions;
    globalThis.addSiteRuleSubscription = addSiteRuleSubscription;
    globalThis.removeSiteRuleSubscription = removeSiteRuleSubscription;
    globalThis.refreshSiteRuleSubscriptions = refreshSiteRuleSubscriptions;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initSiteRules: loadBuiltInRules, getSiteRule, patternMatches, getSiteRuleSubscriptions, addSiteRuleSubscription, removeSiteRuleSubscription, refreshSiteRuleSubscriptions };
  }
})();
