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
    "zh-CN": "?? /tr ???????????",
    "ja": "/tr ??????3???????",
    "ko": "/tr ?? ?? ?? 3?? ??",
    "de": "Mit /tr oder drei Leerzeichen am Ende ?bersetzen",
    "fr": "Utilisez /tr ou trois espaces finaux pour traduire",
    "es": "Usa /tr o tres espacios finales para traducir"
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
  },
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
  }
};
  if (typeof globalThis !== "undefined") {
    globalThis.I18N_MESSAGE_PARTS = globalThis.I18N_MESSAGE_PARTS || [];
    globalThis.I18N_MESSAGE_PARTS.push(part);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = part;
  }
})();
