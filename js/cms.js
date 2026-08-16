/* =========================================================================
   cms.js — 게시본을 지금 화면에 입힌다

   정적으로 쓰인 HTML 위에 사무국이 게시한 내용을 덮는다. 게시본이 없거나
   값이 비면 손으로 쓴 HTML 을 그대로 둔다.

   대메뉴는 덮지 않는다 — templates.js 가 정답이다. 아래 applySiteSettings
   위의 주석에 이유가 있다.

   받아 오고 다듬는 일은 cms-data.js, 뉴스레터 카드를 만드는 일은
   cms-newsletter.js 가 맡는다.

   로드 순서: cms-data.js -> cms-newsletter.js -> cms.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  const {
    isRecord, getCleanText, getSiteSettings, getPages,
    resolveSiteHref, resolveAssetUrl,
    findNewsletterSection, normalizeNewsletter, NEWSLETTER_LIMIT,
  } = window.KMTPACmsData;
  const createNewsletterCard = window.KMTPACmsNewsletter.card;

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
    // 푸터의 'Our Flagship Brand / MEDICON' 블록은 새 푸터 디자인에서 빠졌습니다.
    // MEDICON 진입점은 날개 배너에 그대로 있으므로 그쪽만 계속 CMS 로 바꿉니다.
    // 날개 배너는 회원가입 링크가 앞에 붙어 순서가 바뀌므로 위치 대신 클래스로 집습니다.
    // 이름은 .quick-label 안에 있습니다. 예전에는 childNodes[0] 를 썼는데 그건
    // 태그 사이 줄바꿈(빈 텍스트 노드)이라, 거기에 이름을 넣으면 라벨과 겹쳐
    // 'MEDICON MEDICON' 처럼 두 번 찍혔습니다 — CMS 가 붙는 로컬에서만 보였습니다.
    document.querySelectorAll('.quick-link--flagship').forEach(el => {
      setText(el.querySelector('.quick-label'), brand.flagshipName);
      setHref(el, brand.flagshipUrl);
    });
    document.querySelectorAll('.quick-link--instagram, .footer-social a[aria-label="Instagram"]').forEach(el => {
      setHref(el, brand.instagramUrl);
    });
    return true;
  }

  /* 대메뉴는 게시본이 건드리지 않는다 — templates.js 가 정답이다.

     예전에는 게시본의 siteSettings.nav 가 #top-nav 를 통째로 갈아끼웠다.
     그런데 어드민에는 메뉴를 더하고 빼는 화면이 없다. 그래서 게시본의 메뉴가
     한 번 어긋나면 사무국이 스스로 고칠 방법이 없었다.

     실제로 투명경영과 함께하기가 통째로 빠진 채 남아 있었고, 라이브가 게시본을
     읽기 시작하자 회원가입·상담 신청으로 가는 메뉴 경로가 사라졌다. 갈 곳이
     없는 항목 셋(#resources·#events·#awards)도 함께 실려 있었다.

     메뉴는 페이지가 생기고 없어질 때만 바뀐다. 그때는 어차피 코드를 고친다.
     화면 문구·색·푸터처럼 사무국이 자주 손대는 것과는 성격이 다르다.
     그래서 이 자리는 코드가 갖는다. 게시본에 nav 가 남아 있어도 무시한다. */

  /* 푸터 링크의 번역 키 표 — '한국어 문구 → data-i18n 키'.

     아래 applyFooter 는 링크를 지우고 새로 그린다. 예전에는 새 <a> 에 키를
     안 붙여서, 푸터 컬럼만 언어를 바꿔도 한국어로 남아 있었다 (제목은 기존
     요소에 글자만 넣으므로 키가 살아남아 잘 바뀌었다).

     자리 순서로 맞추면 안 된다. 게시본의 '문의·연결' 칸은 링크가 여섯인데
     (연락처 셋이 뒤에 붙는다) 원본은 넷이라, 순서로 대면 '회원가입' 에
     '함께하기' 키가 붙어 엉뚱하게 번역된다. 그래서 문구로 찾는다 — 사무국이
     순서를 바꾸거나 링크를 끼워 넣어도 어긋나지 않는다.

     표는 templates.js 의 원본 마크업에서 만든다. 화면에서 읽으면 i18n 이
     먼저 돈 경우 이미 번역된 글자를 집게 된다. <template> 은 안이 비활성이라
     로고 이미지를 받지 않는다. */
  let footerKeyByLabel = null;
  function footerI18nKeys() {
    if (footerKeyByLabel) return footerKeyByLabel;
    footerKeyByLabel = new Map();
    const holder = document.createElement('template');
    holder.innerHTML = NS.FOOTER_HTML || '';
    holder.content.querySelectorAll('.footer-col a[data-i18n]').forEach(el => {
      const label = el.textContent.trim();
      if (label && !footerKeyByLabel.has(label)) footerKeyByLabel.set(label, el.dataset.i18n);
    });
    return footerKeyByLabel;
  }

  function applyFooter(settings) {
    if (!isRecord(settings) || !isRecord(settings.footer) || !Array.isArray(settings.footer.columns)) return false;
    const columns = Array.from(document.querySelectorAll('.site-footer .footer-col'));
    const keys = footerI18nKeys();
    settings.footer.columns.filter(isRecord).slice(0, columns.length).forEach((column, index) => {
      const target = columns[index];
      const heading = target.querySelector('h2');
      setText(heading, column.title);
      const links = Array.isArray(column.links) ? column.links.filter(isRecord) : [];
      target.querySelectorAll('a').forEach(el => el.remove());
      links.forEach(item => {
        const link = document.createElement('a');
        const label = item.label || '링크';
        link.textContent = label;
        link.href = resolveSiteHref(item.href) || '#';
        // 원본에 있던 문구면 번역 키를 되붙인다. 메일 주소처럼 원본에 없는
        // 것은 키가 없고, 그대로 두는 것이 맞다 — 번역할 말이 아니다.
        const key = keys.get(label.trim());
        if (key) link.dataset.i18n = key;
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

  /* 공개 목록에 그리는 건수. 사무국이 어드민에서 더 많이 골라도 여기까지만
     그립니다 — 화면에 맞춘 값이라 어드민 선택 개수와는 별개입니다.
     목록은 한 행 61px 이라 여덟 줄이 한 덩어리로 읽히는 한계이고,
     뉴스레터는 3열 그리드라 2행이 딱 떨어지는 여섯입니다. */
  const UPDATE_LIST_LIMIT = 8;

  const EMPTY_TEXT = {
    'panel-press': '등록된 보도자료가 없습니다.',
    'panel-notice': '등록된 공지사항이 없습니다.',
    'panel-newsletter': '발행된 뉴스레터가 없습니다.',
  };

  function emptyNotice(panelId) {
    const p = document.createElement('p');
    p.className = 'list-empty';
    p.textContent = EMPTY_TEXT[panelId] || '등록된 항목이 없습니다.';
    return p;
  }

  /* '총 ○○건' 은 실제로 그려진 줄 수를 씁니다. CMS 가 적용되지 않은 화면도
     정적 목록을 세어 채우므로 자리표시자가 그대로 남지 않습니다.
     이 자리는 data-i18n 을 달지 않습니다 — 사전이 덮어쓰면 숫자가 다시
     '총 ○○건' 으로 돌아갑니다. 대신 템플릿 키를 직접 조회합니다. */
  function labelMore(button) {
    if (!button) return;
    const template = (NS.t && NS.t('chrome.more')) || '더보기 ({n})';
    button.textContent = template.replace('{n}', button.dataset.rest || '');
  }

  function syncUpdateCount(root) {
    if (!root) return;
    labelMore(root.querySelector('.updates-more'));
    const badge = root.querySelector('.section-head .text-mini');
    if (!badge) return;
    const count = root.querySelectorAll('.update-item, .pub').length;
    const template = (NS.t && NS.t('chrome.count.total')) || '총 {n}건';
    badge.textContent = template.replace('{n}', count.toLocaleString('ko-KR'));
  }

  NS.syncUpdateCounts = function () {
    ['panel-press', 'panel-notice', 'panel-newsletter']
      .forEach(id => syncUpdateCount(document.getElementById(id)));
  };

  function updateLink(item) {
    const link = document.createElement('a');
    link.className = 'update-item';
    const href = resolveSiteHref(item.href);
    link.href = href || 'mailto:info@kmtpa.org';
    // 수집 기사는 남의 사이트로 나간다. 협회가 쓴 글은 같은 창에 둔다.
    if (href && /^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
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
  }

  /* 더보기는 서버에 다시 묻지 않는다. 게시본이 이미 최대 60건을 들고 오므로
     여기서는 그중 몇 줄을 그릴지만 늘린다 — 클릭이 곧바로 반응한다. */
  function attachMore(root, list, items) {
    const old = root.querySelector('.updates-more');
    if (old) old.remove();
    if (items.length <= UPDATE_LIST_LIMIT) return;

    let shown = UPDATE_LIST_LIMIT;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'updates-more';
    const label = () => {
      // 남은 수는 속성에 적어 둔다. 사전이 늦게 오면 syncUpdateCounts 가
      // 이 값을 읽어 라벨만 다시 쓴다 — 배지와 같은 처지다.
      button.dataset.rest = String(items.length - shown);
      labelMore(button);
    };
    label();
    button.addEventListener('click', () => {
      shown = Math.min(shown + UPDATE_LIST_LIMIT, items.length);
      list.replaceChildren(...items.slice(0, shown).map(updateLink));
      syncUpdateCount(root);
      if (shown >= items.length) button.remove();
      else label();
    });
    list.after(button);
  }

  function applyUpdateList(selector, items) {
    const root = document.querySelector(selector);
    if (!root || !Array.isArray(items)) return false;
    const list = root.querySelector('.updates');
    if (!list) return false;
    const all = items.filter(isRecord);
    if (!all.length) {
      const stale = root.querySelector('.updates-more');
      if (stale) stale.remove();
      list.replaceChildren(emptyNotice(root.id));
      syncUpdateCount(root);
      return true;
    }
    list.replaceChildren(...all.slice(0, UPDATE_LIST_LIMIT).map(updateLink));
    attachMore(root, list, all);
    syncUpdateCount(root);
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

  function applyNewsletter(items) {
    const list = document.getElementById('homepage-newsletter-list')
      || document.querySelector('[data-cms-section="newsletter"]');
    if (!list) return false;

    const shown = items.slice(0, NEWSLETTER_LIMIT);
    const panel = list.closest('.tab-panel');
    if (!shown.length) {
      list.replaceChildren(emptyNotice(panel ? panel.id : 'panel-newsletter'));
    } else {
      list.replaceChildren(...shown.map(createNewsletterCard));
    }
    syncUpdateCount(panel);

    if (typeof NS.setupPubModal === 'function') {
      NS.setupPubModal();
    }
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    return true;
  }

  NS.applyPublishedHomepageContent = async function () {
    const data = await NS.whenPublished();
    NS.publishedData = data;
    const newsletterSection = findNewsletterSection(data);
    const newsletter = newsletterSection === null ? null : normalizeNewsletter(newsletterSection);
    let didApply = false;

    didApply = applySiteSettings(data) || didApply;
    didApply = applyPageContent(data) || didApply;
    didApply = applySectionControls(data) || didApply;
    if (newsletter) didApply = applyNewsletter(newsletter) || didApply;

    // 게시본이 없어도 정적 목록을 세어 '총 ○○건' 자리표시자를 채웁니다.
    NS.syncUpdateCounts();

    // 여기서 다시 그린 자리에 번역을 입힌다. 지금은 이 파일이 i18n.js 보다
    // 먼저 돌지만(로드 순서), 둘 다 같은 게시본 약속을 기다리므로 순서가
    // 뒤집히면 방금 그린 것만 한국어로 남는다. 사전이 없으면(한국어이거나
    // 아직 안 왔으면) applyI18n 은 아무 일도 안 하므로 불러도 무해하다.
    if (typeof NS.applyI18n === 'function') NS.applyI18n(document);

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
