# wisemon-translate

<div align="center">
  <img src="./icons/icon128.png" width="96" height="96" alt="wisemon-translate icon">
  <p><strong>Private bilingual translation for web pages, long text, PDFs, and YouTube subtitles.</strong></p>
  <p>
    <a href="./manifest.json"><img alt="Version" src="https://img.shields.io/badge/version-1.0.2-blue"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green"></a>
    <a href="./manifest.json"><img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white"></a>
    <a href="./manifest-firefox.json"><img alt="Firefox MV3" src="https://img.shields.io/badge/Firefox-MV3-FF7139?logo=firefoxbrowser&logoColor=white"></a>
  </p>
  <p><a href="#english">English</a> | <a href="#中文">中文</a></p>
</div>

![wisemon-translate settings](./assets/screenshots/options.png)

## English

wisemon-translate is an open-source browser extension for bilingual reading. It sends translation requests directly from your browser to the provider you configure. There is no relay server, no telemetry, and no bundled tracking.

### Highlights

- Page translation with bilingual and translation-only display modes.
- Side panel reader for pasted long text, TXT / HTML / PDF import, resumable segment translation, and HTML / Markdown export.
- YouTube subtitle translation overlay with VTT export.
- Bring your own provider: DeepSeek, OpenAI, Anthropic, Gemini, OpenRouter, Ollama, DeepL, Baidu, Microsoft Translator, Google free translate, or any OpenAI-compatible endpoint.
- Privacy masking for emails, phone numbers, card numbers, verification codes, private keys, and URLs before requests are sent.
- Local-only settings, cache, and logs.

### Screenshots

| Popup | Reader |
|---|---|
| ![Popup controls](./assets/screenshots/popup.png) | ![Long text reader](./assets/screenshots/reader.png) |

| Web page translation | Subtitle overlay |
|---|---|
| ![Bilingual page translation](./assets/screenshots/page-translation.png) | ![YouTube subtitle translation](./assets/screenshots/subtitles.png) |

### Install

Chrome:

1. Download the latest zip from [Releases](https://github.com/aoxzh/wisemon-translate/releases).
2. Unzip it.
3. Open `chrome://extensions/`.
4. Enable Developer mode.
5. Click Load unpacked and select the unzipped folder.

Firefox temporary install:

1. Copy `manifest-firefox.json` to `manifest.json`.
2. Open `about:debugging`.
3. Choose This Firefox, then Load Temporary Add-on.
4. Select `manifest.json`.

### Recommended Setup

DeepSeek V4 Flash is the recommended default for low-cost, high-throughput translation.

| Setting | Recommended value |
|---|---|
| Model | `deepseek-v4-flash` |
| Temperature | `0` |
| Thinking mode | `disabled` |
| Max chars/request | `12000` to `16000` |
| Concurrency | `4` to `6` |
| Streaming | `disabled` |

### Privacy And Review Notes

- API keys are stored in browser extension storage.
- Translation requests go directly to your configured endpoint.
- v1 does not load remote JavaScript at runtime.
- OCR/image translation is intentionally deferred until the OCR engine, workers, WASM, and models can be packaged locally for extension-store review.

### Development

```bash
npm install
npm run validate
npx playwright test tests/extension.spec.js
npm run icons
npm run screenshots
npm run package
```

The packaged extension is written to `dist/wisemon-translate-v<version>.zip`.

## 中文

wisemon-translate 是一个开源浏览器扩展，面向网页、长文、PDF 和视频字幕的双语阅读。所有翻译请求都由浏览器直接发送到你配置的服务商，不经过中转服务器，没有遥测，也没有追踪代码。

### 主要特点

- 网页双语对照翻译，也可以切换成仅译文模式。
- 侧边栏阅读器支持粘贴长文、导入 TXT / HTML / PDF、分段翻译、断点续翻，以及导出 HTML / Markdown。
- YouTube 字幕双语覆盖层，并支持导出 VTT。
- 自带服务商配置：DeepSeek、OpenAI、Anthropic、Gemini、OpenRouter、Ollama、DeepL、百度、微软、Google 免费翻译，以及任意 OpenAI 兼容接口。
- 请求前可自动掩码邮箱、手机号、银行卡号、验证码、私钥、URL 等敏感信息。
- 设置、缓存和日志都保存在本地浏览器里。

### 截图

| 弹窗控制 | 长文阅读器 |
|---|---|
| ![弹窗控制](./assets/screenshots/popup.png) | ![长文阅读器](./assets/screenshots/reader.png) |

| 网页双语翻译 | 字幕翻译 |
|---|---|
| ![网页双语翻译](./assets/screenshots/page-translation.png) | ![字幕翻译](./assets/screenshots/subtitles.png) |

### 安装

Chrome:

1. 从 [Releases](https://github.com/aoxzh/wisemon-translate/releases) 下载最新版 zip。
2. 解压。
3. 打开 `chrome://extensions/`。
4. 开启开发者模式。
5. 点击“加载已解压的扩展程序”，选择解压后的文件夹。

Firefox 临时安装:

1. 将 `manifest-firefox.json` 复制为 `manifest.json`。
2. 打开 `about:debugging`。
3. 选择“此 Firefox”，然后点击“临时载入附加组件”。
4. 选择 `manifest.json`。

### 推荐配置

DeepSeek V4 Flash 是当前推荐默认模型，适合低成本、高并发的网页翻译。

| 设置 | 推荐值 |
|---|---|
| 模型 | `deepseek-v4-flash` |
| 温度 | `0` |
| 思考模式 | `disabled` |
| 单次请求长度 | `12000` 到 `16000` |
| 并发数 | `4` 到 `6` |
| 流式输出 | `disabled` |

### 隐私与审核说明

- API Key 保存在浏览器扩展存储中。
- 翻译请求直接发送到你配置的接口。
- v1 不会在运行时加载远程 JavaScript。
- OCR / 图片翻译已暂缓，之后只有在 OCR 引擎、Worker、WASM 和模型都能本地打包后才会恢复。

### 开发

```bash
npm install
npm run validate
npx playwright test tests/extension.spec.js
npm run icons
npm run screenshots
npm run package
```

打包产物会生成到 `dist/wisemon-translate-v<version>.zip`。
