#!/usr/bin/env node
/*
 * Project validation for the no-build browser extension.
 * Run from the repository root with: node tools/validate.js
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS = ['manifest.json', 'manifest-firefox.json'];
const JSON_FILES = ['src/lib/site-rules.json', 'src/lib/site-rule-schema.json', 'examples/site-rule-subscription.json'];
const HTML_FILES = ['popup.html', 'options.html', 'sidepanel.html', 'privacy.html'];
const UI_PAIRS = [
  ['popup.js', 'popup.html'],
  ['options.js', 'options.html'],
  ['sidepanel.js', 'sidepanel.html']
];
const IGNORED_SCAN_DIRS = new Set([
  '.git',
  '.claude',
  '.cache',
  '.idea',
  '.vscode',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'release',
  'test-results',
  'tmp'
]);
const MESSAGE_FILES = [
  'background.js',
  'content_guard.js',
  'popup.js',
  'options.js',
  'sidepanel.js',
  'src/content/core/content-constants.js',
  'src/content/core/content-main.js',
  'src/content/core/content-core.js',
  'src/content/core/content-navigation.js',
  'src/content/core/content-observers.js',
  'src/content/features/content-input.js',
  'src/content/features/content-subtitle.js',
  'src/content/features/content-subtitle-bilibili.js',
  'src/content/features/content-shortcuts.js',
  'src/content/features/content-selection.js',
  'src/content/features/content-fab.js',
  'src/content/translation/content-progress.js',
  'src/content/translation/content-text-utils.js',
  'src/content/translation/content-glossary.js',
  'src/content/translation/content-adaptive-scanner.js',
  'src/content/translation/content-candidate-pruner.js',
  'src/content/translation/content-scanner.js',
  'src/content/translation/content-batch-processor.js',
  'src/content/ui/content-ui.js'
];

let failed = false;

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function rootPath(file) {
  return path.join(ROOT, file);
}

function read(file) {
  return fs.readFileSync(rootPath(file), 'utf8');
}

function exists(file) {
  return fs.existsSync(rootPath(file));
}

function fail(message) {
  failed = true;
  console.error('FAIL ' + message);
}

function pass(message) {
  console.log('OK   ' + message);
}

function warn(message) {
  console.warn('WARN ' + message);
}

function listFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
      listFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function checkJsSyntax() {
  const jsFiles = listFiles(ROOT, file => file.endsWith('.js'));
  for (const file of jsFiles) {
    const result = childProcess.spawnSync(process.execPath, ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      fail(`JS syntax: ${rel(file)}\n${result.stderr || result.stdout}`);
      return;
    }
  }
  pass(`JS syntax (${jsFiles.length} files)`);
}

function collectManifestRefs(manifest) {
  const refs = [];
  if (manifest.background?.service_worker) refs.push(manifest.background.service_worker);
  if (Array.isArray(manifest.background?.scripts)) refs.push(...manifest.background.scripts);
  for (const cs of manifest.content_scripts || []) {
    refs.push(...(cs.js || []), ...(cs.css || []));
  }
  for (const group of manifest.web_accessible_resources || []) {
    refs.push(...(group.resources || []).filter(item => !item.includes('*')));
  }
  if (manifest.action?.default_popup) refs.push(manifest.action.default_popup);
  if (manifest.options_page) refs.push(manifest.options_page);
  if (manifest.side_panel?.default_path) refs.push(manifest.side_panel.default_path);
  if (manifest.sidebar_action?.default_panel) refs.push(manifest.sidebar_action.default_panel);
  for (const icon of Object.values(manifest.icons || {})) refs.push(icon);
  for (const icon of Object.values(manifest.action?.default_icon || {})) refs.push(icon);
  return refs;
}

function checkManifestsAndResources() {
  const packageVersion = JSON.parse(read('package.json')).version;
  for (const file of MANIFESTS) {
    let manifest;
    try {
      manifest = JSON.parse(read(file));
    } catch (err) {
      fail(`${file} JSON parse: ${err.message}`);
      continue;
    }
    if (manifest.version !== packageVersion) {
      fail(`${file} version ${manifest.version} does not match package.json ${packageVersion}`);
    }
    for (const ref of collectManifestRefs(manifest)) {
      if (!exists(ref)) fail(`${file} references missing file: ${ref}`);
    }
  }

  for (const file of HTML_FILES) {
    const html = read(file);
    for (const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
      const ref = match[1];
      if (/^(https?:|#|chrome:|mailto:)/.test(ref)) continue;
      if (!exists(ref)) fail(`${file} references missing file: ${ref}`);
    }
  }

  for (const file of JSON_FILES) {
    try { JSON.parse(read(file)); } catch (err) { fail(`${file} JSON parse: ${err.message}`); }
  }

  const loaderPath = rootPath('src/lib/provider-loader.js');
  delete require.cache[require.resolve(loaderPath)];
  const providerFiles = require(loaderPath).LLM_PROVIDER_FILES;
  const firefoxScripts = JSON.parse(read('manifest-firefox.json')).background?.scripts || [];
  const optionsScripts = [...read('options.html').matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  for (const [entryPoint, scripts] of [['manifest-firefox.json', firefoxScripts], ['options.html', optionsScripts]]) {
    const actual = scripts.filter(script => providerFiles.includes(script));
    if (JSON.stringify(actual) !== JSON.stringify(providerFiles)) {
      fail(`${entryPoint} provider scripts do not match src/lib/provider-loader.js order`);
    }
  }

  if (!failed) pass('manifest and HTML resource references');
}

function checkDirectDomIds() {
  for (const [jsFile, htmlFile] of UI_PAIRS) {
    const ids = new Set([...read(htmlFile).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    const code = read(jsFile);
    for (const match of code.matchAll(/\$\(['"]([^'"]+)['"]\)/g)) {
      if (!ids.has(match[1])) fail(`${jsFile} references missing #${match[1]} in ${htmlFile}`);
    }
  }
  if (!failed) pass('direct UI DOM id references');
}

function extractHandledActions(code) {
  const handled = [];
  for (const match of code.matchAll(/request\.action\s*={2,3}\s*['"]([^'"]+)['"]/g)) {
    handled.push(match[1]);
  }
  for (const match of code.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)) {
    handled.push(match[1]);
  }
  return handled;
}

function extractSentActions(code) {
  const sent = [];
  for (const match of code.matchAll(/(?:sendMessage|tabs\.sendMessage)\s*\([\s\S]{0,220}?action\s*:\s*['"]([^'"]+)['"]/g)) {
    sent.push(match[1]);
  }
  return sent;
}

function checkMessageActions() {
  const sent = new Map();
  const handled = new Map();

  for (const file of MESSAGE_FILES) {
    const code = read(file);
    for (const action of extractSentActions(code)) {
      if (!sent.has(action)) sent.set(action, new Set());
      sent.get(action).add(file);
    }
    for (const action of extractHandledActions(code)) {
      if (!handled.has(action)) handled.set(action, new Set());
      handled.get(action).add(file);
    }
  }

  for (const [action, files] of sent.entries()) {
    if (!handled.has(action)) {
      fail(`message action "${action}" is sent by ${[...files].join(', ')} but has no handler`);
    }
  }
  if (!failed) pass(`message actions (${sent.size} sent actions)`);
}

async function checkSmokeTests() {
  try {
    const providers = require(rootPath('src/lib/providers.js'));
    if (providers.getProviderFromPreset('deepseek-v4-pro') !== 'deepseek') {
      throw new Error('provider preset lookup failed');
    }
    if (providers.providerNeedsApiKeyShared('custom')) {
      throw new Error('custom provider should not require an API key');
    }
    if (providers.getProviderFromPreset('hunyuan') !== 'hunyuan') {
      throw new Error('Hunyuan provider preset lookup failed');
    }
    if (providers.providerNeedsApiKeyShared('hunyuan')) {
      throw new Error('Hunyuan provider should not require an API key');
    }

    const utils = require(rootPath('src/lib/utils.js'));
    global.DEFAULT_SETTINGS = utils.DEFAULT_SETTINGS;
    const original = 'email a@test.com code: 123456 card 4242 4242 4242 4242';
    const masked = utils.maskSensitiveData(original, utils.DEFAULT_SETTINGS);
    if (utils.restoreSensitiveData(masked.text, masked.map) !== original) {
      throw new Error('sensitive masking restore failed');
    }
    if (utils.providerNeedsApiKey('google')) {
      throw new Error('google provider should not require an API key');
    }
    if (utils.providerNeedsApiKey('hunyuan')) {
      throw new Error('hunyuan provider should not require an API key');
    }
    if (utils.normalizeProviderLanguage('deepl', 'zh-CN') !== 'ZH') {
      throw new Error('DeepL zh-CN language mapping failed');
    }
    if (utils.normalizeProviderLanguage('baidu', 'ja') !== 'jp') {
      throw new Error('Baidu ja language mapping failed');
    }
    if (utils.normalizeProviderLanguage('microsoft', 'zh-TW') !== 'zh-Hant') {
      throw new Error('Microsoft zh-TW language mapping failed');
    }

    const rules = require(rootPath('src/lib/site-rules.js'));
    const githubRule = await rules.getSiteRule('https://github.com/org/repo/blob/main/file.js', {});
    if (!githubRule.excludeSelectors || !githubRule.excludeSelectors.includes('pre')) {
      throw new Error('GitHub site rule missing code excludes');
    }

    global.normalizeSettings = value => value;
    const { LLMAPI, LLM_API_CONFIG } = require(rootPath('src/lib/llm-api.js'));
    global.LLMAPI = LLMAPI;
    global.LLM_API_CONFIG = LLM_API_CONFIG;
    require(rootPath('src/lib/llm-adapters/batch.js'));
    for (const file of require(rootPath('src/lib/provider-loader.js')).LLM_PROVIDER_FILES) {
      require(rootPath(file));
    }
    const api = new LLMAPI({ baseURL: 'https://api.deepseek.com', model: 'deepseek-v4-flash' });
    if (api._buildURL('https://api.deepseek.com') !== 'https://api.deepseek.com/chat/completions') {
      throw new Error('DeepSeek URL mapping failed');
    }
    if (api._buildURL('https://api.openai.com/v1') !== 'https://api.openai.com/v1/chat/completions') {
      throw new Error('OpenAI-compatible URL mapping failed');
    }
    for (const method of ['translateWithAnthropic', 'translateWithGoogle', 'translateWithDeepL', 'translateWithBaidu', 'translateWithMicrosoft']) {
      if (typeof api[method] !== 'function') throw new Error(`provider method not loaded: ${method}`);
    }

    global.window = { __LLM_CTX__: { state: {}, fn: {}, features: {} } };
    require(rootPath('src/content/translation/content-scanner.js'));
    require(rootPath('src/content/translation/content-batch-processor.js'));
    if (typeof global.window.__LLM_CTX__.fn.createContentScanner !== 'function') {
      throw new Error('content scanner factory was not registered');
    }
    if (typeof global.window.__LLM_CTX__.fn.createContentBatchProcessor !== 'function') {
      throw new Error('content batch processor factory was not registered');
    }
    require(rootPath('src/content/features/content-input.js'));
    const parseInputTrigger = global.window.__LLM_CTX__.fn.getExplicitInputTrigger;
    if (parseInputTrigger('/tr Hello world') !== 'Hello world') {
      throw new Error('input /tr prefix trigger failed');
    }
    if (parseInputTrigger('Hello world /tr') !== 'Hello world') {
      throw new Error('input /tr suffix trigger failed');
    }
    delete global.window;

    let longTextCalls = 0;
    const originalFetch = global.fetch;
    const originalLog = global.LOG;
    global.LOG = { info() {}, warn() {}, error() {}, debug() {} };
    global.fetch = async (_url, init) => {
      longTextCalls++;
      const body = JSON.parse(init.body || '{}');
      const userText = body.messages?.find(item => item.role === 'user')?.content || '';
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'T:' + userText.slice(-12) }, finish_reason: 'stop' }],
          usage: { total_tokens: 1 },
          model: body.model
        })
      };
    };
    const longApi = new LLMAPI({
      provider: 'deepseek',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      apiKey: 'test',
      maxCharsPerRequest: 1200,
      largeTextMode: true,
      thinkingMode: 'disabled',
      useStream: false,
      streamRenderMode: 'disabled'
    });
    await longApi.translate('A'.repeat(5200), 'en', 'zh-CN', { noCache: true, retries: 0 });
    global.fetch = originalFetch;
    global.LOG = originalLog;
    if (longTextCalls < 2) throw new Error('long text translation did not split into multiple API calls');

    pass('core smoke tests');
  } catch (err) {
    fail('core smoke tests: ' + err.message);
  }
}

function checkSizeWarnings() {
  const contentMain = rootPath('src/content/core/content-main.js');
  const llmApi = rootPath('src/lib/llm-api.js');
  const contentKb = Math.round(fs.statSync(contentMain).size / 1024);
  const apiKb = Math.round(fs.statSync(llmApi).size / 1024);
  if (contentKb > 75) warn(`src/content/core/content-main.js is ${contentKb}KB; keep module split as next architecture work`);
  if (apiKb > 45) warn(`src/lib/llm-api.js is ${apiKb}KB; keep OpenAI-compatible core focused and move provider-specific code out`);
}

async function main() {
  checkJsSyntax();
  checkManifestsAndResources();
  checkDirectDomIds();
  checkMessageActions();
  await checkSmokeTests();
  checkSizeWarnings();

  if (failed) {
    console.error('\nValidation failed.');
    process.exit(1);
  }
  console.log('\nValidation passed.');
}

main().catch(err => {
  fail('validation crashed: ' + err.message);
  process.exit(1);
});
