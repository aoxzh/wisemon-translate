const { test, expect, chromium } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..');
const FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'article.html');
const COMPLEX_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'complex.html');
const ECOMMERCE_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'ecommerce.html');
const BINANCE_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'binance.html');
const SELECTION_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'selection.html');
const SHADOW_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'shadow-dom.html');
const RICH_EDITOR_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'rich-editor.html');
const NEWS_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'news.html');
const DOCS_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'docs.html');
const FORUM_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'forum.html');
const SPA_FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'spa.html');

async function launchExtensionContext() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });
  return context;
}

async function getExtensionId(context) {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker');
  return serviceWorker.url().split('/')[2];
}

async function startFixtureServer(file = FIXTURE_FILE) {
  const html = fs.readFileSync(file, 'utf8');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/article.html`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function setExtensionSettings(context, extensionId, settings) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (nextSettings) => {
    const current = (await chrome.runtime.sendMessage({ action: 'get-settings' })).settings;
    await chrome.runtime.sendMessage({
      action: 'set-settings',
      settings: { ...current, ...nextSettings }
    });
  }, settings);
  await page.close();
}

async function mockGoogleTranslate(context, prefix = 'TRANSLATED:') {
  await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
    const url = new URL(route.request().url());
    const source = url.searchParams.get('q') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([[[`${prefix}${source.slice(0, 60)}`, source, null, null]]])
    });
  });
}

async function sendToFixtureTab(context, extensionId, targetUrl, message, attempts = 8) {
  const extensionPage = await context.newPage();
  try {
    await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
    return await extensionPage.evaluate(async ({ targetUrl, message, attempts }) => {
      const tabs = await chrome.tabs.query({ url: targetUrl });
      const tabId = tabs[0] && tabs[0].id;
      let lastError = '';
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
          return await chrome.tabs.sendMessage(tabId, message);
        } catch (err) {
          lastError = err.message || String(err);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      return { error: lastError || 'content script did not connect' };
    }, { targetUrl, message, attempts });
  } finally {
    await extensionPage.close();
  }
}

async function translateFixturePage(context, extensionId, targetUrl, action = 'toggle-translation') {
  return await sendToFixtureTab(context, extensionId, targetUrl, { action });
}

test.describe('extension smoke', () => {
  test('options page renders key sections', async () => {
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await expect(page.locator('#save-settings')).toBeVisible();
      await expect(page.locator('#provider-grid')).toBeVisible();
      await expect(page.locator('#logs')).toBeAttached();
    } finally {
      await context.close();
    }
  });

  test('popup renders main controls', async () => {
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(page.locator('#btn-translate')).toBeVisible();
      await expect(page.locator('.wm-select[data-select-id="target-lang-select"]')).toBeVisible();
      await expect(page.locator('#link-options')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('options custom selects keep subtitle layout compact', async () => {
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html#subtitles`);
      await expect(page.locator('#subtitleSubfield')).toBeVisible();
      await expect(page.locator('.wm-select[data-select-id="subtitleMode"]')).toBeVisible();
      const box = await page.locator('#subtitleSubfield').boundingBox();
      expect(box.height).toBeLessThan(360);
      const modeBox = await page.locator('.wm-select[data-select-id="subtitleMode"]').boundingBox();
      expect(modeBox.height).toBeLessThan(70);
    } finally {
      await context.close();
    }
  });

  test('side panel reader translates long text in segments', async () => {
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`ç¿»è¨³:${source.slice(0, 40)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        maxCharsPerRequest: 6000,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      const longText = [
        'This is the first long reader paragraph. '.repeat(80),
        'This is the second long reader paragraph. '.repeat(80),
        'This is the third long reader paragraph. '.repeat(80)
      ].join('\n\n');
      await page.fill('#source-text', longText);
      await page.click('#translate-text');
      await expect(page.locator('#reader-result')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.side-segment')).toHaveCount(3, { timeout: 20000 });
      await expect(page.locator('#chapter-nav option')).toHaveCount(3, { timeout: 20000 });
      await expect(page.locator('#resume-translate')).toBeVisible();
      await expect(page.locator('#save-html')).toBeVisible();
      await expect(page.locator('#save-markdown')).toBeVisible();
      await expect(page.locator('.side-segment-translation').first()).toContainText('ç¿»è¨³:', { timeout: 20000 });
    } finally {
      await context.close();
    }
  });

  test('youtube subtitle overlay translates timedtext captions', async () => {
    const context = await launchExtensionContext();
    try {
      const playerResponse = {
        captions: {
          playerCaptionsTracklistRenderer: {
            captionTracks: [{
              baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123&lang=en&kind=asr',
              languageCode: 'en',
              kind: 'asr',
              name: { simpleText: 'English auto-generated' }
            }]
          }
        },
        videoDetails: { shortDescription: 'Fixture video' }
      };
      const timedText = {
        events: [
          { tStartMs: 0, dDurationMs: 1200, segs: [{ utf8: 'Hello ' }, { utf8: 'world.' }] },
          { tStartMs: 1300, dDurationMs: 1200, segs: [{ utf8: 'This is a subtitle.' }] }
        ]
      };

      await context.route('https://www.youtube.com/watch?v=abc123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><html><head><title>YouTube fixture</title><script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script></head><body><div id="movie_player" class="html5-video-player"><div class="video-ads"></div><div id="container"><video></video></div><div class="ytp-right-controls"><button class="ytp-subtitles-button ytp-button" aria-pressed="false">CC</button></div><div id="ytp-caption-window-container"></div></div><script>document.querySelector('.ytp-subtitles-button').addEventListener('click', function(){ this.setAttribute('aria-pressed', 'true'); fetch('https://www.youtube.com/api/timedtext?v=abc123&lang=en&kind=asr&fmt=json3'); });</script></body></html>`
        });
      });
      await context.route('https://www.youtube.com/api/timedtext**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(timedText)
        });
      });
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`ç¿»è¨³:${source.slice(0, 40)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        enableSubtitle: true,
        subtitleMode: 'bilingual',
        subtitleStyle: 'outline',
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto('https://www.youtube.com/watch?v=abc123');
      await page.waitForTimeout(1500);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async () => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find(item => item.url && item.url.startsWith('https://www.youtube.com/'));
        const tabId = tab && tab.id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'get-status' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'subtitle content script did not connect' };
      }, 'https://www.youtube.com/watch?v=abc123');
      expect(result.error || '').toBe('');
      await expect(page.locator('#llm-youtube-subtitle-button')).toBeVisible({ timeout: 15000 });
      await page.evaluate(() => {
        const video = document.querySelector('video');
        Object.defineProperty(video, 'currentTime', { value: 0.4, configurable: true });
        video.dispatchEvent(new Event('timeupdate'));
      });
      await expect(page.locator('.llm-youtube-subtitle-overlay')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.llm-youtube-subtitle-overlay')).toHaveClass(/llm-subtitle-style-outline/, { timeout: 15000 });
      await expect(page.locator('.llm-youtube-subtitle-overlay .llm-sub-original')).toContainText('Hello world.', { timeout: 15000 });
      await expect(page.locator('.llm-youtube-subtitle-overlay .llm-sub-translated')).toContainText('ç¿»è¨³:', { timeout: 15000 });
    } finally {
      await context.close();
    }
  });

  test('youtube subtitle starts after spa navigation to watch page', async () => {
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        enableSubtitle: true
      });
      await context.route('https://www.youtube.com/', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: '<!doctype html><html><body><main id="content">Home</main><script>setTimeout(() => { history.pushState({}, "", "/watch?v=spa123"); document.body.innerHTML = `<div id="movie_player" class="html5-video-player"><div id="container"><video></video></div><div class="ytp-right-controls"><button class="ytp-subtitles-button ytp-button" aria-pressed="false">CC</button></div><div id="ytp-caption-window-container"></div></div>`; window.dispatchEvent(new Event("yt-navigate-finish")); }, 600);</script></body></html>'
        });
      });
      const page = await context.newPage();
      await page.goto('https://www.youtube.com/');
      await page.waitForTimeout(500);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async () => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find(item => item.url && item.url.startsWith('https://www.youtube.com/'));
        const tabId = tab && tab.id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'get-status' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'subtitle content script did not connect' };
      });
      expect(result.error || '').toBe('');
      await expect(page.locator('#llm-youtube-subtitle-button')).toBeVisible({ timeout: 15000 });
    } finally {
      await context.close();
    }
  });

  test('bilingual page translation keeps compact navigation originals', async () => {
    const server = await startFixtureServer(COMPLEX_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`TRANSLATED:${source.slice(0, 40)}`, source, null, null]]])
        });
      });
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        displayMode: 'bilingual',
        translationTheme: 'subtle',
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(server.url);
      await page.waitForTimeout(1200);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'translate-page' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'content script did not translate' };
      }, server.url);
      expect(result.error || '').toBe('');
      await expect(page.locator('nav a').first()).toContainText('Overview');
      await expect(page.locator('nav a').first()).not.toContainText('TRANSLATED:');
      await expect(page.locator('.llm-translate-block-wrapper').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.llm-translate-block-wrapper').first()).toContainText('TRANSLATED:', { timeout: 15000 });
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('content script bridge responds on a local fixture page', async () => {
    const fixture = await startFixtureServer();
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1500);
      const extensionPage = await context.newPage();
      await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
      const status = await extensionPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        if (!tabId) return { error: 'Target tab not found' };
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'get-status' });
          } catch (err) {
            if (attempt === 4) return { error: err.message || String(err) };
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }, fixture.url);
      expect(status).toBeTruthy();
      expect(status.error || '').toBe('');
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('selection popup opens from runtime selection action', async () => {
    const fixture = await startFixtureServer(SELECTION_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`TRANSLATED:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        enableSelection: true
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);

      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, {
              action: 'translate-selection',
              text: 'Right click selection translation should open the translation popup close to the selected text and keep the chosen source sentence stable.'
            });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'translate-selection did not connect' };
      }, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('.llm-translate-popup')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.llm-popup-original')).toContainText('Right click selection translation should open', { timeout: 15000 });
      await expect(page.locator('.llm-popup-result')).toContainText('TRANSLATED:', { timeout: 15000 });
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('input translation replaces contenteditable text via triple-space trigger', async () => {
    const fixture = await startFixtureServer(RICH_EDITOR_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`TRANSLATED:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        enableInputBox: true
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.locator('#editor').click();
      await page.locator('#editor').press('Control+A');
      await page.locator('#editor').type('Translate this editable paragraph into another language.   ');
      await expect(page.locator('#editor')).toContainText('TRANSLATED:', { timeout: 15000 });
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('shadow dom content can still be translated', async () => {
    const fixture = await startFixtureServer(SHADOW_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`TRANSLATED:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'toggle-translation' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'toggle-translation did not connect' };
      }, fixture.url);

      expect(result.error || '').toBe('');
      const translated = await page.locator('#shadow-host').evaluate((host) => host.shadowRoot.textContent);
      expect(translated).toContain('TRANSLATED:');
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('news fixture translates article copy while leaving form controls alone', async () => {
    const fixture = await startFixtureServer(NEWS_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await mockGoogleTranslate(context);
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        translateMainOnly: false,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const result = await translateFixturePage(context, extensionId, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('article .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
      await expect(page.locator('input .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('button .llm-translate-inner')).toHaveCount(0);
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('docs fixture translates prose and skips code and keyboard snippets', async () => {
    const fixture = await startFixtureServer(DOCS_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await mockGoogleTranslate(context);
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        translateMainOnly: false,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const result = await translateFixturePage(context, extensionId, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('article .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
      await expect(page.locator('pre .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('kbd .llm-translate-inner')).toHaveCount(0);
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('forum fixture translates nested replies without touching the editor draft', async () => {
    const fixture = await startFixtureServer(FORUM_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await mockGoogleTranslate(context);
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        translateMainOnly: false,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const result = await translateFixturePage(context, extensionId, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('.thread .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
      await expect(page.locator('.reply .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
      await expect(page.locator('blockquote')).toContainText('Previous message');
      await expect(page.locator('#forum-editor .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('#forum-editor')).toContainText('Draft reply text');
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('complex spa fixture translates content rendered after client-side routing', async () => {
    const fixture = await startFixtureServer(SPA_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await mockGoogleTranslate(context);
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        translateMainOnly: false,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await expect(page.locator('#spa-dynamic')).toBeVisible({ timeout: 5000 });
      const result = await translateFixturePage(context, extensionId, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('#app .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
      await page.locator('#route-thread').click();
      await expect(page.locator('#spa-dynamic')).toContainText('discussion route', { timeout: 5000 });
      await translateFixturePage(context, extensionId, fixture.url, 'translate-to-bottom');
      await expect(page.locator('#app .llm-translate-inner').first()).toContainText('TRANSLATED:', { timeout: 15000 });
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('direct hover entrypoint shows one translated hover result', async () => {
    const fixture = await startFixtureServer(NEWS_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await mockGoogleTranslate(context);
      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        enableHover: true,
        hoverMode: 'direct'
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const status = await sendToFixtureTab(context, extensionId, fixture.url, { action: 'get-status' });
      expect(status.error || '').toBe('');
      expect(status.hoverEnabled).toBe(true);
      await page.bringToFront();
      const extensionPage = await context.newPage();
      await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
      const hoverDebug = await extensionPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        const [result] = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const el = document.querySelector('#news-lead');
            const rect = el.getBoundingClientRect();
            const before = {
              hasCtx: !!window.__LLM_CTX__,
              hasHandler: typeof window.__LLM_CTX__?.fn?.onMouseOver,
              settings: window.__LLM_CTX__?.state?.settings,
              text: el?.innerText || el?.textContent || ''
            };
            el.dispatchEvent(new MouseEvent('mouseover', {
              bubbles: true,
              clientX: rect.left + 12,
              clientY: rect.top + 12
            }));
            return {
              ...before,
              hoverButtons: document.querySelectorAll('.llm-translate-hover-btn').length
            };
          }
        });
        return result.result;
      }, fixture.url);
      expect(hoverDebug.hasCtx).toBe(true);
      expect(hoverDebug.hasHandler).toBe('function');
      await extensionPage.close();

      await expect(page.locator('.llm-translate-hover-btn')).toContainText('TRANSLATED:', { timeout: 15000 });
      await expect(page.locator('.llm-translate-hover-btn')).toHaveCount(1);
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('translation failure is logged after mocked 401', async () => {
    const fixture = await startFixtureServer();
    const context = await launchExtensionContext();
    try {
      await context.route('https://api.deepseek.com/chat/completions', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Invalid API key for test' } })
        });
      });

      const extensionId = await getExtensionId(context);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await optionsPage.evaluate(() => localStorage.setItem('llm-translate-ui-lang', 'en'));
      await optionsPage.fill('#apiKey', 'test-key');
      await optionsPage.click('#save-settings');
      await expect(optionsPage.locator('#save-status')).toHaveText(/Settings saved/i);

      const contentPage = await context.newPage();
      await contentPage.goto(fixture.url);
      await contentPage.bringToFront();
      await contentPage.waitForTimeout(1500);
      const translateResult = await optionsPage.evaluate(async () => {
        return await chrome.runtime.sendMessage({
          action: 'translate',
          text: 'Smoke test text',
          sourceLang: 'en',
          targetLang: 'zh-CN'
        });
      });
      expect(translateResult.error || '').toContain('401');

      const logsPage = await context.newPage();
      await logsPage.goto(`chrome-extension://${extensionId}/options.html#logs`);
      await logsPage.click('a[data-section="logs"]');
      await expect(logsPage.locator('#log-entries')).toContainText('401', { timeout: 15000 });
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('complex mixed-language page translates visible content and skips code', async () => {
    const fixture = await startFixtureServer(COMPLEX_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`翻訳:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      const extensionId = await getExtensionId(context);
      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        translateMainOnly: false,
        minTextLength: 2,
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1500);

      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        let lastError = '';
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'toggle-translation' });
          } catch (err) {
            lastError = err.message || String(err);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: lastError || 'toggle-translation did not connect' };
      }, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('.llm-translate-inner').first()).toContainText('翻訳:', { timeout: 15000 });
      await expect(page.locator('pre .llm-translate-inner')).toHaveCount(0);
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('ecommerce rules translate product details and skip commerce controls', async () => {
    const fixture = await startFixtureServer(ECOMMERCE_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const ruleInfo = await optionsPage.evaluate(async () => {
        const src = chrome.runtime.getURL('src/lib/site-rules.js');
        await import(src);
        const amazon = getSiteRule('https://www.amazon.co.jp/dp/B000TEST', {});
        const bandai = getSiteRule('https://p-bandai.jp/item/item-1000000000/', {});
        return {
          amazonIds: amazon.matchedIds,
          amazonMain: amazon.mainSelectors,
          bandaiIds: bandai.matchedIds,
          bandaiExclude: bandai.excludeSelectors
        };
      });
      expect(ruleInfo.amazonIds).toContain('amazon-product');
      expect(ruleInfo.amazonMain).toContain('#feature-bullets');
      expect(ruleInfo.bandaiIds).toContain('p-bandai-product');
      expect(ruleInfo.bandaiExclude).toContain('.cart');

      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`翻訳:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        siteRules: JSON.stringify([{
          id: 'fixture-p-bandai',
          matches: ['127.0.0.1'],
          mainSelectors: ['#product_detail'],
          excludeSelectors: ['.price', '.cart', '.recommend']
        }]),
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'toggle-translation' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'toggle-translation did not connect' };
      }, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('.description .llm-translate-inner').first()).toContainText('翻訳:', { timeout: 15000 });
      await expect(page.locator('.price .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('.cart .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('.recommend .llm-translate-inner')).toHaveCount(0);
    } finally {
      await context.close();
      await fixture.close();
    }
  });

  test('crypto trading rules translate content and skip trading widgets', async () => {
    const fixture = await startFixtureServer(BINANCE_FIXTURE_FILE);
    const context = await launchExtensionContext();
    try {
      const extensionId = await getExtensionId(context);
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      const ruleInfo = await optionsPage.evaluate(async () => {
        const src = chrome.runtime.getURL('src/lib/site-rules.js');
        await import(src);
        const trade = getSiteRule('https://www.binance.com/en/trade/BTC_USDT', {});
        const article = getSiteRule('https://www.binance.com/en/support/faq/example', {});
        return {
          tradeIds: trade.matchedIds,
          tradePrivacy: trade.privacyMode,
          tradeAuto: trade.disableAutoTranslate,
          articleIds: article.matchedIds,
          articleMain: article.mainSelectors
        };
      });
      expect(ruleInfo.tradeIds).toContain('crypto-trading-sensitive');
      expect(ruleInfo.tradePrivacy).toBe('strict');
      expect(ruleInfo.tradeAuto).toBe(true);
      expect(ruleInfo.articleIds).toContain('binance-content');
      expect(ruleInfo.articleMain).toContain('article');

      await context.route('https://translate.googleapis.com/translate_a/single**', async route => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('q') || '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[[`ç¿»è¨³:${source.slice(0, 60)}`, source, null, null]]])
        });
      });

      await setExtensionSettings(context, extensionId, {
        provider: 'google',
        model: 'google-free',
        targetLang: 'zh-CN',
        sourceLang: 'auto',
        siteRules: JSON.stringify([{
          id: 'fixture-binance',
          matches: ['127.0.0.1'],
          mainSelectors: ['article'],
          excludeSelectors: [
            '.price-ticker', '.chart-container', '.orderbook', '.trade-panel',
            '.wallet-balance', 'input', 'button'
          ],
          contextHint: 'Fixture for crypto exchange content.'
        }]),
        maxConcurrency: 1
      });

      const page = await context.newPage();
      await page.goto(fixture.url);
      await page.waitForTimeout(1200);
      const result = await optionsPage.evaluate(async (targetUrl) => {
        const tabs = await chrome.tabs.query({ url: targetUrl });
        const tabId = tabs[0] && tabs[0].id;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await chrome.runtime.sendMessage({ action: 'inject-content-main', tabId });
            return await chrome.tabs.sendMessage(tabId, { action: 'toggle-translation' });
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        return { error: 'toggle-translation did not connect' };
      }, fixture.url);

      expect(result.error || '').toBe('');
      await expect(page.locator('article .llm-translate-inner').first()).toContainText('ç¿»è¨³:', { timeout: 15000 });
      await expect(page.locator('.price-ticker .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('.orderbook .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('.trade-panel .llm-translate-inner')).toHaveCount(0);
      await expect(page.locator('.wallet-balance .llm-translate-inner')).toHaveCount(0);
    } finally {
      await context.close();
      await fixture.close();
    }
  });
});
