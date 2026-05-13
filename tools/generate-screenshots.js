#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'screenshots');

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function writeDemo(name, body) {
  const file = path.join(OUT, `${name}.html`);
  fs.writeFileSync(file, body, 'utf8');
  return 'file:///' + file.replace(/\\/g, '/');
}

function shell(title, subtitle, content, extraCss = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      --bg: #f6f8fb;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #dbe3ee;
      --panel: #ffffff;
      --soft: #eef6f2;
      --green: #16a34a;
      --cyan: #0891b2;
      --blue: #2563eb;
      --dark: #071019;
      --shadow: 0 24px 80px rgba(15, 23, 42, .12);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at 18% 0%, #dff7ec 0, transparent 28%), linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%); color: var(--ink); }
    .stage { width: 1440px; height: 960px; padding: 56px 64px; overflow: hidden; }
    .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 34px; }
    .brand { display: flex; align-items: center; gap: 14px; font-weight: 760; font-size: 24px; letter-spacing: 0; }
    .brand img { width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 12px 28px rgba(2, 6, 23, .18); }
    .badge { display: inline-flex; align-items: center; gap: 8px; height: 34px; border: 1px solid var(--line); background: rgba(255,255,255,.8); border-radius: 999px; padding: 0 14px; color: var(--muted); font-size: 14px; font-weight: 650; }
    h1 { margin: 0; font-size: 42px; line-height: 1.08; letter-spacing: 0; }
    .subtitle { margin: 12px 0 0; color: var(--muted); font-size: 18px; line-height: 1.55; max-width: 780px; }
    .card { background: rgba(255,255,255,.92); border: 1px solid rgba(219,227,238,.95); border-radius: 22px; box-shadow: var(--shadow); }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 800; letter-spacing: .02em; }
    .muted { color: var(--muted); }
    .mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    ${extraCss}
  </style>
</head>
<body>
  <main class="stage">
    <div class="topbar">
      <div class="brand"><img src="../../icons/icon128.png" alt="">wisemon-translate</div>
      <div class="badge">local settings · direct API · no telemetry</div>
    </div>
    <section class="hero">
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </section>
    ${content}
  </main>
