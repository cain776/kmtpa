/* =========================================================================
   cms-data.js — 게시본을 받아 오고 값을 다듬는다

   화면을 모른다. document 를 건드리지 않고, 서버(또는 정적 사본)에서 받은
   JSON 을 화면이 바로 쓸 수 있는 모양으로 바꾸는 데까지만 한다. 그리는 일은
   cms.js 와 cms-newsletter.js 가 맡는다.

   cms.js 가 600줄을 넘어 이 덩어리를 뗐다. 자르는 자리를 '읽기 / 그리기' 로
   잡은 이유는, 고칠 일이 생기는 이유가 서로 다르기 때문이다 — 이쪽은 게시본의
   모양이 바뀔 때, 저쪽은 화면이 바뀔 때 손댄다.

   로드 순서: cms-data.js -> cms-newsletter.js -> cms.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  const STORAGE_KEY = 'kmtpa.homepage.published.v1';
  const API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다

  const NEWSLETTER_LIMIT = 6;

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function getCleanText(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text ? text : null;
  }

  function readLocalPublishedData() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function readPublishedData() {
    try {
      const response = await fetch(`${API_BASE}/homepage/published`, { cache: 'no-store' });
      if (response.ok) {
        const parsed = await response.json();
        if (isRecord(parsed)) {
          try {
            window.localStorage && window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch (error) {
            /* best-effort browser cache */
          }
          return parsed;
        }
      }
    } catch (error) {
      /* Offline/file preview fallback. */
    }

    /* API 가 없는 곳을 위한 정적 사본. 이 사이트는 GitHub Pages·Vercel 로
       나가는데 그쪽에는 /api 가 없어서 위 요청이 404 를 받는다. 그러면 배포한
       내용 대신 HTML 에 박혀 있던 옛 샘플이 그대로 보인다.
       서버가 배포할 때마다 같은 JSON 을 data/published.json 으로 남긴다. */
    try {
      const path = typeof NS.makePageUrl === 'function'
        ? NS.makePageUrl('data/published.json')
        : '../data/published.json';
      const response = await fetch(path, { cache: 'no-store' });
      if (response.ok) {
        const parsed = await response.json();
        if (isRecord(parsed)) {
          try {
            window.localStorage && window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch (error) {
            /* best-effort browser cache */
          }
          return parsed;
        }
      }
    } catch (error) {
      /* 파일도 없으면 마지막으로 브라우저 캐시를 본다. */
    }
    return readLocalPublishedData();
  }

  /* 게시본은 한 번만 받아 두고 그 약속을 나눠 쓴다.

     i18n.js 도 같은 것을 본다 — 사무국이 고친 번역이 i18n/*.json 보다
     우선한다. 그런데 그쪽은 app.js 안에서 먼저 돌기 시작하고, 여기는 API 가
     없는 곳에서 왕복을 한 번 더 쓴다. 기다리지 않으면 아직 도착하지 않은
     것을 읽어 번역이 조용히 버려진다 — 라이브를 재보니 i18n 이 46ms 먼저
     끝났다. */
  let pendingPublished = null;
  NS.whenPublished = function () {
    if (!pendingPublished) pendingPublished = readPublishedData();
    return pendingPublished;
  };

  function findNewsletterSection(data) {
    if (!isRecord(data)) return null;

    if (isRecord(data.newsletter) || Array.isArray(data.newsletter)) return data.newsletter;
    if (isRecord(data.homepage)) {
      if (isRecord(data.homepage.newsletter) || Array.isArray(data.homepage.newsletter)) {
        return data.homepage.newsletter;
      }
      if (isRecord(data.homepage.sections)) {
        const section = data.homepage.sections.newsletter;
        if (isRecord(section) || Array.isArray(section)) return section;
      }
    }
    if (isRecord(data.sections)) {
      const section = data.sections.newsletter;
      if (isRecord(section) || Array.isArray(section)) return section;
    }

    if (Array.isArray(data.sections)) {
      const section = data.sections.find(item => {
        if (!isRecord(item)) return false;
        return ['newsletter', 'newsletters'].includes(item.id)
          || ['newsletter', 'newsletters'].includes(item.key)
          || ['newsletter', 'newsletters'].includes(item.slug)
          || ['newsletter', 'newsletters'].includes(item.sectionId);
      });

      if (isRecord(section)) {
        if (Array.isArray(section.items)) return section.items;
        if (Array.isArray(section.drafts)) return section.drafts;
        if (isRecord(section.content) || Array.isArray(section.content)) return section.content;
        if (isRecord(section.data) || Array.isArray(section.data)) return section.data;
        return section;
      }
    }

    return null;
  }

  function pickText(record, keys) {
    for (const key of keys) {
      const text = getCleanText(record[key]);
      if (text) return text;
    }
    return null;
  }

  function getNewsletterItems(section) {
    if (Array.isArray(section)) return section;
    if (!isRecord(section)) return [];

    const content = isRecord(section.content) || Array.isArray(section.content) ? section.content : null;
    const data = isRecord(section.data) || Array.isArray(section.data) ? section.data : null;

    if (Array.isArray(section.items)) return section.items;
    if (Array.isArray(section.drafts)) return section.drafts;
    if (Array.isArray(section.cards)) return section.cards;
    if (Array.isArray(section.newsletters)) return section.newsletters;
    if (Array.isArray(content)) return content;
    if (Array.isArray(data)) return data;
    if (isRecord(content)) return getNewsletterItems(content);
    if (isRecord(data)) return getNewsletterItems(data);

    return [];
  }

  function makeIssueText(item) {
    const explicit = pickText(item, ['thumb', 'issue', 'label', 'eyebrow', 'badge']);
    if (explicit) return explicit;

    const volume = pickText(item, ['volume', 'vol', 'number']);
    const date = pickText(item, ['date', 'publishedAt', 'publishedDate', 'month']);
    if (volume && date) return `Vol. ${volume} · ${date}`;
    if (volume) return `Vol. ${volume}`;
    if (date) return date;

    return 'Newsletter';
  }

  function makeMetaText(item) {
    const explicit = pickText(item, ['meta', 'summaryMeta', 'displayMeta']);
    if (explicit) return explicit;

    const date = pickText(item, ['dateLabel', 'date', 'publishedAt', 'publishedDate', 'month']);
    const format = pickText(item, ['format', 'type']);
    const pages = pickText(item, ['pages', 'pageCount']);
    const parts = [date, format, pages && /^\d+$/.test(pages) ? `${pages}p` : pages].filter(Boolean);

    return parts.length ? parts.join(' · ') : '한국의료관광진흥협회';
  }

  /* 협회 대표 도메인은 아직 연결되지 않았다(응답 없음). 게시본에 그 절대주소가
     들어 있으면 — 푸터 '문의·연결' 칸이 그렇다 — 방문자를 사이트 밖 죽은
     페이지로 내보낸다. 같은 곳을 가리키는 내부 경로로 되돌린다.
     도메인이 붙은 뒤에도 자기 사이트 안 링크가 맞으므로 그대로 둬도 된다. */
  const OWN_ORIGIN = /^https?:\/\/(www\.)?kmtpa\.org\/?/i;

  function normalizeUrl(value) {
    const url = getCleanText(value);
    if (!url) return null;
    if (/^(javascript|data):/i.test(url)) return null;
    if (OWN_ORIGIN.test(url)) return url.replace(OWN_ORIGIN, '') || 'index.html';
    return url;
  }

  function normalizeHref(value) {
    const url = normalizeUrl(value);
    if (!url) return null;

    const routeMap = {
      'about.html': 'about/index.html',
      'communications.html': 'communications/index.html',
      'directions.html': 'directions/index.html',
      'patient-journey.html': 'patient-journey/index.html',
      'programs.html': 'programs/index.html',
      'privacy.html': 'privacy/index.html',
      'terms.html': 'terms/index.html',
      'newsletter-vol25.html': 'newsletter/vol25/index.html',
    };

    const mapped = Object.keys(routeMap).reduce((next, key) => {
      const escaped = key.replace('.', '\\.');
      return next.replace(new RegExp(`(^|/)${escaped}(#|$)`, 'g'), `$1${routeMap[key]}$2`);
    }, url);

    const indexRoutes = [
      'about',
      'communications',
      'directions',
      'patient-journey',
      'programs',
      'privacy',
      'terms',
      'newsletter/vol25',
      'newsletter/email/2026-05'
    ];

    return indexRoutes.reduce((next, route) => {
      const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return next.replace(new RegExp(`(^|/)${escaped}/(?=([?#]|$))`, 'g'), `$1${route}/index.html`);
    }, mapped);
  }

  function resolveSiteHref(value) {
    const href = normalizeHref(value);
    if (!href || href.startsWith('#')) return href;
    if (/^(mailto|tel|https?|data|javascript):/i.test(href) || href.startsWith('//') || href.startsWith('/')) {
      return href;
    }

    const route = href.replace(/^(\.\.\/)+/, '');
    return typeof NS.makePageUrl === 'function' ? NS.makePageUrl(route) : route;
  }

  function getSiteSettings(data) {
    return isRecord(data) && isRecord(data.siteSettings) ? data.siteSettings : null;
  }

  function getPages(data) {
    return isRecord(data) && isRecord(data.pages) ? data.pages : null;
  }

  function resolveAssetUrl(value) {
    const url = normalizeUrl(value);
    if (!url) return null;
    if (/^(https?|data|blob):/i.test(url) || url.startsWith('//') || url.startsWith('/')) return url;
    return typeof NS.makePageUrl === 'function' ? NS.makePageUrl(url) : url;
  }

  function normalizeArticleList(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(isRecord)
      .map(article => ({
        title: pickText(article, ['title', 'name', 'headline']),
        sourceName: pickText(article, ['sourceName', 'source', 'publisher']),
        rawCategory: pickText(article, ['rawCategory', 'categoryName', 'category']),
        publishedAt: pickText(article, ['publishedAt', 'date']),
      }))
      .filter(article => article.title)
      .slice(0, 8);
  }

  function normalizeOutline(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(isRecord)
      .map(section => {
        const heading = pickText(section, ['heading', 'title', 'name']);
        const bullets = Array.isArray(section.bullets)
          ? section.bullets.map(getCleanText).filter(Boolean)
          : normalizeArticleList(section.articles).map(article => article.title);
        return { heading, bullets };
      })
      .filter(section => section.heading && section.bullets.length)
      .slice(0, 4);
  }

  function normalizeNewsletter(section) {
    const items = getNewsletterItems(section)
      .filter(isRecord)
      .map(item => {
        const title = pickText(item, ['title', 'name', 'headline']);
        if (!title) return null;

        return {
          title,
          thumb: makeIssueText(item),
          // 표지 이미지. 게시본이 들고 오면 카드가 글자 대신 그림을 쓴다.
          cover: resolveSiteHref(pickText(item, ['cover', 'coverImage', 'thumbnail', 'image'])),
          meta: makeMetaText(item),
          summary: pickText(item, ['summary', 'previewText', 'lede', 'description']),
          lede: pickText(item, ['lede', 'summary', 'previewText', 'description']),
          articles: normalizeArticleList(item.selectedArticles || item.articles || item.items),
          outline: normalizeOutline(item.outline || item.sections),
          href: resolveSiteHref(item.href || item.url || item.link || item.pageUrl || item.permalink),
          pubId: pickText(item, ['pubId', 'id', 'slug', 'key']) || '',
          download: null
        };
      })
      .filter(Boolean)
      .slice(0, NEWSLETTER_LIMIT);

    // 빈 배열도 그대로 돌려줍니다. 사무국이 전부 내렸다는 뜻이므로 정적
    // 카드를 남기면 안 됩니다. '섹션 자체가 없음'(게시본 없음)은 호출부에서
    // findNewsletterSection 이 null 을 주는 것으로 구분합니다.
    return items;
  }
  window.KMTPACmsData = {
    isRecord, getCleanText, getSiteSettings, getPages,
    resolveSiteHref, resolveAssetUrl,
    findNewsletterSection, normalizeNewsletter, NEWSLETTER_LIMIT,
  };
})(window.KMTPA);
