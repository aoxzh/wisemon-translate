# wisemon-translate 现代化路线图

> 本路线图基于专家代码审查、Chrome 扩展 2026 最佳实践及 Read Frog 等现代扩展架构对比整理。当前已完成的 P0/P1 修复与性能/安全项见 `git log` / 变更摘要；本文件记录需要分阶段推进的架构级改进。

## 已落地（本轮）

- **Critical / High 缺陷**
  - `content-language.js` 不存在引用清理（manifest、background、validate）
  - Google provider `AbortController` 重试复用问题
  - LLM API fallback `AbortController` 复用问题
  - LLM 返回内容 `innerHTML` 插入改为 `textContent`
  - 流式翻译未收到任何数据时断开按错误处理
  - `storage.local` 写入失败静默吞错，增加 quota exceeded 降级清理
  - 双语/仅译文切换时 compact UI 跳过元素未重新翻译
  - Hover 翻译竞态/abort 后 DOM 未清理
  - 划词弹窗拖拽监听器内存泄漏
  - Options 主题广播改为仅当前活动 tab，减少错误噪音

- **安全**
  - API Key 请求日志从“前 20 字符 + ...”改为完全脱敏 `[REDACTED]`
  - 移除 `privacy.html` 与已不存在的 `content-language.js` 的 `web_accessible_resources` 暴露

- **性能**
  - `restoreOriginal()` 移除重复 `querySelectorAll([data-llm-done])` 并调用 `stopObservers()`
  - `getTranslationCacheStats()` 取消 `JSON.stringify` 全量序列化，改为按 key/text 估算
  - 多段合并翻译（`translateBatch` / `translateMultiText`）已落地，可显著降低 BYOK 用户的 API 调用次数

- **体验**
  - 扩展图标 badge 显示翻译进度 / 错误状态
  - 自定义 select 键盘可访问性完整化
  - `prefers-contrast`、`prefers-reduced-motion` 全页面覆盖
  - 输入框/文本域统一 `caret-color`、options 面板容器查询
  - 上下文感知翻译：自动提取页面标题 + 文章摘要作为 LLM 上下文，改善术语与风格一致性
  - Provider 连接健康检查：Test Connection 现在对所有 OpenAI-compatible 服务商探测 `/v1/models`，并校验模型是否在列表中

---

## 下一优先级说明

基于竞品调研（Read Frog、Immersive Translate、Trancy、Language Reactor）和本项目"开源免费 + BYOK DeepSeek"的定位，**暂缓 WXT/TypeScript/Tailwind 大迁移**。当前原生 JS 架构已稳定且刚修复完 P0/P1，立即重写会引入大量回归并阻塞真正给用户带来价值的功能。优先在现有架构内落地高 ROI 功能，待功能集稳定后再评估架构迁移。

---

## Phase 2 — 差异化能力（预计 3-5 周）

目标：做出闭源竞品收费或不做的高级功能，提升 BYOK 用户留存。

### 2.1 Custom AI Actions（自定义 AI 动作）

- 设置中新增 **AI Actions** 面板
- 数据模型：`{ id, name, icon, prompt, outputMode: 'replace'|'panel', temperature? }`
- 在 `content-selection.js` popup 顶部增加 action 按钮行
- 内置模板：解释、润色、简化中文、总结、提取术语
- 新增消息类型 `run-action`，复用现有 LLM 请求逻辑

### 2.2 文本朗读 TTS

- 使用浏览器原生 `speechSynthesis`（零成本、无额外权限）
- 在 selection popup 和 sidepanel 增加 🔊 按钮
- 设置中可选语言/语速/音色（voice mapping）

### 2.3 快速术语收藏（Vocabulary Bank 初版）

- 新增 `chrome.storage.local` key `llm-vocab-v1`
- 划词 popup 增加 ⭐ 收藏按钮
- Options 增加 **Vocabulary** 面板：列表、搜索、删除、导出 CSV/Anki

---

## Phase 3 — 字幕与规则生态（预计 3-5 周）

### 3.1 多平台字幕

- 在 `src/injectors/` 增加 Netflix / Bilibili 注入器
- 复用 `content-subtitle.js` 的 overlay 与缓存逻辑
- 抽象平台无关的 subtitle adapter 接口

### 3.2 规则订阅系统

- 把 `src/lib/site-rules.js` 的 `BUILT_IN_SITE_RULES` 改为可合并远程订阅
- 设置中增加 "规则订阅 URL"，定期拉取更新
- 提供 JSON Schema 校验与社区规则仓库模板

### 3.3 敏感数据脱敏强化

- 更精确的正则（IBAN、IPv4/IPv6、JWT、AWS key）
- 提供“脱敏预览”开关
- 对日志中的原文也做一致脱敏

---

## Phase 4 — 架构现代化（后续按需启动）

### 4.1 迁移到 WXT + TypeScript

**目标**：解决无构建项目在多平台 manifest、HMR、类型安全上的长期债务。

**步骤**：
1. 初始化 `wxt.config.ts`，保留 MV3 主目标
2. 将 `src/lib/*.js`、`src/content/**/*.js`、`background.js`、`popup.js`、`options.js`、`sidepanel.js` 逐步重命名为 `.ts`
3. 引入最小类型层（`Settings`、`Message`、`Provider`）
4. 用 WXT 自动生成 manifest，处理 Firefox 差异
5. 迁移 `importScripts` 为 ES Module `import`

### 4.2 UI 体系：Tailwind CSS + shadcn/ui

- 配置 Tailwind 4 + `@tailwindcss/vite`
- 将现有 CSS token 映射到 Tailwind 主题
- 用 shadcn/ui 基础组件替换手写控件

### 4.3 存储：IndexedDB + Dexie

- 引入 `dexie`
- 创建 `TranslationCache` 与 `WordBank` 表
- 解决 `chrome.storage.local` 10MB 配额问题

### 4.4 测试与 CI

- Vitest 替换/补充当前验证脚本
- Playwright 测试使用 Chrome 稳定通道 + headless=new
- GitHub Actions 自动打包 Chrome / Firefox / Edge 三个商店 zip
- oxlint + Prettier 统一代码风格

---

## 明确不做

- **OCR / 图片翻译**：需要 WASM/模型打包，商店审核风险大，README 已说明暂缓
- **Safari / iOS Userscript**：需要独立打包和测试，优先级低于核心能力

---

## 实施建议

1. **价值优先于架构**：在功能未稳定前不要启动 WXT/TS 重写，避免高回归成本。
2. **每个 Phase 独立可发布**：每个阶段完成后应能独立发版，并附带明确的 BYOK 用户收益说明。
3. **先写回归测试**：在大型迁移前为关键路径（页面翻译、划词、hover、options 保存）补充 Playwright 用例。
4. **分版本发布**：
   - v1.1：P0/P1 修复 + 安全/性能 + 上下文感知翻译 + Provider 健康检查
   - v1.2：Custom AI Actions + TTS + Vocabulary Bank
   - v1.3：多平台字幕 + 规则订阅 + 脱敏强化
   - v1.4：WXT/TS 迁移 + IndexedDB + Tailwind（功能稳定后启动）
