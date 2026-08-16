/* =========================================================================
   components-modal.js — 뉴스레터 모달

   .pub-trigger 가 있는 화면(커뮤니티·홈)에서만 돈다. 카드를 눌렀을 때 띄우고,
   좌우 버튼과 화살표 키로 호를 넘긴다.

   components.js 가 600줄을 넘어 떼어냈다. 이 덩어리는 여는 상태를 하나
   들고 있어서(pubModalState) 다른 것과 섞이면 알아보기 어렵다.

   로드 순서: templates.js -> components.js -> components-modal.js -> app.js
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
  /* ----- Newsletter Modal — 커뮤니티·홈 등 .pub-trigger가 있는 모든 페이지에서 작동
     <a class="pub-trigger">는 별도 페이지로 이동(예: newsletter-vol25.html)하고,
     <button class="pub-trigger">만 모달을 띄웁니다. ----- */
  NS.setupPubModal = function () {
    const allTriggers = document.querySelectorAll('.pub-trigger');
    if (!allTriggers.length) return;

    // <button>만 모달 대상 — <a class="pub-trigger">는 navigate (스킵)
    /* 예전에는 <a> 를 전부 걸러냈다 — 링크는 페이지로 보내는 것이라서다.
       뉴스레터 카드는 주소를 그대로 두되(공유·새 탭·검색엔진) 왼쪽 클릭만
       모달로 받는다. 그 표시가 data-pub-modal 이다. */
    const triggers = Array.from(allTriggers)
      .filter(t => t.tagName !== 'A' || t.hasAttribute('data-pub-modal'));
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

    /* 같은 격자에 있는 카드들이 곧 목록이다. 카드가 다시 그려질 수 있으므로
       열 때마다 새로 읽는다 — 게시본이 늦게 도착하면 개수가 달라진다. */
    function siblings(article) {
      const grid = article && article.closest('.pub-grid');
      return grid ? Array.from(grid.querySelectorAll('.pub')) : (article ? [article] : []);
    }

    function syncNav(article) {
      const list = siblings(article);
      const index = list.indexOf(article);
      const count = pubModalState.modal.querySelector('.pub-modal-count');
      const nav = pubModalState.modal.querySelector('.pub-modal-nav');
      // 한 건뿐이면 옮길 곳이 없다.
      if (nav) nav.hidden = list.length < 2;
      if (count) count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
      pubModalState.modal.querySelectorAll('[data-pub-step]').forEach(button => {
        const next = index + Number(button.dataset.pubStep);
        button.disabled = next < 0 || next >= list.length;
      });
      pubModalState.current = article;
    }

    function step(delta) {
      const list = siblings(pubModalState.current);
      const next = list[list.indexOf(pubModalState.current) + delta];
      if (next) open(next);
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

      syncNav(article);
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
        if (!trigger) return;
        if (trigger.tagName === 'A') {
          // 새 탭·다운로드·보조 클릭은 그대로 링크로 둔다. 모달은 평범한
          // 왼쪽 클릭일 때만 가로챈다.
          if (!trigger.hasAttribute('data-pub-modal')) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
        }
        open(trigger.closest('.pub'));
      });

      // 좌우 버튼과 화살표 키로 호를 옮긴다.
      modal.querySelectorAll('[data-pub-step]').forEach(button => {
        button.addEventListener('click', () => step(Number(button.dataset.pubStep)));
      });
      document.addEventListener('keydown', e => {
        if (!pubModalState.modal || pubModalState.modal.hidden) return;
        if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
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
})(window.KMTPA);
