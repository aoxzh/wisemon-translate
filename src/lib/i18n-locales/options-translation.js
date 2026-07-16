(function() {
  const part = {
  "hover_key_label2": {
    "en": "Modifier Key",
    "zh-CN": "修饰键",
    "ja": "修飾キー",
    "ko": "보조 키",
    "de": "Modifikatortaste",
    "fr": "Touche modificatrice",
    "es": "Tecla modificadora"
  },
  "layout_section": {
    "en": "Layout & Filtering",
    "zh-CN": "布局与过滤",
    "ja": "レイアウトとフィルタリング",
    "ko": "레이아웃 및 필터링",
    "de": "Layout & Filterung",
    "fr": "Mise en page & Filtrage",
    "es": "Diseño y filtrado"
  },
  "nav_glossary": {
    "en": "Glossary",
    "zh-CN": "术语表",
    "ja": "用語集",
    "ko": "용어집",
    "de": "Glossar",
    "fr": "Glossaire",
    "es": "Glosario"
  },
  "nav_shortcuts": {
    "en": "Shortcuts",
    "zh-CN": "快捷键",
    "ja": "ショートカット",
    "ko": "단축키",
    "de": "Tastenkürzel",
    "fr": "Raccourcis",
    "es": "Atajos"
  },
  "nav_data": {
    "en": "Data",
    "zh-CN": "数据管理",
    "ja": "データ管理",
    "ko": "데이터 관리",
    "de": "Daten",
    "fr": "Données",
    "es": "Datos"
  },
  "glossary_title": {
    "en": "Glossary / Terminology",
    "zh-CN": "术语表 / 词汇替换",
    "ja": "用語集 / 用語置換",
    "ko": "용어집 / 용어 치환",
    "de": "Glossar / Terminologie",
    "fr": "Glossaire / Terminologie",
    "es": "Glosario / Terminología"
  },
  "glossary_desc": {
    "en": "Custom word replacements applied before sending text to the LLM.",
    "zh-CN": "发送给LLM之前应用的自定义词汇替换。",
    "ja": "LLMに送信する前に適用されるカスタム単語置換。",
    "ko": "LLM에 전송하기 전에 적용되는 사용자 정의 단어 치환.",
    "de": "Benutzerdefinierte Wortersetzungen vor dem Senden an das LLM.",
    "fr": "Remplacements de mots personnalisés appliqués avant l'envoi au LLM.",
    "es": "Reemplazos de palabras personalizados aplicados antes de enviar al LLM."
  },
  "glossary_hint": {
    "en": "Format: original,replacement per line. Applied as case-insensitive regex.",
    "zh-CN": "格式：原文,替换 每行一条。作为不区分大小写的正则表达式应用。",
    "ja": "形式：原文,置換 1行に1つ。大文字小文字を区別しない正規表現として適用。",
    "ko": "형식: 원문,치환 한 줄에 하나. 대소문자 구분 없는 정규식으로 적용.",
    "de": "Format: Original,Ersatz pro Zeile. Als Regex ohne Groß-/Kleinschreibung.",
    "fr": "Format : original,remplacement par ligne. Appliqué comme regex insensible à la casse.",
    "es": "Formato: original,reemplazo por línea. Aplicado como regex sin distinción de mayúsculas."
  },
  "shortcuts_title": {
    "en": "Keyboard Shortcuts",
    "zh-CN": "键盘快捷键",
    "ja": "キーボードショートカット",
    "ko": "키보드 단축키",
    "de": "Tastaturkürzel",
    "fr": "Raccourcis clavier",
    "es": "Atajos de teclado"
  },
  "shortcuts_desc": {
    "en": "Customize global shortcuts.",
    "zh-CN": "自定义全局快捷键。",
    "ja": "グローバルショートカットをカスタマイズ。",
    "ko": "전역 단축키를 사용자 정의합니다.",
    "de": "Globale Tastenkürzel anpassen.",
    "fr": "Personnalisez les raccourcis globaux.",
    "es": "Personalice los atajos globales."
  },
  "sc_translate": {
    "en": "Translate Page",
    "zh-CN": "翻译页面",
    "ja": "ページ翻訳",
    "ko": "페이지 번역",
    "de": "Seite übersetzen",
    "fr": "Traduire la page",
    "es": "Traducir página"
  },
  "sc_hover": {
    "en": "Toggle Hover Mode",
    "zh-CN": "切换悬浮模式",
    "ja": "ホバーモード切替",
    "ko": "호버 모드 전환",
    "de": "Hover-Modus umschalten",
    "fr": "Basculer mode survol",
    "es": "Alternar modo flotante"
  },
  "sc_style": {
    "en": "Cycle Translation Style",
    "zh-CN": "切换翻译样式",
    "ja": "翻訳スタイル切替",
    "ko": "번역 스타일 순환",
    "de": "Übersetzungsstil wechseln",
    "fr": "Changer le style de traduction",
    "es": "Cambiar estilo de traducción"
  },
  "data_title": {
    "en": "Data Management",
    "zh-CN": "数据管理",
    "ja": "データ管理",
    "ko": "데이터 관리",
    "de": "Datenverwaltung",
    "fr": "Gestion des données",
    "es": "Gestión de datos"
  },
  "data_desc": {
    "en": "Export, import, or clear your settings and translation cache.",
    "zh-CN": "导出、导入或清除设置和翻译缓存。",
    "ja": "設定と翻訳キャッシュのエクスポート、インポート、またはクリア。",
    "ko": "설정 및 번역 캐시를 내보내기, 가져오기 또는 삭제합니다.",
    "de": "Einstellungen und Übersetzungscache exportieren, importieren oder löschen.",
    "fr": "Exporter, importer ou effacer vos paramètres et le cache de traduction.",
    "es": "Exportar, importar o borrar ajustes y caché de traducción."
  },
  "export_btn": {
    "en": "Export Settings",
    "zh-CN": "导出设置",
    "ja": "設定をエクスポート",
    "ko": "설정 내보내기",
    "de": "Einstellungen exportieren",
    "fr": "Exporter les paramètres",
    "es": "Exportar ajustes"
  },
  "import_btn": {
    "en": "Import Settings",
    "zh-CN": "导入设置",
    "ja": "設定をインポート",
    "ko": "설정 가져오기",
    "de": "Einstellungen importieren",
    "fr": "Importer les paramètres",
    "es": "Importar ajustes"
  },
  "clear_cache_btn": {
    "en": "Clear Translation Cache",
    "zh-CN": "清除翻译缓存",
    "ja": "翻訳キャッシュをクリア",
    "ko": "번역 캐시 삭제",
    "de": "Übersetzungscache löschen",
    "fr": "Effacer le cache de traduction",
    "es": "Borrar caché de traducción"
  },
  "export_success": {
    "en": "Settings exported",
    "zh-CN": "设置已导出",
    "ja": "設定をエクスポートしました",
    "ko": "설정을 내보냈습니다",
    "de": "Einstellungen exportiert",
    "fr": "Paramètres exportés",
    "es": "Ajustes exportados"
  },
  "import_success": {
    "en": "Settings imported successfully!",
    "zh-CN": "设置导入成功！",
    "ja": "設定のインポートに成功しました！",
    "ko": "설정을 성공적으로 가져왔습니다!",
    "de": "Einstellungen erfolgreich importiert!",
    "fr": "Paramètres importés avec succès !",
    "es": "¡Ajustes importados con éxito!"
  },
  "import_failed": {
    "en": "Import failed",
    "zh-CN": "导入失败",
    "ja": "インポートに失敗しました",
    "ko": "가져오기 실패",
    "de": "Import fehlgeschlagen",
    "fr": "Échec de l'importation",
    "es": "Error al importar"
  },
  "cache_cleared": {
    "en": "Cache cleared",
    "zh-CN": "缓存已清除",
    "ja": "キャッシュをクリアしました",
    "ko": "캐시가 삭제되었습니다",
    "de": "Cache gelöscht",
    "fr": "Cache effacé",
    "es": "Caché borrado"
  },
  "clear_cache_confirm": {
    "en": "Clear all translation cache and reset all translated pages?",
    "zh-CN": "清除所有翻译缓存并重置已翻译的页面？",
    "ja": "すべての翻訳キャッシュをクリアし、翻訳済みページをリセットしますか？",
    "ko": "모든 번역 캐시를 삭제하고 번역된 페이지를 재설정하시겠습니까?",
    "de": "Gesamten Übersetzungscache löschen und alle übersetzten Seiten zurücksetzen?",
    "fr": "Effacer tout le cache et réinitialiser les pages traduites ?",
    "es": "¿Borrar toda la caché y restablecer las páginas traducidas?"
  },
  "sites_desc": {
    "en": "Sites where the extension will not run.",
    "zh-CN": "插件不会在这些网站上运行。",
    "ja": "拡張機能が実行されないサイト。",
    "ko": "확장 프로그램이 실행되지 않는 사이트.",
    "de": "Seiten, auf denen die Erweiterung nicht ausgeführt wird.",
    "fr": "Sites où l'extension ne s'exécutera pas.",
    "es": "Sitios donde la extensión no se ejecutará."
  },
  "logs_loading": {
    "en": "Loading logs...",
    "zh-CN": "正在加载日志...",
    "ja": "ログを読み込み中...",
    "ko": "로그 불러오는 중...",
    "de": "Lade Logs...",
    "fr": "Chargement des journaux...",
    "es": "Cargando registros..."
  },
  "hover_on": {
    "en": "Hover On",
    "zh-CN": "悬浮开启",
    "ja": "ホバーON",
    "ko": "호버 켜짐",
    "de": "Hover an",
    "fr": "Survol actif",
    "es": "Flotante activo"
  },
  "hover_off_short": {
    "en": "Hover",
    "zh-CN": "悬浮",
    "ja": "ホバー",
    "ko": "호버",
    "de": "Hover",
    "fr": "Survol",
    "es": "Flotante"
  },
  "api_key_missing_title": {
    "en": "API key not configured",
    "zh-CN": "API Key 未配置",
    "ja": "APIキーが未設定です",
    "ko": "API 키가 설정되지 않았습니다",
    "de": "API-Schlüssel nicht konfiguriert",
    "fr": "Clé API non configurée",
    "es": "Clave API no configurada"
  },
  "ui_theme_label": {
    "en": "Interface Theme",
    "zh-CN": "界面主题",
    "ja": "UIテーマ",
    "ko": "인터페이스 테마",
    "de": "Oberflächenthema",
    "fr": "Thème de l’interface",
    "es": "Tema de la interfaz"
  },
  "ui_theme_auto": {
    "en": "Follow System",
    "zh-CN": "跟随系统",
    "ja": "システムに従う",
    "ko": "시스템 설정 따름",
    "de": "System folgen",
    "fr": "Suivre le système",
    "es": "Seguir el sistema"
  },
  "ui_theme_light": {
    "en": "Light",
    "zh-CN": "浅色",
    "ja": "ライト",
    "ko": "라이트",
    "de": "Hell",
    "fr": "Clair",
    "es": "Claro"
  },
  "ui_theme_dark": {
    "en": "Dark",
    "zh-CN": "深色",
    "ja": "ダーク",
    "ko": "다크",
    "de": "Dunkel",
    "fr": "Sombre",
    "es": "Oscuro"
  },
  "custom_css_label": {
    "en": "Custom Translation CSS",
    "zh-CN": "自定义翻译 CSS",
    "ja": "カスタム翻訳 CSS",
    "ko": "사용자 정의 번역 CSS",
    "de": "Benutzerdefiniertes Übersetzungs-CSS",
    "fr": "CSS de traduction personnalisé",
    "es": "CSS de traducción personalizado"
  },
  "custom_css_hint": {
    "en": "Applied to page translations. Use .llm-translate-inner, .llm-translate-block-wrapper, and .llm-translate-inline-wrapper.",
    "zh-CN": "应用于页面翻译。可使用 .llm-translate-inner、.llm-translate-block-wrapper 和 .llm-translate-inline-wrapper。",
    "ja": "ページ翻訳に適用されます。.llm-translate-inner、.llm-translate-block-wrapper、.llm-translate-inline-wrapper を使用できます。",
    "ko": "페이지 번역에 적용됩니다. .llm-translate-inner, .llm-translate-block-wrapper, .llm-translate-inline-wrapper 를 사용하세요.",
    "de": "Wird auf Seitenübersetzungen angewendet. Verwenden Sie .llm-translate-inner, .llm-translate-block-wrapper und .llm-translate-inline-wrapper.",
    "fr": "Appliqué aux traductions de page. Utilisez .llm-translate-inner, .llm-translate-block-wrapper et .llm-translate-inline-wrapper.",
    "es": "Se aplica a las traducciones de página. Use .llm-translate-inner, .llm-translate-block-wrapper y .llm-translate-inline-wrapper."
  },
  "sidepanel_title": {
    "en": "Translate",
    "zh-CN": "翻译",
    "ja": "翻訳",
    "ko": "번역",
    "de": "Übersetzen",
    "fr": "Traduire",
    "es": "Traducir"
  },
  "sidepanel_subtitle": {
    "en": "Long text workspace",
    "zh-CN": "长文本工作区",
    "ja": "長文ワークスペース",
    "ko": "긴 텍스트 작업 공간",
    "de": "Arbeitsbereich für lange Texte",
    "fr": "Espace de travail pour longs textes",
    "es": "Espacio de trabajo para textos largos"
  },
  "sidepanel_source_label": {
    "en": "Source text",
    "zh-CN": "原文",
    "ja": "原文",
    "ko": "원문",
    "de": "Quelltext",
    "fr": "Texte source",
    "es": "Texto de origen"
  },
  "sidepanel_source_placeholder": {
    "en": "Paste text to translate...",
    "zh-CN": "粘贴要翻译的文本...",
    "ja": "翻訳するテキストを貼り付け...",
    "ko": "번역할 텍스트를 붙여넣으세요...",
    "de": "Zu übersetzenden Text einfügen...",
    "fr": "Collez le texte à traduire...",
    "es": "Pegue el texto a traducir..."
  },
  "sidepanel_result_label": {
    "en": "Result",
    "zh-CN": "结果",
    "ja": "結果",
    "ko": "결과",
    "de": "Ergebnis",
    "fr": "Résultat",
    "es": "Resultado"
  },
  "sidepanel_history_label": {
    "en": "History",
    "zh-CN": "历史记录",
    "ja": "履歴",
    "ko": "기록",
    "de": "Verlauf",
    "fr": "Historique",
    "es": "Historial"
  },
  "sidepanel_no_result": {
    "en": "No result yet.",
    "zh-CN": "暂无结果。",
    "ja": "まだ結果はありません。",
    "ko": "아직 결과가 없습니다.",
    "de": "Noch kein Ergebnis.",
    "fr": "Aucun résultat pour l’instant.",
    "es": "Aún no hay resultado."
  },
  "sidepanel_no_history": {
    "en": "No history yet.",
    "zh-CN": "暂无历史记录。",
    "ja": "履歴はまだありません。",
    "ko": "아직 기록이 없습니다.",
    "de": "Noch kein Verlauf.",
    "fr": "Aucun historique pour l’instant.",
    "es": "Aún no hay historial."
  },
  "sidepanel_translating": {
    "en": "Translating...",
    "zh-CN": "正在翻译...",
    "ja": "翻訳中...",
    "ko": "번역 중...",
    "de": "Übersetze...",
    "fr": "Traduction en cours...",
    "es": "Traduciendo..."
  },
  "sidepanel_failed_prefix": {
    "en": "Failed: ",
    "zh-CN": "失败：",
    "ja": "失敗: ",
    "ko": "실패: ",
    "de": "Fehlgeschlagen: ",
    "fr": "Échec : ",
    "es": "Falló: "
  },
  "action_copy": {
    "en": "Copy",
    "zh-CN": "复制",
    "ja": "コピー",
    "ko": "복사",
    "de": "Kopieren",
    "fr": "Copier",
    "es": "Copiar"
  },
  "action_clear": {
    "en": "Clear",
    "zh-CN": "清空",
    "ja": "クリア",
    "ko": "지우기",
    "de": "Leeren",
    "fr": "Effacer",
    "es": "Borrar"
  },
  "action_use_selection": {
    "en": "Use Selection",
    "zh-CN": "使用选中文本",
    "ja": "選択テキストを使用",
    "ko": "선택한 텍스트 사용",
    "de": "Auswahl verwenden",
    "fr": "Utiliser la sélection",
    "es": "Usar selección"
  },
  "action_use_page": {
    "en": "Use Page Text",
    "zh-CN": "使用页面文本",
    "ja": "ページ本文を使用",
    "ko": "페이지 텍스트 사용",
    "de": "Seitentext verwenden",
    "fr": "Utiliser le texte de la page",
    "es": "Usar texto de la página"
  },
  "action_clear_history": {
    "en": "Clear History",
    "zh-CN": "清空历史",
    "ja": "履歴をクリア",
    "ko": "기록 지우기",
    "de": "Verlauf löschen",
    "fr": "Effacer l’historique",
    "es": "Borrar historial"
  },
  "action_open_logs": {
    "en": "Open Logs",
    "zh-CN": "打开日志",
    "ja": "ログを開く",
    "ko": "로그 열기",
    "de": "Logs öffnen",
    "fr": "Ouvrir les journaux",
    "es": "Abrir registros"
  },
  "action_open_shortcuts": {
    "en": "Open Browser Shortcut Settings",
    "zh-CN": "打开浏览器快捷键设置",
    "ja": "ブラウザーのショートカット設定を開く",
    "ko": "브라우저 단축키 설정 열기",
    "de": "Browser-Tastenkürzel öffnen",
    "fr": "Ouvrir les raccourcis du navigateur",
    "es": "Abrir configuración de atajos del navegador"
  },
  "status_logs_copied": {
    "en": "Logs copied",
    "zh-CN": "日志已复制",
    "ja": "ログをコピーしました",
    "ko": "로그를 복사했습니다",
    "de": "Logs kopiert",
    "fr": "Journaux copiés",
    "es": "Registros copiados"
  },
  "status_settings_exported": {
    "en": "Settings exported",
    "zh-CN": "设置已导出",
    "ja": "設定をエクスポートしました",
    "ko": "설정을 내보냈습니다",
    "de": "Einstellungen exportiert",
    "fr": "Paramètres exportés",
    "es": "Ajustes exportados"
  },
  "status_imported_terms": {
    "en": "Imported {{count}} terms",
    "zh-CN": "已导入 {{count}} 条术语",
    "ja": "{{count}} 件の用語をインポートしました",
    "ko": "{{count}}개 용어를 가져왔습니다",
    "de": "{{count}} Begriffe importiert",
    "fr": "{{count}} termes importés",
    "es": "{{count}} términos importados"
  },
  "status_invalid_json": {
    "en": "Invalid JSON file",
    "zh-CN": "JSON 文件无效",
    "ja": "無効な JSON ファイルです",
    "ko": "잘못된 JSON 파일입니다",
    "de": "Ungültige JSON-Datei",
    "fr": "Fichier JSON invalide",
    "es": "Archivo JSON no válido"
  },
  "legacy_glossary_title": {
    "en": "Legacy Glossary (comma-separated)",
    "zh-CN": "旧版术语表（逗号分隔）",
    "ja": "旧式用語集（カンマ区切り）",
    "ko": "레거시 용어집(쉼표 구분)",
    "de": "Altes Glossar (kommagetrennt)",
    "fr": "Glossaire hérité (séparé par des virgules)",
    "es": "Glosario heredado (separado por comas)"
  },
  "quality_preset_label": {
    "en": "Quality Preset",
    "zh-CN": "质量预设",
    "ja": "品質プリセット",
    "ko": "품질 프리셋",
    "de": "Qualitaetsprofil",
    "fr": "Preset qualite",
    "es": "Preset de calidad"
  },
  "quality_balanced": {
    "en": "Balanced",
    "zh-CN": "平衡",
    "ja": "バランス",
    "ko": "균형",
    "de": "Ausgewogen",
    "fr": "Equilibre",
    "es": "Equilibrado"
  },
  "quality_natural": {
    "en": "Natural",
    "zh-CN": "自然",
    "ja": "自然",
    "ko": "자연스러움",
    "de": "Natuerlich",
    "fr": "Naturel",
    "es": "Natural"
  },
  "quality_faithful": {
    "en": "Faithful",
    "zh-CN": "忠实",
    "ja": "忠実",
    "ko": "충실",
    "de": "Texttreu",
    "fr": "Fidele",
    "es": "Fiel"
  },
  "quality_subtitle": {
    "en": "Subtitle dialogue",
    "zh-CN": "字幕口语",
    "ja": "字幕会話",
    "ko": "자막 대화체",
    "de": "Untertitel-Dialog",
    "fr": "Dialogue sous-titre",
    "es": "Dialogo subtitulo"
  },
  "quality_technical": {
    "en": "Technical docs",
    "zh-CN": "技术文档",
    "ja": "技術文書",
    "ko": "기술 문서",
    "de": "Technische Doku",
    "fr": "Docs techniques",
    "es": "Docs tecnicos"
  },
  "quality_novel": {
    "en": "Novel prose",
    "zh-CN": "小说文风",
    "ja": "小説文体",
    "ko": "소설체",
    "de": "Romanprosa",
    "fr": "Prose roman",
    "es": "Prosa novela"
  },
  "large_text_label": {
    "en": "Large text mode",
    "zh-CN": "长文模式",
    "ja": "長文モード",
    "ko": "긴 텍스트 모드",
    "de": "Langtextmodus",
    "fr": "Mode texte long",
    "es": "Modo texto largo"
  },
  "large_text_desc": {
    "en": "Faster batching for novels and long articles",
    "zh-CN": "为小说和长文更快分批",
    "ja": "小説や長文を素早くバッチ処理",
    "ko": "소설과 긴 글을 빠르게 배치 처리",
    "de": "Schnellere Stapel fuer Romane und lange Artikel",
    "fr": "Lots plus rapides pour romans et longs articles",
    "es": "Lotes mas rapidos para novelas y articulos largos"
  },
  "context_aware_label": {
    "en": "Context-aware translation",
    "zh-CN": "上下文感知翻译",
    "ja": "コンテキスト考慮型翻訳",
    "ko": "맥띵 인식 번역",
    "de": "Kontextbewusste Uebersetzung",
    "fr": "Traduction contextuelle",
    "es": "Traduccion con contexto"
  },
  "context_aware_desc": {
    "en": "Send page title and article summary to improve terminology and style",
    "zh-CN": "发送网页标题和文章摘要，改善术语和风格",
    "ja": "ページタイトルと記事要約を送信して用語とスタイルを向上",
    "ko": "페이지 제목과 기사 요약을 보내어 용어과 문장을 개선",
    "de": "Sendet Seitentitel und Artikelzusammenfassung zur Verbesserung von Terminologie und Stil",
    "fr": "Envoie le titre et le resume pour ameliorer terminologie et style",
    "es": "Envia titulo y resumen para mejorar terminologia y estilo"
  },
  "nav_ai_actions": {
    "en": "AI Actions",
    "zh-CN": "AI 动作",
    "ja": "AIアクション",
    "ko": "AI 액션",
    "de": "AI-Aktionen",
    "fr": "Actions IA",
    "es": "Acciones IA"
  },
  "ai_actions_title": {
    "en": "AI Actions",
    "zh-CN": "AI 动作",
    "ja": "AIアクション",
    "ko": "AI 액션",
    "de": "AI-Aktionen",
    "fr": "Actions IA",
    "es": "Acciones IA"
  },
  "ai_actions_desc": {
    "en": "Custom prompts that appear in the selection popup for quick reuse.",
    "zh-CN": "在划词弹窗中显示的自定义提示词，方便快速复用。",
    "ja": "選択ポップアップに表示されるカスタムプロンプト。",
    "ko": "선택 팝업에 표시되어 빠르게 재사용할 수 있는 사용자 지정 프롬프트입니다.",
    "de": "Benutzerdefinierte Prompts im Auswahl-Popup zur schnellen Wiederverwendung.",
    "fr": "Prompts personnalises dans le popup de selection pour une reutilisation rapide.",
    "es": "Prompts personalizados en el popup de seleccion para reutilizacion rapida."
  },
  "ai_actions_list_label": {
    "en": "Actions",
    "zh-CN": "动作列表",
    "ja": "アクション一覧",
    "ko": "액션 목록",
    "de": "Aktionen",
    "fr": "Actions",
    "es": "Acciones"
  },
  "ai_actions_empty": {
    "en": "No custom actions yet.",
    "zh-CN": "暂无自定义动作。",
    "ja": "まだカスタムアクションがありません。",
    "ko": "사용자 지정 액션이 없습니다.",
    "de": "Noch keine benutzerdefinierten Aktionen.",
    "fr": "Aucune action personnalisee pour l'instant.",
    "es": "Aun no hay acciones personalizadas."
  },
  "ai_action_add": {
    "en": "+ Add Action",
    "zh-CN": "+ 添加动作",
    "ja": "+ アクションを追加",
    "ko": "+ 액션 추가",
    "de": "+ Aktion hinzufuegen",
    "fr": "+ Ajouter une action",
    "es": "+ Anadir accion"
  },
  "ai_action_edit": {
    "en": "Edit",
    "zh-CN": "编辑",
    "ja": "編集",
    "ko": "편집",
    "de": "Bearbeiten",
    "fr": "Modifier",
    "es": "Editar"
  },
  "ai_action_delete": {
    "en": "Delete",
    "zh-CN": "删除",
    "ja": "削除",
    "ko": "삭제",
    "de": "Loeschen",
    "fr": "Supprimer",
    "es": "Eliminar"
  },
  "ai_action_delete_confirm": {
    "en": "Delete this action?",
    "zh-CN": "删除此动作？",
    "ja": "このアクションを削除しますか？",
    "ko": "이 액션을 삭제하시겠습니까?",
    "de": "Diese Aktion loeschen?",
    "fr": "Supprimer cette action ?",
    "es": "Eliminar esta accion?"
  },
  "ai_action_edit_title": {
    "en": "Edit Action",
    "zh-CN": "编辑动作",
    "ja": "アクションを編集",
    "ko": "액션 편집",
    "de": "Aktion bearbeiten",
    "fr": "Modifier l'action",
    "es": "Editar accion"
  },
  "ai_action_name": {
    "en": "Name",
    "zh-CN": "名称",
    "ja": "名前",
    "ko": "이름",
    "de": "Name",
    "fr": "Nom",
    "es": "Nombre"
  },
  "ai_action_icon": {
    "en": "Icon (emoji)",
    "zh-CN": "图标（表情）",
    "ja": "アイコン（絵文字）",
    "ko": "아이콘 (이모지)",
    "de": "Icon (Emoji)",
    "fr": "Icone (emoji)",
    "es": "Icono (emoji)"
  },
  "ai_action_prompt": {
    "en": "Prompt",
    "zh-CN": "提示词",
    "ja": "プロンプト",
    "ko": "프롬프트",
    "de": "Prompt",
    "fr": "Prompt",
    "es": "Prompt"
  }
};
  if (typeof globalThis !== 'undefined') {
    globalThis.I18N_MESSAGE_PARTS = globalThis.I18N_MESSAGE_PARTS || [];
    globalThis.I18N_MESSAGE_PARTS.push(part);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = part;
  }
})();
