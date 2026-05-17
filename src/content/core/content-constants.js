(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };

  const TAG_NAME = 'llm-translate';
  const ATTR_PROCESSED = 'data-llm-done';
  const ATTR_ID = 'data-llm-id';
  const ATTR_OBSERVED = 'data-llm-observed';

  const BLOCK_TAGS = new Set([
    'ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','DD','DIV','DL','DT',
    'FIELDSET','FIGCAPTION','FIGURE','FOOTER','FORM','H1','H2','H3','H4','H5','H6',
    'HEADER','LI','MAIN','NAV','OL','P','PRE','SECTION','TABLE','TD','TFOOT','TH','UL'
  ]);

  const WARP_TAGS = new Set([
    'A','ABBR','B','BDI','BDO','BIG','CITE','CODE','DEL','DFN','EM',
    'FONT','I','INS','KBD','LABEL','MARK','Q','RP','RT','RUBY','S',
    'SAMP','SMALL','SPAN','STRONG','SUB','SUP','TIME','TT','U','VAR'
  ]);

  const REPLACE_TAGS = new Set(['IMG','SVG','CANVAS','VIDEO','AUDIO','IFRAME','OBJECT','EMBED']);
  const IGNORE_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','TEMPLATE','AREA','MAP','WBR','BR','HR','PRE','CODE','KBD','SAMP']);
  const STRICT_PARENT_TAGS = new Set(['TR', 'UL', 'OL', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'SELECT']);

  const IGNORE_SELECTOR = `pre, code, kbd, samp, [contenteditable='true'], [translate='no'], .notranslate, [class*="${TAG_NAME}-block-wrapper"], [class*="${TAG_NAME}-inline-wrapper"], #llm-translate-inline-styles, .llm-translate-hover-btn, .llm-translate-popup`;

  const SKIP_PATTERNS = [
    /^(?:https?:\/\/|www\.)[^\s]*$/i,
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /^[\d.,\s%pxemremptvwvhdegs]+$/,
    /^[^\p{L}\p{N}\s]{1,5}$/u,
    /^&[a-z]+;$/i,
    /^\[\d+\]$/,
    /^\d{1,2}:\d{2}(:\d{2})?$/,
    /^#[A-Fa-f0-9]{3,8}$/,
    /^\s*[\{\[]/,
    /^\s*<\/?[a-zA-Z]+/,
    /[a-zA-Z0-9+/]{50,}={0,2}/,
    /\$\{[^}]+\}/,
    /\{\{[^}]+\}\}/
  ];

  const NON_CONTENT_PATTERNS = [
    /^\s*function\s*\(/,
    /^\s*\{[^}]*"[^"]+"\s*:/,
    /^\s*\/\//,
    /ue\.count|ue_csm|\.execute\(/,
    /^[A-Z0-9]{10,}$/,
    /^\s*P\.when\(/,
    /^\s*\[.*\{.*\}.*\]/
  ];

  ctx.constants = {
    TAG_NAME,
    ATTR_PROCESSED,
    ATTR_ID,
    ATTR_OBSERVED,
    BLOCK_TAGS,
    WARP_TAGS,
    REPLACE_TAGS,
    IGNORE_TAGS,
    IGNORE_SELECTOR,
    SKIP_PATTERNS,
    NON_CONTENT_PATTERNS,
    STRICT_PARENT_TAGS
  };

  ctx.state.tagName = TAG_NAME;
  ctx.state.attrProcessed = ATTR_PROCESSED;
  ctx.state.attrObserved = ATTR_OBSERVED;
})();
