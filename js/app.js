/* =========================================================================
   app.js — 진입점 (Entry Point)
   (사)한국의료관광진흥협회 KMTPA 공개 홈페이지

   페이지 로드 시 헤더·푸터·날개 배너를 주입하고, 각 인터랙션 모듈을
   초기화한 뒤 lucide 아이콘을 렌더합니다.

   모듈 의존성 (HTML에서 이 순서로 로드해야 합니다):
     1. templates.js — HTML 마크업 상수 (HEADER_HTML, FOOTER_HTML, MODAL 등)
     2. components.js — UI 인터랙션 함수 (탭, FAQ, 모달 등)
     3. nav-dropdown.js — 메가 드롭다운 위치 계산
     4. app.js — 본 파일, init() 호출
   ========================================================================= */

(function () {
  'use strict';

  const NS = window.KMTPA;
  if (!NS) {
    console.error('[KMTPA] templates.js가 로드되지 않았습니다. HTML의 스크립트 순서를 확인하세요.');
    return;
  }

  function init() {
    NS.injectLayout();      // 헤더·푸터·날개 배너를 먼저 주입
    NS.setupHeroSlider();   // 홈 히어로 슬라이더 (.hero-stage가 있을 때만 작동)
    NS.setupLangSelect();   // 히어로 언어 선택 드롭다운
    NS.setupHeroVideo();    // 구 히어로 영상 (.hero-video가 남아있는 페이지용)
    NS.setupMobileNav();    // 모바일 햄버거 메뉴
    NS.setupNavDropdown();  // 메가 드롭다운 위치 (왼쪽 정렬 + 화면 밖 방지)
    NS.setupTabs();         // 탭 + 서브탭 (about·communications·programs 등)
    NS.setupStandaloneSubTabs(); // 상위 탭 없이 서브탭만 있는 화면 (transparency)
    NS.setupBreadcrumb();   // Depth1 네비게이터의 '다른 메뉴' 드롭다운
    NS.setupFaq();          // FAQ 아코디언
    NS.setupPubModal();     // 뉴스레터 모달 (.pub-trigger가 있는 페이지)
    NS.setupJoinFlow();     // 회원가입 3단계 흐름 (join 페이지에서만 작동)

    // 문구 번역은 맨 마지막. 헤더·푸터·빵부스러기가 다 그려진 뒤라야
    // 그 안의 data-i18n 까지 한 번에 잡힌다.
    if (typeof NS.setupI18n === 'function') NS.setupI18n();

    // 주입된 헤더·푸터·모달의 아이콘까지 렌더
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
