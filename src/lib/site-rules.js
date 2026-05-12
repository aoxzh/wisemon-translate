/**
 * Site rules v1.
 * A small local rule engine inspired by Immersive/Kiss rules, without remote config.
 */
(function() {
  const BUILT_IN_SITE_RULES = [
    {
      id: 'translator-sites',
      matches: ['translate.google.com', 'www.deepl.com', 'www.bing.com/translator'],
      disabled: true,
      reason: 'Native translator page'
    },
    {
      id: 'banking-privacy',
      matches: [
        'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com',
        'capitalone.com', 'paypal.com', 'stripe.com'
      ],
      disableAutoTranslate: true,
      privacyMode: 'strict',
      excludeSelectors: ['input', 'textarea', '[contenteditable="true"]']
    },
    {
      id: 'crypto-trading-sensitive',
      matches: [
        'binance.com', '*.binance.com',
        'coinbase.com', '*.coinbase.com',
        'kraken.com', '*.kraken.com',
        'okx.com', '*.okx.com',
        'bybit.com', '*.bybit.com',
        'kucoin.com', '*.kucoin.com'
      ],
      disableAutoTranslate: true,
      privacyMode: 'strict',
      excludeSelectors: [
        'input', 'textarea', 'select', 'button', '[role="button"]', '[contenteditable="true"]',
        'canvas', 'svg', 'iframe', '.tradingview-widget-container', '[class*="TradingView"]',
        '[class*="chart"]', '[class*="Chart"]', '[id*="chart"]', '[data-testid*="chart"]',
        '[class*="kline"]', '[class*="Kline"]', '[class*="candlestick"]', '[class*="depth"]',
        '[class*="orderbook"]', '[class*="OrderBook"]', '[data-testid*="orderbook"]',
        '[class*="ticker"]', '[class*="Ticker"]', '[class*="market"]', '[class*="Market"]',
        '[class*="price"]', '[class*="Price"]', '[class*="currency"]', '[class*="Currency"]',
        '[class*="balance"]', '[class*="Balance"]', '[class*="asset"]', '[class*="Asset"]',
        '[class*="wallet"]', '[class*="Wallet"]', '[class*="portfolio"]', '[class*="Portfolio"]',
        '[class*="order"]', '[class*="Order"]', '[class*="trade"]', '[class*="Trade"]',
        '[class*="buy"]', '[class*="Buy"]', '[class*="sell"]', '[class*="Sell"]',
        '[class*="margin"]', '[class*="Margin"]', '[class*="leverage"]', '[class*="Leverage"]',
        '[class*="pnl"]', '[class*="PnL"]', '[class*="profit"]', '[class*="loss"]',
        '[data-testid*="wallet"]', '[data-testid*="order"]', '[data-testid*="trade"]',
        '[data-testid*="buy"]', '[data-testid*="sell"]', '[data-testid*="balance"]',
        '[aria-label*="Buy"]', '[aria-label*="Sell"]', '[aria-label*="Order"]',
        'nav', 'header', 'footer', '[role="navigation"]'
      ],
      contextHint: 'This is a cryptocurrency exchange or trading platform. Never alter prices, tickers, asset symbols, wallet balances, order forms, leverage/margin data, charts, order books, PnL, or trading controls. Translate only explanatory prose when the user explicitly requests translation.'
    },
    {
      id: 'binance-content',
      matches: [
        'binance.com/en/support', 'www.binance.com/en/support',
        'binance.com/en/academy', 'academy.binance.com',
        'binance.com/en/blog', 'www.binance.com/en/blog',
        'binance.com/en/square', 'www.binance.com/en/square',
        'binance.com/en/announcement', 'www.binance.com/en/announcement'
      ],
      mainSelectors: [
        'main article', 'article', '[role="main"]',
        '[class*="article"]', '[class*="Article"]',
        '[class*="content"]', '[class*="Content"]',
        '[class*="rich-text"]', '[class*="RichText"]',
        '[class*="markdown"]', '[class*="Markdown"]',
        '[data-bn-type="text"]'
      ],
      includeSelectors: [
        'article h1', 'article h2', 'article h3', 'article p', 'article li',
        '[class*="article"] h1', '[class*="article"] h2', '[class*="article"] p',
        '[class*="content"] h1', '[class*="content"] h2', '[class*="content"] p',
        '[class*="markdown"] p', '[class*="markdown"] li'
      ],
      excludeSelectors: [
        '[class*="Related"]', '[class*="related"]', '[class*="Share"]', '[class*="share"]',
        '[class*="Author"]', '[class*="author"]', '[class*="Breadcrumb"]', '[class*="breadcrumb"]',
        '[class*="Subscribe"]', '[class*="subscribe"]', '[class*="Side"]', '[class*="side"]',
        'time', '.tag', '[class*="tag"]'
      ],
      contextHint: 'This is Binance educational, support, blog, or announcement content. Preserve token symbols, chain names, product names, risk warnings, URLs, dates, and numeric values. Translate the article/help prose only.'
    },
    {
      id: 'code-hosting',
      matches: ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com'],
      excludeSelectors: [
        'pre', 'code', '.highlight', '.blob-code', '.cm-editor', '.monaco-editor',
        '[class*="code"]', '[data-testid="code-cell"]'
      ],
      mainSelectors: ['main', 'article', '.markdown-body', '#content'],
      contextHint: 'This page contains software engineering content. Preserve code identifiers, CLI commands, package names, API names, and file paths exactly.'
    },
    {
      id: 'docs',
      matches: ['developer.mozilla.org', 'docs.github.com', 'learn.microsoft.com'],
      excludeSelectors: ['pre', 'code', '.code-toolbar', '.highlight'],
      mainSelectors: ['main', 'article', '.main-content', '#content'],
      contextHint: 'This page is technical documentation. Keep product names, APIs, parameters, code identifiers, and UI labels accurate.'
    },
    {
      id: 'vitepress-docs',
      matches: ['vuejs.org', 'vitepress.dev', 'vite.dev', 'nuxt.com'],
      excludeSelectors: [
        'pre', 'code', 'kbd', 'samp', '.vp-code', '.vp-doc div[class*="language-"]',
        '.VPSidebar', '.VPNav', '.VPDocAside', '.VPLocalNav', '.VPFooter',
        '.sponsors', '.sponsor', '[class*="sponsor"]', '[class*="carbon"]',
        'nav', 'header', 'footer', 'aside'
      ],
      mainSelectors: ['main .vp-doc', '.VPDoc .vp-doc', 'main article', 'main'],
      contextHint: 'This is Vue/VitePress technical documentation. Preserve Vue API names, component names, directives, file extensions, JavaScript identifiers, HTML tags, and CLI commands. Translate prose in the main document body.'
    },
    {
      id: 'video-common',
      matches: ['youtube.com', 'youtu.be', 'vimeo.com', 'coursera.org', 'udemy.com'],
      preferSubtitleOverlay: true,
      excludeSelectors: ['.ytp-caption-window-container', '.vjs-text-track-display']
    },
    {
      id: 'twitter-x',
      matches: ['x.com', 'twitter.com', 'tweetdeck.twitter.com', 'pro.twitter.com'],
      excludeSelectors: [
        '[data-testid="app-bar-back"]', '[data-testid="topNavBar"]',
        '[role="navigation"]', 'nav[aria-label]', '[data-testid="SideNav"]',
        '[data-testid="tweetButton"]', '[data-testid="tweetButtonInline"]',
        'time', '[data-testid="User-Name"] a', '[href*="/status/"] time',
        'input', 'textarea', '[contenteditable="true"]',
        '[aria-label][role="button"][data-testid]', '[data-testid="appTabBar"]'
      ],
      mainSelectors: ['article[data-testid="tweet"]', 'main[role="main"]'],
      injectedCss: [
        '.llm-translate-block-wrapper{display:inline!important;margin:0 0 0 6px!important;padding:0!important;border:none!important;background:none!important;box-shadow:none!important}',
        '.llm-translate-block-wrapper .llm-translate-inner{display:inline!important;font-size:0.88em!important;font-weight:400!important;line-height:1.35!important}',
        '[data-testid="tweetText"] .llm-translate-block-wrapper{display:inline!important}'
      ],
      contextHint: 'This is a social media feed. Keep usernames (@), hashtags (#), URLs, and emoji untranslated. Only translate the actual post content.'
    },
    {
      id: 'social-media',
      matches: ['reddit.com', 'news.ycombinator.com', 'linkedin.com/feed'],
      excludeSelectors: [
        'nav', '[role="navigation"]', 'header', '[class*="vote"]',
        '[class*="score"]', 'time', '[class*="timestamp"]',
        'input', 'textarea', '[contenteditable="true"]',
        '[class*="username"]', '[class*="author"]', '[class*="subreddit"]'
      ],
      mainSelectors: ['main', '[role="main"]', '[data-testid="post-container"]', '.Post', '[class*="post"]'],
      injectedCss: [
        '.llm-translate-block-wrapper{display:inline!important;margin:0 0 0 6px!important;padding:0!important}'
      ],
      contextHint: 'This is a social media / forum page. Preserve usernames, subreddit names, vote counts, timestamps, and platform-specific terms.'
    },
    {
      id: 'wikipedia',
      matches: ['wikipedia.org', 'wikimedia.org', 'wiktionary.org'],
      excludeSelectors: [
        '.infobox', '.navbox', '.reference', '.citation', 'sup',
        '.thumbinner', '.toc', '.mw-editsection', '.catlinks',
        'table', 'code', 'pre'
      ],
      mainSelectors: ['#mw-content-text', '.mw-parser-output', 'article'],
      contextHint: 'This is a Wikipedia article. Preserve article titles, proper nouns, technical terms, citations, and interwiki links. Translate the main prose content only.'
    },
    {
      id: 'medium-substack',
      matches: ['medium.com', '*.medium.com', 'substack.com', '*.substack.com', 'hashnode.dev', 'dev.to'],
      excludeSelectors: [
        'nav', 'header', 'aside', '[role="navigation"]',
        'pre', 'code', '[class*="code"]',
        '[data-testid="authorName"]', '[data-testid="date"]'
      ],
      mainSelectors: ['article', '[class*="post-content"]', '[class*="article-content"]', 'main'],
      contextHint: 'This is a blog/article platform. Preserve author names, publication names, code blocks, and technical terms. Focus on the main article body.'
    },
    {
      id: 'quora-qa',
      matches: ['quora.com', 'stackoverflow.com', 'stackexchange.com', 'superuser.com', 'serverfault.com'],
      excludeSelectors: [
        'nav', 'header', '[role="navigation"]',
        'pre', 'code', '.s-code-block', '[class*="code"]',
        '.user-info', '.post-signature', '.vote', '[class*="vote"]',
        'time', '[class*="time"]'
      ],
      mainSelectors: ['.question', '.answer', '.post-text', '[class*="content"]'],
      contextHint: 'This is a Q&A platform. Preserve usernames, reputation scores, badges, tags, and code blocks. Translate question titles and answer bodies only.'
    },
    {
      id: 'telegram-discord',
      matches: ['web.telegram.org', 'web.telegram.k', 'discord.com', 'discordapp.com'],
      excludeSelectors: [
        '[class*="username"]', '[class*="timestamp"]', '[class*="time"]',
        '[class*="reaction"]', '[class*="emoji"]', 'input', 'textarea'
      ],
      mainSelectors: ['[class*="message-content"]', '[class*="chat-content"]'],
      contextHint: 'This is an instant messaging platform. Preserve usernames, timestamps, emoji reactions, and message metadata. Translate message text only.'
    },
    {
      id: 'ecommerce',
      matches: ['ebay.com', 'aliexpress.com', 'taobao.com', 'tmall.com', 'jd.com'],
      disableAutoTranslate: true,
      excludeSelectors: [
        'input', 'textarea', 'button', '[role="button"]',
        '[class*="price"]', '[class*="currency"]', '[data-cy*="price"]',
        'nav', '[role="navigation"]'
      ],
      contextHint: 'This is an e-commerce site. Preserve product names, brand names, model numbers, prices, and SKU codes. Do not translate automatically without user action.'
    },
    {
      id: 'amazon-product',
      matches: [
        'amazon.com', 'amazon.co.*', 'amazon.jp', 'amazon.co.jp',
        'www.amazon.com', 'www.amazon.co.jp', 'smile.amazon.com'
      ],
      disableAutoTranslate: true,
      mainSelectors: [
        '#dp-container', '#ppd', '#centerCol', '#desktop_unifiedPrice',
        '#feature-bullets', '#productDescription', '#aplus', '#detailBullets_feature_div',
        '#productDetails_feature_div', '#importantInformation', '#reviewsMedley'
      ],
      includeSelectors: [
        '#productTitle', '#feature-bullets li', '#productDescription',
        '#aplus', '#detailBullets_feature_div li', '#productDetails_feature_div',
        '#importantInformation', '[data-feature-name="productDescription"]'
      ],
      excludeSelectors: [
        'input', 'textarea', 'select', 'button', '[role="button"]',
        '#nav-main', '#navbar', '#navFooter', '#rhf', '#sponsoredProducts_feature_div',
        '#desktop_buybox', '#buybox', '#rightCol', '#attach-accessory-pane',
        '#ask_feature_div', '#customerReviews', '#cm_cr-review_list',
        '.a-price', '.a-color-price', '.a-price-whole', '.a-price-fraction',
        '.offer-price', '.currencyINR', '.currencyUSD', '[class*="price"]',
        '[id*="price"]', '[data-csa-c-type="widget"]',
        '[aria-label*="Add to Cart"]', '[aria-label*="Buy Now"]'
      ],
      contextHint: 'This is an Amazon product page. Preserve brand names, model numbers, size/color variants, SKU/ASIN, prices, ratings, stock status, and delivery dates. Translate product title, feature bullets, descriptions, specifications, warnings, and review prose only.'
    },
    {
      id: 'p-bandai-product',
      matches: [
        'p-bandai.jp', 'p-bandai.com', 'p-bandai.hk', 'p-bandai.com.tw',
        'p-bandai.co.kr', 'p-bandai.com/us', 'p-bandai.com/uk'
      ],
      disableAutoTranslate: true,
      mainSelectors: [
        'main', '#main', '#contents', '#product_detail', '.product-detail',
        '.item-detail', '.itemDetail', '.commodity-detail', '.detailArea'
      ],
      includeSelectors: [
        'h1', '.product-name', '.item-name', '.itemName', '.catch-copy',
        '.description', '.product-description', '.item-description',
        '.spec', '.specification', '.detail', '.attention', '.notice',
        '.materials', '.set-content', '.contents'
      ],
      excludeSelectors: [
        'input', 'textarea', 'select', 'button', '[role="button"]',
        'nav', 'header', 'footer', '.breadcrumb', '.global-nav',
        '.price', '[class*="price"]', '.tax', '.point', '.stock', '.cart',
        '.favorite', '.sns', '.share', '.recommend', '.ranking',
        '.banner', '.campaign', '.modal', '.login', '.member'
      ],
      contextHint: 'This is a Premium Bandai product page. Preserve product series names, character names, brand names, model names, JAN/SKU codes, release month, scale, materials, dimensions, prices, and preorder dates. Translate product title, descriptions, specifications, warnings, and included-item lists only.'
    },
    {
      id: 'news-media',
      matches: ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com', 'apnews.com', 'washingtonpost.com', 'ft.com', 'economist.com'],
      excludeSelectors: [
        'nav', 'header', 'aside', '[role="navigation"]',
        '.byline', '.author', 'time', '[class*="timestamp"]',
        '[class*="caption"]', '[class*="credit"]'
      ],
      mainSelectors: ['article', '[class*="article-body"]', '[class*="story-body"]', 'main'],
      contextHint: 'This is a news/media site. Preserve journalist names, publication names, datelines, photo captions, and proper nouns. Translate the main article body only.'
    },
    {
      id: 'notion-confluence',
      matches: ['notion.so', '*.notion.site', 'atlassian.net', 'confluence.atlassian.net'],
      disableAutoTranslate: true,
      excludeSelectors: [
        'input', 'textarea', '[contenteditable="true"]',
        '[class*="property"]', '[class*="database"]', '[class*="board"]'
      ],
      contextHint: 'This is a workspace/documentation platform. Preserve page titles, database properties, and structured data. Do not translate automatically without user action.'
    }
  ];

  function hostPath(url) {
    try {
      const u = new URL(url || location.href);
      return `${u.hostname}${u.pathname}`.toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function normalizePattern(pattern) {
    return String(pattern || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }

  function patternMatches(url, pattern) {
    const target = hostPath(url);
    const p = normalizePattern(pattern);
    if (!p) return false;
    if (p.includes('*')) {
      const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}`).test(target);
    }
    return target === p || target.startsWith(p + '/') || target.endsWith('.' + p) || target.includes('/' + p);
  }

  function parseUserRules(raw) {
    if (!raw || !String(raw).trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      if (typeof LOG !== 'undefined') LOG.warn('Rules', `Invalid user site rules: ${e.message}`);
      return [];
    }
  }

  function mergeArray(a, b) {
    return [...new Set([...(a || []), ...(b || [])].filter(Boolean))];
  }

  function mergeRule(base, next) {
    const merged = { ...base, ...next };
    merged.excludeSelectors = mergeArray(base.excludeSelectors, next.excludeSelectors);
    merged.includeSelectors = mergeArray(base.includeSelectors, next.includeSelectors);
    merged.mainSelectors = mergeArray(base.mainSelectors, next.mainSelectors);
    merged.injectedCss = mergeArray(base.injectedCss, next.injectedCss);
    if (base.contextHint && next.contextHint) {
      merged.contextHint = base.contextHint + '\n' + next.contextHint;
    }
    return merged;
  }

  function getSiteRule(url, settings = {}) {
    const userRules = parseUserRules(settings.siteRules);
    const allRules = [...BUILT_IN_SITE_RULES, ...userRules];
    let matched = { id: 'default', excludeSelectors: [], includeSelectors: [], mainSelectors: [], injectedCss: [] };
    const matchedIds = [];
    for (const rule of allRules) {
      const patterns = Array.isArray(rule.matches) ? rule.matches : [rule.matches];
      if (patterns.some(pattern => patternMatches(url, pattern))) {
        matched = mergeRule(matched, rule);
        matchedIds.push(rule.id || patterns[0]);
      }
    }
    matched.matchedIds = matchedIds;
    return matched;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.BUILT_IN_SITE_RULES = BUILT_IN_SITE_RULES;
    globalThis.getSiteRule = getSiteRule;
    globalThis.patternMatchesSiteRule = patternMatches;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BUILT_IN_SITE_RULES, getSiteRule, patternMatches };
  }
})();
