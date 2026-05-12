/**
 * Shadow DOM Detection Injector
 * Monkey-patches Element.prototype.attachShadow to notify the content script
 * whenever a new shadow root is created, enabling translation inside web components.
 * 
 * This script runs in the MAIN world (page context) via scripting.executeScript
 * with world: 'MAIN', not in the isolated content script world.
 */
(function() {
  'use strict';

  if (window.__LLM_SHADOW_PATCHED__) return;
  window.__LLM_SHADOW_PATCHED__ = true;

  const ORIGINAL_ATTACH_SHADOW = Element.prototype.attachShadow;

  Element.prototype.attachShadow = function(init) {
    const shadowRoot = ORIGINAL_ATTACH_SHADOW.call(this, init);
    try {
      document.dispatchEvent(new CustomEvent('__llm_shadowroot_created__', {
        detail: {
          tagName: this.tagName,
          mode: init && init.mode
        }
      }));
    } catch (e) {
      // Silently fail if CustomEvent is blocked
    }
    return shadowRoot;
  };

  // Also notify about already-existing shadow roots
  try {
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
    const existingShadows = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.shadowRoot) {
        existingShadows.push({
          tagName: node.tagName,
          mode: node.shadowRoot.mode,
          host: node
        });
      }
    }
    if (existingShadows.length > 0) {
      document.dispatchEvent(new CustomEvent('__llm_shadowroot_batch__', {
        detail: { shadows: existingShadows }
      }));
    }
  } catch (e) {
    // Ignore errors during initial scan
  }
})();
