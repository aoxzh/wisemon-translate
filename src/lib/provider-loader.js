/**
 * Provider script loading order.
 *
 * This project intentionally runs without a build step, so manifests and
 * HTML pages load providers as plain scripts after src/lib/llm-api.js.
 * Non-provider adapters are loaded explicitly by each entry point.
 */
(function() {
  const LLM_PROVIDER_FILES = [
    'src/lib/providers/anthropic.js',
    'src/lib/providers/google.js',
    'src/lib/providers/deepl.js',
    'src/lib/providers/baidu.js',
    'src/lib/providers/microsoft.js'
  ];

  if (typeof globalThis !== 'undefined') {
    globalThis.LLM_PROVIDER_FILES = LLM_PROVIDER_FILES;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLM_PROVIDER_FILES };
  }
})();
