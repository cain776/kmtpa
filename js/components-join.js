/* =========================================================================
   components-join.js — 회원가입 3단계 흐름

   join/index.html 에서만 돈다. 유형 선택 -> 정보 입력 -> 신청 완료.

   components.js 가 600줄을 넘어 떼어냈다. 이쪽은 폼을 검증하고 API 계약으로
   옮기는 일이라, 화면 뼈대를 그리는 일과 성격이 다르다.

   로드 순서: templates.js -> components.js -> components-join.js -> app.js
   ========================================================================= */

window.KMTPA = window.KMTPA || {};

(function (NS) {
  'use strict';

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
