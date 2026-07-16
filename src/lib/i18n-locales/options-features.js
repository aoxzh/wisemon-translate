(function() {
  const part = {
  "ai_action_prompt_hint": {
    "en": "Use {{text}}, {{sourceLang}}, {{targetLang}} as placeholders.",
    "zh-CN": "使用 {{text}}、{{sourceLang}}、{{targetLang}} 作占位符。",
    "ja": "{{text}}、{{sourceLang}}、{{targetLang}} をプレースホルダとして使用します。",
    "ko": "{{text}}, {{sourceLang}}, {{targetLang}}을 머리 자리표시쁜으로 사용하세요.",
    "de": "Platzhalter: {{text}}, {{sourceLang}}, {{targetLang}}.",
    "fr": "Utilisez {{text}}, {{sourceLang}}, {{targetLang}} comme placeholders.",
    "es": "Usa {{text}}, {{sourceLang}}, {{targetLang}} como marcadores."
  },
  "ai_action_output": {
    "en": "Output Mode",
    "zh-CN": "输出模式",
    "ja": "出力モード",
    "ko": "출력 모드",
    "de": "Ausgabemodus",
    "fr": "Mode de sortie",
    "es": "Modo de salida"
  },
  "ai_action_output_panel": {
    "en": "Show in popup panel",
    "zh-CN": "在弹窗面板中显示",
    "ja": "ポップアップパネルに表示",
    "ko": "팝업 패널에 표시",
    "de": "Im Popup-Panel anzeigen",
    "fr": "Afficher dans le panneau",
    "es": "Mostrar en panel emergente"
  },
  "ai_action_output_replace": {
    "en": "Replace translation result",
    "zh-CN": "替换翻译结果",
    "ja": "翻訳結果を置き換え",
    "ko": "번역 결과 대체",
    "de": "Uebersetzung ersetzen",
    "fr": "Remplacer le resultat",
    "es": "Reemplazar resultado"
  },
  "ai_action_save": {
    "en": "Save",
    "zh-CN": "保存",
    "ja": "保存",
    "ko": "저장",
    "de": "Speichern",
    "fr": "Enregistrer",
    "es": "Guardar"
  },
  "ai_action_cancel": {
    "en": "Cancel",
    "zh-CN": "取消",
    "ja": "キャンセル",
    "ko": "취소",
    "de": "Abbrechen",
    "fr": "Annuler",
    "es": "Cancelar"
  },
  "ai_action_required": {
    "en": "Name and prompt are required.",
    "zh-CN": "名称和提示词不能为空。",
    "ja": "名前とプロンプトは必須です。",
    "ko": "이름과 프롬프트가 필요합니다.",
    "de": "Name und Prompt sind erforderlich.",
    "fr": "Le nom et le prompt sont obligatoires.",
    "es": "Nombre y prompt son obligatorios."
  },
  "ai_action_saved": {
    "en": "AI Action saved.",
    "zh-CN": "AI 动作已保存。",
    "ja": "AIアクションを保存しました。",
    "ko": "AI 액션이 저장되었습니다.",
    "de": "AI-Aktion gespeichert.",
    "fr": "Action IA enregistree.",
    "es": "Accion IA guardada."
  },
  "action_speak_source": {
    "en": "🔊 Source",
    "zh-CN": "🔊 朗读原文",
    "ja": "🔊 原文を読む",
    "ko": "🔊 원문 읽기",
    "de": "🔊 Quelle",
    "fr": "🔊 Source",
    "es": "🔊 Fuente"
  },
  "action_speak_result": {
    "en": "🔊 Result",
    "zh-CN": "🔊 朗读结果",
    "ja": "🔊 結果を読む",
    "ko": "🔊 결과 읽기",
    "de": "🔊 Ergebnis",
    "fr": "🔊 Resultat",
    "es": "🔊 Resultado"
  },
  "nav_vocabulary": {
    "en": "Vocabulary",
    "zh-CN": "词汇本",
    "ja": "単語帳",
    "ko": "단어장",
    "de": "Vokabeln",
    "fr": "Vocabulaire",
    "es": "Vocabulario"
  },
  "vocabulary_title": {
    "en": "Vocabulary Bank",
    "zh-CN": "词汇本",
    "ja": "単語帳",
    "ko": "단어장",
    "de": "Vokabeltrainer",
    "fr": "Carnet de vocabulaire",
    "es": "Banco de vocabulario"
  },
  "vocabulary_desc": {
    "en": "Words and phrases you saved from the selection popup.",
    "zh-CN": "从划词弹窗保存的词汇和短语。",
    "ja": "選択ポップアップから保存した単語・熟語。",
    "ko": "선택 팝업에서 저장한 단어와 구문입니다.",
    "de": "Gespeicherte Woerter und Phrasen aus dem Auswahl-Popup.",
    "fr": "Mots et phrases sauvegardes depuis le popup de selection.",
    "es": "Palabras y frases guardadas desde el popup de seleccion."
  },
  "vocabulary_search_placeholder": {
    "en": "Search saved words...",
    "zh-CN": "搜索已保存的词汇...",
    "ja": "保存した単語を検索...",
    "ko": "저장한 단어 검색...",
    "de": "Gespeicherte Vokabeln suchen...",
    "fr": "Rechercher dans le vocabulaire...",
    "es": "Buscar palabras guardadas..."
  },
  "vocabulary_export_csv": {
    "en": "Export CSV",
    "zh-CN": "导出 CSV",
    "ja": "CSV 出力",
    "ko": "CSV 내려받기",
    "de": "CSV exportieren",
    "fr": "Exporter CSV",
    "es": "Exportar CSV"
  },
  "vocabulary_clear_all": {
    "en": "Clear All",
    "zh-CN": "清空",
    "ja": "すべて削除",
    "ko": "모두 삭제",
    "de": "Alle loeschen",
    "fr": "Tout effacer",
    "es": "Borrar todo"
  },
  "vocabulary_clear_confirm": {
    "en": "Clear all saved vocabulary?",
    "zh-CN": "清空所有已保存的词汇？",
    "ja": "保存した単語をすべて削除しますか？",
    "ko": "저장한 모든 단어를 삭제하시겠습니까?",
    "de": "Alle gespeicherten Vokabeln loeschen?",
    "fr": "Effacer tout le vocabulaire sauvegarde ?",
    "es": "Borrar todo el vocabulario guardado?"
  },
  "hover_desc": {
    "en": "Hold key or hover over text to translate",
    "zh-CN": "按住快捷键或悬停到文本上翻译",
    "ja": "キーを押すかテキストにホバーして翻訳",
    "ko": "키를 누르거나 텍스트에 호버해 번역",
    "de": "Taste halten oder Text per Hover uebersetzen",
    "fr": "Maintenez une touche ou survolez le texte",
    "es": "Mantenga una tecla o pase el cursor para traducir"
  },
  "selection_desc": {
    "en": "Select text to see translation popup",
    "zh-CN": "选中文本后显示翻译弹窗",
    "ja": "テキスト選択で翻訳ポップアップを表示",
    "ko": "텍스트를 선택하면 번역 팝업 표시",
    "de": "Text markieren, um das Uebersetzungs-Popup zu sehen",
    "fr": "Selectionnez du texte pour afficher la traduction",
    "es": "Seleccione texto para ver la traduccion"
  },
  "fab_label": {
    "en": "Floating Button",
    "zh-CN": "网页悬浮球",
    "ja": "フローティングボタン",
    "ko": "플로팅 버튼",
    "de": "Schwebende Schaltflaeche",
    "fr": "Bouton flottant",
    "es": "Boton flotante"
  },
  "fab_desc": {
    "en": "Show the page translation button; drag it to set its position",
    "zh-CN": "显示网页翻译悬浮球，开启后可拖动调整位置",
    "ja": "ページ翻訳ボタンを表示し、ドラッグで位置を調整",
    "ko": "페이지 번역 버튼을 표시하고 드래그해 위치를 조정",
    "de": "Zeigt die Seitenuebersetzung an; per Ziehen positionieren",
    "fr": "Affiche le bouton de traduction; faites-le glisser pour le placer",
    "es": "Muestra el boton de traduccion; arrastrelo para colocarlo"
  },
  "term_replacements_title": {
    "en": "Term Replacements",
    "zh-CN": "术语替换",
    "ja": "用語置換",
    "ko": "용어 치환",
    "de": "Begriffsersetzungen",
    "fr": "Remplacements de termes",
    "es": "Reemplazos de terminos"
  },
  "term_replacements_desc": {
    "en": "Define pattern-to-replacement rules applied before translation. Enable Regex for pattern-based matching, or leave unchecked for exact word-boundary matching.",
    "zh-CN": "定义翻译前应用的匹配到替换规则。启用 Regex 可按模式匹配，否则按完整词边界匹配。",
    "ja": "翻訳前に適用する置換ルールを定義します。",
    "ko": "번역 전에 적용할 패턴-치환 규칙을 정의합니다.",
    "de": "Definiert Ersetzungsregeln vor der Uebersetzung.",
    "fr": "Definit les regles de remplacement avant traduction.",
    "es": "Define reglas de reemplazo antes de traducir."
  },
  "term_add": {
    "en": "+ Add Term",
    "zh-CN": "+ 添加术语",
    "ja": "+ 用語を追加",
    "ko": "+ 용어 추가",
    "de": "+ Begriff",
    "fr": "+ Terme",
    "es": "+ Termino"
  },
  "import_json": {
    "en": "Import JSON",
    "zh-CN": "导入 JSON",
    "ja": "JSONをインポート",
    "ko": "JSON 가져오기",
    "de": "JSON importieren",
    "fr": "Importer JSON",
    "es": "Importar JSON"
  },
  "export_json": {
    "en": "Export JSON",
    "zh-CN": "导出 JSON",
    "ja": "JSONをエクスポート",
    "ko": "JSON 내보내기",
    "de": "JSON exportieren",
    "fr": "Exporter JSON",
    "es": "Exportar JSON"
  },
  "ai_terms_title": {
    "en": "AI Context Terms",
    "zh-CN": "AI 上下文术语",
    "ja": "AIコンテキスト用語",
    "ko": "AI 문맥 용어",
    "de": "AI-Kontextbegriffe",
    "fr": "Termes de contexte IA",
    "es": "Terminos de contexto IA"
  },
  "ai_terms_desc": {
    "en": "These terms are injected into the translation prompt to help the LLM understand domain-specific vocabulary.",
    "zh-CN": "这些术语会注入翻译 prompt，帮助 LLM 理解领域词汇。",
    "ja": "専門用語を翻訳プロンプトに追加します。",
    "ko": "전문 용어를 번역 프롬프트에 추가합니다.",
    "de": "Diese Begriffe werden dem Prompt hinzugefuegt.",
    "fr": "Ces termes sont ajoutes au prompt de traduction.",
    "es": "Estos terminos se agregan al prompt."
  },
  "ai_terms_label": {
    "en": "AI Terms",
    "zh-CN": "AI 术语",
    "ja": "AI用語",
    "ko": "AI 용어",
    "de": "AI-Begriffe",
    "fr": "Termes IA",
    "es": "Terminos IA"
  },
  "ai_terms_hint": {
    "en": "Each line: Term: Definition (optional context in parentheses).",
    "zh-CN": "每行：术语：定义（括号内可加上下文）。",
    "ja": "1行ずつ：用語: 定義。",
    "ko": "각 줄: 용어: 정의.",
    "de": "Je Zeile: Begriff: Definition.",
    "fr": "Une ligne : terme : definition.",
    "es": "Una linea: termino: definicion."
  },
  "legacy_glossary_hint": {
    "en": "Original format: source,translation per line. Used as fallback when structured terms are empty.",
    "zh-CN": "原格式：每行 source,translation。结构化术语为空时作为备用。",
    "ja": "従来形式: source,translation を1行ずつ。",
    "ko": "기존 형식: 한 줄에 source,translation.",
    "de": "Altes Format: source,translation pro Zeile.",
    "fr": "Ancien format : source,translation par ligne.",
    "es": "Formato anterior: source,translation por linea."
  },
  "site_rules_label": {
    "en": "Advanced Site Rules (JSON)",
    "zh-CN": "高级站点规则（JSON）",
    "ja": "高度なサイトルール (JSON)",
    "ko": "고급 사이트 규칙(JSON)",
    "de": "Erweiterte Site-Regeln (JSON)",
    "fr": "Regles avancees de site (JSON)",
    "es": "Reglas avanzadas del sitio (JSON)"
  },
  "site_rules_hint": {
    "en": "Optional. Supports matches, excludeSelectors, mainSelectors, injectedCss, disableAutoTranslate, privacyMode.",
    "zh-CN": "可选。支持 matches、excludeSelectors、mainSelectors、injectedCss、disableAutoTranslate、privacyMode。",
    "ja": "任意。matches、excludeSelectorsなどに対応。",
    "ko": "선택 사항. matches, excludeSelectors 등을 지원합니다.",
    "de": "Optional. Unterstuetzt matches, selectors und privacyMode.",
    "fr": "Optionnel. Prend en charge matches, selectors et privacyMode.",
    "es": "Opcional. Admite matches, selectores y privacyMode."
  },
  "site_subscriptions_label": {
    "en": "Rule Subscriptions",
    "zh-CN": "规则订阅",
    "ja": "ルール購読",
    "ko": "규칙 구독",
    "de": "Regel-Abonnements",
    "fr": "Abonnements de regles",
    "es": "Suscripciones de reglas"
  },
  "site_subscriptions_hint": {
    "en": "Subscribe to remote JSON rule lists. Rules are merged with built-in and local rules.",
    "zh-CN": "订阅远程 JSON 规则列表，与内置和本地规则合并。",
    "ja": "遥遅のJSONルールリストを購読します。ビルトインやローカルルールと統合されます。",
    "ko": "원격 JSON 규정 목록을 구독합니다. 기본 및 로컬 규정과 돼합됩니다.",
    "de": "Abonnieren Sie entfernte JSON-Regellisten. Regeln werden mit integrierten und lokalen Regeln zusammengefuehrt.",
    "fr": "Abonnez-vous a des listes de regles JSON distantes. Fusionne avec les regles integrees et locales.",
    "es": "Suscribase a listas de reglas JSON remotas. Se fusionan con las reglas integradas y locales."
  },
  "site_subscriptions_url_placeholder": {
    "en": "https://example.com/rules.json",
    "zh-CN": "https://example.com/rules.json",
    "ja": "https://example.com/rules.json",
    "ko": "https://example.com/rules.json",
    "de": "https://example.com/rules.json",
    "fr": "https://example.com/rules.json",
    "es": "https://example.com/rules.json"
  },
  "site_subscriptions_add": {
    "en": "Add",
    "zh-CN": "添加",
    "ja": "追加",
    "ko": "추가",
    "de": "Hinzufuegen",
    "fr": "Ajouter",
    "es": "Anadir"
  },
  "site_subscriptions_refresh_all": {
    "en": "Refresh All",
    "zh-CN": "全部刷新",
    "ja": "すべて更新",
    "ko": "모두 새로고침",
    "de": "Alle aktualisieren",
    "fr": "Tout actualiser",
    "es": "Actualizar todo"
  },
  "site_subscriptions_empty": {
    "en": "No subscriptions yet.",
    "zh-CN": "暂无订阅。",
    "ja": "まだ購読がありません。",
    "ko": "구독이 없습니다.",
    "de": "Noch keine Abonnements.",
    "fr": "Aucun abonnement pour l'instant.",
    "es": "Aun no hay suscripciones."
  },
  "site_subscriptions_added": {
    "en": "Subscription added.",
    "zh-CN": "订阅已添加。",
    "ja": "購読を追加しました。",
    "ko": "구독이 추가되었습니다.",
    "de": "Abonnement hinzugefuegt.",
    "fr": "Abonnement ajoute.",
    "es": "Suscripcion anadida."
  },
  "site_subscriptions_delete_confirm": {
    "en": "Remove subscription?",
    "zh-CN": "移除订阅？",
    "ja": "購読を解除しますか？",
    "ko": "구독을 제거하시겠습니까?",
    "de": "Abonnement entfernen?",
    "fr": "Supprimer l'abonnement ?",
    "es": "Eliminar suscripcion?"
  },
  "shortcuts_browser_desc": {
    "en": "Configure shortcuts in your browser settings.",
    "zh-CN": "在浏览器设置中配置快捷键。",
    "ja": "ブラウザ設定でショートカットを設定します。",
    "ko": "브라우저 설정에서 단축키를 설정하세요.",
    "de": "Shortcuts in den Browsereinstellungen konfigurieren.",
    "fr": "Configurez les raccourcis dans le navigateur.",
    "es": "Configure atajos en el navegador."
  },
  "logs_desc": {
    "en": "Translation failures, provider responses, site rules, and content-script diagnostics.",
    "zh-CN": "翻译失败、服务响应、站点规则和内容脚本诊断。",
    "ja": "翻訳失敗、プロバイダ応答、サイトルールの診断。",
    "ko": "번역 실패, 제공자 응답, 사이트 규칙 진단.",
    "de": "Fehler, Anbieterantworten, Site-Regeln und Diagnosen.",
    "fr": "Echecs, reponses fournisseur, regles de site et diagnostics.",
    "es": "Fallos, respuestas, reglas del sitio y diagnosticos."
  },
  "log_total": {
    "en": "Total",
    "zh-CN": "总数",
    "ja": "合計",
    "ko": "전체",
    "de": "Gesamt",
    "fr": "Total",
    "es": "Total"
  },
  "log_errors": {
    "en": "Errors",
    "zh-CN": "错误",
    "ja": "エラー",
    "ko": "오류",
    "de": "Fehler",
    "fr": "Erreurs",
    "es": "Errores"
  },
  "log_warnings": {
    "en": "Warnings",
    "zh-CN": "警告",
    "ja": "警告",
    "ko": "경고",
    "de": "Warnungen",
    "fr": "Avertissements",
    "es": "Advertencias"
  },
  "log_all_levels": {
    "en": "All Levels",
    "zh-CN": "全部级别",
    "ja": "全レベル",
    "ko": "모든 레벨",
    "de": "Alle Stufen",
    "fr": "Tous niveaux",
    "es": "Todos"
  },
  "log_errors_only": {
    "en": "Errors Only",
    "zh-CN": "仅错误",
    "ja": "エラーのみ",
    "ko": "오류만",
    "de": "Nur Fehler",
    "fr": "Erreurs seules",
    "es": "Solo errores"
  },
  "log_warnings_plus": {
    "en": "Warnings+",
    "zh-CN": "警告以上",
    "ja": "警告以上",
    "ko": "경고+",
    "de": "Warnungen+",
    "fr": "Avertissements+",
    "es": "Advertencias+"
  },
  "log_search": {
    "en": "Search logs...",
    "zh-CN": "搜索日志...",
    "ja": "ログを検索...",
    "ko": "로그 검색...",
    "de": "Logs suchen...",
    "fr": "Rechercher...",
    "es": "Buscar..."
  },
  "log_auto_scroll": {
    "en": "Auto-scroll",
    "zh-CN": "自动滚动",
    "ja": "自動スクロール",
    "ko": "자동 스크롤",
    "de": "Auto-scroll",
    "fr": "Defilement auto",
    "es": "Auto-scroll"
  },
  "refresh_btn": {
    "en": "Refresh",
    "zh-CN": "刷新",
    "ja": "更新",
    "ko": "새로고침",
    "de": "Aktualisieren",
    "fr": "Actualiser",
    "es": "Actualizar"
  },
  "copy_btn": {
    "en": "Copy",
    "zh-CN": "复制",
    "ja": "コピー",
    "ko": "복사",
    "de": "Kopieren",
    "fr": "Copier",
    "es": "Copiar"
  },
  "privacy_policy": {
    "en": "Privacy Policy",
    "zh-CN": "隐私政策",
    "ja": "プライバシーポリシー",
    "ko": "개인정보 처리방침",
    "de": "Datenschutz",
    "fr": "Politique de confidentialite",
    "es": "Politica de privacidad"
  },
  "mit_license": {
    "en": "MIT License",
    "zh-CN": "MIT 许可证",
    "ja": "MITライセンス",
    "ko": "MIT 라이선스",
    "de": "MIT-Lizenz",
    "fr": "Licence MIT",
    "es": "Licencia MIT"
  },
  "nav_subtitles": {
    "en": "Subtitles",
    "zh-CN": "字幕",
    "ja": "字幕",
    "ko": "자막",
    "de": "Untertitel",
    "fr": "Sous-titres",
    "es": "Subtitulos"
  },
  "subtitles_title": {
    "en": "Subtitle Translation",
    "zh-CN": "字幕翻译",
    "ja": "字幕翻訳",
    "ko": "자막 번역",
    "de": "Untertiteluebersetzung",
    "fr": "Traduction des sous-titres",
    "es": "Traduccion de subtitulos"
  },
  "subtitles_desc": {
    "en": "Controls for YouTube and HTML video subtitle overlays.",
    "zh-CN": "控制 YouTube 和 HTML 视频的字幕浮层。",
    "ja": "YouTube と HTML 動画の字幕オーバーレイを設定します。",
    "ko": "YouTube 및 HTML 비디오 자막 오버레이를 제어합니다.",
    "de": "Steuert Untertitel-Overlays fuer YouTube und HTML-Videos.",
    "fr": "Controle les sous-titres superposes pour YouTube et les videos HTML.",
    "es": "Controla los subtitulos superpuestos de YouTube y videos HTML."
  },
  "subtitle_mode_bilingual": {
    "en": "Bilingual subtitles",
    "zh-CN": "双语字幕",
    "ja": "二言語字幕",
    "ko": "이중 자막",
    "de": "Zweisprachige Untertitel",
    "fr": "Sous-titres bilingues",
    "es": "Subtitulos bilingues"
  },
  "subtitle_track_manual": {
    "en": "Prefer manual captions",
    "zh-CN": "优先手动字幕",
    "ja": "手動字幕を優先",
    "ko": "수동 자막 우선",
    "de": "Manuelle Untertitel bevorzugen",
    "fr": "Preferer les sous-titres manuels",
    "es": "Preferir subtitulos manuales"
  },
  "subtitle_track_auto": {
    "en": "Prefer auto captions",
    "zh-CN": "优先自动字幕",
    "ja": "自動字幕を優先",
    "ko": "자동 자막 우선",
    "de": "Automatische Untertitel bevorzugen",
    "fr": "Preferer les sous-titres auto",
    "es": "Preferir subtitulos automaticos"
  },
  "subtitle_track_any": {
    "en": "Any source track",
    "zh-CN": "任意来源轨道",
    "ja": "任意のソーストラック",
    "ko": "아무 원본 트랙",
    "de": "Beliebige Quellspur",
    "fr": "Toute piste source",
    "es": "Cualquier pista"
  },
  "subtitle_scope_nearby": {
    "en": "Translate nearby only",
    "zh-CN": "仅翻译当前附近",
    "ja": "近くのみ翻訳",
    "ko": "주변만 번역",
    "de": "Nur nahe Untertitel uebersetzen",
    "fr": "Traduire seulement autour",
    "es": "Traducir solo cerca"
  },
  "subtitle_scope_full": {
    "en": "Pre-translate full video",
    "zh-CN": "预翻译整个视频",
    "ja": "動画全体を事前翻訳",
    "ko": "전체 영상 미리 번역",
    "de": "Ganzes Video voruebersetzen",
    "fr": "Pre-traduire toute la video",
    "es": "Pretraducir todo el video"
  },
  "subtitle_skip_target": {
    "en": "Skip target-language tracks",
    "zh-CN": "跳过目标语轨道",
    "ja": "目標言語のトラックをスキップ",
    "ko": "대상 언어 트랙 건너뛰기",
    "de": "Zielsprache-Spuren ueberspringen",
    "fr": "Ignorer les pistes de langue cible",
    "es": "Omitir pistas del idioma destino"
  },
  "subtitle_preview_original": {
    "en": "Original subtitle sample",
    "zh-CN": "原文字幕示例",
    "ja": "原文字幕のサンプル",
    "ko": "원문 자막 예시",
    "de": "Original-Untertitelbeispiel",
    "fr": "Exemple de sous-titre original",
    "es": "Ejemplo de subtitulo original"
  },
  "subtitle_preview_translated": {
    "en": "Subtitle translation preview",
    "zh-CN": "字幕译文预览",
    "ja": "字幕翻訳プレビュー",
    "ko": "자막 번역 미리보기",
    "de": "Untertitel-Vorschau",
    "fr": "Apercu de traduction",
    "es": "Vista previa de traduccion"
  },
  "site_terms_title": {
    "en": "Site-bound Terms",
    "zh-CN": "按域名绑定术语",
    "ja": "サイト別用語",
    "ko": "사이트별 용어",
    "de": "Website-bezogene Begriffe",
    "fr": "Termes lies au site",
    "es": "Terminos por sitio"
  },
  "site_terms_desc": {
    "en": "Bind terms to specific domains. These rules apply only when the current page hostname matches the domain list.",
    "zh-CN": "将术语绑定到特定域名，仅当前页面主机名匹配时生效。",
    "ja": "用語を特定のドメインに紐づけ、現在のホスト名が一致する場合のみ適用します。",
    "ko": "용어를 특정 도메인에 연결합니다. 현재 페이지 호스트명이 일치할 때만 적용됩니다.",
    "de": "Bindet Begriffe an bestimmte Domains. Sie gelten nur bei passender Website.",
    "fr": "Lie les termes a des domaines precis. Ils ne s'appliquent qu'au site correspondant.",
    "es": "Vincula terminos a dominios concretos. Solo se aplican si el sitio coincide."
  },
  "site_terms_add": {
    "en": "+ Add Site Term",
    "zh-CN": "+ 添加站点术语",
    "ja": "+ サイト用語を追加",
    "ko": "+ 사이트 용어 추가",
    "de": "+ Website-Begriff",
    "fr": "+ Terme de site",
    "es": "+ Termino de sitio"
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
