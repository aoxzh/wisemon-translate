#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src/lib/i18n.js.legacy-source'), 'utf8');
const sandbox = { module: { exports: {} }, exports: {}, globalThis: {} };
vm.runInNewContext(src + '\nmodule.exports = { MESSAGES, COMMON_LANGS };', sandbox, { filename: 'i18n.js.legacy-source' });

const { MESSAGES, COMMON_LANGS } = sandbox.module.exports;

Object.assign(MESSAGES, {
  lang_switch_toggle: { en: 'Switch language', 'zh-CN': '切换语言', ja: '言語を切り替え', ko: '언어 전환', de: 'Sprache wechseln', fr: 'Changer de langue', es: 'Cambiar idioma' },
  label_engine: { en: 'Engine', 'zh-CN': '引擎', ja: 'エンジン', ko: '엔진', de: 'Engine', fr: 'Moteur', es: 'Motor' },
  label_mode: { en: 'Mode', 'zh-CN': '模式', ja: 'モード', ko: '모드', de: 'Modus', fr: 'Mode', es: 'Modo' },
  label_health: { en: 'Health', 'zh-CN': '状态', ja: '状態', ko: '상태', de: 'Status', fr: 'État', es: 'Estado' },
  label_logs: { en: 'Logs', 'zh-CN': '日志', ja: 'ログ', ko: '로그', de: 'Logs', fr: 'Journaux', es: 'Registros' },
  label_panel: { en: 'Panel', 'zh-CN': '面板', ja: 'パネル', ko: '패널', de: 'Panel', fr: 'Panneau', es: 'Panel' },
  hover_on: { en: 'Hover On', 'zh-CN': '悬浮开启', ja: 'ホバーON', ko: '호버 켜짐', de: 'Hover an', fr: 'Survol actif', es: 'Flotante activo' },
  hover_off_short: { en: 'Hover', 'zh-CN': '悬浮', ja: 'ホバー', ko: '호버', de: 'Hover', fr: 'Survol', es: 'Flotante' },
  provider_health_untested: { en: 'Untested', 'zh-CN': '未测试', ja: '未テスト', ko: '미테스트', de: 'Ungetestet', fr: 'Non testé', es: 'Sin probar' },
  provider_health_error: { en: 'Error', 'zh-CN': '错误', ja: 'エラー', ko: '오류', de: 'Fehler', fr: 'Erreur', es: 'Error' },
  provider_health_unknown: { en: 'Unknown', 'zh-CN': '未知', ja: '不明', ko: '알 수 없음', de: 'Unbekannt', fr: 'Inconnu', es: 'Desconocido' },
  provider_health_ok: { en: 'Healthy', 'zh-CN': '正常', ja: '正常', ko: '정상', de: 'Normal', fr: 'Sain', es: 'Correcto' },
  api_key_missing_title: { en: 'API key not configured', 'zh-CN': 'API Key 未配置', ja: 'APIキーが未設定です', ko: 'API 키가 설정되지 않았습니다', de: 'API-Schlüssel nicht konfiguriert', fr: 'Clé API non configurée', es: 'Clave API no configurada' },
  ui_theme_label: { en: 'Interface Theme', 'zh-CN': '界面主题', ja: 'UIテーマ', ko: '인터페이스 테마', de: 'Oberflächenthema', fr: 'Thème de l’interface', es: 'Tema de la interfaz' },
  ui_theme_auto: { en: 'Follow System', 'zh-CN': '跟随系统', ja: 'システムに従う', ko: '시스템 설정 따름', de: 'System folgen', fr: 'Suivre le système', es: 'Seguir el sistema' },
  ui_theme_light: { en: 'Light', 'zh-CN': '浅色', ja: 'ライト', ko: '라이트', de: 'Hell', fr: 'Clair', es: 'Claro' },
  ui_theme_dark: { en: 'Dark', 'zh-CN': '深色', ja: 'ダーク', ko: '다크', de: 'Dunkel', fr: 'Sombre', es: 'Oscuro' },
  custom_css_label: { en: 'Custom Translation CSS', 'zh-CN': '自定义翻译 CSS', ja: 'カスタム翻訳 CSS', ko: '사용자 정의 번역 CSS', de: 'Benutzerdefiniertes Übersetzungs-CSS', fr: 'CSS de traduction personnalisé', es: 'CSS de traducción personalizado' },
  custom_css_hint: { en: 'Applied to page translations. Use .llm-translate-inner, .llm-translate-block-wrapper, and .llm-translate-inline-wrapper.', 'zh-CN': '应用于页面翻译。可使用 .llm-translate-inner、.llm-translate-block-wrapper 和 .llm-translate-inline-wrapper。', ja: 'ページ翻訳に適用されます。.llm-translate-inner、.llm-translate-block-wrapper、.llm-translate-inline-wrapper を使用できます。', ko: '페이지 번역에 적용됩니다. .llm-translate-inner, .llm-translate-block-wrapper, .llm-translate-inline-wrapper 를 사용하세요.', de: 'Wird auf Seitenübersetzungen angewendet. Verwenden Sie .llm-translate-inner, .llm-translate-block-wrapper und .llm-translate-inline-wrapper.', fr: 'Appliqué aux traductions de page. Utilisez .llm-translate-inner, .llm-translate-block-wrapper et .llm-translate-inline-wrapper.', es: 'Se aplica a las traducciones de página. Use .llm-translate-inner, .llm-translate-block-wrapper y .llm-translate-inline-wrapper.' },
  sidepanel_title: { en: 'Translate', 'zh-CN': '翻译', ja: '翻訳', ko: '번역', de: 'Übersetzen', fr: 'Traduire', es: 'Traducir' },
  sidepanel_subtitle: { en: 'Long text workspace', 'zh-CN': '长文本工作区', ja: '長文ワークスペース', ko: '긴 텍스트 작업 공간', de: 'Arbeitsbereich für lange Texte', fr: 'Espace de travail pour longs textes', es: 'Espacio de trabajo para textos largos' },
  sidepanel_source_label: { en: 'Source text', 'zh-CN': '原文', ja: '原文', ko: '원문', de: 'Quelltext', fr: 'Texte source', es: 'Texto de origen' },
  sidepanel_source_placeholder: { en: 'Paste text to translate...', 'zh-CN': '粘贴要翻译的文本...', ja: '翻訳するテキストを貼り付け...', ko: '번역할 텍스트를 붙여넣으세요...', de: 'Zu übersetzenden Text einfügen...', fr: 'Collez le texte à traduire...', es: 'Pegue el texto a traducir...' },
  sidepanel_result_label: { en: 'Result', 'zh-CN': '结果', ja: '結果', ko: '결과', de: 'Ergebnis', fr: 'Résultat', es: 'Resultado' },
  sidepanel_history_label: { en: 'History', 'zh-CN': '历史记录', ja: '履歴', ko: '기록', de: 'Verlauf', fr: 'Historique', es: 'Historial' },
  sidepanel_no_result: { en: 'No result yet.', 'zh-CN': '暂无结果。', ja: 'まだ結果はありません。', ko: '아직 결과가 없습니다.', de: 'Noch kein Ergebnis.', fr: 'Aucun résultat pour l’instant.', es: 'Aún no hay resultado.' },
  sidepanel_no_history: { en: 'No history yet.', 'zh-CN': '暂无历史记录。', ja: '履歴はまだありません。', ko: '아직 기록이 없습니다.', de: 'Noch kein Verlauf.', fr: 'Aucun historique pour l’instant.', es: 'Aún no hay historial.' },
  sidepanel_translating: { en: 'Translating...', 'zh-CN': '正在翻译...', ja: '翻訳中...', ko: '번역 중...', de: 'Übersetze...', fr: 'Traduction en cours...', es: 'Traduciendo...' },
  sidepanel_failed_prefix: { en: 'Failed: ', 'zh-CN': '失败：', ja: '失敗: ', ko: '실패: ', de: 'Fehlgeschlagen: ', fr: 'Échec : ', es: 'Falló: ' },
  action_copy: { en: 'Copy', 'zh-CN': '复制', ja: 'コピー', ko: '복사', de: 'Kopieren', fr: 'Copier', es: 'Copiar' },
  action_clear: { en: 'Clear', 'zh-CN': '清空', ja: 'クリア', ko: '지우기', de: 'Leeren', fr: 'Effacer', es: 'Borrar' },
  action_use_selection: { en: 'Use Selection', 'zh-CN': '使用选中文本', ja: '選択テキストを使用', ko: '선택한 텍스트 사용', de: 'Auswahl verwenden', fr: 'Utiliser la sélection', es: 'Usar selección' },
  action_use_page: { en: 'Use Page Text', 'zh-CN': '使用页面文本', ja: 'ページ本文を使用', ko: '페이지 텍스트 사용', de: 'Seitentext verwenden', fr: 'Utiliser le texte de la page', es: 'Usar texto de la página' },
  action_clear_history: { en: 'Clear History', 'zh-CN': '清空历史', ja: '履歴をクリア', ko: '기록 지우기', de: 'Verlauf löschen', fr: 'Effacer l’historique', es: 'Borrar historial' },
  action_open_logs: { en: 'Open Logs', 'zh-CN': '打开日志', ja: 'ログを開く', ko: '로그 열기', de: 'Logs öffnen', fr: 'Ouvrir les journaux', es: 'Abrir registros' },
  action_open_shortcuts: { en: 'Open Browser Shortcut Settings', 'zh-CN': '打开浏览器快捷键设置', ja: 'ブラウザーのショートカット設定を開く', ko: '브라우저 단축키 설정 열기', de: 'Browser-Tastenkürzel öffnen', fr: 'Ouvrir les raccourcis du navigateur', es: 'Abrir configuración de atajos del navegador' },
  status_logs_copied: { en: 'Logs copied', 'zh-CN': '日志已复制', ja: 'ログをコピーしました', ko: '로그를 복사했습니다', de: 'Logs kopiert', fr: 'Journaux copiés', es: 'Registros copiados' },
  status_settings_exported: { en: 'Settings exported', 'zh-CN': '设置已导出', ja: '設定をエクスポートしました', ko: '설정을 내보냈습니다', de: 'Einstellungen exportiert', fr: 'Paramètres exportés', es: 'Ajustes exportados' },
  status_imported_terms: { en: 'Imported {{count}} terms', 'zh-CN': '已导入 {{count}} 条术语', ja: '{{count}} 件の用語をインポートしました', ko: '{{count}}개 용어를 가져왔습니다', de: '{{count}} Begriffe importiert', fr: '{{count}} termes importés', es: '{{count}} términos importados' },
  status_invalid_json: { en: 'Invalid JSON file', 'zh-CN': 'JSON 文件无效', ja: '無効な JSON ファイルです', ko: '잘못된 JSON 파일입니다', de: 'Ungültige JSON-Datei', fr: 'Fichier JSON invalide', es: 'Archivo JSON no válido' },
  legacy_glossary_title: { en: 'Legacy Glossary (comma-separated)', 'zh-CN': '旧版术语表（逗号分隔）', ja: '旧式用語集（カンマ区切り）', ko: '레거시 용어집(쉼표 구분)', de: 'Altes Glossar (kommagetrennt)', fr: 'Glossaire hérité (séparé par des virgules)', es: 'Glosario heredado (separado por comas)' }
});

