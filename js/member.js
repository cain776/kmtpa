/* =========================================================================
   member.js — 회원 로그인(login/) · 마이페이지(mypage/)

   화면만 먼저 만든 상태입니다. 회원 인증이 서버에 없어서(members 테이블에
   비밀번호 컬럼이 없습니다) 지금은 아래 예시 데이터로 그립니다.

   인증이 붙으면 고칠 곳은 두 군데뿐입니다.
     signIn()   → POST /api/member/login 으로 바꾸고 세션 저장
     loadMe()   → GET  /api/member/me 로 바꿔 응답을 그대로 넘김
   나머지(그리기·검증·아코디언)는 그대로 씁니다.

   응답 모양은 지금 DB 를 그대로 따랐습니다 — members(내 정보) +
   consultations(문의). 답변 필드(answer)만 아직 DB 에 없어, 그 자리를
   비워 두면 '답변 준비 중'으로 그려집니다.
   ========================================================================= */

(function () {
  'use strict';

  // 화면만 먼저 만든 단계라는 표시. 인증이 붙으면 이 상수를 지웁니다.
  const PREVIEW = true;
  const SESSION_KEY = 'kmtpa.member.preview.v1';

  /* ----- 예시 데이터 -----
     실제 응답과 같은 모양이라, 인증이 붙으면 이 덩어리만 걷어내면 됩니다. */
  const SAMPLE = {
    member: {
      name: '이수진',
      memberType: 'corp',
      status: 'approved',
      email: 'sujin@smc.example',
      phone: '02-1234-5678',
      createdAt: '2026-07-02T09:12:00+09:00',
      approvedAt: '2026-07-04T14:30:00+09:00',
      newsletterConsent: true,
      detail: { orgName: '서울메디컬센터', contactDept: '국제진료센터 · 팀장', membershipGrade: '정회원' },
    },
    consultations: [
      {
        id: 'c-1', subject: '해외 로드쇼 공동 참여 문의',
        inquiryType: 'partnership', status: 'completed',
        createdAt: '2026-08-04T10:20:00+09:00',
        message: '하반기 동남아 로드쇼에 저희 기관이 공동 참여할 수 있을지 문의드립니다.\n참가 조건과 비용 분담 기준을 알고 싶습니다.',
        answer: '안녕하세요, 이수진 팀장님.\n\n하반기 로드쇼는 9월 중순 베트남·태국 2개국으로 예정되어 있으며, 회원기관은 부스 비용의 50%를 협회가 지원합니다.\n참가 신청서를 이번 달 말까지 보내주시면 배정 순서에 포함해 드리겠습니다.',
        answeredAt: '2026-08-06T15:40:00+09:00',
        answeredBy: '사업팀',
      },
      {
        id: 'c-2', subject: '코디네이터 교육 단체 수강',
        inquiryType: 'education_event', status: 'in_progress',
        createdAt: '2026-08-12T16:05:00+09:00',
        message: '직원 12명이 함께 수강할 수 있는지, 단체 할인이 있는지 궁금합니다.',
        answer: '', answeredAt: '', answeredBy: '',
      },
    ],
  };

  const INQUIRY_LABEL = {
    membership: '회원가입', partnership: '기관 협력',
    education_event: '교육·행사', publicity: '홍보·미디어', other: '기타',
  };
  const STATUS_LABEL = { pending: '심사 대기', approved: '승인', rejected: '반려', withdrawn: '탈퇴' };
  const TYPE_LABEL = { personal: '개인회원', corp: '법인회원' };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  /* =======================================================================
     서버에 붙을 자리 — 인증이 생기면 여기 둘만 바꿉니다
     ======================================================================= */

  async function signIn(email, password) {
    if (PREVIEW) {
      // 아직 인증이 없어 실제로 확인하지 않습니다. 어떤 값이든 통과시키되
      // 통과했다는 사실을 기록해, 마이페이지가 직접 열렸을 때와 구분합니다.
      // name 은 헤더가 "OO님"을 표시하는 데 씁니다(components.js). 실제
      // 인증이 붙으면 로그인 응답의 이름을 여기 담으면 됩니다.
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        email, name: SAMPLE.member.name, at: Date.now(),
      }));
      return { ok: true };
    }
    // 인증이 붙으면:
    // const r = await fetch('/api/member/login', { method:'POST', headers:{'Content-Type':'application/json'},
    //                                              body: JSON.stringify({ email, password }) });
    // if (!r.ok) throw new Error((await r.json()).error || '로그인하지 못했습니다.');
    // return r.json();
    throw new Error('아직 준비되지 않았습니다.');
  }

  async function loadMe() {
    if (PREVIEW) return SAMPLE;
    // const r = await fetch('/api/member/me', { headers: { Authorization: `Bearer ${token()}` } });
    // if (!r.ok) throw new Error('내 정보를 불러오지 못했습니다.');
    // return r.json();
    throw new Error('아직 준비되지 않았습니다.');
  }

  /* =======================================================================
     로그인 화면
     ======================================================================= */

  function setFieldError(input, message) {
    const box = document.querySelector(`[data-error-for="${input.id}"]`);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (box) { box.textContent = message; box.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (box) { box.textContent = ''; box.hidden = true; }
    }
  }

  function validate(input) {
    const v = input.value.trim();
    if (!v) {
      setFieldError(input, input.type === 'email' ? '이메일을 입력해 주세요.' : '비밀번호를 입력해 주세요.');
      return false;
    }
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setFieldError(input, '이메일 형식이 올바르지 않습니다.');
      return false;
    }
    setFieldError(input, '');
    return true;
  }

  function setupLogin() {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;

    const summary = form.querySelector('[data-login-error]');
    const submit = form.querySelector('[data-login-submit]');
    const inputs = Array.from(form.querySelectorAll('input'));

    // 칸을 벗어날 때 확인합니다. 제출할 때만 알려주면 다 채우고 나서야 틀린 걸 압니다.
    inputs.forEach(input => input.addEventListener('blur', () => validate(input)));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      summary.hidden = true;

      const bad = inputs.filter(i => !validate(i));
      if (bad.length) {
        summary.textContent = '입력하신 내용을 다시 확인해 주세요.';
        summary.hidden = false;
        summary.focus();          // 화면을 못 보는 분도 실패를 알 수 있게
        bad[0].focus();
        return;
      }

      // 눌렀다는 티를 냅니다 — 반응이 없으면 다시 누릅니다.
      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      const original = submit.textContent;
      submit.textContent = '확인 중…';

      try {
        await signIn(form.email.value.trim(), form.password.value);
        submit.textContent = '이동 중…';
        window.location.href = '../mypage/index.html';
      } catch (error) {
        summary.textContent = error.message || '로그인하지 못했습니다.';
        summary.hidden = false;
        summary.focus();
        submit.textContent = original;
      } finally {
        submit.removeAttribute('aria-busy');
        submit.disabled = false;
      }
    });
  }

  /* =======================================================================
     마이페이지
     ======================================================================= */

  function renderInfo(member) {
    const dl = document.querySelector('[data-my-info]');
    if (!dl) return;

    const rows = [['회원 유형', TYPE_LABEL[member.memberType] || member.memberType]];
    if (member.detail && member.detail.orgName) rows.push(['기관명', member.detail.orgName]);
    if (member.detail && member.detail.contactDept) rows.push(['부서 · 직위', member.detail.contactDept]);
    if (member.detail && member.detail.membershipGrade) rows.push(['회원 등급', member.detail.membershipGrade]);
    rows.push(['이메일', member.email], ['연락처', member.phone || '-']);
    rows.push(['가입 신청일', formatDate(member.createdAt)]);
    if (member.approvedAt) rows.push(['승인일', formatDate(member.approvedAt)]);
    rows.push(['뉴스레터', member.newsletterConsent ? '수신 동의함' : '수신하지 않음']);

    const status = member.status || 'pending';
    dl.innerHTML = `
      <dt>상태</dt>
      <dd><span class="status-pill status-${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span></dd>
      ${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}`;
  }

  function renderInquiries(list) {
    const wrap = document.querySelector('[data-my-inquiries]');
    if (!wrap) return;
    // 건수는 왼쪽 메뉴 배지와 패널 제목 두 곳에 표시됩니다.
    document.querySelectorAll('[data-my-count]').forEach(el => { el.textContent = list.length; });

    if (!list.length) {
      // 빈 화면으로 두지 않고 다음에 할 일을 함께 둡니다.
      wrap.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <p>아직 남기신 문의가 없습니다.</p>
          <a class="btn-ghost-link" href="../consultation/index.html">상담 신청하기</a>
        </div>`;
      return;
    }

    wrap.innerHTML = list.map((item, i) => {
      const answered = !!(item.answer && item.answer.trim());
      return `
      <div class="inquiry${i === 0 ? ' is-open' : ''}">
        <button type="button" class="inquiry-summary" aria-expanded="${i === 0}" aria-controls="inq-${esc(item.id)}">
          <span class="title">${esc(item.subject)}</span>
          <span class="date">${esc(formatDate(item.createdAt))}</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="inquiry-body" id="inq-${esc(item.id)}"${i === 0 ? '' : ' hidden'}>
          <div class="inquiry-block">
            <div class="who">${esc(INQUIRY_LABEL[item.inquiryType] || '문의')} · 내가 남긴 내용</div>
            <p>${esc(item.message)}</p>
          </div>
          ${answered ? `
          <div class="inquiry-answer">
            <div class="who">협회 답변${item.answeredBy ? ` · ${esc(item.answeredBy)}` : ''}</div>
            <p>${esc(item.answer)}</p>
            ${item.answeredAt ? `<div class="when">${esc(formatDate(item.answeredAt))}</div>` : ''}
          </div>` : `
          <div class="inquiry-waiting">
            담당 팀이 확인하고 있습니다. 답변이 등록되면 이 자리에 표시되고,
            가입하신 이메일로도 알려드립니다.
          </div>`}
        </div>
      </div>`;
    }).join('');

    wrap.querySelectorAll('.inquiry-summary').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.inquiry');
        const body = card.querySelector('.inquiry-body');
        const open = card.classList.toggle('is-open');
        body.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* 왼쪽 메뉴 ↔ 오른쪽 패널. 주소 해시(#info/#inquiries)가 기준이라
     뒤로가기와 링크 공유가 그대로 동작합니다. */
  function setupMyNav() {
    const links = document.querySelectorAll('[data-my-nav]');
    const panels = document.querySelectorAll('[data-my-panel]');
    if (!links.length || !panels.length) return;

    function apply() {
      const raw = (window.location.hash || '').slice(1);
      const key = ['info', 'inquiries'].includes(raw) ? raw : 'info';
      panels.forEach(p => { p.hidden = p.dataset.myPanel !== key; });
      links.forEach(a => {
        if (a.dataset.myNav === key) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }

    window.addEventListener('hashchange', apply);
    apply();
  }

  async function setupMyPage() {
    const greeting = document.querySelector('[data-my-greeting]');
    if (!greeting) return;

    // 로그인 없이 직접 열면 로그인 화면으로 보냅니다. 이게 없으면
    // 헤더는 '로그인'인데 화면에는 회원 정보가 떠서 상태가 어긋납니다.
    if (!sessionStorage.getItem(SESSION_KEY)) {
      window.location.replace('../login/index.html');
      return;
    }
    setupMyNav();

    try {
      const data = await loadMe();
      const member = data.member || {};
      greeting.innerHTML = `<b>${esc(member.name || '회원')}</b>님, 안녕하세요.`;
      renderInfo(member);
      renderInquiries(data.consultations || []);
    } catch (error) {
      greeting.textContent = error.message || '정보를 불러오지 못했습니다.';
    }
  }

  function init() {
    setupLogin();
    setupMyPage();
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
