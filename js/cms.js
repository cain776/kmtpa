/* =========================================================================
   cms.js - lightweight static CMS bridge for the public homepage

   Reads published homepage content from the API and applies it to the existing
   static DOM. If the API is unavailable, this file falls back to localStorage
   and leaves authored HTML untouched when no valid data exists.
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  const STORAGE_KEY = 'kmtpa.homepage.published.v1';
  const API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다

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
    return readLocalPublishedData();
  }

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

  function normalizeUrl(value) {
    const url = getCleanText(value);
    if (!url) return null;
    if (/^(javascript|data):/i.test(url)) return null;
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

  function setText(el, value) {
    const text = getCleanText(value);
    if (el && text) el.textContent = text;
  }

  function setMultilineText(el, value) {
    const text = getCleanText(value);
    if (!el || !text) return;
    const parts = text.split(/\n|<br\s*\/?>/i);
    el.textContent = '';
    parts.forEach((part, index) => {
      if (index > 0) el.appendChild(document.createElement('br'));
      el.append(part);
    });
  }

  function setHref(el, value) {
    const href = resolveSiteHref(value);
    if (el && href) el.setAttribute('href', href);
  }

  function resolveAssetUrl(value) {
    const url = normalizeUrl(value);
    if (!url) return null;
    if (/^(https?|data|blob):/i.test(url) || url.startsWith('//') || url.startsWith('/')) return url;
    return typeof NS.makePageUrl === 'function' ? NS.makePageUrl(url) : url;
  }

  function setMeta(name, content, attrName = 'name') {
    const text = getCleanText(content);
    if (!text) return;
    let meta = document.querySelector(`meta[${attrName}="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attrName, name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', text);
  }

  function getCurrentPageKey() {
    const current = String(NS.path || '').toLowerCase();
    if (current === 'about/' || current === 'about/index.html') return 'about';
    if (current === 'patient-journey/' || current === 'patient-journey/index.html') return 'patientJourney';
    if (current === 'programs/' || current === 'programs/index.html') return 'programs';
    if (current === 'communications/' || current === 'communications/index.html') return 'communications';
    if (current === 'directions/' || current === 'directions/index.html') return 'directions';
    return 'home';
  }

  function applyDesign(settings) {
    if (!isRecord(settings) || !isRecord(settings.design)) return false;
    const design = settings.design;
    const vars = {
      navy900: '--navy-900',
      navy800: '--navy-800',
      navy700: '--navy-700',
      navy100: '--navy-100',
      bgSubtle: '--bg-subtle',
      textHeading: '--text-heading',
      textBody: '--text-body',
      textMuted: '--text-muted',
      borderDefault: '--border-default',
    };
    Object.keys(vars).forEach(key => {
      const value = getCleanText(design[key]);
      if (value) document.documentElement.style.setProperty(vars[key], value);
    });

    document.querySelectorAll('.header-cta').forEach(el => {
      el.hidden = design.headerCtaVisible === false;
    });
    document.querySelectorAll('.quick-banner').forEach(el => {
      el.hidden = design.quickBannerVisible === false;
    });
    return true;
  }

  function applyBrand(settings) {
    if (!isRecord(settings) || !isRecord(settings.brand)) return false;
    const brand = settings.brand;
    document.querySelectorAll('.brand-name .ko').forEach((el, index) => {
      setText(el, index > 0 ? brand.footerKoName || brand.koName : brand.koName);
    });
    document.querySelectorAll('.brand-name .en').forEach(el => setText(el, brand.enName));
    document.querySelectorAll('.brand-mark img').forEach(img => {
      const src = resolveAssetUrl(brand.logoUrl);
      if (src) img.setAttribute('src', src);
      img.setAttribute('alt', brand.koName || 'KMTPA');
    });
    // .header-cta 는 이제 회원 로그인이라 brand.adminLabel(관리자 로그인)로
    // 덮어쓰지 않습니다. 덮어쓰면 CMS 를 한 번이라도 게시한 순간 버튼 이름이
    // '관리자 로그인' 으로 되돌아갑니다.
    document.querySelectorAll('.footer-tagline').forEach(el => setText(el, brand.footerTagline));
    document.querySelectorAll('.footer-brand-label').forEach(el => setText(el, brand.flagshipLabel));
    // 날개 배너는 회원가입 링크가 앞에 붙어 순서가 바뀌므로 위치 대신 클래스로 집습니다.
    document.querySelectorAll('.footer-brand-link, .quick-link--flagship').forEach(el => {
      setText(el.childNodes[0], brand.flagshipName);
      setHref(el, brand.flagshipUrl);
    });
    document.querySelectorAll('.quick-link--instagram, .footer-social a[aria-label="Instagram"]').forEach(el => {
      setHref(el, brand.instagramUrl);
    });
    return true;
  }

  function createNavLink(item, active) {
    const link = document.createElement('a');
    link.href = resolveSiteHref(item.href) || '#';
    link.textContent = item.label || '메뉴';
    if (active) {
      link.className = 'active';
      link.setAttribute('aria-current', 'page');
    }
    return link;
  }

  function applyNav(settings) {
    if (!isRecord(settings) || !Array.isArray(settings.nav)) return false;
    const nav = document.getElementById('top-nav');
    if (!nav) return false;

    const currentPage = getCurrentPageKey();
    nav.replaceChildren(...settings.nav.filter(isRecord).map(item => {
      const children = Array.isArray(item.children) ? item.children.filter(isRecord) : [];
      const active = String(item.href || '').includes(currentPage.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`));
      if (!children.length) return createNavLink(item, active);

      const wrap = document.createElement('div');
      wrap.className = 'nav-item-with-dropdown';
      wrap.appendChild(createNavLink(item, active));
      const dropdown = document.createElement('div');
      dropdown.className = children.length > 3 ? 'nav-dropdown nav-dropdown--mega' : 'nav-dropdown';
      dropdown.setAttribute('role', 'menu');
      const group = document.createElement('div');
      group.className = 'dropdown-group';
      const label = document.createElement('div');
      label.className = 'dropdown-group-label';
      label.textContent = item.label || '메뉴';
      group.appendChild(label);
      children.forEach(child => {
        const childLink = createNavLink(child, false);
        childLink.setAttribute('role', 'menuitem');
        group.appendChild(childLink);
      });
      dropdown.appendChild(group);
      wrap.appendChild(dropdown);
      return wrap;
    }));
    return true;
  }

  function applyFooter(settings) {
    if (!isRecord(settings) || !isRecord(settings.footer) || !Array.isArray(settings.footer.columns)) return false;
    const columns = Array.from(document.querySelectorAll('.site-footer .footer-col'));
    settings.footer.columns.filter(isRecord).slice(0, columns.length).forEach((column, index) => {
      const target = columns[index];
      const heading = target.querySelector('h4');
      setText(heading, column.title);
      const links = Array.isArray(column.links) ? column.links.filter(isRecord) : [];
      target.querySelectorAll('a').forEach(el => el.remove());
      links.forEach(item => {
        const link = document.createElement('a');
        link.textContent = item.label || '링크';
        link.href = resolveSiteHref(item.href) || '#';
        if (/^https?:/i.test(item.href || '')) {
          link.target = '_blank';
          link.rel = 'noopener';
        }
        target.appendChild(link);
      });
    });
    return true;
  }

  function applySeo(settings, pages) {
    const siteSeo = settings && settings.seo;
    if (!isRecord(siteSeo)) return false;
    const pageKey = getCurrentPageKey();
    const pageSeo = isRecord(pages) && isRecord(pages[pageKey]) && isRecord(pages[pageKey].seo)
      ? pages[pageKey].seo
      : {};
    const baseTitle = getCleanText(pageSeo.title) || getCleanText(siteSeo.defaultTitle);
    const suffix = getCleanText(siteSeo.titleSuffix);
    if (baseTitle) {
      document.title = suffix && !baseTitle.includes(suffix) ? `${baseTitle} | ${suffix}` : baseTitle;
      setMeta('og:title', document.title, 'property');
    }
    const description = getCleanText(pageSeo.description) || getCleanText(siteSeo.defaultDescription);
    setMeta('description', description);
    setMeta('og:description', description, 'property');
    setMeta('keywords', siteSeo.keywords);
    const ogImage = resolveAssetUrl(siteSeo.ogImage);
    if (ogImage) setMeta('og:image', ogImage, 'property');
    return true;
  }

  function applySiteSettings(data) {
    const settings = getSiteSettings(data);
    if (!settings) return false;
    const pages = getPages(data);
    let didApply = false;
    didApply = applyDesign(settings) || didApply;
    didApply = applyBrand(settings) || didApply;
    didApply = applyNav(settings) || didApply;
    didApply = applyFooter(settings) || didApply;
    didApply = applySeo(settings, pages) || didApply;
    return didApply;
  }

  function applyHero(page) {
    if (!isRecord(page) || !isRecord(page.hero)) return false;
    const hero = document.querySelector('[data-cms-section="hero"], .journey-hero, .hero');
    if (!hero) return false;
    setText(hero.querySelector('.eyebrow'), page.hero.eyebrow);
    setMultilineText(hero.querySelector('h1'), page.hero.title);
    setText(hero.querySelector('.lede'), page.hero.lede);
    return true;
  }

  function applyGenericSectionHeads(page) {
    if (!isRecord(page) || !Array.isArray(page.sections)) return false;
    const heads = Array.from(document.querySelectorAll('main .section-head'));
    page.sections.forEach((section, index) => {
      const head = document.querySelector(`#panel-${CSS.escape(String(section.id || ''))} .section-head`)
        || document.querySelector(`#${CSS.escape(String(section.id || ''))} .section-head`)
        || heads[index];
      if (!head) return;
      setText(head.querySelector('.eyebrow'), section.eyebrow);
      setText(head.querySelector('h2'), section.title);
      setText(head.querySelector('.desc, p'), section.description);
    });
    return true;
  }

  function applyPatientJourney(page) {
    if (!isRecord(page) || !Array.isArray(page.steps)) return false;
    const steps = Array.from(document.querySelectorAll('.journey-step'));
    page.steps.slice(0, steps.length).forEach((item, index) => {
      const step = steps[index];
      setText(step.querySelector('.step-number'), item.number);
      setText(step.querySelector('.step-body h2, h2'), item.title);
      setText(step.querySelector('.step-lede'), item.lede);
      const support = step.querySelector('.step-support');
      if (support && getCleanText(item.support)) {
        const label = support.querySelector('strong');
        support.textContent = '';
        if (label) support.appendChild(label);
        if (label) support.append(' ');
        support.append(item.support);
      }
    });
    return true;
  }

  function applyPrograms(page) {
    if (!isRecord(page) || !Array.isArray(page.tabs)) return false;
    page.tabs.forEach(tab => {
      const panel = document.getElementById(`panel-${tab.id}`);
      if (!panel) return;
      setText(panel.querySelector('.program-subhead .label, .program-label'), tab.label);
      setText(panel.querySelector('.program-subhead h3, h3'), tab.title);
      setText(panel.querySelector('.transparency-intro, .program-subhead p'), tab.intro);
      const insight = panel.querySelector('.program-insight p, .program-insight');
      setText(insight, tab.insight);
    });
    return true;
  }

  function applyUpdateList(selector, items) {
    const root = document.querySelector(selector);
    if (!root || !Array.isArray(items)) return false;
    const list = root.querySelector('.updates');
    if (!list) return false;
    list.replaceChildren(...items.filter(isRecord).map(item => {
      const link = document.createElement('a');
      link.className = 'update-item';
      link.href = resolveSiteHref(item.href) || 'mailto:info@kmtpa.org';
      const source = document.createElement('span');
      source.className = 'u-source';
      const dot = document.createElement('span');
      dot.className = 'dot';
      source.appendChild(dot);
      source.append(item.source || 'KMTPA');
      const title = document.createElement('span');
      title.className = 'u-title';
      title.textContent = item.title || '제목 없음';
      const date = document.createElement('span');
      date.className = 'u-date';
      date.textContent = item.date || '';
      link.append(source, title, date);
      return link;
    }));
    return true;
  }

  function applyCommunications(page) {
    if (!isRecord(page)) return false;
    let didApply = false;
    didApply = applyUpdateList('#panel-press', page.pressItems) || didApply;
    didApply = applyUpdateList('#panel-notice', page.noticeItems) || didApply;
    return didApply;
  }

  function applyDirections(page) {
    if (!isRecord(page)) return false;
    const contact = isRecord(page.contact) ? page.contact : null;
    if (contact) {
      const dd = Array.from(document.querySelectorAll('.address-block dd'));
      if (dd[0]) {
        dd[0].textContent = [contact.address, contact.postal && `(우편번호 ${contact.postal})`].filter(Boolean).join('\n');
      }
      if (dd[1]) {
        const phone = getCleanText(contact.phone);
        let link = dd[1].querySelector('a');
        if (!link) {
          dd[1].textContent = '';
          link = document.createElement('a');
          dd[1].appendChild(link);
        }
        if (phone) {
          link.textContent = phone;
          link.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
        }
      }
      if (dd[2]) {
        const email = getCleanText(contact.email) || 'info@kmtpa.org';
        const concierge = getCleanText(contact.conciergeEmail) || 'concierge@kmtpa.org';
        dd[2].textContent = '';
        const emailLink = document.createElement('a');
        emailLink.href = `mailto:${email}`;
        emailLink.textContent = email;
        const conciergeLink = document.createElement('a');
        conciergeLink.href = `mailto:${concierge}`;
        conciergeLink.textContent = concierge;
        dd[2].append(emailLink, ' (일반 문의)', document.createElement('br'), conciergeLink, ' (Visit Korea)');
      }
      if (dd[3]) setText(dd[3], contact.hours);
    }
    if (Array.isArray(page.transitCards)) {
      const cards = Array.from(document.querySelectorAll('.transit-card'));
      page.transitCards.slice(0, cards.length).forEach((item, index) => {
        setText(cards[index].querySelector('h3'), item.title);
        const li = cards[index].querySelector('li');
        setText(li, item.body);
      });
    }
    return Boolean(contact || Array.isArray(page.transitCards));
  }

  // applyAbout(이사회 명단 적용)은 이사회 섹션과 함께 지웠습니다.
  // CMS 데이터에 boardMembers 가 남아 있어도 그냥 무시됩니다.

  function applyPageContent(data) {
    const pages = getPages(data);
    if (!pages) return false;
    const page = pages[getCurrentPageKey()];
    if (!isRecord(page)) return false;
    let didApply = false;
    didApply = applyHero(page) || didApply;
    didApply = applyGenericSectionHeads(page) || didApply;
    didApply = applyPatientJourney(page) || didApply;
    didApply = applyPrograms(page) || didApply;
    didApply = applyCommunications(page) || didApply;
    didApply = applyDirections(page) || didApply;
    return didApply;
  }

  function sectionRootFromSelector(selector) {
    const raw = getCleanText(selector);
    if (!raw) return null;
    const el = document.querySelector(raw);
    if (!el) return null;
    return el.tagName && el.tagName.toLowerCase() === 'section' ? el : el.closest('section') || el;
  }

  function applySectionControls(data) {
    const cmsSections = isRecord(data) && isRecord(data.sections) && Array.isArray(data.sections.cmsSections)
      ? data.sections.cmsSections
      : [];
    if (!cmsSections.length) return false;
    const main = document.querySelector('main');
    cmsSections.forEach(section => {
      const root = sectionRootFromSelector(section.selector);
      if (root) root.hidden = section.visible === false;
    });
    if (main) {
      cmsSections.map(section => sectionRootFromSelector(section.selector))
        .filter(el => el && el.parentElement === main)
        .forEach(el => main.appendChild(el));
    }
    return true;
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
      .slice(0, 3);

    return items.length ? items : null;
  }

  function createNewsletterCard(item) {
    const article = document.createElement('article');
    article.className = 'pub';

    const trigger = item.href ? document.createElement('a') : document.createElement('button');
    trigger.className = item.href ? 'pub-trigger pub-trigger--link' : 'pub-trigger';

    if (item.href) {
      trigger.setAttribute('href', item.href);
    } else {
      trigger.setAttribute('type', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      if (item.pubId) trigger.dataset.pubId = item.pubId;
    }
    if (item.download) trigger.dataset.download = item.download;

    const thumb = document.createElement('span');
    thumb.className = 'pub-thumb';
    thumb.textContent = item.thumb;

    const body = document.createElement('span');
    body.className = 'pub-body';

    const title = document.createElement('span');
    title.className = 'pub-title';
    title.textContent = item.title;

    const meta = document.createElement('span');
    meta.className = 'pub-meta';
    meta.textContent = item.meta;

    const cta = document.createElement('span');
    cta.className = 'pub-cta';
    cta.append('자세히 보기');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'arrow-right');
    cta.appendChild(icon);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(cta);
    trigger.appendChild(thumb);
    trigger.appendChild(body);
    article.appendChild(trigger);
    if (!item.href) {
      article.appendChild(createNewsletterDetailTemplate(item));
    }

    return article;
  }

  function createNewsletterDetailTemplate(item) {
    const template = document.createElement('template');
    template.className = 'pub-detail';

    const wrap = document.createElement('div');
    wrap.className = 'pub-modal-placeholder';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'pub-modal-eyebrow';
    eyebrow.textContent = item.thumb;
    wrap.appendChild(eyebrow);

    const title = document.createElement('h2');
    title.className = 'pub-modal-title';
    title.id = 'pub-modal-title';
    title.textContent = item.title;
    wrap.appendChild(title);

    const lede = document.createElement('p');
    lede.className = 'pub-modal-lede';
    lede.textContent = item.lede || item.summary || '뉴스레터 본문은 검수 후 공개될 예정입니다.';
    wrap.appendChild(lede);

    if (item.outline.length) {
      const section = document.createElement('section');
      section.className = 'pub-modal-section';
      const heading = document.createElement('h3');
      heading.textContent = '구성안';
      section.appendChild(heading);

      item.outline.forEach(outline => {
        const subheading = document.createElement('h4');
        subheading.textContent = outline.heading;
        section.appendChild(subheading);

        const list = document.createElement('ul');
        outline.bullets.forEach(text => {
          const li = document.createElement('li');
          li.textContent = text;
          list.appendChild(li);
        });
        section.appendChild(list);
      });
      wrap.appendChild(section);
    }

    if (item.articles.length) {
      const section = document.createElement('section');
      section.className = 'pub-modal-section';
      const heading = document.createElement('h3');
      heading.textContent = '선택된 기사';
      section.appendChild(heading);

      const list = document.createElement('ul');
      item.articles.forEach(article => {
        const li = document.createElement('li');
        const meta = [article.sourceName, article.rawCategory, article.publishedAt].filter(Boolean).join(' · ');
        li.textContent = meta ? `${article.title} (${meta})` : article.title;
        list.appendChild(li);
      });
      section.appendChild(list);
      wrap.appendChild(section);
    }

    const note = document.createElement('p');
    note.className = 'pub-modal-lede';
    note.textContent = '원문 자료는 준비중입니다. 뉴스레터 및 협력 문의는 사무국으로 보내주세요.';
    wrap.appendChild(note);

    template.content.appendChild(wrap);
    return template;
  }

  function applyNewsletter(items) {
    const list = document.getElementById('homepage-newsletter-list')
      || document.querySelector('[data-cms-section="newsletter"]');
    if (!list) return false;

    list.replaceChildren(...items.map(createNewsletterCard));

    if (typeof NS.setupPubModal === 'function') {
      NS.setupPubModal();
    }
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    return true;
  }

  NS.applyPublishedHomepageContent = async function () {
    const data = await readPublishedData();
    const newsletter = normalizeNewsletter(findNewsletterSection(data));
    let didApply = false;

    didApply = applySiteSettings(data) || didApply;
    didApply = applyPageContent(data) || didApply;
    didApply = applySectionControls(data) || didApply;
    if (newsletter) didApply = applyNewsletter(newsletter) || didApply;

    return didApply;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      NS.applyPublishedHomepageContent();
    });
  } else {
    NS.applyPublishedHomepageContent();
  }
})(window.KMTPA);
