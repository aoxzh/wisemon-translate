(function() {
  const part = {
  "app_name": {
    "en": "wisemon-translate",
    "zh-CN": "wisemon-translate",
    "ja": "wisemon-translate",
    "ko": "wisemon-translate",
    "de": "wisemon-translate",
    "fr": "wisemon-translate",
    "es": "wisemon-translate"
  },
  "app_desc": {
    "en": "AI-powered bilingual translation",
    "zh-CN": "AI 驱动双语翻译",
    "ja": "AIによるバイリンガル翻訳",
    "ko": "AI 기반 이중 언어 번역",
    "de": "KI-gestützte zweisprachige Übersetzung",
    "fr": "Traduction bilingue par IA",
    "es": "Traducción bilingüe con IA"
  },
  "btn_translate": {
    "en": "Translate Page",
    "zh-CN": "翻译页面",
    "ja": "ページを翻訳",
    "ko": "페이지 번역",
    "de": "Seite übersetzen",
    "fr": "Traduire la page",
    "es": "Traducir página"
  },
  "btn_restore": {
    "en": "Restore Original",
    "zh-CN": "恢复原文",
    "ja": "原文に戻す",
    "ko": "원문 복원",
    "de": "Original wiederherstellen",
    "fr": "Restaurer l'original",
    "es": "Restaurar original"
  },
  "mode_label": {
    "en": "Display Mode",
    "zh-CN": "显示模式",
    "ja": "表示モード",
    "ko": "표시 모드",
    "de": "Anzeigemodus",
    "fr": "Mode d'affichage",
    "es": "Modo de visualización"
  },
  "mode_bilingual": {
    "en": "Bilingual",
    "zh-CN": "双语对照",
    "ja": "バイリンガル",
    "ko": "이중 언어",
    "de": "Zweisprachig",
    "fr": "Bilingue",
    "es": "Bilingüe"
  },
  "mode_replace": {
    "en": "Translation Only",
    "zh-CN": "仅译文",
    "ja": "翻訳のみ",
    "ko": "번역만 표시",
    "de": "Nur Übersetzung",
    "fr": "Traduction seule",
    "es": "Solo traducción"
  },
  "shortcut_translate": {
    "en": "Translate",
    "zh-CN": "翻译",
    "ja": "翻訳",
    "ko": "번역",
    "de": "Übersetzen",
    "fr": "Traduire",
    "es": "Traducir"
  },
  "shortcut_hover": {
    "en": "Hover Mode",
    "zh-CN": "悬浮翻译",
    "ja": "ホバー翻訳",
    "ko": "호버 번역",
    "de": "Hover-Modus",
    "fr": "Mode survol",
    "es": "Modo flotante"
  },
  "settings": {
    "en": "Settings",
    "zh-CN": "设置",
    "ja": "設定",
    "ko": "설정",
    "de": "Einstellungen",
    "fr": "Paramètres",
    "es": "Configuración"
  },
  "lang_switch_title": {
    "en": "Switch to Chinese",
    "zh-CN": "切换到英文",
    "ja": "言語切替",
    "ko": "언어 전환",
    "de": "Sprache wechseln",
    "fr": "Changer de langue",
    "es": "Cambiar idioma"
  },
  "cannot_translate": {
    "en": "Cannot translate this page",
    "zh-CN": "无法翻译此页面",
    "ja": "このページは翻訳できません",
    "ko": "이 페이지를 번역할 수 없습니다",
    "de": "Diese Seite kann nicht übersetzt werden",
    "fr": "Impossible de traduire cette page",
    "es": "No se puede traducir esta página"
  },
  "no_api_key": {
    "en": "Please set API Key in Settings",
    "zh-CN": "请先在设置中配置 API Key",
    "ja": "設定でAPIキーを設定してください",
    "ko": "설정에서 API 키를 설정하세요",
    "de": "Bitte API-Key in den Einstellungen setzen",
    "fr": "Veuillez configurer la clé API dans les paramètres",
    "es": "Configure la clave API en Ajustes"
  },
  "mode_bilingual_short": {
    "en": "Bilingual",
    "zh-CN": "双语",
    "ja": "バイリンガル",
    "ko": "이중언어",
    "de": "Zweisprachig",
    "fr": "Bilingue",
    "es": "Bilingüe"
  },
  "mode_replace_short": {
    "en": "Only Trans",
    "zh-CN": "仅译文",
    "ja": "翻訳のみ",
    "ko": "번역만",
    "de": "Nur Übers.",
    "fr": "Trad. seule",
    "es": "Solo trad."
  },
  "btn_translate_bottom": {
    "en": "To Bottom",
    "zh-CN": "翻译到底",
    "ja": "最後まで翻訳",
    "ko": "끝까지 번역",
    "de": "Bis zum Ende",
    "fr": "Jusqu'en bas",
    "es": "Hasta el final"
  },
  "ctx_translate_page": {
    "en": "Translate this page",
    "zh-CN": "翻译此页面",
    "ja": "このページを翻訳",
    "ko": "이 페이지 번역",
    "de": "Diese Seite übersetzen",
    "fr": "Traduire cette page",
    "es": "Traducir esta página"
  },
  "ctx_translate_selection": {
    "en": "Translate selection",
    "zh-CN": "翻译选中文本",
    "ja": "選択テキストを翻訳",
    "ko": "선택 텍스트 번역",
    "de": "Auswahl übersetzen",
    "fr": "Traduire la sélection",
    "es": "Traducir selección"
  },
  "ctx_translate_input": {
    "en": "Translate input",
    "zh-CN": "翻译输入框",
    "ja": "入力を翻訳",
    "ko": "입력 번역",
    "de": "Eingabe übersetzen",
    "fr": "Traduire la saisie",
    "es": "Traducir entrada"
  },
  "log_empty": {
    "en": "No logs yet. Try translating something!",
    "zh-CN": "暂无日志。试试翻译吧！",
    "ja": "ログはまだありません。翻訳を試してください！",
    "ko": "아직 로그가 없습니다. 번역을 시도해보세요!",
    "de": "Noch keine Protokolle. Übersetzen Sie etwas!",
    "fr": "Pas encore de journaux. Essayez de traduire !",
    "es": "Aún no hay registros. ¡Prueba a traducir algo!"
  },
  "lang_zh-CN": {
    "en": "Chinese (Simplified)",
    "zh-CN": "简体中文",
    "ja": "中国語（簡体字）",
    "ko": "중국어 (간체)",
    "de": "Chinesisch (Vereinfacht)",
    "fr": "Chinois (simplifié)",
    "es": "Chino (simplificado)"
  },
  "lang_zh-TW": {
    "en": "Chinese (Traditional)",
    "zh-CN": "繁体中文",
    "ja": "中国語（繁体字）",
    "ko": "중국어 (번체)",
    "de": "Chinesisch (Traditionell)",
    "fr": "Chinois (traditionnel)",
    "es": "Chino (tradicional)"
  },
  "lang_en": {
    "en": "English",
    "zh-CN": "英语",
    "ja": "英語",
    "ko": "영어",
    "de": "Englisch",
    "fr": "Anglais",
    "es": "Inglés"
  },
  "lang_ja": {
    "en": "Japanese",
    "zh-CN": "日语",
    "ja": "日本語",
    "ko": "일본어",
    "de": "Japanisch",
    "fr": "Japonais",
    "es": "Japonés"
  },
  "lang_ko": {
    "en": "Korean",
    "zh-CN": "韩语",
    "ja": "韓国語",
    "ko": "한국어",
    "de": "Koreanisch",
    "fr": "Coréen",
    "es": "Coreano"
  },
  "lang_fr": {
    "en": "French",
    "zh-CN": "法语",
    "ja": "フランス語",
    "ko": "프랑스어",
    "de": "Französisch",
    "fr": "Français",
    "es": "Francés"
  },
  "lang_de": {
    "en": "German",
    "zh-CN": "德语",
    "ja": "ドイツ語",
    "ko": "독일어",
    "de": "Deutsch",
    "fr": "Allemand",
    "es": "Alemán"
  },
  "lang_es": {
    "en": "Spanish",
    "zh-CN": "西班牙语",
    "ja": "スペイン語",
    "ko": "스페인어",
    "de": "Spanisch",
    "fr": "Espagnol",
    "es": "Español"
  },
  "lang_ru": {
    "en": "Russian",
    "zh-CN": "俄语",
    "ja": "ロシア語",
    "ko": "러시아어",
    "de": "Russisch",
    "fr": "Russe",
    "es": "Ruso"
  },
  "lang_pt": {
    "en": "Portuguese",
    "zh-CN": "葡萄牙语",
    "ja": "ポルトガル語",
    "ko": "포르투갈어",
    "de": "Portugiesisch",
    "fr": "Portugais",
    "es": "Portugués"
  },
  "lang_ar": {
    "en": "Arabic",
    "zh-CN": "阿拉伯语",
    "ja": "アラビア語",
    "ko": "아랍어",
    "de": "Arabisch",
    "fr": "Arabe",
    "es": "Árabe"
  },
  "lang_auto": {
    "en": "Auto Detect",
    "zh-CN": "自动检测",
    "ja": "自動検出",
    "ko": "자동 감지",
    "de": "Automatisch",
    "fr": "Détection auto",
    "es": "Detección automática"
  },
  "subtitle_label": {
    "en": "Video Subtitles",
    "zh-CN": "视频字幕",
    "ja": "動画字幕",
    "ko": "비디오 자막",
    "de": "Video-Untertitel",
    "fr": "Sous-titres vidéo",
    "es": "Subtítulos de video"
  },
  "subtitle_desc": {
    "en": "Translate available video subtitle tracks with an overlay",
    "zh-CN": "通过覆盖层翻译可用的视频字幕轨道",
    "ja": "利用可能な字幕トラックをオーバーレイで翻訳",
    "ko": "사용 가능한 비디오 자막 트랙을 오버레이로 번역",
    "de": "Verfügbare Untertitelspuren mit Overlay übersetzen",
    "fr": "Traduire les pistes de sous-titres vidéo disponibles avec un calque",
    "es": "Traducir las pistas de subtítulos de video disponibles con una superposición"
  },
  "privacy_masking_label": {
    "en": "Privacy Masking",
    "zh-CN": "隐私脱敏",
    "ja": "プライバシーマスキング",
    "ko": "개인정보 마스킹",
    "de": "Datenschutz-Maskierung",
    "fr": "Masquage de confidentialité",
    "es": "Enmascarado de privacidad"
  },
  "privacy_masking_desc": {
    "en": "Mask sensitive data before sending text to translation APIs",
    "zh-CN": "在发送文本到翻译 API 前屏蔽敏感数据",
    "ja": "翻訳 API に送信する前に機密データをマスク",
    "ko": "번역 API로 보내기 전에 민감한 데이터를 마스킹",
    "de": "Sensible Daten vor dem Senden an Übersetzungs-APIs maskieren",
    "fr": "Masquer les données sensibles avant l’envoi aux API de traduction",
    "es": "Ocultar datos sensibles antes de enviarlos a las API de traducción"
  },
  "lang_switch_toggle": {
    "en": "Switch language",
    "zh-CN": "切换语言",
    "ja": "言語を切り替え",
    "ko": "언어 전환",
    "de": "Sprache wechseln",
    "fr": "Changer de langue",
    "es": "Cambiar idioma"
  },
  "label_engine": {
    "en": "Engine",
    "zh-CN": "引擎",
    "ja": "エンジン",
    "ko": "엔진",
    "de": "Engine",
    "fr": "Moteur",
    "es": "Motor"
  },
  "label_mode": {
    "en": "Mode",
    "zh-CN": "模式",
    "ja": "モード",
    "ko": "모드",
    "de": "Modus",
    "fr": "Mode",
    "es": "Modo"
  },
  "label_health": {
    "en": "Health",
    "zh-CN": "状态",
    "ja": "状態",
    "ko": "상태",
    "de": "Status",
    "fr": "État",
    "es": "Estado"
  },
  "label_logs": {
    "en": "Logs",
    "zh-CN": "日志",
    "ja": "ログ",
    "ko": "로그",
    "de": "Logs",
    "fr": "Journaux",
    "es": "Registros"
  },
  "label_panel": {
    "en": "Panel",
    "zh-CN": "面板",
    "ja": "パネル",
    "ko": "패널",
    "de": "Panel",
    "fr": "Panneau",
    "es": "Panel"
  },
  "provider_health_untested": {
    "en": "Untested",
    "zh-CN": "未测试",
    "ja": "未テスト",
    "ko": "미테스트",
    "de": "Ungetestet",
    "fr": "Non testé",
    "es": "Sin probar"
  },
  "provider_health_error": {
    "en": "Error",
    "zh-CN": "错误",
    "ja": "エラー",
    "ko": "오류",
    "de": "Fehler",
    "fr": "Erreur",
    "es": "Error"
  },
  "provider_health_unknown": {
    "en": "Unknown",
    "zh-CN": "未知",
    "ja": "不明",
    "ko": "알 수 없음",
    "de": "Unbekannt",
    "fr": "Inconnu",
    "es": "Desconocido"
  },
  "provider_health_ok": {
    "en": "Healthy",
    "zh-CN": "正常",
    "ja": "正常",
    "ko": "정상",
    "de": "Normal",
    "fr": "Sain",
    "es": "Correcto"
  },
  "popup_advanced_controls": { "en": "Model & subtitle controls", "zh-CN": "\u6a21\u578b\u4e0e\u5b57\u5e55\u63a7\u5236", "ja": "\u30e2\u30c7\u30eb\u3068\u5b57\u5e55", "ko": "\ubaa8\ub378 \ubc0f \uc790\ub9c9", "de": "Modell & Untertitel", "fr": "Modele et sous-titres", "es": "Modelo y subtitulos" },
  "popup_subtitles": { "en": "Subtitles", "zh-CN": "\u5b57\u5e55", "ja": "\u5b57\u5e55", "ko": "\uc790\ub9c9", "de": "Untertitel", "fr": "Sous-titres", "es": "Subtitulos" },
  "popup_track": { "en": "Track", "zh-CN": "\u8f68\u9053", "ja": "\u30c8\u30e9\u30c3\u30af", "ko": "\ud2b8\ub799", "de": "Spur", "fr": "Piste", "es": "Pista" },
  "popup_track_manual": { "en": "Manual first", "zh-CN": "\u624b\u52a8\u4f18\u5148", "ja": "\u624b\u52d5\u512a\u5148", "ko": "\uc218\ub3d9 \uc6b0\uc120", "de": "Manuell zuerst", "fr": "Manuelle d'abord", "es": "Manual primero" },
  "popup_track_auto": { "en": "Auto first", "zh-CN": "\u81ea\u52a8\u4f18\u5148", "ja": "\u81ea\u52d5\u512a\u5148", "ko": "\uc790\ub3d9 \uc6b0\uc120", "de": "Automatisch zuerst", "fr": "Auto d'abord", "es": "Auto primero" },
  "popup_track_any": { "en": "Any", "zh-CN": "\u4efb\u610f", "ja": "\u4efb\u610f", "ko": "\uc544\ubb34\uac70\ub098", "de": "Beliebig", "fr": "Toutes", "es": "Cualquiera" },
  "popup_scope_nearby": { "en": "Nearby only", "zh-CN": "\u9644\u8fd1\u7247\u6bb5", "ja": "\u8fd1\u304f\u306e\u307f", "ko": "\uc8fc\ubcc0\ub9cc", "de": "Nur nahe", "fr": "Proche seul.", "es": "Solo cerca" },
  "popup_scope_full": { "en": "Full video", "zh-CN": "\u6574\u4e2a\u89c6\u9891", "ja": "\u5168\u4f53", "ko": "\uc804\uccb4 \uc601\uc0c1", "de": "Ganzes Video", "fr": "Video entiere", "es": "Video completo" },
  "popup_current_site": { "en": "Current site", "zh-CN": "\u5f53\u524d\u7f51\u7ad9", "ja": "\u73fe\u5728\u306e\u30b5\u30a4\u30c8", "ko": "\ud604\uc7ac \uc0ac\uc774\ud2b8", "de": "Aktuelle Website", "fr": "Site actuel", "es": "Sitio actual" },
  "popup_site_controls": { "en": "Site controls", "zh-CN": "\u7ad9\u70b9\u63a7\u5236", "ja": "\u30b5\u30a4\u30c8\u8a2d\u5b9a", "ko": "\uc0ac\uc774\ud2b8 \uc81c\uc5b4", "de": "Website-Steuerung", "fr": "Controles du site", "es": "Controles del sitio" },
  "popup_manage": { "en": "Manage", "zh-CN": "\u7ba1\u7406", "ja": "\u7ba1\u7406", "ko": "\uad00\ub9ac", "de": "Verwalten", "fr": "Gerer", "es": "Gestionar" },
  "popup_manage_site_title": { "en": "Open site settings", "zh-CN": "\u6253\u5f00\u7ad9\u70b9\u8bbe\u7f6e", "ja": "\u30b5\u30a4\u30c8\u8a2d\u5b9a\u3092\u958b\u304f", "ko": "\uc0ac\uc774\ud2b8 \uc124\uc815 \uc5f4\uae30", "de": "Website-Einstellungen oeffnen", "fr": "Ouvrir les parametres du site", "es": "Abrir ajustes del sitio" },
  "popup_terms_action": { "en": "Terms", "zh-CN": "\u672f\u8bed", "ja": "\u7528\u8a9e", "ko": "\uc6a9\uc5b4", "de": "Begriffe", "fr": "Termes", "es": "Terminos" },
  "popup_exclude_action": { "en": "Exclude", "zh-CN": "\u6392\u9664", "ja": "\u9664\u5916", "ko": "\uc81c\uc678", "de": "Ausschliessen", "fr": "Exclure", "es": "Excluir" },
  "popup_already_excluded": { "en": "Excluded", "zh-CN": "\u5df2\u6392\u9664", "ja": "\u9664\u5916\u6e08\u307f", "ko": "\uc81c\uc678\ub428", "de": "Ausgeschlossen", "fr": "Exclu", "es": "Excluido" },
  "popup_terms_label": { "en": "Terms", "zh-CN": "\u672f\u8bed", "ja": "\u7528\u8a9e", "ko": "\uc6a9\uc5b4", "de": "Begriffe", "fr": "Termes", "es": "Terminos" },
  "popup_rules_label": { "en": "Rules", "zh-CN": "\u89c4\u5219", "ja": "\u30eb\u30fc\u30eb", "ko": "\uaddc\uce59", "de": "Regeln", "fr": "Regles", "es": "Reglas" },
  "popup_excluded_label": { "en": "Excluded", "zh-CN": "\u6392\u9664", "ja": "\u9664\u5916", "ko": "\uc81c\uc678", "de": "Ausgeschl.", "fr": "Exclu", "es": "Excluido" },
  "popup_none": { "en": "none", "zh-CN": "\u65e0", "ja": "\u306a\u3057", "ko": "\uc5c6\uc74c", "de": "keine", "fr": "aucun", "es": "ninguno" },
  "popup_bound": { "en": "bound", "zh-CN": "\u5df2\u7ed1\u5b9a", "ja": "\u6709\u52b9", "ko": "\uc5f0\uacb0", "de": "aktiv", "fr": "lie", "es": "vinc." },
  "popup_matched": { "en": "matched", "zh-CN": "\u5339\u914d", "ja": "\u4e00\u81f4", "ko": "\uc77c\uce58", "de": "aktiv", "fr": "actif", "es": "act." },
  "popup_yes": { "en": "yes", "zh-CN": "\u662f", "ja": "\u306f\u3044", "ko": "\uc608", "de": "ja", "fr": "oui", "es": "si" },
  "popup_no": { "en": "no", "zh-CN": "\u5426", "ja": "\u3044\u3044\u3048", "ko": "\uc544\ub2c8\uc694", "de": "nein", "fr": "non", "es": "no" },
  "popup_sub_off": { "en": "Sub off", "zh-CN": "\u5b57\u5e55\u5173", "ja": "\u5b57\u5e55OFF", "ko": "\uc790\ub9c9 \ub044\uae30", "de": "UT aus", "fr": "ST off", "es": "Sub off" },
  "popup_sub_translation": { "en": "Sub trans", "zh-CN": "\u5b57\u5e55\u8bd1\u6587", "ja": "\u5b57\u5e55\u7ffb\u8a33", "ko": "\uc790\ub9c9 \ubc88\uc5ed", "de": "UT uebers.", "fr": "ST trad.", "es": "Sub trad." },
  "popup_sub_bilingual": { "en": "Sub bi", "zh-CN": "\u53cc\u8bed\u5b57\u5e55", "ja": "\u4e8c\u8a00\u8a9e\u5b57\u5e55", "ko": "\uc774\uc911 \uc790\ub9c9", "de": "UT bi", "fr": "ST bi", "es": "Sub bi" }

};
  const commonLangs = [
  {
    "code": "zh-CN",
    "nameKey": "lang_zh-CN"
  },
  {
    "code": "zh-TW",
    "nameKey": "lang_zh-TW"
  },
  {
    "code": "en",
    "nameKey": "lang_en"
  },
  {
    "code": "ja",
    "nameKey": "lang_ja"
  },
  {
    "code": "ko",
    "nameKey": "lang_ko"
  },
  {
    "code": "fr",
    "nameKey": "lang_fr"
  },
  {
    "code": "de",
    "nameKey": "lang_de"
  },
  {
    "code": "es",
    "nameKey": "lang_es"
  },
  {
    "code": "ru",
    "nameKey": "lang_ru"
  },
  {
    "code": "pt",
    "nameKey": "lang_pt"
  },
  {
    "code": "ar",
    "nameKey": "lang_ar"
  }
];
  if (typeof globalThis !== "undefined") globalThis.I18N_COMMON_LANGS = commonLangs;
  if (typeof globalThis !== "undefined") {
    globalThis.I18N_MESSAGE_PARTS = globalThis.I18N_MESSAGE_PARTS || [];
    globalThis.I18N_MESSAGE_PARTS.push(part);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { part, commonLangs };
  }
})();
