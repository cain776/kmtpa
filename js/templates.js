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
  // 내부 시스템 로그인. frontend/ 가 shared/·workspace/·admin/ 으로 분리되면서
  // 진입점이 shared/login.html 로 바뀌었습니다.
  const adminUrl = localUrl(new URL('../shared/login.html', siteRoot));
  const flags = {
    isAbout: path === 'about/' || path === 'about/index.html',
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

  const { isAbout, isVisitKorea, isCommunications, isResources } = flags;

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
                <a href="${page('about/#board')}" role="menuitem">이사회</a>
              </div>
              <div class="dropdown-group">
                <div class="dropdown-group-label">투명경영</div>
                <a href="${page('about/#transparency')}" role="menuitem">지속가능경영</a>
                <a href="${page('about/#transparency-finance')}" role="menuitem">재정 및 활동보고</a>
                <a href="${page('about/#transparency-accountability')}" role="menuitem">투명성과 책무성</a>
              </div>
            </div>
          </div>
          <div class="nav-item-with-dropdown">
            <a href="${page('communications/')}"${isCommunications ? ' class="active" aria-current="page"' : ''}>커뮤니케이션</a>
            <div class="nav-dropdown nav-dropdown--mega" role="menu">
              <div class="dropdown-group">
                <div class="dropdown-group-label">알림</div>
                <a href="${page('communications/#press')}" role="menuitem">보도자료</a>
                <a href="${page('communications/#notice')}" role="menuitem">공지사항</a>
                <a href="${page('communications/#newsletter')}" role="menuitem">뉴스레터</a>
              </div>
              <div class="dropdown-group">
                <div class="dropdown-group-label">대표 브랜드</div>
                <a href="https://mymedicon.com/" target="_blank" rel="noopener" role="menuitem">
                  MEDICON<span class="external-mark"><i data-lucide="arrow-up-right"></i></span>
                </a>
                <p class="dropdown-group-desc">한국을 대표하는<br>의료·뷰티 전문가와 함께</p>
              </div>
            </div>
          </div>
          <a href="${page('patient-journey/')}"${isVisitKorea ? ' class="active" aria-current="page"' : ''}>Visit Korea</a>
          <div class="nav-item-with-dropdown">
            <a href="${page('programs/')}"${isResources ? ' class="active" aria-current="page"' : ''}>활동·자료</a>
            <div class="nav-dropdown" role="menu">
              <a href="${page('programs/')}" role="menuitem">주요업무</a>
              <a href="${page('#resources')}" role="menuitem">산업 동향</a>
              <a href="${page('#events')}" role="menuitem">이벤트·교육</a>
              <a href="${page('#awards')}" role="menuitem">시상·인증</a>
            </div>
          </div>
        </nav>

        <a href="${adminUrl}" class="header-cta">관리자 로그인</a>

        <button class="mobile-toggle" id="mobile-toggle" type="button" aria-label="메뉴 열기" aria-controls="top-nav" aria-expanded="false">
          <i data-lucide="menu"></i>
        </button>
      </div>
    </header>
  `;

  /* ----- Footer markup ----- */
  NS.FOOTER_HTML = `
    <footer class="site-footer">
      <div class="container">
        <div>
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

          <div class="footer-brand-extras">
            <div class="footer-brand-label">Our Flagship Brand</div>
            <a href="https://mymedicon.com/" target="_blank" rel="noopener" class="footer-brand-link">
              MEDICON
              <i data-lucide="arrow-up-right"></i>
            </a>
          </div>

          <div class="footer-social" aria-label="SNS">
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20LinkedIn%20Channel%20Inquiry" aria-label="LinkedIn"><i data-lucide="linkedin"></i></a>
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20YouTube%20Channel%20Inquiry" aria-label="YouTube"><i data-lucide="youtube"></i></a>
            <a href="mailto:info@kmtpa.org?subject=KMTPA%20Facebook%20Channel%20Inquiry" aria-label="Facebook"><i data-lucide="facebook"></i></a>
            <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener" aria-label="Instagram"><i data-lucide="instagram"></i></a>
          </div>
        </div>

        <div class="footer-col">
          <h4>협회 소개</h4>
          <a href="${page('about/#greeting')}">인사말</a>
          <a href="${page('about/#vision')}">비전·미션</a>
          <a href="${page('about/#organization')}">조직</a>
          <a href="${page('about/#board')}">이사회</a>
          <a href="${page('about/#transparency')}">투명경영</a>
        </div>

        <div class="footer-col">
          <h4>커뮤니케이션</h4>
          <a href="${page('communications/#press')}">보도자료</a>
          <a href="${page('communications/#notice')}">공지사항</a>
          <a href="${page('communications/#newsletter')}">뉴스레터</a>
        </div>

        <div class="footer-col">
          <h4>Visit Korea</h4>
          <a href="${page('patient-journey/')}">전체 안내</a>
        </div>

        <div class="footer-col">
          <h4>활동·자료</h4>
          <a href="${page('programs/')}">주요업무</a>
          <a href="${page('#resources')}">산업 동향</a>
          <a href="${page('#events')}">이벤트·교육</a>
          <a href="${page('#awards')}">시상·인증</a>
        </div>

        <div class="footer-col">
          <h4>문의·연결</h4>
          <a href="mailto:info@kmtpa.org">info@kmtpa.org</a>
          <a href="mailto:concierge@kmtpa.org">concierge@kmtpa.org</a>
          <a href="${page('directions/')}">오시는 길</a>
          <a href="https://kmtpa.org/" target="_blank" rel="noopener">kmtpa.org</a>
        </div>
      </div>

      <div class="container footer-bottom">
        <div>© 2026 (사)한국의료관광진흥협회. All rights reserved.</div>
        <div class="footer-legal-links">
          <a href="${page('privacy/')}">개인정보처리방침</a>
          <a href="${page('terms/')}">이용약관</a>
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
      <div class="hero-lang" data-lang-select>
        <button type="button" class="hero-lang-toggle" aria-haspopup="listbox" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.4 2.4 3.6 5.6 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.6-3.6-9s1.2-6.6 3.6-9z"></path></svg>
          <span class="hero-lang-current">한국어</span>
          <svg class="hero-lang-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <ul class="hero-lang-menu" role="listbox" aria-label="언어 선택" hidden>
          <li role="option" aria-selected="true" class="is-current">한국어</li>
          <li role="option" aria-selected="false" aria-disabled="true">English<span class="hero-lang-soon">준비중</span></li>
          <li role="option" aria-selected="false" aria-disabled="true">中文<span class="hero-lang-soon">준비중</span></li>
          <li role="option" aria-selected="false" aria-disabled="true">日本語<span class="hero-lang-soon">준비중</span></li>
        </ul>
      </div>
    </div>
  `;

  /* ----- 히어로 하단 바로가기 바 (홈 전용) -----
     상단에 있던 대메뉴(협회 소개·커뮤니케이션·Visit Korea·활동·자료)를
     이 바로 합쳐 첫 화면의 진입점을 한 줄로 모았습니다.
     순서: 외부 채널 2 → 대메뉴 4 → 문의 2 ----- */
  NS.HERO_QUICKBAR_HTML = `
    <nav class="hero-quickbar" aria-label="바로가기">
      <a href="https://mymedicon.com/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z"></path></svg>
        <span class="qb-label">MEDICON</span>
      </a>
      <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"></rect><circle cx="12" cy="12" r="4.5"></circle><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"></circle></svg>
        <span class="qb-label">인스타그램</span>
      </a>
      <a href="${page('about/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2"></path><path d="M10 7h4M10 11h4M10 15h4"></path></svg>
        <span class="qb-label">협회 소개</span>
      </a>
      <a href="${page('communications/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 18-6v14L3 13z"></path><path d="M11.6 16.9a3 3 0 1 1-5.6-1.9"></path></svg>
        <span class="qb-label">커뮤니케이션</span>
      </a>
      <a href="${page('patient-journey/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2c2.7 2.7 4 6.2 4 10s-1.3 7.3-4 10c-2.7-2.7-4-6.2-4-10s1.3-7.3 4-10z"></path></svg>
        <span class="qb-label">Visit Korea</span>
      </a>
      <a href="${page('programs/')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span class="qb-label">활동·자료</span>
      </a>
      <a href="mailto:info@kmtpa.org">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <span class="qb-label">문의하기</span>
      </a>
      <a href="mailto:concierge@kmtpa.org?subject=KMTPA%20%ED%9A%8C%EC%9B%90%EA%B8%B0%EA%B4%80%20%EC%B0%BE%EA%B8%B0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>
        <span class="qb-label">회원기관 찾기</span>
      </a>
    </nav>
  `;

  /* ----- Quick Banner (우측 날개 — MEDICON & Instagram) ----- */
  NS.QUICK_BANNER_HTML = `
    <aside class="quick-banner" aria-label="빠른 링크">
      <a href="https://mymedicon.com/" target="_blank" rel="noopener" class="quick-link quick-link--external">
        <span class="quick-label">MEDICON</span>
        <span class="quick-icon"><i data-lucide="arrow-up-right"></i></span>
      </a>
      <a href="https://www.instagram.com/mediconeng/" target="_blank" rel="noopener" class="quick-link quick-link--external">
        <span class="quick-label">Instagram</span>
        <span class="quick-icon"><i data-lucide="instagram"></i></span>
      </a>
    </aside>
  `;

  /* ----- Newsletter Modal markup (커뮤니케이션·홈에서 공유) ----- */
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
