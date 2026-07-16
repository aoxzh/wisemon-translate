(function() {
  const part = {
  "status_ready": {
    "en": "Ready",
    "zh-CN": "就绪",
    "ja": "準備完了",
    "ko": "준비 완료",
    "de": "Bereit",
    "fr": "Prêt",
    "es": "Listo"
  },
  "status_translated": {
    "en": "Page translated",
    "zh-CN": "页面已翻译",
    "ja": "翻訳済み",
    "ko": "페이지 번역 완료",
    "de": "Seite übersetzt",
    "fr": "Page traduite",
    "es": "Página traducida"
  },
  "status_translating": {
    "en": "Translating...",
    "zh-CN": "正在翻译...",
    "ja": "翻訳中...",
    "ko": "번역 중...",
    "de": "Übersetze...",
    "fr": "Traduction en cours...",
    "es": "Traduciendo..."
  },
  "status_error": {
    "en": "Translation failed",
    "zh-CN": "翻译失败",
    "ja": "翻訳に失敗しました",
    "ko": "번역 실패",
    "de": "Übersetzung fehlgeschlagen",
    "fr": "Échec de la traduction",
    "es": "Traducción fallida"
  },
  "target_lang_label": {
    "en": "Target",
    "zh-CN": "目标语言",
    "ja": "目標言語",
    "ko": "대상 언어",
    "de": "Zielsprache",
    "fr": "Langue cible",
    "es": "Idioma destino"
  },
  "nav_llm": {
    "en": "API Config",
    "zh-CN": "API 配置",
    "ja": "API設定",
    "ko": "API 설정",
    "de": "API-Konfiguration",
    "fr": "Config API",
    "es": "Config API"
  },
  "nav_translation": {
    "en": "Translation",
    "zh-CN": "翻译设置",
    "ja": "翻訳設定",
    "ko": "번역 설정",
    "de": "Übersetzung",
    "fr": "Traduction",
    "es": "Traducción"
  },
  "nav_features": {
    "en": "Features",
    "zh-CN": "功能开关",
    "ja": "機能",
    "ko": "기능",
    "de": "Funktionen",
    "fr": "Fonctionnalités",
    "es": "Funciones"
  },
  "nav_prompts": {
    "en": "Prompts",
    "zh-CN": "提示词",
    "ja": "プロンプト",
    "ko": "프롬프트",
    "de": "Prompts",
    "fr": "Prompts",
    "es": "Prompts"
  },
  "nav_sites": {
    "en": "Sites",
    "zh-CN": "网站管理",
    "ja": "サイト管理",
    "ko": "사이트 관리",
    "de": "Websites",
    "fr": "Sites",
    "es": "Sitios"
  },
  "nav_about": {
    "en": "About",
    "zh-CN": "关于",
    "ja": "概要",
    "ko": "정보",
    "de": "Über",
    "fr": "À propos",
    "es": "Acerca de"
  },
  "llm_title": {
    "en": "API Configuration",
    "zh-CN": "API 配置",
    "ja": "API設定",
    "ko": "API 구성",
    "de": "API-Konfiguration",
    "fr": "Configuration API",
    "es": "Configuración API"
  },
  "llm_desc": {
    "en": "Connect to DeepSeek, OpenAI, or any compatible LLM API.",
    "zh-CN": "接入 DeepSeek、OpenAI 或其他兼容的大模型 API。",
    "ja": "DeepSeek、OpenAI、または互換LLM APIに接続します。",
    "ko": "DeepSeek, OpenAI 또는 호환 LLM API에 연결하세요.",
    "de": "Verbinden Sie sich mit DeepSeek, OpenAI oder einer kompatiblen LLM-API.",
    "fr": "Connectez-vous à DeepSeek, OpenAI ou toute API LLM compatible.",
    "es": "Conéctese a DeepSeek, OpenAI o cualquier API LLM compatible."
  },
  "preset_label": {
    "en": "Provider",
    "zh-CN": "服务商",
    "ja": "プロバイダー",
    "ko": "제공업체",
    "de": "Anbieter",
    "fr": "Fournisseur",
    "es": "Proveedor"
  },
  "base_url_label": {
    "en": "API Base URL",
    "zh-CN": "API 地址",
    "ja": "APIベースURL",
    "ko": "API 기본 URL",
    "de": "API-Basis-URL",
    "fr": "URL de base API",
    "es": "URL base de API"
  },
  "api_key_label": {
    "en": "API Key",
    "zh-CN": "API 密钥",
    "ja": "APIキー",
    "ko": "API 키",
    "de": "API-Schlüssel",
    "fr": "Clé API",
    "es": "Clave API"
  },
  "api_key_placeholder": {
    "en": "sk-...",
    "zh-CN": "sk-...",
    "ja": "sk-...",
    "ko": "sk-...",
    "de": "sk-...",
    "fr": "sk-...",
    "es": "sk-..."
  },
  "model_label": {
    "en": "Model Name",
    "zh-CN": "模型名称",
    "ja": "モデル名",
    "ko": "모델 이름",
    "de": "Modellname",
    "fr": "Nom du modèle",
    "es": "Nombre del modelo"
  },
  "temperature_label": {
    "en": "Temperature",
    "zh-CN": "随机性",
    "ja": "温度",
    "ko": "온도",
    "de": "Temperatur",
    "fr": "Température",
    "es": "Temperatura"
  },
  "test_btn": {
    "en": "Test Connection",
    "zh-CN": "测试连接",
    "ja": "接続テスト",
    "ko": "연결 테스트",
    "de": "Verbindung testen",
    "fr": "Tester la connexion",
    "es": "Probar conexión"
  },
  "test_testing": {
    "en": "Testing...",
    "zh-CN": "测试中...",
    "ja": "テスト中...",
    "ko": "테스트 중...",
    "de": "Teste...",
    "fr": "Test en cours...",
    "es": "Probando..."
  },
  "test_success": {
    "en": "Connected!",
    "zh-CN": "连接成功！",
    "ja": "接続成功！",
    "ko": "연결 성공!",
    "de": "Verbunden!",
    "fr": "Connecté !",
    "es": "¡Conectado!"
  },
  "test_failed_prefix": {
    "en": "Failed: ",
    "zh-CN": "失败：",
    "ja": "失敗：",
    "ko": "실패: ",
    "de": "Fehlgeschlagen: ",
    "fr": "Échec : ",
    "es": "Falló: "
  },
  "save_btn": {
    "en": "Save Settings",
    "zh-CN": "保存设置",
    "ja": "設定を保存",
    "ko": "설정 저장",
    "de": "Einstellungen speichern",
    "fr": "Enregistrer",
    "es": "Guardar ajustes"
  },
  "reset_btn": {
    "en": "Reset Defaults",
    "zh-CN": "恢复默认",
    "ja": "デフォルトに戻す",
    "ko": "기본값 복원",
    "de": "Zurücksetzen",
    "fr": "Réinitialiser",
    "es": "Restablecer"
  },
  "save_success": {
    "en": "Settings saved",
    "zh-CN": "设置已保存",
    "ja": "設定を保存しました",
    "ko": "설정이 저장되었습니다",
    "de": "Einstellungen gespeichert",
    "fr": "Paramètres enregistrés",
    "es": "Ajustes guardados"
  },
  "save_error": {
    "en": "Save failed",
    "zh-CN": "保存失败",
    "ja": "保存に失敗しました",
    "ko": "저장 실패",
    "de": "Speichern fehlgeschlagen",
    "fr": "Échec de l'enregistrement",
    "es": "Error al guardar"
  },
  "reset_confirm": {
    "en": "Reset all settings to defaults?",
    "zh-CN": "确认恢复默认设置？",
    "ja": "すべての設定をデフォルトに戻しますか？",
    "ko": "모든 설정을 기본값으로 복원하시겠습니까?",
    "de": "Alle Einstellungen zurücksetzen?",
    "fr": "Réinitialiser tous les paramètres ?",
    "es": "¿Restablecer todos los ajustes?"
  },
  "reset_success": {
    "en": "Settings reset",
    "zh-CN": "已恢复默认",
    "ja": "設定をリセットしました",
    "ko": "설정이 초기화되었습니다",
    "de": "Einstellungen zurückgesetzt",
    "fr": "Paramètres réinitialisés",
    "es": "Ajustes restablecidos"
  },
  "trans_title": {
    "en": "Translation Settings",
    "zh-CN": "翻译设置",
    "ja": "翻訳設定",
    "ko": "번역 설정",
    "de": "Übersetzungseinstellungen",
    "fr": "Paramètres de traduction",
    "es": "Ajustes de traducción"
  },
  "target_lang": {
    "en": "Target Language",
    "zh-CN": "目标语言",
    "ja": "目標言語",
    "ko": "대상 언어",
    "de": "Zielsprache",
    "fr": "Langue cible",
    "es": "Idioma destino"
  },
  "source_lang": {
    "en": "Source Language",
    "zh-CN": "源语言",
    "ja": "ソース言語",
    "ko": "소스 언어",
    "de": "Ausgangssprache",
    "fr": "Langue source",
    "es": "Idioma origen"
  },
  "display_mode_label": {
    "en": "Display Mode",
    "zh-CN": "显示模式",
    "ja": "表示モード",
    "ko": "표시 모드",
    "de": "Anzeigemodus",
    "fr": "Mode d'affichage",
    "es": "Modo de visualización"
  },
  "display_bilingual": {
    "en": "Bilingual (Original + Translation)",
    "zh-CN": "双语对照（原文 + 译文）",
    "ja": "バイリンガル（原文＋翻訳）",
    "ko": "이중 언어 (원문 + 번역)",
    "de": "Zweisprachig (Original + Übersetzung)",
    "fr": "Bilingue (Original + Traduction)",
    "es": "Bilingüe (Original + Traducción)"
  },
  "display_replace": {
    "en": "Translation Only",
    "zh-CN": "仅显示译文",
    "ja": "翻訳のみ表示",
    "ko": "번역만 표시",
    "de": "Nur Übersetzung",
    "fr": "Traduction seule",
    "es": "Solo traducción"
  },
  "max_chars_label": {
    "en": "Max Characters Per Request",
    "zh-CN": "单次最大字符数",
    "ja": "リクエストあたりの最大文字数",
    "ko": "요청당 최대 문자 수",
    "de": "Max. Zeichen pro Anfrage",
    "fr": "Caractères max par requête",
    "es": "Máx. caracteres por solicitud"
  },
  "max_chars_hint": {
    "en": "Longer texts split into chunks.",
    "zh-CN": "较长文本将自动分段。",
    "ja": "長いテキストは自動的に分割されます。",
    "ko": "긴 텍스트는 자동으로 분할됩니다.",
    "de": "Längere Texte werden automatisch aufgeteilt.",
    "fr": "Les textes longs sont divisés automatiquement.",
    "es": "Los textos largos se dividen automáticamente."
  },
  "features_title": {
    "en": "Feature Toggles",
    "zh-CN": "功能开关",
    "ja": "機能の切り替え",
    "ko": "기능 토글",
    "de": "Funktionsschalter",
    "fr": "Activation des fonctionnalités",
    "es": "Activación de funciones"
  },
  "hover_label": {
    "en": "Hover Translation",
    "zh-CN": "鼠标悬浮翻译",
    "ja": "ホバー翻訳",
    "ko": "호버 번역",
    "de": "Hover-Übersetzung",
    "fr": "Traduction au survol",
    "es": "Traducción flotante"
  },
  "hover_key_label": {
    "en": "Hover Key",
    "zh-CN": "悬浮快捷键",
    "ja": "ホバーキー",
    "ko": "호버 키",
    "de": "Hover-Taste",
    "fr": "Touche de survol",
    "es": "Tecla flotante"
  },
  "input_label": {
    "en": "Input Box Translation",
    "zh-CN": "输入框翻译",
    "ja": "入力欄の翻訳",
    "ko": "입력창 번역",
    "de": "Eingabefeld-Übersetzung",
    "fr": "Traduction de saisie",
    "es": "Traducción de entrada"
  },
  "input_hint": {
    "en": "Use /tr or triple space to translate",
    "zh-CN": "使用 /tr 或连续三个空格触发翻译",
    "ja": "/tr または空白3回で翻訳",
    "ko": "/tr 또는 공백 3번으로 번역",
    "de": "Mit /tr oder drei Leerzeichen uebersetzen",
    "fr": "Utilisez /tr ou trois espaces pour traduire",
    "es": "Usa /tr o tres espacios para traducir"
  },
  "selection_label": {
    "en": "Selection Translation",
    "zh-CN": "划词翻译",
    "ja": "選択テキスト翻訳",
    "ko": "선택 텍스트 번역",
    "de": "Auswahl-Übersetzung",
    "fr": "Traduction de sélection",
    "es": "Traducción de selección"
  },
  "auto_translate_label": {
    "en": "Auto Translate on Load",
    "zh-CN": "加载后自动翻译",
    "ja": "読み込み時に自動翻訳",
    "ko": "로드 시 자동 번역",
    "de": "Automatisch übersetzen beim Laden",
    "fr": "Traduction automatique au chargement",
    "es": "Traducir automáticamente al cargar"
  },
  "auto_translate_hint": {
    "en": "Automatically translate page after it loads",
    "zh-CN": "页面加载完成后自动开始翻译",
    "ja": "ページ読み込み後に自動翻訳を開始",
    "ko": "페이지 로드 후 자동 번역 시작",
    "de": "Seite nach dem Laden automatisch übersetzen",
    "fr": "Traduire automatiquement la page après chargement",
    "es": "Traducir automáticamente tras cargar la página"
  },
  "main_only_label": {
    "en": "Translate Main Content Only",
    "zh-CN": "仅翻译主体内容",
    "ja": "メインコンテンツのみ翻訳",
    "ko": "주요 콘텐츠만 번역",
    "de": "Nur Hauptinhalt übersetzen",
    "fr": "Traduire le contenu principal uniquement",
    "es": "Traducir solo contenido principal"
  },
  "main_only_hint": {
    "en": "Skip sidebars, headers, footers — translate article body only",
    "zh-CN": "跳过侧边栏、页眉页脚，仅翻译文章正文",
    "ja": "サイドバー、ヘッダー、フッターをスキップ",
    "ko": "사이드바, 헤더, 푸터 건너뛰기",
    "de": "Sidebars, Kopf- und Fußzeilen überspringen",
    "fr": "Ignorer barres latérales, en-têtes, pieds de page",
    "es": "Omitir barras laterales, encabezados, pies de página"
  },
  "sites_hint_v2": {
    "en": "One hostname per line. Supports exact match and subdomain match (e.g. example.com matches www.example.com too). Extension will not run on these sites.",
    "zh-CN": "每行一个主机名。支持精确匹配和子域名匹配（例如 example.com 也会匹配 www.example.com）。插件不会在这些网站上运行。",
    "ja": "1行に1つのホスト名。完全一致とサブドメイン一致をサポート。これらのサイトでは実行されません。",
    "ko": "한 줄에 하나의 호스트 이름. 정확한 일치 및 하위 도메인 일치 지원. 이 사이트에서는 실행되지 않습니다.",
    "de": "Ein Hostname pro Zeile. Unterstützt exakte und Subdomain-Übereinstimmung. Erweiterung wird auf diesen Seiten nicht ausgeführt.",
    "fr": "Un nom d'hôte par ligne. Correspondance exacte et sous-domaine. L'extension ne s'exécutera pas sur ces sites.",
    "es": "Un nombre de host por línea. Coincidencia exacta y de subdominio. La extensión no se ejecutará en estos sitios."
  },
  "prompts_title": {
    "en": "Prompt Customization",
    "zh-CN": "提示词自定义",
    "ja": "プロンプトカスタマイズ",
    "ko": "프롬프트 사용자 정의",
    "de": "Prompt-Anpassung",
    "fr": "Personnalisation des prompts",
    "es": "Personalización de prompts"
  },
  "system_prompt_label": {
    "en": "System Prompt",
    "zh-CN": "系统提示词",
    "ja": "システムプロンプト",
    "ko": "시스템 프롬프트",
    "de": "System-Prompt",
    "fr": "Prompt système",
    "es": "Prompt del sistema"
  },
  "user_prompt_label": {
    "en": "User Prompt Template",
    "zh-CN": "用户提示词模板",
    "ja": "ユーザープロンプトテンプレート",
    "ko": "사용자 프롬프트 템플릿",
    "de": "Benutzer-Prompt-Vorlage",
    "fr": "Modèle de prompt utilisateur",
    "es": "Plantilla de prompt de usuario"
  },
  "user_prompt_hint": {
    "en": "Variables: {{sourceLang}}, {{targetLang}}, {{text}}",
    "zh-CN": "可用变量：{{sourceLang}}、{{targetLang}}、{{text}}",
    "ja": "変数：{{sourceLang}}、{{targetLang}}、{{text}}",
    "ko": "변수: {{sourceLang}}, {{targetLang}}, {{text}}",
    "de": "Variablen: {{sourceLang}}, {{targetLang}}, {{text}}",
    "fr": "Variables : {{sourceLang}}, {{targetLang}}, {{text}}",
    "es": "Variables: {{sourceLang}}, {{targetLang}}, {{text}}"
  },
  "sites_title": {
    "en": "Site Exclusions",
    "zh-CN": "排除网站",
    "ja": "除外サイト",
    "ko": "사이트 제외",
    "de": "Seiten-Ausschlüsse",
    "fr": "Sites exclus",
    "es": "Sitios excluidos"
  },
  "sites_label": {
    "en": "Excluded Sites (one per line)",
    "zh-CN": "排除网站（每行一个）",
    "ja": "除外サイト（1行に1つ）",
    "ko": "제외 사이트 (한 줄에 하나)",
    "de": "Ausgeschlossene Seiten (eine pro Zeile)",
    "fr": "Sites exclus (un par ligne)",
    "es": "Sitios excluidos (uno por línea)"
  },
  "sites_hint": {
    "en": "Extension will not run on these sites.",
    "zh-CN": "插件不会在这些网站上运行。",
    "ja": "これらのサイトでは拡張機能は実行されません。",
    "ko": "이 사이트에서는 확장 프로그램이 실행되지 않습니다.",
    "de": "Erweiterung wird auf diesen Seiten nicht ausgeführt.",
    "fr": "L'extension ne s'exécutera pas sur ces sites.",
    "es": "La extensión no se ejecutará en estos sitios."
  },
  "about_title": {
    "en": "About",
    "zh-CN": "关于",
    "ja": "概要",
    "ko": "정보",
    "de": "Über",
    "fr": "À propos",
    "es": "Acerca de"
  },
  "about_desc": {
    "en": "Free, open-source AI translation extension. Use your own API keys for DeepSeek, OpenAI, or any compatible LLM.",
    "zh-CN": "免费开源的大模型 AI 翻译插件。支持 DeepSeek、OpenAI 及兼容 API。使用你自己的 Key。",
    "ja": "無料のオープンソースAI翻訳拡張機能。独自のAPIキーを使用。",
    "ko": "무료 오픈소스 AI 번역 확장 프로그램. 자신의 API 키를 사용하세요.",
    "de": "Kostenlose Open-Source-KI-Übersetzungserweiterung. Eigene API-Keys verwenden.",
    "fr": "Extension de traduction IA gratuite et open-source. Utilisez vos propres clés API.",
    "es": "Extensión de traducción IA gratuita y de código abierto. Use sus propias claves API."
  },
  "about_privacy": {
    "en": "All requests go directly to your configured API endpoint. Keys stored locally.",
    "zh-CN": "所有请求直连你的 API 端点。密钥仅本地存储。",
    "ja": "すべてのリクエストは設定されたAPIエンドポイントに直接送信。キーはローカル保存。",
    "ko": "모든 요청은 구성된 API 엔드포인트로 직접 전송됩니다. 키는 로컬에 저장됩니다.",
    "de": "Alle Anfragen gehen direkt an Ihren API-Endpunkt. Schlüssel werden lokal gespeichert.",
    "fr": "Toutes les requêtes vont directement à votre endpoint API. Clés stockées localement.",
    "es": "Todas las solicitudes van directamente a su endpoint API. Claves almacenadas localmente."
  },
  "hover_translate": {
    "en": "Translate",
    "zh-CN": "翻译",
    "ja": "翻訳",
    "ko": "번역",
    "de": "Übersetzen",
    "fr": "Traduire",
    "es": "Traducir"
  },
  "hover_translating": {
    "en": "Translating...",
    "zh-CN": "翻译中...",
    "ja": "翻訳中...",
    "ko": "번역 중...",
    "de": "Übersetze...",
    "fr": "Traduction...",
    "es": "Traduciendo..."
  },
  "nav_logs": {
    "en": "Logs",
    "zh-CN": "日志",
    "ja": "ログ",
    "ko": "로그",
    "de": "Protokolle",
    "fr": "Journaux",
    "es": "Registros"
  },
  "logs_title": {
    "en": "Debug Logs",
    "zh-CN": "调试日志",
    "ja": "デバッグログ",
    "ko": "디버그 로그",
    "de": "Debug-Protokolle",
    "fr": "Journaux de débogage",
    "es": "Registros de depuración"
  },
  "thinking_mode_label": {
    "en": "Thinking Mode",
    "zh-CN": "思考模式",
    "ja": "思考モード",
    "ko": "사고 모드",
    "de": "Denkmodus",
    "fr": "Mode réflexion",
    "es": "Modo de razonamiento"
  },
  "thinking_disabled": {
    "en": "Disabled — Fast translation (recommended)",
    "zh-CN": "禁用 — 快速翻译（推荐）",
    "ja": "無効 — 高速翻訳（推奨）",
    "ko": "비활성화 — 빠른 번역 (권장)",
    "de": "Deaktiviert — Schnelle Übersetzung (empfohlen)",
    "fr": "Désactivé — Traduction rapide (recommandé)",
    "es": "Desactivado — Traducción rápida (recomendado)"
  },
  "thinking_enabled": {
    "en": "Enabled — Chain-of-thought reasoning",
    "zh-CN": "启用 — 思维链推理",
    "ja": "有効 — 思考連鎖推論",
    "ko": "활성화 — 사고 연쇄 추론",
    "de": "Aktiviert — Gedankenketten-Argumentation",
    "fr": "Activé — Raisonnement par chaîne de pensée",
    "es": "Activado — Razonamiento en cadena"
  },
  "thinking_hint": {
    "en": "Models think before answering by default. Disable for pure translation speed.",
    "zh-CN": "模型默认先思考再回答。禁用以获得纯翻译速度。",
    "ja": "モデルはデフォルトで回答前に思考します。翻訳速度を優先する場合は無効に。",
    "ko": "모델은 기본적으로 응답 전에 생각합니다. 순수 번역 속도를 위해 비활성화하세요.",
    "de": "Modelle denken standardmäßig vor der Antwort. Für reine Übersetzungsgeschwindigkeit deaktivieren.",
    "fr": "Les modèles réfléchissent avant de répondre. Désactivez pour une vitesse de traduction pure.",
    "es": "Los modelos piensan antes de responder. Desactive para velocidad de traducción pura."
  },
  "concurrency_label": {
    "en": "Parallel Requests (Speed)",
    "zh-CN": "并行请求数（速度）",
    "ja": "並列リクエスト数（速度）",
    "ko": "병렬 요청 수 (속도)",
    "de": "Parallele Anfragen (Geschwindigkeit)",
    "fr": "Requêtes parallèles (Vitesse)",
    "es": "Solicitudes paralelas (Velocidad)"
  },
  "concurrency_hint": {
    "en": "Number of parallel API calls. Higher = faster but more rate-limit risk.",
    "zh-CN": "并行API调用数量。越高越快但限流风险越大。",
    "ja": "並列API呼び出し数。多いほど高速ですがレート制限のリスクが高まります。",
    "ko": "병렬 API 호출 수. 높을수록 빠르지만 속도 제한 위험이 커집니다.",
    "de": "Anzahl paralleler API-Aufrufe. Höher = schneller, aber mehr Risiko von Ratenbegrenzung.",
    "fr": "Nombre d'appels API parallèles. Plus élevé = plus rapide mais plus de risque de limite.",
    "es": "Número de llamadas API paralelas. Más alto = más rápido pero más riesgo de límite."
  },
  "position_label": {
    "en": "Translation Position",
    "zh-CN": "译文位置",
    "ja": "翻訳の位置",
    "ko": "번역 위치",
    "de": "Übersetzungsposition",
    "fr": "Position de la traduction",
    "es": "Posición de la traducción"
  },
  "position_after": {
    "en": "After Original",
    "zh-CN": "原文之后",
    "ja": "原文の後",
    "ko": "원문 뒤",
    "de": "Nach Original",
    "fr": "Après l'original",
    "es": "Después del original"
  },
  "position_before": {
    "en": "Before Original",
    "zh-CN": "原文之前",
    "ja": "原文の前",
    "ko": "원문 앞",
    "de": "Vor Original",
    "fr": "Avant l'original",
    "es": "Antes del original"
  },
  "fontSize_label": {
    "en": "Font Size (%)",
    "zh-CN": "字号 (%)",
    "ja": "フォントサイズ (%)",
    "ko": "글꼴 크기 (%)",
    "de": "Schriftgröße (%)",
    "fr": "Taille de police (%)",
    "es": "Tamaño de fuente (%)"
  },
  "fontSize_hint": {
    "en": "Translation text size relative to original",
    "zh-CN": "译文相对原文的字号比例",
    "ja": "原文に対する翻訳テキストのサイズ比率",
    "ko": "원문 대비 번역 텍스트 크기 비율",
    "de": "Übersetzungstextgröße relativ zum Original",
    "fr": "Taille du texte traduit par rapport à l'original",
    "es": "Tamaño del texto traducido relativo al original"
  },
  "minLength_label": {
    "en": "Min Text Length",
    "zh-CN": "最小文本长度",
    "ja": "最小テキスト長",
    "ko": "최소 텍스트 길이",
    "de": "Min. Textlänge",
    "fr": "Longueur min. du texte",
    "es": "Longitud mín. de texto"
  },
  "minLength_hint": {
    "en": "Skip texts shorter than this",
    "zh-CN": "短于此的文本跳过不翻译",
    "ja": "これより短いテキストはスキップ",
    "ko": "이보다 짧은 텍스트 건너뛰기",
    "de": "Kürzere Texte überspringen",
    "fr": "Ignorer les textes plus courts",
    "es": "Omitir textos más cortos que esto"
  },
  "excludeSelector_label": {
    "en": "Extra CSS Exclude Selector",
    "zh-CN": "额外CSS排除选择器",
    "ja": "追加CSS除外セレクタ",
    "ko": "추가 CSS 제외 선택자",
    "de": "Zusätzlicher CSS-Ausschluss-Selektor",
    "fr": "Sélecteur CSS d'exclusion supplémentaire",
    "es": "Selector CSS de exclusión adicional"
  },
  "excludeSelector_hint": {
    "en": "Skip elements matching this CSS selector",
    "zh-CN": "匹配此CSS选择器的元素跳过",
    "ja": "このCSSセレクタに一致する要素をスキップ",
    "ko": "이 CSS 선택자와 일치하는 요소 건너뛰기",
    "de": "Elemente überspringen, die diesem CSS-Selektor entsprechen",
    "fr": "Ignorer les éléments correspondant à ce sélecteur CSS",
    "es": "Omitir elementos que coincidan con este selector CSS"
  },
  "hover_mode_label": {
    "en": "Hover Mode",
    "zh-CN": "悬浮模式",
    "ja": "ホバーモード",
    "ko": "호버 모드",
    "de": "Hover-Modus",
    "fr": "Mode survol",
    "es": "Modo flotante"
  },
  "hover_mode_key": {
    "en": "Hold Key + Hover",
    "zh-CN": "按住按键+悬浮",
    "ja": "キー押下＋ホバー",
    "ko": "키 누름 + 호버",
    "de": "Taste halten + Hover",
    "fr": "Maintenir touche + Survol",
    "es": "Mantener tecla + Flotar"
  },
  "hover_mode_direct": {
    "en": "Direct Hover (no key)",
    "zh-CN": "直接悬浮（无需按键）",
    "ja": "直接ホバー（キー不要）",
    "ko": "직접 호버 (키 불필요)",
    "de": "Direkter Hover (keine Taste)",
    "fr": "Survol direct (pas de touche)",
    "es": "Flotar directamente (sin tecla)"
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
