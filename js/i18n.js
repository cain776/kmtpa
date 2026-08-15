/* =========================================================================
   i18n.js — 화면 문구를 언어에 맞춰 갈아끼운다

   문구는 i18n/<lang>.json 한 벌이고 키는 data-i18n 속성으로 HTML 에 박혀 있다.
   한국어는 HTML 에 그대로 적혀 있으므로 ko 는 아무것도 안 하고 끝난다 —
   한국어 방문자에게는 네트워크 요청도, 글자가 바뀌는 깜빡임도 없다.

   CMS 우선. 어드민이 게시한 payload 에 translations[lang] 이 있으면 그것을
   먼저 쓰고, 없는 키만 i18n/<lang>.json 으로 채운다. 사무국이 고친 문구가
   파일보다 항상 우선한다.

   로드 순서: templates.js → components.js → nav-dropdown.js → app.js → i18n.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  const DEFAULT = 'ko';
  const STORE_KEY = 'kmtpa.lang';
  // 화면에 보이는 순서대로. code 는 <html lang> 과 JSON 파일 이름에 함께 쓴다.
  const LANGS = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    // 중국어는 본토(간체)와 대만(번체)을 나눕니다. 글자만이 아니라 단어도
    // 갈립니다 — 건강검진이 본토는 体检, 대만은 健檢입니다.
    { code: 'zh', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'ja', label: '日本語' },
    { code: 'mn', label: 'Монгол' },
    { code: 'es', label: 'Español' },
  ];
  NS.LANGS = LANGS;

  const CODES = LANGS.map(l => l.code);
  let dict = null;

  /* ----- 어떤 언어로 볼 것인가 -----
     주소의 ?lang= 이 가장 세다. 링크로 공유했을 때 받는 사람이 같은 언어를
     보게 하려는 것이다. 그다음이 지난번 선택, 마지막이 브라우저 설정. */
  function detect() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && CODES.includes(q)) return q;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && CODES.includes(saved)) return saved;
    } catch (ignored) { /* 사생활 보호 모드 */ }
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return CODES.includes(nav) ? nav : DEFAULT;
  }

  NS.currentLang = detect();

  /* ----- 사전 읽기 ----- */
  function sitePath() { return NS.sitePath || '/'; }

  async function loadFile(lang) {
    try {
      const r = await fetch(`${sitePath()}i18n/${lang}.json`, { cache: 'no-cache' });
      return r.ok ? await r.json() : {};
    } catch (ignored) {
      return {};
    }
  }

  // 어드민이 게시한 번역. cms.js 가 이미 받아 둔 것이 있으면 그것을 쓰고,
  // 없으면 조용히 건너뛴다 — 번역이 CMS 때문에 막히면 안 된다.
  function fromCms(lang) {
    const data = NS.publishedData;
    const t = data && data.translations && data.translations[lang];
    return t && typeof t === 'object' ? t : {};
  }

  async function ensureDict(lang) {
    if (lang === DEFAULT) return {};
    const [file, cms] = [await loadFile(lang), fromCms(lang)];
    return Object.assign({}, file, cms);   // CMS 가 파일을 덮어쓴다
  }

  /* ----- 적용 ----- */
  function applyTo(root, table) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const v = table[el.dataset.i18n];
      if (typeof v !== 'string' || !v) return;
      // 문단 안 <strong>·<br> 같은 서식은 번역문이 함께 갖고 있다.
      if (/<[a-z][\s\S]*>/i.test(v)) el.innerHTML = v;
      else el.textContent = v;
    });
    // 번역 대상 속성 — 값이 한국어와 같은 것을 찾아 바꾼다
    const attrs = ['alt', 'title', 'placeholder', 'aria-label'];
    root.querySelectorAll('[' + attrs.join('],[') + ']').forEach(el => {
      attrs.forEach(a => {
        const cur = el.getAttribute(a);
        if (cur && table['@' + cur]) el.setAttribute(a, table['@' + cur]);
      });
    });
  }

  // 사전 한 줄 조회. 화면이 스스로 다시 그리는 곳(히어로 슬라이드처럼)에서 쓴다.
  NS.t = function (key) {
    return dict && typeof dict[key] === 'string' && dict[key] ? dict[key] : null;
  };

  NS.applyI18n = function (root) {
    if (!dict) return;
    applyTo(root || document, dict);
  };

  /* ----- 언어 선택 상자 ----- */
  function buildSelect() {
    const wrap = document.createElement('label');
    wrap.className = 'lang-select';

    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = 'Language';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Language');
    LANGS.forEach(l => {
      const o = document.createElement('option');
      o.value = l.code;
      o.textContent = l.label;
      if (l.code === NS.currentLang) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => NS.setLang(select.value));
    wrap.append(sr, select);
    return wrap;
  }

  function mountSelect() {
    // 공용 헤더 — 로그인 버튼 왼쪽에 둔다. 없으면 맨 뒤.
    const header = document.querySelector('.site-header .container');
    if (header && !header.querySelector('.lang-select')) {
      const wrap = buildSelect();
      const cta = header.querySelector('.header-cta');
      if (cta) cta.before(wrap); else header.appendChild(wrap);
    }

    // 홈 히어로 — 첫 화면에서는 공용 헤더가 숨어 있어 여기에도 따로 둔다.
    // 언어를 바꾸면 페이지를 새로 여니 두 상자를 맞출 필요는 없다.
    const heroMount = document.querySelector('[data-hero-lang]');
    if (heroMount && !heroMount.querySelector('.lang-select')) {
      heroMount.appendChild(buildSelect());
    }
  }

  NS.setLang = async function (lang) {
    if (!CODES.includes(lang) || lang === NS.currentLang) return;
    try { localStorage.setItem(STORE_KEY, lang); } catch (ignored) { /* noop */ }
    // 한국어로 돌아갈 때는 새로 고친다. 원문이 HTML 에 있으므로 되돌리는
    // 코드를 따로 두는 것보다 이쪽이 확실하다.
    const url = new URL(window.location.href);
    if (lang === DEFAULT) url.searchParams.delete('lang');
    else url.searchParams.set('lang', lang);
    window.location.href = url.toString();
  };

  NS.setupI18n = async function () {
    mountSelect();
    document.documentElement.setAttribute('lang', NS.currentLang);
    if (NS.currentLang === DEFAULT) return;

    dict = await ensureDict(NS.currentLang);
    NS.applyI18n(document);
    // 스스로 다시 그리는 화면은 사전이 준비된 뒤 한 번 더 그려야 한다.
    if (typeof NS.refreshHeroCopy === 'function') NS.refreshHeroCopy();

    // <title> 과 검색용 설명도 함께 바꾼다
    const page = document.body.dataset.i18nPage;
    if (page) {
      const t = dict[`${page}.title`];
      if (t) document.title = t;
      const d = dict[`${page}.meta.description`];
      const meta = document.querySelector('meta[name="description"]');
      if (d && meta) meta.setAttribute('content', d);
    }
  };
})(window.KMTPA);
