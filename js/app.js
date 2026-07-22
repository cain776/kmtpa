/* =========================================================================
   app.js — 진입점 (Entry Point)
   (사)한국의료관광진흥협회 KMTPA 공개 홈페이지

   페이지 로드 시 헤더·푸터·날개 배너를 주입하고, 각 인터랙션 모듈을
   초기화한 뒤 lucide 아이콘을 렌더합니다.

   모듈 의존성 (HTML에서 이 순서로 로드해야 합니다):
     1. templates.js — HTML 마크업 상수 (HEADER_HTML, FOOTER_HTML, MODAL 등)
     2. components.js — UI 인터랙션 함수 (탭, FAQ, 모달 등)
     3. app.js — 본 파일, init() 호출
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
    NS.setupHeroVideo();    // 홈페이지 히어로 영상 (해당 요소가 있을 때만 작동)
    NS.setupMobileNav();    // 모바일 햄버거 메뉴
    NS.setupTabs();         // 탭 + 서브탭 (about·communications·programs 등)
    NS.setupFaq();          // FAQ 아코디언
    NS.setupPubModal();     // 뉴스레터 모달 (.pub-trigger가 있는 페이지)

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
