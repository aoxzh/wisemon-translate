/**
 * Page translation candidate discovery.
 *
 * The scanner receives a narrow runtime adapter from content-main so it can
 * operate on the current translation run without owning page lifecycle state.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  function createContentScanner(deps) {
    function settings() { return deps.getSettings() || {}; }
    function siteRule() { return deps.getSiteRule() || null; }
    function observedElements() { return deps.getObservedElements(); }
    function processedElements() { return deps.getProcessedElements(); }
    function scanStats() { return deps.getScanStats(); }

    function hasRuleIncludeSelectors() {
      const rule = siteRule();
      return Array.isArray(rule?.includeSelectors)
        && rule.includeSelectors.length > 0
        && (rule.matchedIds || []).some(id => id && id !== 'default');
    }

    function collectRuleIncludedCandidates(root) {
      const out = [];
      const seen = new WeakSet();
      const rule = siteRule();
      const selectors = rule?.includeSelectors || [];
      function add(el) {
        if (!(el instanceof Element) || seen.has(el) || processedElements().has(el)) return;
        if (!isBottomScanCandidate(el)) return;
        seen.add(el);
        out.push(el);
      }
      for (const selector of selectors) {
        try {
          if (root instanceof Element && root.matches(selector)) add(root);
          root.querySelectorAll?.(selector).forEach(add);
        } catch (err) {
          deps.safeLog('warn', 'Rules', 'Invalid translate-to-bottom include selector skipped: ' + selector, { error: err.message });
        }
      }
      root.querySelectorAll?.(`[${deps.attrObserved}="true"]`).forEach(add);
      return pruneTranslationCandidates(out);
    }

    function collectUnprocessedCandidates(root) {
      const out = [];
      const seen = new WeakSet();
      const rule = siteRule();
      function add(el) {
        if (!(el instanceof Element) || seen.has(el) || processedElements().has(el)) return;
        if (!isBottomScanCandidate(el)) return;
        seen.add(el);
        out.push(el);
      }

      root.querySelectorAll?.(`[${deps.attrObserved}="true"]`).forEach(add);
      root.querySelectorAll?.('p, li, td, th, dd, dt, figcaption, caption, blockquote, h1, h2, h3, h4, h5, h6').forEach(add);

      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
            if (!value || deps.isInvalidText(value)) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || deps.isIgnored(parent) || deps.matchesSiteRuleSelector(parent, rule?.excludeSelectors)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        while (walker.nextNode()) add(findTranslationHostForTextNode(walker.currentNode));
      } catch (err) {
        deps.safeLog('debug', 'Content', 'Bottom text scan skipped: ' + err.message);
      }

      return pruneTranslationCandidates(out);
    }

    function isBottomScanCandidate(el) {
      const rule = siteRule();
      const config = settings();
      if (!(el instanceof Element)) return false;
      if (deps.isIgnored(el)) return false;
      if (deps.matchesSiteRuleSelector(el, rule?.excludeSelectors)) return false;
      const text = deps.getVisibleText(el);
      if (deps.isInvalidText(text)) return false;
      if (deps.shouldSkipTranslation(text, config.targetLang)) return false;
      return true;
    }

    function pruneTranslationCandidates(candidates) {
      if (!ctx.fn.candidatePruner?.pruneCandidates) return Array.from(candidates || []);
      const config = settings();
      const rule = siteRule();
      return ctx.fn.candidatePruner.pruneCandidates(candidates, {
        settings: config,
        siteRule: rule,
        processedElements: processedElements(),
        isIgnored: deps.isIgnored,
        matchesSiteRuleSelector: deps.matchesSiteRuleSelector,
        getVisibleText: deps.getVisibleText,
        isInvalidText: deps.isInvalidText,
        shouldSkipTranslation: deps.shouldSkipTranslation
      });
    }

    function scanRuleIncludedElements(root) {
      const rule = siteRule();
      const selectors = rule?.includeSelectors || [];
      if (!root || !Array.isArray(selectors) || selectors.length === 0) return;
      for (const selector of selectors) {
        try {
          if (root instanceof Element && root.matches(selector)
              && !deps.matchesSiteRuleSelector(root, rule?.excludeSelectors)) {
            startObserveElement(root);
          }
          root.querySelectorAll(selector).forEach(function(el) {
            if (!deps.matchesSiteRuleSelector(el, rule?.excludeSelectors)) startObserveElement(el);
          });
        } catch (err) {
          deps.safeLog('warn', 'Rules', 'Invalid include selector skipped: ' + selector, { error: err.message });
        }
      }
    }

    function scanAdaptiveTextElements(root) {
      const config = settings();
      const rule = siteRule();
      ctx.fn.adaptiveScanner?.scanAdaptiveTextElements(root, {
        settings: config,
        siteRule: rule,
        observedElements: observedElements(),
        processedElements: processedElements(),
        startObserveElement,
        isIgnored: deps.isIgnored,
        matchesSiteRuleSelector: deps.matchesSiteRuleSelector,
        getVisibleText: deps.getVisibleText,
        getDirectText: deps.getDirectText,
        isInvalidText: deps.isInvalidText,
        isBlockNode: deps.isBlockNode,
        safeLog: deps.safeLog
      });
    }

    function scanNode(root, includeTextNodePass = true) {
      const config = settings();
      if (!(root instanceof Element) && !(root instanceof DocumentFragment)) return;
      if (root.nodeType === Node.ELEMENT_NODE && deps.isIgnored(root)) return;

      if (config.translateMainOnly && root !== document.body) {
        const tag = root.tagName.toLowerCase();
        const role = root.getAttribute('role');
        if (['banner', 'navigation', 'complementary', 'contentinfo', 'search'].includes(role)) return;
        if (['header', 'footer', 'nav', 'aside'].includes(tag)) return;
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        const hasBlockChild = [...root.children].some(child => deps.blockTags.has(child.tagName));
        const hasDirectText = deps.hasDirectTextNode(root);
        const hasSemanticContent = ctx.fn.adaptiveScanner?.hasSemanticContentSignal(root);
        if ((hasDirectText || hasSemanticContent || !hasBlockChild) && deps.isTranslatableElement(root)) {
          startObserveElement(root);
        }
      }

      for (const child of root.children || []) {
        if (deps.blockTags.has(child.tagName)) scanNode(child, false);
      }
      for (const child of root.children || []) {
        if (!deps.blockTags.has(child.tagName) && !deps.warpTags.has(child.tagName) && !deps.isIgnored(child)) {
          scanNode(child, false);
        }
      }
      if (includeTextNodePass) scanTextNodes(root);
    }

    function scanTextNodes(root) {
      const config = settings();
      const rule = siteRule();
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
            if (!value || value.length < Math.max(1, config.minTextLength || 2)) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || deps.isIgnored(parent)) return NodeFilter.FILTER_REJECT;
            if (deps.matchesSiteRuleSelector(parent, rule?.excludeSelectors)) {
              const stats = scanStats();
              if (stats) stats.skippedByRule++;
              return NodeFilter.FILTER_REJECT;
            }
            if (deps.isInvalidText(value)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });

        const hosts = new Set();
        while (walker.nextNode()) {
          const host = findTranslationHostForTextNode(walker.currentNode);
          if (host) hosts.add(host);
        }
        hosts.forEach(startObserveElement);
        const stats = scanStats();
        if (hosts.size && stats) stats.textNodeHosts = (stats.textNodeHosts || 0) + hosts.size;
      } catch (err) {
        deps.safeLog('debug', 'Content', 'Text node scan skipped: ' + err.message);
      }
    }

    function findTranslationHostForTextNode(textNode) {
      const config = settings();
      const rule = siteRule();
      const observed = observedElements();
      let el = textNode?.parentElement;
      if (!el || deps.isIgnored(el)) return null;

      let candidate = el;
      let depth = 0;
      while (el && el !== document.body && depth < 5) {
        if (deps.isIgnored(el) || deps.matchesSiteRuleSelector(el, rule?.excludeSelectors)) return null;
        if (el.hasAttribute?.(deps.attrProcessed) || observed.has(el)) return null;

        const tag = el.tagName;
        const directText = deps.getDirectText(el);
        const childBlockCount = Array.from(el.children || []).filter(child => deps.isBlockNode(child)).length;
        const visibleText = deps.getVisibleText(el);
        const semanticHost = ctx.fn.adaptiveScanner?.hasSemanticContentSignal(el)
          && visibleText.length <= Math.max(1200, config.maxCharsPerRequest || 4000);

        if (['A','BUTTON','LABEL','SUMMARY','FIGCAPTION','CAPTION','TH','TD','LI','P','H1','H2','H3','H4','H5','H6'].includes(tag)
            || semanticHost
            || (deps.blockTags.has(tag) && directText && childBlockCount === 0 && visibleText.length <= Math.max(600, config.maxCharsPerRequest || 4000))
            || (deps.warpTags.has(tag) && directText && (!el.parentElement || deps.isBlockNode(el.parentElement)))) {
          candidate = el;
          break;
        }

        candidate = el;
        el = el.parentElement;
        depth++;
      }

      if (!candidate || candidate === document.body || deps.isIgnored(candidate)) return null;
      return deps.isTranslatableElement(candidate) ? candidate : null;
    }

    function startObserveElement(el) {
      const config = settings();
      const rule = siteRule();
      const observed = observedElements();
      const stats = scanStats();
      if (!(el instanceof Element) || observed.has(el)) return;
      if (deps.isIgnored(el)) {
        if (stats) stats.skippedIgnored++;
        return;
      }
      if (deps.matchesSiteRuleSelector(el, rule?.excludeSelectors)) {
        if (stats) stats.skippedByRule++;
        return;
      }

      const text = deps.getVisibleText(el);
      if (deps.isInvalidText(text)) {
        if (stats) stats.skippedInvalid++;
        return;
      }
      if (deps.shouldSkipTranslation(text, config.targetLang)) {
        if (stats) stats.skippedSameLanguage++;
        return;
      }
      if (pruneTranslationCandidates([el]).length === 0) {
        if (stats) stats.skippedInvalid++;
        return;
      }

      observed.add(el);
      deps.incrementTotalObserved();
      el.setAttribute(deps.attrObserved, 'true');
      deps.syncSharedTrackingState();
      if (stats) stats.observed++;
      if (ctx.state.intersectionObserver) ctx.state.intersectionObserver.observe(el);

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
        deps.viewElements.add(el);
        const initialVisible = deps.getInitialVisibleElements();
        if (initialVisible) initialVisible.add(el);
        else deps.scheduleProcessViewBatch([el]);
      }
    }

    return {
      hasRuleIncludeSelectors,
      collectRuleIncludedCandidates,
      collectUnprocessedCandidates,
      pruneTranslationCandidates,
      scanRuleIncludedElements,
      scanAdaptiveTextElements,
      scanNode,
      scanTextNodes,
      findTranslationHostForTextNode,
      startObserveElement
    };
  }

  ctx.fn.createContentScanner = createContentScanner;
})();
