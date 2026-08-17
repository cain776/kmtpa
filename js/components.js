/* =========================================================================
   components.js — 화면 뼈대와 탐색

   레이아웃 주입(헤더·푸터·날개 배너·빵부스러기), 히어로, 모바일 메뉴, 탭,
   FAQ 아코디언. 방문자가 '어디에 있고 어디로 갈 수 있는지' 를 다루는 것들이다.

   뉴스레터 모달은 components-modal.js, 회원가입 3단계는 components-join.js 가
   맡는다. 둘 다 특정 화면에서만 도는 데다 이 파일이 600줄을 넘어 떼어냈다.

   로드 순서: templates.js -> components.js -> components-modal.js
              -> components-join.js -> app.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

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
      headerCta.addEventListener('click', async (e) => {
        e.preventDefault();
        let token = '';
        try { token = (JSON.parse(memberSession) || {}).token || ''; }
        catch (ignored) { /* 손상된 로컬 세션은 로컬에서만 정리합니다 */ }
        sessionStorage.removeItem('kmtpa.member.preview.v1');
        if (token) {
          try {
            await fetch(`${window.KMTPA_API_BASE || '/api'}/member/logout`, {
              method: 'POST',
              headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
              cache: 'no-store',
              keepalive: true,
            });
          } catch (ignored) { /* 네트워크가 끊겨도 브라우저 세션은 종료합니다 */ }
        }
        // 로그아웃 후에는 홈으로. href 가 '<루트>/login/index.html' 이므로
        // 그 자리를 index.html 로 바꾸면 어느 배포 경로에서도 루트가 됩니다.
        window.location.href = headerCta.href.replace(/login\/index\.html.*$/, 'index.html');
      });
    }
  };

  /* ----- Hero 배경 영상 재생 (playlist 순환 + 속도 조절) ----- */
  /* 히어로 언어 선택은 i18n.js 의 mountSelect() 가 [data-hero-lang] 자리에 그립니다. */

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
    // 슬라이드 문구. 6 초마다 headline 을 다시 쓰므로, 번역을 한 번 적용해도
    // 다음 회전에서 원문으로 되돌아간다. 그래서 그릴 때마다 사전을 본다.
    const COPY = [
      '세계가 신뢰하는 <em>K-의료관광</em>을<br>만들어갑니다.',
      '치료를 넘어, <em>한국을 경험하는 여정</em>을<br>함께 만듭니다.'
    ];
    const COPY_KEYS = ['home.hero.1', 'home.hero.2'];
    const copyAt = i => (NS.t && NS.t(COPY_KEYS[i])) || COPY[i];

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const INTERVAL = 6000;
    let index = 0;
    let timer = null;

    function pad(n) { return String(n).padStart(2, '0'); }

    function render() {
      slides.forEach((el, i) => el.classList.toggle('is-active', i === index));
      dots.forEach((el, i) => {
        el.classList.toggle('is-active', i === index);
        // tab/aria-selected 였다. 가리키는 tabpanel 이 없어 버튼 무리로 바꿨고,
        // 현재 것은 aria-current 로 알린다.
        if (i === index) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
      });
      if (headline && COPY[index]) headline.innerHTML = copyAt(index);
      if (counter) counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    }

    function go(next) {
      index = ((next % total) + total) % total;
      render();
      restart();
    }

    // 마우스가 히어로 위에 있거나 안의 버튼에 포커스가 있는 동안은 돌리지
    // 않는다. 읽고 있는데 6초마다 바뀌면 못 읽고, 자동 회전을 멈출 방법이
    // 없는 것은 접근성 기준(WCAG 2.2.2)에 걸린다. 벗어나면 다시 돈다.
    let held = false;

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function restart() {
      stop();
      if (reduceMotion || held) return;      // 모션 최소화 설정이거나 잡혀 있으면 안 돎
      timer = setInterval(() => go(index + 1), INTERVAL);
    }

    function hold()    { held = true;  stop(); }
    function release() { held = false; restart(); }

    // 마우스일 때만. 터치는 enter 가 한 번 오고 leave 가 안 와서, 한 번
    // 만지면 영영 멈춘 채로 남는다.
    stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold(); });
    stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') release(); });
    stage.addEventListener('focusin', hold);
    // 포커스가 히어로 밖으로 나갈 때만 푼다. 안에서 버튼 사이를 옮길 때는
    // focusout → focusin 이 연달아 오는데, relatedTarget 이 안쪽이면 나간 게 아니다.
    stage.addEventListener('focusout', (e) => {
      if (!stage.contains(e.relatedTarget)) release();
    });

    stage.querySelector('.hero-arrow--prev')?.addEventListener('click', () => go(index - 1));
    stage.querySelector('.hero-arrow--next')?.addEventListener('click', () => go(index + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));

    stage.querySelector('.hero-scroll')?.addEventListener('click', () => {
      const target = stage.nextElementSibling;
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    // 탭이 가려져 있는 동안에는 타이머를 돌리지 않습니다.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else restart();
    });

    render();
    restart();
    // 사전은 나중에 도착한다. i18n.js 가 다 적용한 뒤 한 번 더 그린다.
    NS.refreshHeroCopy = render;

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

  /* ----- 모바일 메뉴 서랍 -----
     대메뉴만 보이고 + 를 눌러야 하위가 열린다. 예전에는 22개 링크가 한 번에
     쏟아져서 무엇이 상위인지 알아보기 어려웠다.

     닫는 길을 셋 둔다 — 햄버거를 다시 누르기(아이콘이 ✕ 로 바뀐다), 바깥
     누르기, ESC. 예전에도 다시 누르면 닫히긴 했는데 아이콘이 ☰ 그대로라
     닫을 수 있다는 것이 보이지 않았다. */
  NS.setupMobileNav = function () {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('top-nav');
    if (!toggle || !nav) return;

    const header = toggle.closest('.site-header');
    let backdrop = null;

    function icon(name) {
      toggle.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      toggle.appendChild(i);
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }

    function setOpen(open) {
      nav.classList.toggle('open', open);
      if (header) header.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      icon(open ? 'x' : 'menu');

      if (open && !backdrop) {
        // 바깥을 눌러 닫는 자리. 버튼으로 두어야 키보드로도 닿는다.
        backdrop = document.createElement('button');
        backdrop.type = 'button';
        backdrop.className = 'nav-backdrop';
        backdrop.setAttribute('aria-label', '메뉴 닫기');
        backdrop.addEventListener('click', () => setOpen(false));
        (header || document.body).appendChild(backdrop);
      } else if (!open && backdrop) {
        backdrop.remove();
        backdrop = null;
      }
      if (!open) collapseAll();
    }

    function setExpandIcon(button, open) {
      button.innerHTML = `<i data-lucide="${open ? 'minus' : 'plus'}"></i>`;
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }

    function collapseAll() {
      nav.querySelectorAll('.nav-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      nav.querySelectorAll('.nav-expand[aria-expanded="true"]').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        setExpandIcon(b, false);
      });
    }

    /* 하위가 있는 대메뉴마다 + 버튼을 단다. 마크업이 아니라 여기서 만드는
       이유는 데스크톱에는 없는 부품이기 때문이다 — templates.js 를 모바일
       사정으로 어지럽히지 않는다. */
    nav.querySelectorAll('.nav-item-with-dropdown').forEach((item, index) => {
      const dropdown = item.querySelector('.nav-dropdown');
      const link = item.querySelector(':scope > a');
      if (!dropdown || !link) return;

      const id = dropdown.id || `nav-sub-${index}`;
      dropdown.id = id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-expand';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', id);
      button.setAttribute('aria-label', `${link.textContent.trim()} 하위 메뉴`);
      button.innerHTML = '<i data-lucide="plus"></i>';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const open = !dropdown.classList.contains('is-open');
        // 한 번에 하나만 연다. 여섯이 다 열리면 처음 모습으로 되돌아간다.
        collapseAll();
        dropdown.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        setExpandIcon(button, open);
      });
      item.appendChild(button);
    });

    /* 서랍 첫 줄에 언어 자리를 만든다. 상자 자체는 i18n.js 가 넣는다 —
       언어 목록이 그쪽에 있고, 이 파일이 그것까지 알 필요는 없다.

       좁은 화면에서 헤더에 두면 이름과 자리를 다툰다. 실제로 360px 에서
       4px 겹쳤다. 그렇다고 언어를 서랍 안에만 두면 한국어를 못 읽는 사람이
       메뉴를 열어 볼 생각을 못 한다. 그래서 헤더에는 지구본만 남기고, 그것을
       누르면 서랍이 이 줄과 함께 열린다. */
    if (!nav.querySelector('.nav-lang-row')) {
      const row = document.createElement('div');
      row.className = 'nav-lang-row';
      row.setAttribute('data-drawer-lang', '');
      const label = document.createElement('span');
      label.className = 'nav-lang-label';
      label.innerHTML = '<i data-lucide="globe"></i><span>Language</span>';
      row.appendChild(label);
      nav.prepend(row);
    }

    // 헤더 왼쪽 지구본 — 서랍을 열어 위 줄로 데려간다.
    const container = toggle.closest('.container');
    if (container && !container.querySelector('.lang-trigger')) {
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'lang-trigger';
      trigger.setAttribute('aria-label', '언어 선택');
      trigger.setAttribute('aria-controls', 'top-nav');
      trigger.innerHTML = '<i data-lucide="globe"></i>';
      trigger.addEventListener('click', () => {
        if (!nav.classList.contains('open')) setOpen(true);
        const select = nav.querySelector('.nav-lang-row select');
        if (select) select.focus({ preventScroll: true });
      });
      container.prepend(trigger);
    }

    // 서랍 맨 아래 로그인 — 헤더에서 자리를 내주고 여기로 내려왔다.
    const cta = document.querySelector('.header-cta');
    if (cta && !nav.querySelector('.nav-drawer-cta')) {
      const link = document.createElement('a');
      link.className = 'nav-drawer-cta';
      link.href = cta.getAttribute('href') || '#';
      link.textContent = cta.textContent.trim() || '로그인';
      nav.appendChild(link);
    }

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
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
})(window.KMTPA);
