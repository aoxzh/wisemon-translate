(function() {
  const part = {
  "theme_label": {
    "en": "Translation Style",
    "zh-CN": "翻译样式",
    "ja": "翻訳スタイル",
    "ko": "번역 스타일",
    "de": "Übersetzungsstil",
    "fr": "Style de traduction",
    "es": "Estilo de traducción"
  },
  "theme_none": {
    "en": "None (Clean)",
    "zh-CN": "无（干净）",
    "ja": "なし（クリーン）",
    "ko": "없음 (깔끔)",
    "de": "Kein (Sauber)",
    "fr": "Aucun (Propre)",
    "es": "Ninguno (Limpio)"
  },
  "theme_underline": {
    "en": "Underline",
    "zh-CN": "下划线",
    "ja": "下線",
    "ko": "밑줄",
    "de": "Unterstrichen",
    "fr": "Souligné",
    "es": "Subrayado"
  },
  "theme_dashedBorder": {
    "en": "Dashed Border",
    "zh-CN": "虚线边框",
    "ja": "破線枠",
    "ko": "점선 테두리",
    "de": "Gestrichelter Rahmen",
    "fr": "Bordure pointillée",
    "es": "Borde punteado"
  },
  "theme_solidBorder": {
    "en": "Solid Border",
    "zh-CN": "实线边框",
    "ja": "実線枠",
    "ko": "실선 테두리",
    "de": "Durchgezogener Rahmen",
    "fr": "Bordure pleine",
    "es": "Borde sólido"
  },
  "theme_dividingLine": {
    "en": "Dividing Line",
    "zh-CN": "分割线",
    "ja": "区切り線",
    "ko": "구분선",
    "de": "Trennlinie",
    "fr": "Ligne de séparation",
    "es": "Línea divisoria"
  },
  "theme_blockquote": {
    "en": "Blockquote",
    "zh-CN": "引用块",
    "ja": "引用ブロック",
    "ko": "인용 블록",
    "de": "Blockzitat",
    "fr": "Bloc de citation",
    "es": "Cita en bloque"
  },
  "theme_card": {
    "en": "Card",
    "zh-CN": "卡片",
    "ja": "カード",
    "ko": "카드",
    "de": "Karte",
    "fr": "Carte",
    "es": "Tarjeta"
  },
  "theme_paper": {
    "en": "Paper (Shadow)",
    "zh-CN": "纸张（阴影）",
    "ja": "用紙（影付き）",
    "ko": "종이 (그림자)",
    "de": "Papier (Schatten)",
    "fr": "Papier (Ombre)",
    "es": "Papel (Sombra)"
  },
  "theme_background": {
    "en": "Background",
    "zh-CN": "背景色",
    "ja": "背景色",
    "ko": "배경색",
    "de": "Hintergrund",
    "fr": "Arrière-plan",
    "es": "Fondo"
  },
  "theme_highlight": {
    "en": "Highlight",
    "zh-CN": "高亮",
    "ja": "ハイライト",
    "ko": "강조",
    "de": "Hervorhebung",
    "fr": "Surlignage",
    "es": "Resaltado"
  },
  "theme_marker": {
    "en": "Marker",
    "zh-CN": "荧光笔",
    "ja": "マーカー",
    "ko": "형광펜",
    "de": "Marker",
    "fr": "Marqueur",
    "es": "Marcador"
  },
  "theme_grey": {
    "en": "Grey Text",
    "zh-CN": "灰色文字",
    "ja": "灰色テキスト",
    "ko": "회색 텍스트",
    "de": "Grauer Text",
    "fr": "Texte gris",
    "es": "Texto gris"
  },
  "theme_italic": {
    "en": "Italic",
    "zh-CN": "斜体",
    "ja": "イタリック",
    "ko": "이탤릭",
    "de": "Kursiv",
    "fr": "Italique",
    "es": "Cursiva"
  },
  "theme_bold": {
    "en": "Bold",
    "zh-CN": "粗体",
    "ja": "太字",
    "ko": "굵게",
    "de": "Fett",
    "fr": "Gras",
    "es": "Negrita"
  },
  "theme_weakening": {
    "en": "Weakening (Faded)",
    "zh-CN": "淡化",
    "ja": "フェード",
    "ko": "흐리게",
    "de": "Verblasst",
    "fr": "Estompé",
    "es": "Atenuado"
  },
  "theme_mask": {
    "en": "Mask (Blur — Hover to Reveal)",
    "zh-CN": "模糊（悬停揭示）",
    "ja": "マスク（ぼかし — ホバーで表示）",
    "ko": "마스크 (흐림 — 호버 시 표시)",
    "de": "Maske (Unschärfe — Hover zum Anzeigen)",
    "fr": "Masque (Flou — Survoler pour révéler)",
    "es": "Máscara (Desenfoque — Pasar el cursor para revelar)"
  },
  "theme_opacity": {
    "en": "Opacity (Hover to Reveal)",
    "zh-CN": "半透明（悬停揭示）",
    "ja": "不透明度（ホバーで表示）",
    "ko": "불투명도 (호버 시 표시)",
    "de": "Deckkraft (Hover zum Anzeigen)",
    "fr": "Opacité (Survoler pour révéler)",
    "es": "Opacidad (Pasar el cursor para revelar)"
  },
  "theme_hint": {
    "en": "Visual style for translated text blocks.",
    "zh-CN": "翻译文本块的视觉样式。",
    "ja": "翻訳テキストブロックの視覚スタイル。",
    "ko": "번역된 텍스트 블록의 시각적 스타일.",
    "de": "Visueller Stil für übersetzte Textblöcke.",
    "fr": "Style visuel pour les blocs de texte traduits.",
    "es": "Estilo visual para bloques de texto traducidos."
  },
  "theme_changed": {
    "en": "Style",
    "zh-CN": "样式",
    "ja": "スタイル",
    "ko": "스타일",
    "de": "Stil",
    "fr": "Style",
    "es": "Estilo"
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