</body>
</html>`;
}

function pageTranslationDemo() {
  return shell(
    'Mixed-language pages stay readable',
    'Bilingual mode keeps source text visible while adding translations next to the real reading flow.',
    `<div class="browser card">
      <div class="browser-bar"><span></span><span></span><span></span><div>research.example/articles/global-ai</div></div>
      <div class="article">
        <aside class="toc">
          <div class="toc-title">Sections</div>
          <a>Overview</a><a>Benchmarks</a><a>用語メモ</a><a>风险提示</a>
        </aside>
        <section class="copy">
          <div class="pill">BILINGUAL VIEW</div>
          <h2>AI agents are moving from chat to workflow execution</h2>
          <div class="translation">AI 代理正在从聊天界面走向完整工作流执行。</div>
          <p>Teams now mix English specs, 日本語 release notes, 한국어 issue comments, and 中文 product feedback in the same browser session.</p>
          <div class="translation">团队常在同一个浏览器会话中同时阅读英文规格、日文发布说明、韩文 issue 评论和中文产品反馈。</div>
          <p>重要なポイント: preserve terms like <b>RAG</b>, <b>latency budget</b>, and <b>token window</b> while translating the surrounding prose.</p>
          <div class="translation">重点：保留 RAG、latency budget、token window 等术语，同时翻译周围正文。</div>
          <pre><code>const latencyBudget = "1200ms";\nawait translateVisibleText({ mode: "bilingual" });</code></pre>
        </section>
      </div>
    </div>`,
    `.browser { margin-top: 32px; height: 680px; overflow: hidden; }
    .browser-bar { height: 54px; display:flex; align-items:center; gap:9px; padding:0 18px; border-bottom:1px solid var(--line); background:#fbfdff; }
    .browser-bar span { width:12px; height:12px; border-radius:999px; background:#cbd5e1; }
    .browser-bar span:nth-child(1){background:#fb7185}.browser-bar span:nth-child(2){background:#fbbf24}.browser-bar span:nth-child(3){background:#34d399}
    .browser-bar div { margin-left:14px; height:30px; min-width:520px; border-radius:999px; background:#eef2f7; color:#64748b; display:flex; align-items:center; padding:0 18px; font-size:14px; }
    .article { display:grid; grid-template-columns: 220px 1fr; gap:34px; padding:34px; }
    .toc { border-right:1px solid var(--line); padding-right:22px; display:flex; flex-direction:column; gap:14px; color:#64748b; }
    .toc-title { color:#0f172a; font-weight:800; margin-bottom:8px; }
    .toc a { padding:10px 12px; border-radius:10px; background:#f8fafc; font-weight:650; }
    .copy { max-width: 850px; }
    .copy h2 { margin:18px 0 14px; font-size:44px; line-height:1.05; letter-spacing:0; }
    .copy p { font-size:20px; line-height:1.72; color:#334155; margin:22px 0 8px; }
    .translation { margin:10px 0 22px; padding:14px 18px; border-radius:14px; background:#ecfdf5; border-left:4px solid #22c55e; color:#14532d; font-size:18px; line-height:1.62; }
    pre { margin-top:26px; background:#0f172a; color:#c4f1d0; border-radius:16px; padding:20px; font-size:16px; }`
  );
}

function readerDemo() {
  return shell(
    'Long articles become a resumable workspace',
    'Paste a chapter, import a PDF, continue interrupted work, and export clean HTML or Markdown.',
    `<div class="reader-grid">
      <section class="input card">
        <div class="panel-head"><b>Source</b><span>Chapter 03 · 8 segments</span></div>
        <div class="textarea">
          <p><b>English:</b> The architecture must support streaming logs, delayed retries, and low-cost batch translation.</p>
          <p><b>日本語:</b> 仕様変更が多い場合でも、用語集と文脈を維持する必要があります。</p>
          <p><b>中文:</b> 对超长文本来说，关键不是一次塞进上下文，而是稳定拆分、续翻和导出。</p>
        </div>
        <div class="controls"><button>Import PDF</button><button>Build chapters</button><button class="primary">Translate</button></div>
      </section>
      <section class="output card">
        <div class="panel-head"><b>Bilingual result</b><span>6 / 8 complete</span></div>
        <div class="progress"><i></i></div>
        <article>
          <h3>Section 1</h3>
          <p>The architecture must support streaming logs, delayed retries, and low-cost batch translation.</p>
          <div>架构需要支持流式日志、延迟重试，以及低成本的批量翻译。</div>
        </article>
        <article>
          <h3>Section 2</h3>
          <p>仕様変更が多い場合でも、用語集と文脈を維持する必要があります。</p>
          <div>即使规格频繁变化，也需要保持术语表和上下文一致。</div>
        </article>
      </section>
    </div>`,
    `.reader-grid { margin-top:32px; display:grid; grid-template-columns: .9fr 1.1fr; gap:28px; height:680px; }
    .input,.output { padding:24px; overflow:hidden; }
    .panel-head { display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:1px solid var(--line); color:#64748b; }
    .panel-head b { color:#0f172a; font-size:18px; }
    .textarea { margin-top:22px; min-height:420px; border:1px solid var(--line); border-radius:16px; background:#f8fafc; padding:22px; font-size:18px; line-height:1.7; color:#334155; }
    .controls { margin-top:18px; display:flex; gap:12px; }
    button { border:1px solid #cbd5e1; background:white; border-radius:10px; padding:12px 16px; font-weight:800; color:#334155; }
    button.primary { background:#16a34a; color:white; border-color:#16a34a; }
    .progress { height:10px; background:#e2e8f0; border-radius:999px; margin:22px 0; overflow:hidden; }
    .progress i { display:block; width:75%; height:100%; background:linear-gradient(90deg,#22c55e,#06b6d4); }
    article { border:1px solid var(--line); border-radius:16px; padding:18px 20px; margin:16px 0; background:#fbfdff; }
    article h3 { margin:0 0 10px; font-size:16px; color:#64748b; }
    article p { margin:0 0 12px; color:#334155; line-height:1.6; }
    article div { background:#ecfdf5; color:#14532d; border-radius:12px; padding:12px 14px; line-height:1.6; }`
  );
}

function subtitleDemo() {
  return shell(
    'Subtitle translation for video learning',
    'Keep the original caption and translated line together, with export-ready bilingual timing.',
    `<div class="video card">
      <div class="scene">
        <div class="play">▶</div>
        <div class="caption">
          <div class="original">The model should preserve names like DeepSeek V4 and OpenAI-compatible API.</div>
          <div class="translated">模型应保留 DeepSeek V4 和 OpenAI-compatible API 这样的名称。</div>
        </div>
        <div class="controls"><span>00:42</span><div><i></i></div><button>T</button><button>VTT</button></div>
      </div>
      <aside class="notes">
        <h3>Video workflow</h3>
        <p>English audio, Japanese slides, Chinese notes, and API terminology can stay aligned while watching.</p>
        <ul><li>Original + translation overlay</li><li>Prefetch upcoming subtitle lines</li><li>Export VTT for review</li></ul>
      </aside>
    </div>`,
    `.video { margin-top:32px; height:680px; display:grid; grid-template-columns: 1fr 320px; overflow:hidden; background:#020617; color:white; border-color:#0f172a; }
    .scene { position:relative; background: radial-gradient(circle at 70% 20%, rgba(34,197,94,.22), transparent 28%), linear-gradient(135deg,#0f172a,#020617); }
    .play { position:absolute; inset:0; display:grid; place-items:center; font-size:88px; color:rgba(255,255,255,.2); }
    .caption { position:absolute; left:80px; right:80px; bottom:118px; text-align:center; display:grid; gap:10px; }
    .original { display:inline-block; justify-self:center; background:rgba(15,23,42,.82); border:1px solid rgba(255,255,255,.18); border-radius:14px; padding:12px 18px; font-size:22px; line-height:1.42; }
    .translated { display:inline-block; justify-self:center; background:rgba(22,163,74,.92); color:white; border-radius:14px; padding:12px 18px; font-size:24px; font-weight:780; line-height:1.42; }
    .controls { position:absolute; left:42px; right:42px; bottom:34px; display:flex; align-items:center; gap:16px; color:#cbd5e1; }
    .controls div { flex:1; height:8px; border-radius:999px; background:#334155; overflow:hidden; }
    .controls i { display:block; width:42%; height:100%; background:#22c55e; }
    .controls button { width:48px; height:38px; border:1px solid rgba(255,255,255,.2); background:rgba(15,23,42,.8); color:white; border-radius:999px; font-weight:900; }
    .notes { border-left:1px solid rgba(255,255,255,.1); padding:42px 32px; background:rgba(15,23,42,.55); }
    .notes h3 { margin:0 0 18px; font-size:28px; }
    .notes p,.notes li { color:#cbd5e1; line-height:1.65; font-size:17px; }
    .notes ul { padding-left:20px; }`
  );
}

function popupDemo() {
  return shell(
    'Fast controls stay one click away',
    'Change target language, display mode, theme, and translation behavior without leaving the page.',
    `<div class="popup-wrap">
      <div class="popup card">
        <div class="pop-head"><div><img src="../../icons/icon48.png" alt=""><b>wisemon-translate</b><span>DeepSeek V4 Flash</span></div><button>中</button></div>
        <div class="status"><i></i><span>Ready · mixed-language page detected</span></div>
        <button class="translate">Translate Page</button>
        <div class="stats"><div><b>14+</b><span>providers</span></div><div><b>6</b><span>parallel</span></div><div><b>0</b><span>telemetry</span></div></div>
        <div class="field"><span>Translate to</span><b>Chinese Simplified</b></div>
        <div class="seg"><button class="active">Bilingual</button><button>Translation only</button></div>
      </div>
      <div class="callouts">
        <div class="card"><b>Privacy first</b><p>Keys, cache, and logs stay in browser storage.</p></div>
        <div class="card"><b>Long text aware</b><p>Large pages are split and translated in stable batches.</p></div>
      </div>
    </div>`,
    `.popup-wrap { margin-top:32px; display:grid; grid-template-columns:420px 1fr; gap:30px; align-items:start; }
    .popup { padding:22px; background:#071019; color:white; border-color:#1e293b; }
    .pop-head { display:flex; justify-content:space-between; align-items:center; }
    .pop-head div { display:grid; grid-template-columns:42px 1fr; column-gap:12px; align-items:center; }
    .pop-head img { width:42px; height:42px; border-radius:12px; grid-row:span 2; }
    .pop-head b { font-size:18px; }
    .pop-head span { color:#94a3b8; font-size:13px; }
    .pop-head button { width:42px; height:42px; border-radius:12px; border:1px solid #1e293b; background:#0f172a; color:#cbd5e1; }
    .status { margin-top:22px; display:flex; gap:10px; align-items:center; color:#cbd5e1; }
    .status i { width:10px; height:10px; border-radius:999px; background:#22c55e; box-shadow:0 0 0 5px rgba(34,197,94,.14); }
    .translate { margin-top:18px; width:100%; height:52px; border:0; border-radius:14px; background:#22c55e; color:#03110a; font-weight:900; font-size:17px; }
    .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:16px 0; }
    .stats div,.field,.seg { background:#0f172a; border:1px solid #1e293b; border-radius:14px; padding:14px; }
    .stats b { display:block; font-size:22px; color:#86efac; }.stats span,.field span { color:#94a3b8; font-size:12px; }
    .field { display:flex; justify-content:space-between; margin-bottom:12px; }
    .seg { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:8px; }
    .seg button { border:0; border-radius:10px; padding:12px; background:transparent; color:#94a3b8; font-weight:800; }
    .seg button.active { background:#1e293b; color:white; }
    .callouts { display:grid; gap:18px; }
    .callouts .card { padding:28px; }
    .callouts b { font-size:28px; }.callouts p { color:#64748b; font-size:18px; line-height:1.6; }`
  );
}

async function render(browser, name, html) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  await page.goto(writeDemo(name, html));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  await page.close();
}

async function main() {
  ensureOut();
  const browser = await chromium.launch({ headless: true });
  try {
    await render(browser, 'page-translation', pageTranslationDemo());
    await render(browser, 'reader', readerDemo());
    await render(browser, 'subtitles', subtitleDemo());
    await render(browser, 'popup', popupDemo());
    fs.copyFileSync(path.join(OUT, 'page-translation.png'), path.join(OUT, 'options.png'));
    for (const file of fs.readdirSync(OUT)) {
      if (file.endsWith('.html')) fs.rmSync(path.join(OUT, file), { force: true });
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