const groups = { common: [], options: [], themes: [] };
const themePrefixes = ['theme_'];
const optionPrefixes = [
  'nav_', 'llm_', 'preset_', 'base_url_', 'api_key_', 'model_', 'temperature_', 'test_', 'save_', 'reset_',
  'trans_', 'target_lang', 'source_lang', 'display_', 'max_chars_', 'features_', 'hover_', 'input_', 'selection_',
  'auto_', 'main_', 'sites_', 'prompts_', 'data_', 'export_', 'import_', 'clear_cache_', 'cache_', 'glossary_',
  'shortcuts_', 'sc_', 'thinking_', 'concurrency_', 'system_prompt_', 'user_prompt_', 'position_', 'fontSize_',
  'minLength_', 'excludeSelector_', 'layout_', 'about_', 'logs_', 'ui_theme_', 'custom_css_', 'sidepanel_',
  'action_', 'status_', 'legacy_'
];

for (const key of Object.keys(MESSAGES)) {
  if (themePrefixes.some(prefix => key.startsWith(prefix))) groups.themes.push(key);
  else if (optionPrefixes.some(prefix => key.startsWith(prefix))) groups.options.push(key);
  else groups.common.push(key);
}

const outDir = path.join(ROOT, 'src/lib/i18n-locales');
fs.mkdirSync(outDir, { recursive: true });

function writePart(name, keys, extraBodyLines = []) {
  const part = {};
  for (const key of keys) part[key] = MESSAGES[key];
  const lines = [
    '(function() {',
    '  const part = ' + JSON.stringify(part, null, 2) + ';',
    ...extraBodyLines,
    '  if (typeof globalThis !== "undefined") {',
    '    globalThis.I18N_MESSAGE_PARTS = globalThis.I18N_MESSAGE_PARTS || [];',
    '    globalThis.I18N_MESSAGE_PARTS.push(part);',
    '  }',
    '  if (typeof module !== "undefined" && module.exports) {',
    name === 'common' ? '    module.exports = { part, commonLangs };' : '    module.exports = part;',
    '  }',
    '})();',
    ''
  ];
  fs.writeFileSync(path.join(outDir, name + '.js'), lines.join('\n'), 'utf8');
}

writePart('common', groups.common, [
  '  const commonLangs = ' + JSON.stringify(COMMON_LANGS, null, 2) + ';',
  '  if (typeof globalThis !== "undefined") globalThis.I18N_COMMON_LANGS = commonLangs;'
]);
writePart('options', groups.options);
writePart('themes', groups.themes);

console.log('Rebuilt locale parts:', Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])));
