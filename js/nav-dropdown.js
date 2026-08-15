/* =========================================================================
   nav-dropdown.js — 메가 드롭다운 위치 잡기

   대메뉴 하위 패널은 메뉴 항목의 왼쪽 끝에 맞춰 오른쪽으로 펼친다.
   일반 드롭다운(180px)은 CSS 의 `left: -16px` 만으로 어느 폭에서도 들어가지만,
   메가 패널(620px)은 그렇지 않다 — 실측으로 1440px 화면에서 커뮤니티가
   148px, 1280px 에서 228px 넘쳤다.

   그래서 왼쪽 정렬을 기본으로 하되, 오른쪽으로 넘치면 넘친 만큼만 되민다.
   화면이 넓으면 항목의 왼쪽 끝에 정확히 맞고, 좁으면 화면 안에 붙어 선다.

   왜 CSS 로 안 하나: 넘치는 양은 화면 폭과 항목 위치에 따라 달라져서
   미디어 쿼리로 못 쓴다. CSS 기본값은 예전처럼 오른쪽 정렬로 두었다 —
   이 스크립트가 로드되지 않아도 패널이 화면 밖으로 나가지는 않는다.

   숨어 있어도(visibility:hidden) 자리는 차지하므로, 이 계산은 hover 를
   기다리지 않고 로드 직후·리사이즈마다 한 번씩 해 둔다. 그래야 열기 전에도
   페이지에 가로 스크롤이 생기지 않는다.
   ========================================================================= */

(function () {
  'use strict';

  const NS = (window.KMTPA = window.KMTPA || {});

  /** 화면 가장자리에서 최소로 띄울 여백. */
  const EDGE = 16;
  /** 메뉴 항목 글자보다 살짝 왼쪽에서 시작해 패널 안쪽 여백과 눈을 맞춘다. */
  const NUDGE = -16;

  function place(panel) {
    const item = panel.closest('.nav-item-with-dropdown');
    if (!item) return;

    // 계산 전에 되돌려 놓는다. 이전 리사이즈에서 밀어 둔 값이 남아 있으면
    // 그 위에 또 밀어서 패널이 왼쪽으로 계속 기어간다.
    panel.style.right = 'auto';
    panel.style.left = NUDGE + 'px';

    const rect = panel.getBoundingClientRect();
    if (rect.width === 0) return;        // 모바일 — 대메뉴가 숨어 있다

    const over = rect.right - (window.innerWidth - EDGE);
    if (over > 0) panel.style.left = NUDGE - over + 'px';
  }

  function placeAll() {
    document.querySelectorAll('.nav-dropdown--mega').forEach(place);
  }

  NS.setupNavDropdown = function () {
    if (!document.querySelector('.nav-dropdown--mega')) return;
    placeAll();

    let timer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(placeAll, 120);
    });
  };
})();
