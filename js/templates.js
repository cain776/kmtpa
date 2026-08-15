/* =========================================================================
   templates.js — 공용 HTML 마크업 + 페이지 감지
   (사)한국의료관광진흥협회 KMTPA 공개 홈페이지

   모든 페이지에서 동일한 헤더·푸터·날개 배너·뉴스레터 모달을 공유하기 위해
   HTML 문자열 상수를 한 곳에 모아둡니다. window.KMTPA 네임스페이스에 노출되며
   components.js와 app.js가 이를 읽어 사용합니다.

   로드 순서: templates.js → components.js → app.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

  /* ----- 현재 페이지 판별 (active nav state) ----- */
  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL('js/templates.js', window.location.href);
  const siteRoot = new URL('../', scriptUrl);
  const sitePath = siteRoot.pathname.endsWith('/') ? siteRoot.pathname : `${siteRoot.pathname}/`;
  const currentPath = window.location.pathname.replace(sitePath, '').replace(/^\/+/, '').toLowerCase();
  const path = currentPath || 'index.html';

  function localUrl(target) {
    if (target.protocol === 'file:') return target.href;
    return `${target.pathname}${target.search}${target.hash}`;
  }

  function normalizeRoute(route) {
    if (!route) return 'index.html';
    if (route.startsWith('#')) return `index.html${route}`;
    if (/^[a-z][a-z\d+.-]*:/i.test(route) || route.startsWith('//')) return route;

    const hashIndex = route.indexOf('#');
    const beforeHash = hashIndex >= 0 ? route.slice(0, hashIndex) : route;
    const hash = hashIndex >= 0 ? route.slice(hashIndex) : '';
    const queryIndex = beforeHash.indexOf('?');
    const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : '';
    const filePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;

    return `${filePath}${query}${hash}`;
  }

  const page = (route) => localUrl(new URL(normalizeRoute(route), siteRoot));
  const flags = {
    isAbout: path === 'about/' || path === 'about/index.html',
    isTransparency: path === 'transparency/' || path === 'transparency/index.html',
    isTogether: path === 'together/' || path === 'together/index.html',
    isVisitKorea: path === 'patient-journey/' || path === 'patient-journey/index.html',
    isCommunications: path === 'communications/' || path === 'communications/index.html',
    isPrograms: path === 'programs/' || path === 'programs/index.html'
  };
  // 활동·자료 상위 메뉴 활성화 — 현재 주요업무 페이지가 유일한 하위 페이지
  flags.isResources = flags.isPrograms;

  NS.flags = flags;
  NS.path = path;
  NS.sitePath = sitePath;
  NS.makePageUrl = page;

  const { isAbout, isTransparency, isTogether, isVisitKorea, isCommunications, isResources } = flags;

  /* ----- Header markup (모든 페이지 공통) ----- */
  NS.HEADER_HTML = `
    <header class="site-header">
      <div class="container">
        <a href="${page('')}" class="brand" aria-label="KMTPA 홈으로">
          <span class="brand-mark"><img src="${page('images_homepage/logo2.png')}" alt=""></span>
          <span class="brand-name">
            <span class="ko">한국의료관광진흥협회</span>
            <span class="en">Korean Medical Tourism Promotion Association</span>
          </span>
        </a>

        <nav class="top-nav" id="top-nav" aria-label="주 메뉴">
          <div class="nav-item-with-dropdown">
            <a href="${page('about/')}"${isAbout ? ' class="active" aria-current="page"' : ''}>협회 소개</a>
            <div class="nav-dropdown nav-dropdown--mega" role="menu">
              <div class="dropdown-group">
                <div class="dropdown-group-label">KMTPA는</div>
                <a href="${page('about/#greeting')}" role="menuitem">인사말</a>
                <a href="${page('about/#vision')}" role="menuitem">비전·미션</a>
                <a href="${page('about/#values')}" role="menuitem">핵심 가치</a>
                <a href="${page('directions/')}" role="menuitem">오시는 길</a>
              </div>
              <div class="dropdown-group">
                <div class="dropdown-group-label">함께하는 사람들</div>
                <a href="${page('about/#organization')}" role="menuitem">조직</a>
              </div>
            </div>
          </div>
          <div class="nav-item-with-dropdown">
            <a href="${page('transparency/')}"${isTransparency ? ' class="active" aria-current="page"' : ''}>투명경영</a>
            <div class="nav-dropdown" role="menu">
              <a href="${page('transparency/')}" role="menuitem">지속가능경영</a>
              <a href="${page('transparency/#finance')}" role="menuitem">재정 및 활동보고</a>
              <a href="${page('transparency/#accountability')}" role="menuitem">투명성과 책무성</a>
            </div>
          </div>
          <div class="nav-item-with-dropdown">
            <a href="${page('communications/')}"${isCommunications ? ' class="active" aria-current="page"' : ''}>커뮤니티</a>
            <!-- MEDICON('대표 브랜드' 그룹)을 걷어내면서 일반 드롭다운으로 되돌렸다.
                 한 그룹만 남은 620px 메가는 대부분이 빈 칸이고, 그룹 라벨('알림')도
                 나뉠 상대가 없으면 줄만 하나 더 먹는다. MEDICON 은 우측 날개 배너와
                 푸터에 그대로 있다. -->
            <div class="nav-dropdown" role="menu">
              <a href="${page('communications/#press')}" role="menuitem">보도자료</a>
              <a href="${page('communications/#notice')}" role="menuitem">공지사항</a>
              <a href="${page('communications/#newsletter')}" role="menuitem">뉴스레터</a>
            </div>
          </div>
          <div class="nav-item-with-dropdown">
            <a href="${page('together/')}"${isTogether ? ' class="active" aria-current="page"' : ''}>함께하기</a>
            <div class="nav-dropdown" role="menu">
              <a href="${page('together/')}" role="menuitem">회원 안내</a>
              <a href="${page('join/')}" role="menuitem">회원가입 신청</a>
              <a href="${page('consultation/')}" role="menuitem">상담 신청</a>
            </div>
          </div>
          <a href="${page('patient-journey/')}"${isVisitKorea ? ' class="active" aria-current="page"' : ''}>Visit Korea</a>
          <div class="nav-item-with-dropdown">
            <a href="${page('programs/')}"${isResources ? ' class="active" aria-current="page"' : ''}>활동·자료</a>
            <div class="nav-dropdown" role="menu">
              <a href="${page('programs/')}" role="menuitem">주요업무</a>
              <a href="${page('programs/#history')}" role="menuitem">활동 연혁</a>
            </div>
          </div>
        </nav>

        <!-- 회원 로그인. 사무국 로그인은 공개 사이트에서 걷어냈습니다 — 방문자가
             누를 일이 없고, 눌러도 권한이 없어 되돌아옵니다. 사무국은 내부 주소로
             바로 들어갑니다. -->
        <a href="${page('login/')}" class="header-cta">로그인</a>

        <button class="mobile-toggle" id="mobile-toggle" type="button" aria-label="메뉴 열기" aria-controls="top-nav" aria-expanded="false">
          <i data-lucide="menu"></i>
        </button>
      </div>
    </header>
  `;

  /* ----- Depth1 네비게이터 (빵부스러기 + 형제 메뉴) -----
     헤더 드롭다운은 마우스를 올려야 보입니다. 페이지에 들어온 뒤 '내가 어디에
     있는지' 와 '옆에 뭐가 있는지' 를 항상 보이게 두는 것이 이 줄의 역할입니다.

     각 페이지는 <div id="breadcrumb-mount" data-depth1="transparency"> 하나만
     두면 되고, 목록은 여기 한 곳에서 관리합니다. ----- */
  NS.DEPTH1 = [
    { key: 'about', label: '협회 소개', route: 'about/' },
    { key: 'transparency', label: '투명경영', route: 'transparency/' },
    { key: 'communications', label: '커뮤니티', route: 'communications/' },
    { key: 'together', label: '함께하기', route: 'together/' },
    { key: 'patient-journey', label: 'Visit Korea', route: 'patient-journey/' },
    { key: 'programs', label: '활동·자료', route: 'programs/' },
  ];

  NS.breadcrumbHtml = function (currentKey) {
    const current = NS.DEPTH1.find(d => d.key === currentKey);
    if (!current) return '';
    const siblings = NS.DEPTH1
      .filter(d => d.key !== currentKey)
      .map(d => `<a href="${page(d.route)}" role="menuitem">${d.label}</a>`)
      .join('');
    return `
      <nav class="breadcrumb" aria-label="현재 위치">
        <div class="container-narrow breadcrumb-inner">
          <ol>
            <li><a href="${page('')}">홈</a></li>
            <li aria-current="page">${current.label}</li>
          </ol>
          <div class="breadcrumb-siblings">
            <button type="button" class="breadcrumb-toggle" aria-expanded="false" aria-haspopup="true">
              다른 메뉴
              <i data-lucide="chevron-down"></i>
            </button>
            <div class="breadcrumb-menu" role="menu" hidden>${siblings}</div>
          </div>
        </div>
      </nav>`;
  };

  /* ----- Footer markup ----- */
  NS.FOOTER_HTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-brand-block">
          <a href="${page('')}" class="brand" aria-label="KMTPA 홈으로">
            <span class="brand-mark"><img src="${page('images_homepage/logo2.png')}" alt=""></span>
            <span class="brand-name">
              <span class="ko">(사)한국의료관광진흥협회</span>
              <span class="en">Korean Medical Tourism Promotion Association</span>
            </span>
          </a>
          <p class="footer-tagline">
            대한민국 의료관광의 신뢰를 만듭니다. 회원 의료기관과 전문가 네트워크의 공식 협회.
          </p>

          <div class="footer-social" aria-label="SNS">
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20LinkedIn%20Channel%20Inquiry" aria-label="LinkedIn"><i data-lucide="linkedin"></i></a>
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20YouTube%20Channel%20Inquiry" aria-label="YouTube"><i data-lucide="youtube"></i></a>
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20Facebook%20Channel%20Inquiry" aria-label="Facebook"><i data-lucide="facebook"></i></a>
            <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener" aria-label="Instagram"><i data-lucide="instagram"></i></a>
          </div>
        </div>

        <!-- 컬럼 넷. cms.js 의 applyFooter 가 이 순서대로 CMS 데이터를 덮어쓰므로
             (위치 기준 매칭) 어드민의 footer.columns 순서와 반드시 같아야 합니다. -->
        <div class="footer-cols">
          <div class="footer-col">
            <h4>협회 소개</h4>
            <a href="${page('about/#greeting')}">인사말</a>
            <a href="${page('about/#vision')}">비전·미션</a>
            <a href="${page('about/#organization')}">조직</a>
            <a href="${page('transparency/')}">투명경영</a>
          </div>

          <div class="footer-col">
            <h4>활동·자료</h4>
            <a href="${page('programs/')}">주요업무</a>
            <a href="${page('programs/#history')}">활동 연혁</a>
            <a href="${page('patient-journey/')}">VISIT KOREA 전체 안내</a>
          </div>

          <div class="footer-col">
            <h4>커뮤니티</h4>
            <a href="${page('communications/#press')}">보도자료</a>
            <a href="${page('communications/#notice')}">공지사항</a>
            <a href="${page('communications/#newsletter')}">뉴스레터</a>
          </div>

          <div class="footer-col footer-col--contact">
            <h4>문의·연결</h4>
            <a href="${page('together/')}">함께하기</a>
            <a href="${page('join/')}">회원가입</a>
            <a href="${page('consultation/')}">상담 신청</a>
            <a href="${page('directions/')}">오시는 길</a>
          </div>
        </div>
      </div>

      <!-- 푸터 맨 아래 흰 띠 한 줄. 왼쪽에 소관 부처·공시 로고, 오른쪽에
           저작권과 약관.

           예전에는 저작권이 어두운 띠에, 로고가 흰 띠에 있어 줄이 둘이었다.
           둘 다 '법적 표기' 성격이라 한 줄로 합치는 편이 읽기도 낫고 푸터도
           짧아진다.

           로고 PNG 두 장은 알파가 없어 배경이 꽉 찬 이미지다. 어두운 바탕에
           얹고 흰색으로 뒤집으면 로고가 아니라 회색 사각형 두 개가 된다 —
           흰 바탕이라야 그 배경이 묻히고 원래 색이 나온다.

           loading="lazy" 를 뺐다. 둘 합쳐 20KB 도 안 되는데, 지연 로딩이면
           푸터까지 스크롤해야 뜬다 — 짧은 페이지에서 처음부터 푸터가 보일 때
           빈 자리로 남아 깨져 보였다. width/height 는 그대로 두어 로드 전에도
           자리를 잡는다. -->
      <div class="footer-authorities">
        <div class="container footer-authorities-inner">
          <div class="footer-authorities-marks">
            <span class="footer-authorities-label">소관 부처 · 공시</span>
            <a href="https://www.mcst.go.kr/" target="_blank" rel="noopener">
              <img src="${page('images_homepage/authority/mcst.png')}" alt="문화체육관광부" width="588" height="147" decoding="async">
            </a>
            <a href="https://www.hometax.go.kr/" target="_blank" rel="noopener">
              <img src="${page('images_homepage/authority/nts.png')}" alt="국세청" width="380" height="136" decoding="async">
            </a>
          </div>
          <div class="footer-authorities-contact">
            <a href="mailto:info@kmtpa.org">info@kmtpa.org</a>
            <a href="mailto:concierge@kmtpa.org">concierge@kmtpa.org</a>
            <a href="https://kmtpa.org/" target="_blank" rel="noopener">kmtpa.org</a>
          </div>
          <div class="footer-authorities-legal">
            <span>© 2026 (사)한국의료관광진흥협회. All rights reserved.</span>
            <a href="${page('privacy/')}">개인정보처리방침</a>
            <a href="${page('terms/')}">이용약관</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  /* ----- 히어로 상단 바 (홈 전용 — 이미지 위에 얹히는 투명 헤더) -----
     대메뉴는 하단 바로가기 바로 내렸습니다. 여기에는 브랜드와 관리자 로그인만
     남겨 첫 화면을 비워 둡니다. 스크롤하면 공용 .site-header 가 내려오고,
     거기에 드롭다운이 딸린 전체 메뉴가 있습니다. ----- */
  NS.HERO_TOPBAR_HTML = `
    <div class="hero-topbar">
      <a href="${page('')}" class="hero-brand" aria-label="KMTPA 홈으로">
        <!-- logo2.png 는 흰 배경이 붙어 있어 사진 위에서 흰 상자로 보입니다.
             히어로에서는 배경 없는 마름모 마크(가운데 것과 동일)를 씁니다. -->
        <svg class="hero-brand-mark" viewBox="0 0 48 48" aria-hidden="true">
          <g fill="#E8A33D">
            <rect x="17" y="3"  width="14" height="14" rx="4.5" transform="rotate(45 24 10)"></rect>
            <rect x="31" y="17" width="14" height="14" rx="4.5" transform="rotate(45 38 24)"></rect>
            <rect x="17" y="31" width="14" height="14" rx="4.5" transform="rotate(45 24 38)"></rect>
            <rect x="3"  y="17" width="14" height="14" rx="4.5" transform="rotate(45 10 24)"></rect>
          </g>
        </svg>
        <span>
          <span class="ko">한국의료관광진흥협회</span>
          <span class="en">Korean Medical Tourism Promotion Association</span>
        </span>
      </a>
    </div>
  `;

  /* ----- 히어로 하단 바로가기 바 (홈 전용) -----
     상단에 있던 대메뉴(협회 소개·커뮤니티·Visit Korea·활동·자료)를
     이 바로 합쳐 첫 화면의 진입점을 한 줄로 모았습니다.

     8칸 모두 아이콘 하나 + 라벨 한 줄입니다. 예전에는 외부 채널 3칸에만
     "바로가기" 보조문구가 붙어 그 칸들만 세로로 밀려 보였습니다.

     순서는 두 칸씩 네 쌍입니다. 이 바는 좁아지면 4열 → 2열로 접히는데
     (home.css 의 nth-child 규칙), 짝을 맞춰 두면 어느 폭에서도 같이 놓일
     것끼리 붙어 있습니다.

       협회 알아보기   협회소개 · Visit Korea
       소식            커뮤니티 · 공지사항
       회원            회원가입 안내 · 회원기관 찾기
       외부 채널       MEDICON · 인스타그램

     외부로 나가는 칸은 맨 뒤에 둡니다 — 먼저 눌리면 사이트를 떠납니다. ----- */
  NS.HERO_QUICKBAR_HTML = `
    <nav class="hero-quickbar" aria-label="바로가기">
      <a href="${page('about/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"></path><path d="M5 21V10l7-5 7 5v11"></path><path d="M10 21v-6h4v6"></path></svg>
        <span class="qb-label">협회소개</span>
      </a>
      <a href="${page('patient-journey/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2c2.7 2.7 4 6.2 4 10s-1.3 7.3-4 10c-2.7-2.7-4-6.2-4-10s1.3-7.3 4-10z"></path></svg>
        <span class="qb-label">Visit Korea</span>
      </a>
      <a href="${page('communications/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="qb-label">커뮤니티</span>
      </a>
      <a href="${page('communications/#notice')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 18-6v14L3 13z"></path><path d="M11.6 16.9a3 3 0 1 1-5.6-1.9"></path></svg>
        <span class="qb-label">공지사항</span>
      </a>
      <a href="${page('join/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>
        <span class="qb-label">회원가입 안내</span>
      </a>
      <a href="${page('about/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.7" y2="16.7"></line></svg>
        <span class="qb-label">회원기관 찾기</span>
      </a>
      <a href="https://mymedicon.com/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z"></path></svg>
        <span class="qb-label">MEDICON</span>
      </a>
      <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"></rect><circle cx="12" cy="12" r="4.5"></circle><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"></circle></svg>
        <span class="qb-label">인스타그램</span>
      </a>
    </nav>
  `;

  /* ----- Quick Banner (우측 날개 — 회원가입 & MEDICON & Instagram) -----
     회원가입은 협회의 주 전환 동선이라 맨 위에 두고 색을 채워 강조합니다. ----- */
  NS.QUICK_BANNER_HTML = `
    <aside class="quick-banner" aria-label="빠른 링크">
      <a href="${page('join/')}" class="quick-link quick-link--primary">
        <span class="quick-label">회원가입</span>
        <span class="quick-icon"><i data-lucide="user-plus"></i></span>
      </a>
      <a href="${page('communications/#newsletter')}" class="quick-link">
        <span class="quick-label">뉴스레터</span>
        <span class="quick-icon"><i data-lucide="mail"></i></span>
      </a>
      <a href="https://mymedicon.com/" target="_blank" rel="noopener" class="quick-link quick-link--external quick-link--flagship">
        <span class="quick-label">MEDICON</span>
        <span class="quick-icon"><i data-lucide="arrow-up-right"></i></span>
      </a>
      <a href="https://mymedicon.com/alliance/" target="_blank" rel="noopener" class="quick-link quick-link--external quick-link--network">
        <span class="quick-label">MEDICON Network</span>
        <span class="quick-icon"><i data-lucide="network"></i></span>
      </a>
      <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener" class="quick-link quick-link--external quick-link--instagram">
        <span class="quick-label">Instagram</span>
        <span class="quick-icon"><i data-lucide="instagram"></i></span>
      </a>
    </aside>
  `;

  /* ----- Newsletter Modal markup (커뮤니티·홈에서 공유) ----- */
  NS.PUB_MODAL_HTML = `
    <div id="pub-modal" class="pub-modal" role="dialog" aria-modal="true" aria-labelledby="pub-modal-title" hidden>
      <div class="pub-modal-backdrop" data-modal-close></div>
      <div class="pub-modal-dialog" role="document">
        <header class="pub-modal-header">
          <div class="pub-modal-issue" aria-hidden="true"></div>
          <button type="button" class="pub-modal-close" aria-label="닫기" data-modal-close>
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="pub-modal-body" id="pub-modal-body" tabindex="-1">
          <!-- 콘텐츠는 PUB_DETAILS 또는 카드 내부 <template>에서 주입 -->
        </div>
        <footer class="pub-modal-footer">
          <span class="pub-modal-footer-note">한국의료관광진흥협회 발행</span>
          <a href="mailto:info@kmtpa.org?subject=%EB%89%B4%EC%8A%A4%EB%A0%88%ED%84%B0%20%EC%9E%90%EB%A3%8C%20%EB%AC%B8%EC%9D%98" class="link-cta pub-modal-download">
            자료 문의 메일
            <i data-lucide="mail"></i>
          </a>
        </footer>
      </div>
    </div>
  `;

  /* ----- Newsletter 콘텐츠 데이터베이스 (id → 모달 본문 HTML)
     Vol. 25 (대만)은 별도 페이지(newsletter/vol25/index.html)로 분리되어
     SEO·외부 공유에 최적화되었습니다. 페이지가 없는 뉴스레터를 모달로
     보여주려면 이 객체에 'vol-XX': '...HTML...' 형식으로 추가하세요. ----- */
  NS.PUB_DETAILS = {
    // 현재는 모든 vol이 페이지 또는 placeholder로 처리됩니다.
  };

})(window.KMTPA);
