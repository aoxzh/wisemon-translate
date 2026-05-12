# Wisemon

<div align="center">

**AI 双语网页翻译扩展 · 直连大模型 · 隐私优先**  
**AI Bilingual Web Translator · Direct LLM Connection · Privacy First**

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](./manifest.json)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](./manifest.json)
[![Firefox](https://img.shields.io/badge/Firefox-MV3-FF7139?logo=firefoxbrowser&logoColor=white)](./manifest-firefox.json)

English | [中文](#中文)

</div>

---

> **All translation requests are sent directly from your browser to the API endpoint you configure. No intermediate servers. No telemetry.**

Wisemon is a free, open-source browser extension for high-quality bilingual web page translation. Bring your own API key and connect directly to DeepSeek, OpenAI, Anthropic, Google, or any OpenAI-compatible LLM — including local models via Ollama.

## Features

- **Privacy First** — Your API key and all data are stored only in browser local storage (`chrome.storage`). Zero backend. Zero tracking.
- **Bilingual & Replace Modes** — Show translation below original text, or fully replace it. Toggle instantly without reload.
- **14+ Providers** — DeepSeek V4, OpenAI, Anthropic Claude, Google Gemini, OpenRouter, Qwen, SiliconFlow, Zhipu GLM, Ollama (local), DeepL, Baidu, Microsoft Translator, Google Free Translate, and custom OpenAI-compatible APIs.
- **Smart Batching & Concurrency** — Auto-splits page content, translates in parallel with configurable concurrency. Long texts are auto-split further for stability.
- **Sensitive Data Masking** — Auto-masks emails, phones, credit cards, verification codes, private keys, and URLs before sending to LLM; restores them after translation.
- **Site-Specific Rules** — Built-in rules for Amazon, Binance, GitHub, MDN, Vue/VitePress, YouTube, and more. Skips prices, trading panels, and code blocks automatically.
- **Side Panel Reader** — Paste long text, extract page content, or import TXT / HTML / PDF. Translate in segments, resume interrupted work, and export to TXT / HTML / Markdown.
- **Video Subtitle Translation (Beta)** — YouTube bilingual subtitle overlay with VTT export. Based on internal `timedtext` API interception; stability depends on YouTube interface changes.
- **OCR Image Translation (Beta)** — Recognize text in images via Tesseract.js v5 (loaded from jsDelivr CDN at runtime). First use requires network download of language models (~10MB+).
- **24 Translation Themes** — None, underline, card, highlight, blur reveal (learning mode), and more.
- **Glossary** — Three levels: regex replacements, structured terms, and AI context terms.
- **Real-Time Logs** — Built-in diagnostic panel for API requests, errors, and performance metrics.
- **Dark Mode** — Auto / manual dark mode for popup, options, and translated content.
- **Keyboard Shortcuts** — `Alt+T` translate page, `Alt+H` toggle hover, `Alt+R` toggle bilingual/replace mode.

## Quick Start

### Chrome

1. Download or clone this repository.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Click the extension icon → **Settings** → enter your API Key → **Save** → **Test Connection**.
5. Press `Alt + T` on any page to translate.

### Firefox

1. Rename `manifest-firefox.json` to `manifest.json` (overwrite).
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
3. Select `manifest.json`.
4. Configure API Key as above.

### Recommended Defaults (DeepSeek V4 Flash)

> **Current versions are deeply optimized for DeepSeek V4** (Flash & Pro). Other providers (OpenAI, Anthropic, etc.) are supported but have not received the same level of tuning for batching, token limits, and error handling. For the best experience and lowest cost, **DeepSeek V4 Flash is strongly recommended**.

| Parameter | Default | Note |
|-----------|---------|------|
| Model | `deepseek-v4-flash` | Fast and cost-effective for batch page translation |
| Temperature | `0` | Stable output |
| Thinking mode | `disabled` | Lower overhead |
| Max chars/request | `12000` | Auto-split for long texts |
| Concurrency | `6` | Balances speed and rate limits |
| Streaming | `disabled` | Non-streaming is more stable |

#### Cost Estimate (DeepSeek V4 Flash)

Based on [DeepSeek official pricing](https://api-docs.deepseek.com/quick_start/pricing) (as of 2026-05):

| Usage | Tokens | Cost (RMB) |
|-------|--------|------------|
| Input | ¥0.5 / 1M tokens | ~¥0.0005 per 1,000 chars |
| Output | ¥2 / 1M tokens | ~¥0.002 per 1,000 chars |

**Example — daily web browsing:**

- A typical blog / news page ≈ 3,000 Chinese characters
- One page ≈ 3,000 input tokens + 3,000 output tokens
- Cost per page ≈ **¥0.0075** (less than 1 cent)
- **20 pages/day ≈ ¥0.15/day ≈ ¥4.5/month**

**Example — heavy documentation reading:**

- A long technical doc ≈ 10,000 characters
- Cost per page ≈ **¥0.025**
- **10 pages/day ≈ ¥0.25/day ≈ ¥7.5/month**

> These are rough estimates. Actual usage depends on page length, target language, and retry rate. For reference, DeepSeek V4 Pro is roughly 4× more expensive than Flash.

## Development

```bash
# Validate code and resource references
npm run validate

# Run smoke tests
npx playwright test tests/extension.spec.js

# Package extension
npm run package
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Extension API | Chrome Manifest V3 / Firefox MV3 |
| Content Script | Vanilla JS, modular architecture |
| UI | Vanilla JS + CSS Custom Properties (Design Tokens) |
| PDF Support | PDF.js |
| OCR | Tesseract.js v5 (runtime CDN) |
| Testing | Playwright |

## Project Structure

```
wisemon-translate/
├── manifest.json                    # Chrome Manifest V3
├── manifest-firefox.json            # Firefox Manifest V3
├── background.js                    # Service worker
├── content_guard.js                 # Lightweight guard (injects main runtime on demand)
├── content_style.css                # Design tokens & base styles
├── popup.html / popup.css / popup.js
├── options.html / options.css / options.js
├── sidepanel.html / sidepanel.css / sidepanel.js
├── src/
│   ├── content/                     # Page translation engine
│   │   ├── content-main.js
│   │   ├── content-core.js
│   │   ├── content-hover.js
│   │   ├── content-selection.js
│   │   ├── content-input.js
│   │   ├── content-subtitle.js      # YouTube subtitle (Beta)
│   │   ├── content-ocr.js           # Tesseract.js OCR (Beta)
│   │   ├── content-fab.js
│   │   ├── content-ui.js
│   │   ├── content-glossary.js
│   │   ├── content-shortcuts.js
│   │   ├── content-observers.js
│   │   └── inline-styles.css
│   ├── injectors/
│   │   ├── shadowroot-patcher.js
│   │   └── youtube-subtitle-injector.js
│   └── lib/
│       ├── llm-api.js               # OpenAI-compatible API core & batching
│       ├── providers.js             # Provider presets
│       ├── providers/               # Adapters: Google, DeepL, Baidu, Microsoft
│       ├── utils.js                 # Storage, cache, defaults, masking
│       ├── batch-queue.js           # Batched translation queue
│       ├── site-rules.js            # Built-in & custom site rules
│       ├── logger.js                # Diagnostics bridge
│       ├── i18n.js                  # Multi-language UI
│       └── i18n-locales/            # Localization files
├── vendor/pdfjs/                    # PDF.js for side-panel import
└── tests/                           # Playwright smoke tests
```

## Privacy & Security

- All translation requests are sent **directly from your browser** to the API endpoint you configure. **No intermediate servers.**
- Your API key is stored in the browser's `chrome.storage.local / sync` only. Never written to extension files. Never uploaded.
- Sensitive data masking is supported: emails, phone numbers, credit cards, verification codes, private keys, and URLs are automatically masked before being sent to the LLM, then restored after translation.
- This project contains **zero tracking, zero analytics, and zero backend services**.

## License

[MIT](./LICENSE)

---

<div align="center">

**If you find this project useful, please give it a star!**

</div>

---

## 中文

<div align="center">

**AI 双语网页翻译扩展 · 直连大模型 · 隐私优先**

</div>

> **所有翻译请求均从你的浏览器直接发送到配置的 API 端点。无中间服务器。无追踪上报。**

Wisemon 是一款免费开源的浏览器扩展，基于大语言模型实现高质量双语网页翻译。自备 API Key，即可在浏览器内直连 DeepSeek、OpenAI、Anthropic、Google 等 14+ 家翻译服务，也支持通过 Ollama 调用本地模型。

### 功能特性

- **隐私优先** — API Key 与全部翻译数据仅保存在浏览器本地存储（`chrome.storage`），无后端、无追踪。
- **双语对照 / 仅译文** — 支持在原文下方插入译文，或完全替换为译文，一键切换，无需刷新。
- **14+ 提供商** — DeepSeek V4、OpenAI、Anthropic Claude、Google Gemini、OpenRouter、通义千问、SiliconFlow、智谱 GLM、Ollama 本地模型、DeepL、百度翻译、微软翻译、Google 免费翻译，以及任意 OpenAI 兼容 API。
- **智能批量并发** — 自动将页面内容分块，支持并行翻译（并发数可配置），超长文本自动二次切分。
- **敏感信息脱敏** — 在发送给 LLM 前自动掩码邮箱、手机号、银行卡号、验证码、私钥、URL 等，翻译后自动还原。
- **站点智能规则** — 内置 Amazon、Binance、GitHub、MDN、Vue/VitePress、YouTube 等站点规则，自动识别正文区、跳过价格/交易/代码块。
- **侧边栏阅读器** — 支持粘贴长文、提取网页正文、导入 TXT / HTML / PDF，分段翻译、断点续翻，导出 TXT / HTML / Markdown。
- **视频字幕翻译（Beta）** — YouTube 双语字幕实时叠加，支持 VTT 导出。基于 YouTube 内部 `timedtext` API 拦截实现，稳定性取决于 YouTube 接口变更。
- **OCR 图片翻译（Beta）** — 基于 Tesseract.js v5 识别图片文字后翻译。Tesseract.js 在运行时从 jsDelivr CDN 加载，首次使用需联网下载语言模型（约 10MB+）。
- **24 种翻译主题** — 无样式、下划线、卡片、高亮、模糊学习模式（Blur Reveal）等。
- **术语表** — 正则替换、结构化术语、AI Context 术语三级自定义。
- **实时日志** — 内置诊断面板，查看 API 请求、错误详情与性能数据。
- **深色模式** — Popup、设置页、翻译内容均支持自动/手动深色模式。
- **快捷键** — `Alt+T` 翻译页面，`Alt+H` 开关悬停翻译，`Alt+R` 切换双语/仅译文模式。

### 快速开始

#### Chrome

1. 下载或克隆本仓库。
2. 打开 `chrome://extensions/`，开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目文件夹。
4. 点击扩展图标 → 「设置」→ 填入 API Key → 「保存」→ 「测试连接」。
5. 在任意网页按 `Alt + T` 开始翻译。

#### Firefox

1. 将 `manifest-firefox.json` 重命名为 `manifest.json`（覆盖原文件）。
2. 打开 `about:debugging` → 「此 Firefox」→ 「临时加载附加组件」。
3. 选择 `manifest.json`。
4. 按上述步骤配置 API Key。

#### 推荐默认配置（DeepSeek V4 Flash）

> **当前版本针对 DeepSeek V4（Flash / Pro）做了深度优化**（批量处理、token 上限、thinking mode、JSON response format 等）。其他提供商（OpenAI、Anthropic 等）虽然可用，但尚未做同等程度的适配。为了获得最佳体验和最低成本，**强烈建议使用 DeepSeek V4 Flash**。

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 模型 | `deepseek-v4-flash` | 速度快、成本低，适合网页批量翻译 |
| 温度 | `0` | 输出更稳定 |
| 思考模式 | `disabled` | 减少额外开销 |
| 单请求上限 | `12000` 字符 | 长文本自动二次切分 |
| 并发数 | `6` | 平衡速度与限流风险 |
| 流式输出 | `关闭` | 非流式稳定性更高 |

##### 成本估算（DeepSeek V4 Flash）

基于 [DeepSeek 官方定价](https://api-docs.deepseek.com/quick_start/pricing)（截至 2026-05）：

| 计费项 | 价格 |
|--------|------|
| 输入 | ¥0.5 / 百万 tokens |
| 输出 | ¥2 / 百万 tokens |

**日常浏览估算：**

- 一篇普通博客/新闻 ≈ 3,000 中文字符
- 单次翻译 ≈ 3,000 输入 tokens + 3,000 输出 tokens
- 单页成本 ≈ **¥0.0075**（不到 1 分钱）
- **每天 20 页 ≈ ¥0.15/天 ≈ ¥4.5/月**

**重度文档阅读估算：**

- 一篇长技术文档 ≈ 10,000 字符
- 单页成本 ≈ **¥0.025**
- **每天 10 页 ≈ ¥0.25/天 ≈ ¥7.5/月**

> 以上为粗略估算，实际费用取决于页面长度、目标语言和重试次数。仅供参考，DeepSeek V4 Pro 价格约为 Flash 的 4 倍。

### 开发

```bash
# 验证代码与资源引用
npm run validate

# 运行冒烟测试
npx playwright test tests/extension.spec.js

# 打包扩展
npm run package
```

### 技术栈

| 组件 | 技术 |
|------|------|
| 扩展 API | Chrome Manifest V3 / Firefox MV3 |
| 内容脚本 | Vanilla JS，模块化架构 |
| 界面 | Vanilla JS + CSS Custom Properties（设计令牌） |
| PDF 支持 | PDF.js |
| OCR | Tesseract.js v5（运行时 CDN 加载） |
| 测试 | Playwright |

### 项目结构

```
wisemon-translate/
├── manifest.json                    # Chrome Manifest V3
├── manifest-firefox.json            # Firefox Manifest V3
├── background.js                    # Service Worker
├── content_guard.js                 # 轻量级守卫脚本（按需注入主运行时）
├── content_style.css                # 设计令牌与基础样式
├── popup.html / popup.css / popup.js
├── options.html / options.css / options.js
├── sidepanel.html / sidepanel.css / sidepanel.js
├── src/
│   ├── content/                     # 页面翻译引擎
│   │   ├── content-main.js
│   │   ├── content-core.js
│   │   ├── content-hover.js
│   │   ├── content-selection.js
│   │   ├── content-input.js
│   │   ├── content-subtitle.js      # YouTube 字幕（Beta）
│   │   ├── content-ocr.js           # Tesseract.js OCR（Beta）
│   │   ├── content-fab.js
│   │   ├── content-ui.js
│   │   ├── content-glossary.js
│   │   ├── content-shortcuts.js
│   │   ├── content-observers.js
│   │   └── inline-styles.css
│   ├── injectors/
│   │   ├── shadowroot-patcher.js
│   │   └── youtube-subtitle-injector.js
│   └── lib/
│       ├── llm-api.js               # OpenAI 兼容 API 核心与批量逻辑
│       ├── providers.js             # 提供商预设
│       ├── providers/               # 适配脚本：Google、DeepL、百度、微软
│       ├── utils.js                 # 存储、缓存、默认值、脱敏
│       ├── batch-queue.js           # 批量翻译队列
│       ├── site-rules.js            # 内置与自定义站点规则
│       ├── logger.js                # 诊断日志桥接
│       ├── i18n.js                  # 多语言界面
│       └── i18n-locales/            # 本地化文件
├── vendor/pdfjs/                    # 侧边栏 PDF 导入
└── tests/                           # Playwright 冒烟测试
```

### 隐私与安全

- 所有翻译请求均从你的浏览器**直接发送**到配置的 API 端点，**不经过任何中间服务器**。
- API Key 仅保存在浏览器的 `chrome.storage.local / sync` 中，不会写入扩展文件，也不会上传云端。
- 支持敏感数据脱敏：邮箱、手机号、银行卡、验证码、私钥、URL 等在发送至 LLM 前自动掩码，翻译后自动还原。
- 本项目**无追踪代码、无分析上报、无后端服务**。

### 开源协议

[MIT](./LICENSE)

---

<div align="center">

**如果这个项目对你有帮助，请点亮 Star！**

</div>
