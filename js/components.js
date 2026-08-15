/* =========================================================================
   components.js — UI 컴포넌트 인터랙션
   (사)한국의료관광진흥협회 KMTPA 공개 홈페이지

   레이아웃 주입, 히어로 영상, 모바일 메뉴, 탭, FAQ 아코디언, 뉴스레터 모달.
   templates.js에서 정의한 NS.HEADER_HTML 등 마크업과 NS.PUB_DETAILS를 사용합니다.

   로드 순서: templates.js → components.js → app.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  const pubModalState = {
    initialized: false,
    modal: null,
    dialog: null,
    issueEl: null,
    bodyEl: null,
    downloadEl: null,
    footerNote: null,
    lastTrigger: null,
    closeTimer: null,
  };

  /* ----- Layout injection: 헤더·푸터·날개 배너 주입 ----- */
  NS.injectLayout = function () {
    const headerMount = document.getElementById('header-mount');
    const footerMount = document.getElementById('footer-mount');
    if (headerMount) headerMount.outerHTML = NS.HEADER_HTML;
    if (footerMount) footerMount.outerHTML = NS.FOOTER_HTML;

    // 홈 히어로 전용 — 상단 투명 바와 하단 바로가기 바
    const heroTopbar = document.getElementById('hero-topbar-mount');
    const heroQuickbar = document.getElementById('hero-quickbar-mount');
    if (heroTopbar) heroTopbar.outerHTML = NS.HERO_TOPBAR_HTML;
    if (heroQuickbar) heroQuickbar.outerHTML = NS.HERO_QUICKBAR_HTML;
    // 우측 날개 배너 — 모든 페이지에 자동 부착
    if (!document.querySelector('.quick-banner')) {
      document.body.insertAdjacentHTML('beforeend', NS.QUICK_BANNER_HTML);
    }

    // Depth1 네비게이터 — 자리를 둔 페이지에만 그립니다.
    const crumbMount = document.getElementById('breadcrumb-mount');
    if (crumbMount) {
      crumbMount.outerHTML = NS.breadcrumbHtml(crumbMount.dataset.depth1);
    }

    // 헤더 버튼은 로그인 상태를 따라갑니다 — 로그인 중이면 '로그아웃'.
    // 키는 member.js 의 SESSION_KEY 와 같아야 합니다(그 파일은 로그인·마이페이지
    // 에서만 로드되므로 여기서 직접 읽습니다).
    const memberSession = sessionStorage.getItem('kmtpa.member.preview.v1');
    const headerCta = document.querySelector('.header-cta');
    if (memberSession && headerCta) {
      // 로그아웃 버튼 왼쪽에 누가 로그인했는지 표시합니다. 이름을 누르면
      // 마이페이지(내 정보)로 갑니다. 이름은 세션에서 오므로 textContent 로만
      // 넣습니다(HTML 해석 금지).
      try {
        const name = (JSON.parse(memberSession) || {}).name;
        if (name) {
          const who = document.createElement('a');
          who.className = 'header-user';
          // 버튼 href 가 '<루트>/login/index.html' 이므로 그 자리만 바꿉니다.
          who.href = headerCta.href.replace(/login\/index\.html.*$/, 'mypage/index.html');
          const strong = document.createElement('b');
          strong.textContent = name;
          who.append(strong, '님');
          headerCta.before(who);
        }
      } catch (ignored) { /* 세션이 깨져 있으면 이름만 생략합니다 */ }
      headerCta.textContent = '로그아웃';
      headerCta.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('kmtpa.member.preview.v1');
        // 로그아웃 후에는 홈으로. href 가 '<루트>/login/index.html' 이므로
        // 그 자리를 index.html 로 바꾸면 어느 배포 경로에서도 루트가 됩니다.
        window.location.href = headerCta.href.replace(/login\/index\.html.*$/, 'index.html');
      });
    }
  };

  /* ----- Hero 배경 영상 재생 (playlist 순환 + 속도 조절) ----- */
  /* ----- 언어 선택 드롭다운 (홈 히어로) -----
     지금은 한국어만 활성이라 실제 전환은 없고 열고 닫기만 합니다.
     번역 페이지가 생기면 목록 항목에 링크를 달아 주세요. */
  NS.setupLangSelect = function () {
    const root = document.querySelector('[data-lang-select]');
    if (!root) return;

    const toggle = root.querySelector('.hero-lang-toggle');
    const menu = root.querySelector('.hero-lang-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(menu.hidden);
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
  };

  /* ----- 홈 히어로 슬라이더 -----
     배경 3장을 교차 전환하고, 슬라이드마다 헤드라인을 바꿉니다.
     히어로를 지나 스크롤하면 공용 헤더가 내려옵니다. */
  NS.setupHeroSlider = function () {
    const stage = document.querySelector('.hero-stage');
    if (!stage) return;

    const slides = Array.from(stage.querySelectorAll('.hero-slide'));
    const dots = Array.from(stage.querySelectorAll('.hero-dot'));
    const headline = stage.querySelector('.hero-headline');
    const counter = stage.querySelector('.hero-counter');
    const total = slides.length;
    if (!total) return;

    // 슬라이드별 헤드라인 — index.html 의 .hero-slide 순서와 1:1 로 맞춥니다.
    // <em>은 금색 강조입니다.
    // 슬라이드를 추가하면 아래 예비 문구를 살려 쓰세요.
    //   '<em>환자 안전과 진료 품질</em>,<br>협회가 기준을 세웁니다.'
    const COPY = [
      '세계가 신뢰하는 <em>K-의료관광</em>을<br>만들어갑니다.',
      '치료를 넘어, <em>한국을 경험하는 여정</em>을<br>함께 만듭니다.'
    ];

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const INTERVAL = 6000;
    let index = 0;
    let timer = null;

    function pad(n) { return String(n).padStart(2, '0'); }

    function render() {
      slides.forEach((el, i) => el.classList.toggle('is-active', i === index));
      dots.forEach((el, i) => {
        el.classList.toggle('is-active', i === index);
        el.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      if (headline && COPY[index]) headline.innerHTML = COPY[index];
      if (counter) counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    }

    function go(next) {
      index = ((next % total) + total) % total;
      render();
      restart();
    }

    function restart() {
      if (timer) clearInterval(timer);
      if (reduceMotion) return;              // 모션 최소화 설정이면 자동 전환 안 함
      timer = setInterval(() => go(index + 1), INTERVAL);
    }

    stage.querySelector('.hero-arrow--prev')?.addEventListener('click', () => go(index - 1));
    stage.querySelector('.hero-arrow--next')?.addEventListener('click', () => go(index + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));

    stage.querySelector('.hero-scroll')?.addEventListener('click', () => {
      const target = stage.nextElementSibling;
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    // 탭이 가려져 있는 동안에는 타이머를 돌리지 않습니다.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (timer) clearInterval(timer); }
      else restart();
    });

    render();
    restart();

    /* ----- 히어로를 지나면 고정 헤더 노출 ----- */
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => {
        const past = window.scrollY > stage.offsetHeight - 220;
        header.classList.toggle('is-revealed', past);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  };

  NS.setupHeroVideo = function () {
    const heroVideo = document.querySelector('.hero-video');
    if (!heroVideo) return;

    // 재생 순서: bg2 → bg3 → bg → (다시 bg2)
    const asset = (path) => `${NS.sitePath || ''}${path}`;
    const playlist = [
      asset('images_homepage/hero-bg2.mp4'),
      asset('images_homepage/hero-bg3.mp4'),
      asset('images_homepage/hero-bg.mp4')
    ];
    let currentIndex = 0;

    const rate = parseFloat(heroVideo.dataset.rate) || 0.85;
    const setRate = () => { heroVideo.playbackRate = rate; };
    setRate();

    function playNext() {
      currentIndex = (currentIndex + 1) % playlist.length;
      heroVideo.src = playlist[currentIndex];
      heroVideo.load();
      const p = heroVideo.play();
      if (p && p.catch) p.catch(() => {});
    }

    heroVideo.addEventListener('ended', playNext);
    heroVideo.addEventListener('loadedmetadata', setRate);
    heroVideo.addEventListener('play', setRate); // autoplay reset 케이스 대응
  };

  /* ----- 모바일 메뉴 토글 ----- */
  NS.setupMobileNav = function () {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('top-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  };

  /* ----- 탭 (메인 + 각 패널 내부 sub-tab을 일반화) ----- */
  /* 빵부스러기의 '다른 메뉴' 열고 닫기. */
  NS.setupBreadcrumb = function () {
    const root = document.querySelector('.breadcrumb-siblings');
    if (!root) return;
    const toggle = root.querySelector('.breadcrumb-toggle');
    const menu = root.querySelector('.breadcrumb-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    }
    toggle.addEventListener('click', e => { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('click', e => { if (!root.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
    });
  };

  /* 상위 탭 없이 하위 탭만 있는 화면 (투명경영처럼 독립 페이지로 나온 경우).
     setupTabs 는 .tabs 를 전제로 하므로 그쪽에서는 처리되지 않습니다. */
  NS.setupStandaloneSubTabs = function () {
    if (document.querySelector('.tabs [data-tab]')) return;   // 상위 탭이 있으면 setupTabs 담당
    const chips = Array.from(document.querySelectorAll('.sub-tabs [data-sub-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-sub-panel]'));
    if (!chips.length || !panels.length) return;

    const valid = chips.map(c => c.dataset.subTab);

    function activate(name, pushHash = true) {
      if (!valid.includes(name)) return;
      chips.forEach(c => {
        const on = c.dataset.subTab === name;
        c.classList.toggle('current', on);
        c.setAttribute('aria-selected', String(on));
      });
      panels.forEach(p => {
        const on = p.dataset.subPanel === name;
        p.classList.toggle('active', on);
        if (on) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      // 첫 항목은 기본값이라 해시를 붙이지 않습니다 — 주소가 깔끔해집니다.
      if (pushHash) {
        history.replaceState(null, '', name === valid[0] ? location.pathname : '#' + name);
      }
    }

    chips.forEach(c => c.addEventListener('click', () => activate(c.dataset.subTab)));
    window.addEventListener('hashchange', () => {
      activate(valid.includes(location.hash.slice(1)) ? location.hash.slice(1) : valid[0], false);
    });
    activate(valid.includes(location.hash.slice(1)) ? location.hash.slice(1) : valid[0], false);
  };

  NS.setupTabs = function () {
    const tabs = document.querySelectorAll('.tabs [data-tab]');
    const panels = document.querySelectorAll('.tab-panel[data-panel]');
    if (!tabs.length || !panels.length) return;

    const validMain = Array.from(tabs).map(t => t.dataset.tab);

    // 각 메인 탭 내부의 sub-tab을 찾아서 맵에 등록
    const subMap = {};
    panels.forEach(panel => {
      const chips = Array.from(panel.querySelectorAll('.sub-tabs [data-sub-tab]'));
      const subPanels = Array.from(panel.querySelectorAll('[data-sub-panel]'));
      if (!chips.length) return;
      subMap[panel.dataset.panel] = {
        chips,
        subPanels,
        valid: chips.map(c => c.dataset.subTab),
        defaultSub: chips[0].dataset.subTab
      };
    });

    function activateMain(name, pushHash = true, subName = null) {
      tabs.forEach(t => {
        const selected = t.dataset.tab === name;
        t.classList.toggle('active', selected);
        t.setAttribute('aria-selected', String(selected));
        t.setAttribute('tabindex', selected ? '0' : '-1');
      });
      panels.forEach(p => {
        const match = p.dataset.panel === name;
        p.classList.toggle('active', match);
        if (match) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      if (pushHash) {
        const hash = subName ? `${name}-${subName}` : name;
        history.replaceState(null, '', '#' + hash);
      }
    }

    function activateSub(mainName, subName, pushHash = true) {
      const info = subMap[mainName];
      if (!info || !info.valid.includes(subName)) return;
      info.chips.forEach(c => {
        const selected = c.dataset.subTab === subName;
        c.classList.toggle('current', selected);
        c.setAttribute('aria-selected', String(selected));
      });
      info.subPanels.forEach(p => {
        const match = p.dataset.subPanel === subName;
        p.classList.toggle('active', match);
        if (match) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      if (pushHash) {
        const suffix = subName === info.defaultSub ? '' : `-${subName}`;
        history.replaceState(null, '', '#' + mainName + suffix);
      }
    }

    // 해시 파싱: "transparency-finance" → { main: 'transparency', sub: 'finance' }
    function parseHash(h) {
      if (!h) return { main: null, sub: null };
      if (validMain.includes(h)) return { main: h, sub: null };
      const dashIdx = h.indexOf('-');
      if (dashIdx > 0) {
        const main = h.slice(0, dashIdx);
        const sub = h.slice(dashIdx + 1);
        if (validMain.includes(main) && subMap[main] && subMap[main].valid.includes(sub)) {
          return { main, sub };
        }
      }
      return { main: null, sub: null };
    }

    // 메인 탭 클릭
    tabs.forEach(t => {
      t.addEventListener('click', () => activateMain(t.dataset.tab));
    });

    // 모든 sub-tab(chip) 클릭 — 부모 panel에서 main 이름 추출
    Object.entries(subMap).forEach(([mainName, info]) => {
      info.chips.forEach(c => {
        c.addEventListener('click', () => activateSub(mainName, c.dataset.subTab));
      });
    });

    function applyHash() {
      const parsed = parseHash((window.location.hash || '').slice(1));
      if (parsed.main) {
        activateMain(parsed.main, false);
        if (subMap[parsed.main]) {
          activateSub(parsed.main, parsed.sub || subMap[parsed.main].defaultSub, false);
        }
      } else {
        activateMain(validMain[0], false);
      }
    }
    applyHash();

    window.addEventListener('hashchange', applyHash);
  };

  /* ----- FAQ 아코디언 ----- */
  NS.setupFaq = function () {
    document.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      if (!q) return;
      q.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(o => {
          o.classList.remove('open');
          const openButton = o.querySelector('.faq-q');
          if (openButton) openButton.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('open');
          q.setAttribute('aria-expanded', 'true');
        } else {
          q.setAttribute('aria-expanded', 'false');
        }
      });
    });
  };

  /* ----- Newsletter Modal — 커뮤니티·홈 등 .pub-trigger가 있는 모든 페이지에서 작동
     <a class="pub-trigger">는 별도 페이지로 이동(예: newsletter-vol25.html)하고,
     <button class="pub-trigger">만 모달을 띄웁니다. ----- */
  NS.setupPubModal = function () {
    const allTriggers = document.querySelectorAll('.pub-trigger');
    if (!allTriggers.length) return;

    // <button>만 모달 대상 — <a class="pub-trigger">는 navigate (스킵)
    const triggers = Array.from(allTriggers).filter(t => t.tagName !== 'A');
    if (!triggers.length) return;

    // 모달이 페이지에 없으면 주입 (단일 인스턴스)
    let modal = document.getElementById('pub-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', NS.PUB_MODAL_HTML);
      modal = document.getElementById('pub-modal');
    }

    pubModalState.modal = modal;
    pubModalState.dialog = modal.querySelector('.pub-modal-dialog');
    pubModalState.issueEl = modal.querySelector('.pub-modal-issue');
    pubModalState.bodyEl = modal.querySelector('.pub-modal-body');
    pubModalState.downloadEl = modal.querySelector('.pub-modal-download');
    pubModalState.footerNote = modal.querySelector('.pub-modal-footer-note');

    triggers.forEach(trigger => {
      trigger.setAttribute('aria-controls', 'pub-modal');
    });

    function escapeHTML(text) {
      return String(text).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function buildPlaceholder(article) {
      const title = article.querySelector('.pub-title')?.textContent.trim() || '뉴스레터';
      const wrap = document.createElement('div');
      wrap.className = 'pub-modal-placeholder';
      wrap.innerHTML = `
        <span class="pub-modal-eyebrow">Newsletter</span>
        <h2 class="pub-modal-title" id="pub-modal-title">${escapeHTML(title)}</h2>
        <p class="pub-modal-lede">
          전체 인사이트 자료는 준비중입니다. 뉴스레터 및 협력 문의는 사무국으로 보내주세요.
        </p>
        <section class="pub-modal-section">
          <h3>이 리포트에서 다루는 주제</h3>
          <p>
            협회는 회원 의료기관과 정책 관계자가 활용할 수 있도록 매월 산업 동향, 정책 변화, 회원사 소식,
            정책 인사이트를 정리해 발간하고 있습니다. 자료 공개 전에는 문의 메일을 통해 확인해 주시기 바랍니다.
          </p>
        </section>
      `;
      return wrap;
    }

    function open(article) {
      if (!article) return;
      clearTimeout(pubModalState.closeTimer);

      const trigger = article.querySelector('.pub-trigger');
      const pubId = trigger?.dataset.pubId || '';
      const thumb = article.querySelector('.pub-thumb')?.textContent.trim() || '';
      const meta = article.querySelector('.pub-meta')?.textContent.trim() || '';
      const template = article.querySelector('template.pub-detail');
      const details = NS.PUB_DETAILS || {};
      const bodyEl = pubModalState.bodyEl;
      const issueEl = pubModalState.issueEl;
      const downloadEl = pubModalState.downloadEl;
      const footerNote = pubModalState.footerNote;
      if (!bodyEl || !issueEl) return;

      // 콘텐츠 우선순위: NS.PUB_DETAILS[id] → 카드 내부 <template> → placeholder
      bodyEl.innerHTML = '';
      if (details[pubId]) {
        bodyEl.innerHTML = details[pubId];
      } else if (template && template.content) {
        bodyEl.appendChild(template.content.cloneNode(true));
      } else {
        bodyEl.appendChild(buildPlaceholder(article));
      }
      const titleEl = bodyEl.querySelector('.pub-modal-title');
      if (titleEl) titleEl.id = 'pub-modal-title';

      issueEl.textContent = thumb;
      if (footerNote) footerNote.textContent = meta + ' · 한국의료관광진흥협회 발행';
      if (downloadEl) {
        downloadEl.setAttribute(
          'href',
          'mailto:info@kmtpa.org?subject=%EB%89%B4%EC%8A%A4%EB%A0%88%ED%84%B0%20%EC%9E%90%EB%A3%8C%20%EB%AC%B8%EC%9D%98'
        );
        downloadEl.removeAttribute('download');
      }

      pubModalState.lastTrigger = trigger;
      modal.hidden = false;
      document.body.classList.add('modal-open');

      // 아이콘 재렌더 (참고자료 외부링크 등)
      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }

      // 다음 프레임에 open 클래스 부여 → 트랜지션 발생
      requestAnimationFrame(() => {
        modal.classList.add('open');
        bodyEl.scrollTop = 0;
        // 포커스를 닫기 버튼으로 이동 (접근성)
        const closeBtn = modal.querySelector('.pub-modal-close');
        if (closeBtn) closeBtn.focus({ preventScroll: true });
      });
    }

    function close() {
      const modal = pubModalState.modal;
      const bodyEl = pubModalState.bodyEl;
      if (!modal || !bodyEl) return;
      modal.classList.remove('open');
      pubModalState.closeTimer = setTimeout(() => {
        modal.hidden = true;
        bodyEl.innerHTML = '';
        document.body.classList.remove('modal-open');
        if (pubModalState.lastTrigger) {
          pubModalState.lastTrigger.focus({ preventScroll: true });
          pubModalState.lastTrigger = null;
        }
      }, 220);
    }

    if (!pubModalState.initialized) {
      document.addEventListener('click', e => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const trigger = e.target.closest('.pub-trigger');
        if (!trigger || trigger.tagName === 'A') return;
        const article = trigger.closest('.pub');
        open(article);
      });

      // 닫기 버튼 / 백드롭 클릭
      modal.querySelectorAll('[data-modal-close]').forEach(el => {
        el.addEventListener('click', close);
      });

      // ESC 키
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && pubModalState.modal && !pubModalState.modal.hidden) close();
      });

      // 다이얼로그 영역 클릭이 백드롭까지 전파되지 않도록
      if (pubModalState.dialog) {
        pubModalState.dialog.addEventListener('click', e => e.stopPropagation());
      }

      pubModalState.initialized = true;
    }
  };

  /* ----- 회원가입 3단계 흐름 (join/index.html 전용) -----
     유형 선택 → 정보 입력 → 신청 완료. 모든 단계가 한 페이지에 있고
     data-join-view 패널을 번갈아 보여줍니다.

     제출은 POST /api/members로 갑니다. 다만 이 사이트는 GitHub Pages로도
     배포되고 그쪽에는 백엔드가 없습니다. 그래서 요청이 실패하면 예전처럼
     사무국 메일(info@kmtpa.org)을 여는 방식으로 떨어집니다 — 접수 창구가
     없다고 신청 자체를 잃는 것보다 낫습니다.

     완료 화면에는 두 경우 모두 신청서 본문과 복사 버튼을 남깁니다. ----- */
  const JOIN_MAIL_TO = 'info@kmtpa.org';
  const JOIN_API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다

  NS.setupJoinFlow = function () {
    const stepsRoot = document.querySelector('[data-join-steps]');
    const panels = Array.from(document.querySelectorAll('[data-join-view]'));
    if (!stepsRoot || !panels.length) return;

    const steps = Array.from(stepsRoot.querySelectorAll('[data-join-step]'));
    const doneMsgEl = document.querySelector('[data-join-done-msg]');
    const summaryEl = document.querySelector('[data-join-summary]');
    const mailtoEl = document.querySelector('[data-join-mailto]');
    const copyBtn = document.querySelector('[data-join-copy]');

    // 단계 표시에서 각 화면이 몇 번째 칸에 해당하는지
    const RANK = { select: 0, personal: 1, corp: 1, done: 2 };
    const DONE_MSG = {
      personal: '가입 신청이 접수되었습니다. 사무국 확인 후 입력하신 이메일로 승인 결과를 알려드립니다.',
      corp: '가입 신청이 접수되었습니다. 필수 서류를 info@kmtpa.org로 보내주시면 검토 후 영업일 기준 5일 내에 담당자 이메일로 승인 결과와 회비를 안내드립니다.'
    };

    function showView(view, opts) {
      const target = panels.some(p => p.dataset.joinView === view) ? view : 'select';
      panels.forEach(p => { p.hidden = p.dataset.joinView !== target; });

      const rank = RANK[target] ?? 0;
      steps.forEach((el, i) => {
        el.classList.toggle('is-done', i < rank);
        el.classList.toggle('is-active', i === rank);
      });

      // 처음 진입(뒤로가기 포함)에는 스크롤을 건드리지 않습니다.
      if (opts && opts.scroll) {
        stepsRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    /* 폼 값을 사람이 읽는 신청서 본문으로 조립.
       체크박스처럼 같은 name이 여러 개인 항목은 쉼표로 묶습니다. */
    function buildSummary(form, typeLabel) {
      const lines = ['[한국의료관광진흥협회 회원가입 신청]', `가입 유형: ${typeLabel}`, ''];
      const seen = new Map();

      Array.from(form.elements).forEach(el => {
        if (!el.name || el.disabled) return;
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        const value = (el.value || '').trim();
        if (!value) return;
        seen.set(el.name, (seen.get(el.name) || []).concat([value]));
      });

      seen.forEach((values, name) => {
        lines.push(`${name}: ${values.join(', ')}`);
      });

      return lines.join('\n');
    }

    function firstInvalid(form) {
      return Array.from(form.elements).find(el => el.willValidate && !el.checkValidity()) || null;
    }

    /* 폼을 API 계약(docs/plan/14-erd.html 의 members)으로 옮깁니다.

       입력의 name은 한글이라 메일 본문에 그대로 쓰기 좋지만 API 필드명은 아닙니다.
       매핑을 JS에 표로 두면 필드를 더할 때 두 곳이 어긋나므로, 마크업의
       data-api / data-consent 속성이 짝을 들고 있습니다. */
    function buildPayload(form, kind) {
      const payload = { memberType: kind, consents: {} };
      const multi = new Set(['expertise', 'specialties']);

      Array.from(form.elements).forEach(el => {
        const consentKind = el.dataset && el.dataset.consent;
        if (consentKind) {
          // 미체크 항목도 false로 보내야 '거부'가 이력에 남습니다.
          payload.consents[consentKind] = el.checked;
          return;
        }

        const key = el.dataset && el.dataset.api;
        if (!key || el.disabled) return;
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;

        const value = (el.value || '').trim();
        if (multi.has(key)) {
          payload[key] = (payload[key] || []).concat(value ? [value] : []);
        } else if (value) {
          payload[key] = value;
        }
      });

      multi.forEach(key => { if (!payload[key]) payload[key] = []; });
      return payload;
    }

    function buildMailto(form, typeLabel, kind) {
      const body = buildSummary(form, typeLabel);
      const who = kind === 'corp'
        ? (form.elements['기관명(국문)'] || {}).value
        : (form.elements['이름(국문)'] || {}).value;
      const subject = `[KMTPA 회원가입] ${typeLabel}${who ? ` — ${who.trim()}` : ''}`;
      return {
        body,
        href: `mailto:${JOIN_MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      };
    }

    function finish(kind, mail) {
      if (summaryEl) summaryEl.textContent = mail.body;
      // 완료 화면의 메일 버튼은 서류 문의용입니다 — 신청 내용이 본문에 담겨 갑니다.
      if (mailtoEl) { mailtoEl.href = mail.href; mailtoEl.textContent = '사무국에 메일 보내기'; }
      if (doneMsgEl) doneMsgEl.textContent = DONE_MSG[kind] || DONE_MSG.personal;

      const copyBox = document.querySelector('.join-copy');
      if (copyBox) copyBox.hidden = true;

      showView('done', { scroll: true });
    }

    async function sendApplication(form, kind, submitBtn, errorEl) {
      const typeLabel = kind === 'corp' ? '법인회원' : '개인회원';

      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.busy = '1'; }
      try {
        const response = await fetch(`${JOIN_API_BASE}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildPayload(form, kind))
        });

        if (response.ok) {
          finish(kind, buildMailto(form, typeLabel, kind));
          return;
        }

        // 400/409/422 는 입력 문제라 서버 문구를 그대로 보여준다.
        if ([400, 409, 422].includes(response.status)) {
          const detail = await response.json().catch(() => null);
          throw new Error((detail && detail.error) || '입력을 다시 확인해 주세요.');
        }
        throw new Error(`서버 오류(${response.status})가 발생했습니다. 잠시 후 다시 시도해 주세요.`);
      } catch (error) {
        // 서버에 닿지 못해도 메일 접수로 돌리지 않는다. 메일로 온 신청은
        // 비밀번호 계정이 만들어지지 않아 회원 데이터가 갈라진다.
        const message = error instanceof TypeError
          ? '접수 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : (error.message || '신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; errorEl.focus?.(); }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; delete submitBtn.dataset.busy; }
      }
    }

    // 유형 카드 → 해당 폼으로
    document.querySelectorAll('[data-join-go]').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.joinGo, { scroll: true }));
    });

    // "회원 유형 다시 선택"
    document.querySelectorAll('[data-join-back]').forEach(btn => {
      btn.addEventListener('click', () => showView('select', { scroll: true }));
    });

    // 제출 — novalidate 이므로 직접 검증하고 첫 오류 항목으로 포커스를 옮깁니다.
    document.querySelectorAll('[data-join-form]').forEach(form => {
      const errorEl = form.querySelector('[data-join-error]');

      form.addEventListener('submit', e => {
        e.preventDefault();
        form.classList.add('is-validated');

        const bad = firstInvalid(form);
        if (bad) {
          if (errorEl) {
            errorEl.textContent = bad.type === 'checkbox'
              ? '필수 동의 항목을 확인해 주세요.'
              : '필수 항목을 모두 올바르게 입력해 주세요.';
            errorEl.hidden = false;
          }
          // 숨긴 체크박스는 포커스가 보이지 않으므로 감싼 상자로 스크롤합니다.
          const anchor = bad.type === 'checkbox' ? (bad.closest('.term') || bad) : bad;
          anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (anchor === bad) bad.focus({ preventScroll: true });
          return;
        }

        if (errorEl) errorEl.hidden = true;
        sendApplication(form, form.dataset.joinForm, form.querySelector('button[type=submit]'), errorEl);
      });
    });

    if (copyBtn && summaryEl) {
      copyBtn.addEventListener('click', async () => {
        const text = summaryEl.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = '복사됨';
        } catch (err) {
          // 클립보드 권한이 없는 브라우저 — 선택 상태로 두어 직접 복사하게 합니다.
          const range = document.createRange();
          range.selectNodeContents(summaryEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          copyBtn.textContent = '선택됨 — Ctrl+C';
        }
        setTimeout(() => { copyBtn.textContent = '복사'; }, 2200);
      });
    }

    // ?type=corp / #corp 로 들어오면 해당 폼을 바로 엽니다 (배너·메뉴 딥링크용).
    const params = new URLSearchParams(window.location.search);
    const deep = (params.get('type') || window.location.hash.replace('#', '')).toLowerCase();
    showView(deep === 'corp' || deep === 'personal' ? deep : 'select');
  };

})(window.KMTPA);
