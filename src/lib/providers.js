/**
 * Shared provider metadata.
 * Keep names, presets, and key requirements in one place for popup/options/API UI.
 */
(function() {
  const PROVIDER_PRESETS = {
    'deepseek-v4-flash': {
      label: 'DeepSeek V4 Flash',
      description: 'Fast, affordable',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      apiKey: '',
      thinkingMode: 'disabled',
      provider: 'deepseek'
    },
    'deepseek-v4-pro': {
      label: 'DeepSeek V4 Pro',
      description: 'Powerful reasoning',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-v4-pro',
      apiKey: '',
      thinkingMode: 'disabled',
      provider: 'deepseek'
    },
    'glm-4.7-flash': {
      label: 'GLM-4.7 Flash',
      description: 'Free, 200K ctx',
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4.7-flash',
      apiKey: '',
      thinkingMode: 'disabled',
      provider: 'zhipu'
    },
    openai: {
      label: 'OpenAI',
      description: 'OpenAI compatible',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-5.4-mini',
      apiKey: '',
      provider: 'openai'
    },
    gemini: {
      label: 'Gemini',
      description: 'OpenAI-compatible',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-3-flash-preview',
      apiKey: '',
      provider: 'gemini'
    },
    openrouter: {
      label: 'OpenRouter',
      description: 'Multi-model',
      baseURL: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-5.4-mini',
      apiKey: '',
      provider: 'openrouter'
    },
    qwen: {
      label: 'Qwen',
      description: 'DashScope compat',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3.6-max-preview',
      apiKey: '',
      provider: 'qwen'
    },
    siliconflow: {
      label: 'SiliconFlow',
      description: 'OpenAI-compatible',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Pro/deepseek-ai/DeepSeek-V4-Pro',
      apiKey: '',
      provider: 'siliconflow'
    },
    anthropic: {
      label: 'Claude',
      description: 'Anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-haiku-20241022',
      apiKey: '',
      provider: 'anthropic'
    },
    ollama: {
      label: 'Ollama',
      description: 'Local, private',
      baseURL: 'http://localhost:11434/v1',
      model: 'qwen3.6',
      apiKey: '',
      provider: 'ollama'
    },
    hunyuan: {
      label: 'Hunyuan HY-MT',
      description: 'Free self-hosted MT',
      baseURL: 'http://localhost:8000/v1',
      model: 'hunyuan',
      apiKey: '',
      provider: 'hunyuan'
    },
    lmstudio: {
      label: 'LM Studio',
      description: 'Local OpenAI-compatible',
      baseURL: 'http://localhost:1234/v1',
      model: 'local-model',
      apiKey: '',
      provider: 'lmstudio'
    },
    custom: {
      label: 'Custom',
      description: 'Any OpenAI-compatible API',
      baseURL: 'http://localhost:11434/v1',
      model: 'qwen3.6',
      apiKey: '',
      provider: 'custom'
    },
    google: {
      label: 'Google Free',
      description: 'No key fallback',
      baseURL: 'https://translate.googleapis.com',
      model: 'google-free',
      apiKey: '',
      provider: 'google'
    },
    deepl: {
      label: 'DeepL',
      description: 'High quality, API key',
      baseURL: 'https://api-free.deepl.com/v2',
      model: 'deepl-free',
      apiKey: '',
      provider: 'deepl'
    },
    baidu: {
      label: 'Baidu',
      description: 'Chinese focused, API key',
      baseURL: 'https://fanyi-api.baidu.com/api/trans/vip',
      model: 'baidu-standard',
      baiduAppId: '',
      apiKey: '',
      provider: 'baidu'
    },
    microsoft: {
      label: 'Microsoft',
      description: 'Azure, API key',
      baseURL: 'https://api.cognitive.microsofttranslator.com',
      model: 'microsoft-standard',
      apiKey: '',
      provider: 'microsoft'
    }
  };

  const PROVIDER_NAMES = Object.fromEntries(
    Object.values(PROVIDER_PRESETS).map(item => [item.provider, item.label])
  );
  PROVIDER_NAMES.deepseek = 'DeepSeek';
  PROVIDER_NAMES.zhipu = 'GLM';
  PROVIDER_NAMES.google = 'Google';

  const API_KEY_OPTIONAL_PROVIDERS = new Set(['ollama', 'hunyuan', 'lmstudio', 'custom', 'google']);
  const DEFAULT_PROVIDER_CAPABILITIES = Object.freeze({
    nativeMethod: '',
    supportsMultiText: true,
    supportsJsonResponse: true,
    openAiCompatible: true
  });
  const PROVIDER_CAPABILITIES = Object.freeze({
    google: Object.freeze({ nativeMethod: 'translateWithGoogle', supportsJsonResponse: false, openAiCompatible: false }),
    anthropic: Object.freeze({ nativeMethod: 'translateWithAnthropic', supportsMultiText: false, supportsJsonResponse: false, openAiCompatible: false }),
    deepl: Object.freeze({ nativeMethod: 'translateWithDeepL', supportsMultiText: false, supportsJsonResponse: false, openAiCompatible: false }),
    baidu: Object.freeze({ nativeMethod: 'translateWithBaidu', supportsMultiText: false, supportsJsonResponse: false, openAiCompatible: false }),
    microsoft: Object.freeze({ nativeMethod: 'translateWithMicrosoft', supportsMultiText: false, supportsJsonResponse: false, openAiCompatible: false }),
    hunyuan: Object.freeze({ supportsMultiText: false, supportsJsonResponse: false })
  });

  function getProviderName(provider) {
    return PROVIDER_NAMES[provider] || provider || 'Unknown';
  }

  function getProviderFromPreset(presetVal) {
    return PROVIDER_PRESETS[presetVal]?.provider || 'custom';
  }

  function providerNeedsApiKeyShared(provider) {
    return !API_KEY_OPTIONAL_PROVIDERS.has(provider);
  }

  function getProviderCapabilities(provider) {
    return { ...DEFAULT_PROVIDER_CAPABILITIES, ...(PROVIDER_CAPABILITIES[provider] || {}) };
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.PROVIDER_PRESETS = PROVIDER_PRESETS;
    globalThis.PROVIDER_NAMES = PROVIDER_NAMES;
    globalThis.API_KEY_OPTIONAL_PROVIDERS = API_KEY_OPTIONAL_PROVIDERS;
    globalThis.PROVIDER_CAPABILITIES = PROVIDER_CAPABILITIES;
    globalThis.getProviderName = getProviderName;
    globalThis.getProviderFromPreset = getProviderFromPreset;
    globalThis.providerNeedsApiKeyShared = providerNeedsApiKeyShared;
    globalThis.getProviderCapabilities = getProviderCapabilities;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      PROVIDER_PRESETS,
      PROVIDER_NAMES,
      API_KEY_OPTIONAL_PROVIDERS,
      PROVIDER_CAPABILITIES,
      getProviderName,
      getProviderFromPreset,
      providerNeedsApiKeyShared,
      getProviderCapabilities
    };
  }
})();
