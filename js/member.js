/* =========================================================================
   member.js — 회원 로그인(login/) · 마이페이지(mypage/)

   Java 회원 세션으로 로그인하고, 본인 정보와 본인이 작성한 문의만 읽습니다.
   문의를 등록하면 관리자 상담 관리에 들어가며 관리자 답변은 같은 목록에
   표시됩니다.
   ========================================================================= */

(function () {
  'use strict';

  // components.js 의 헤더 로그인 표시와 같은 키를 쓴다. 기존 키 이름은
  // 배포된 화면과의 호환 때문에 유지하지만 내용은 실제 서버 세션이다.
  const SESSION_KEY = 'kmtpa.member.preview.v1';
  const API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다

  /* 이 화면의 문구는 HTML 이 아니라 여기서 만들어진다. data-i18n 이 붙을
     자리가 없으므로 사전을 직접 본다 — 없으면 한국어 원문이 그대로 남는다.
     사전이 아직 안 왔을 수도 있어서(i18n.js 는 파일을 받아 온다) 다 그린 뒤
     NS.refreshMemberCopy 로 한 번 더 그린다. 아래 setupMyPage 를 보라. */
  const NS = window.KMTPA || (window.KMTPA = {});
  function t(key, ko) {
    const v = NS.t && NS.t(key);
    return typeof v === 'string' && v ? v : ko;
  }

  /* 서버가 주는 코드값을 사람이 읽는 말로 바꾼다. 상수가 아니라 함수인 것은
     언어가 정해지는 시점이 이 파일을 읽는 시점보다 늦기 때문이다. */
  const inquiryLabel = v => ({
    membership: t('member.inquiry.type.membership', '회원가입'),
    partnership: t('member.inquiry.type.partnership', '기관 협력'),
    education_event: t('member.inquiry.type.education_event', '교육·행사'),
    publicity: t('member.inquiry.type.publicity', '홍보·미디어'),
    other: t('member.inquiry.type.other', '기타'),
  })[v] || t('member.inquiry.fallback', '문의');
  const statusLabel = v => ({
    pending: t('member.status.pending', '심사 대기'),
    approved: t('member.status.approved', '승인'),
    rejected: t('member.status.rejected', '반려'),
    withdrawn: t('member.status.withdrawn', '탈퇴'),
  })[v] || v;
  const typeLabel = v => ({
    personal: t('member.type.personal', '개인회원'),
    corp: t('member.type.corp', '법인회원'),
  })[v] || v;

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

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; }
    catch { return null; }
  }

  async function request(path, options = {}) {
    const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    const session = readSession();
    if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
    if (Object.prototype.hasOwnProperty.call(options, 'body')) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET', headers, cache: 'no-store',
      body: Object.prototype.hasOwnProperty.call(options, 'body')
        ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || t('member.error.request', '요청을 처리하지 못했습니다.'));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function signIn(email, password) {
    const session = await request('/member/login', {
      method: 'POST', body: { email, password },
    });
    session.name = session.member && session.member.name;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async function loadMe() {
    return request('/member/me');
  }

  async function createInquiry(payload) {
    return request('/member/inquiries', { method: 'POST', body: payload });
  }

  async function withdraw(password) {
    return request('/member/withdraw', { method: 'POST', body: { password } });
  }

  async function changePassword(currentPassword, newPassword) {
    return request('/member/password', {
      method: 'PATCH', body: { currentPassword, newPassword },
    });
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
      setFieldError(input, input.type === 'email'
        ? t('member.login.error.email', '이메일을 입력해 주세요.')
        : t('member.login.error.password', '비밀번호를 입력해 주세요.'));
      return false;
    }
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setFieldError(input, t('member.login.error.emailFormat', '이메일 형식이 올바르지 않습니다.'));
      return false;
    }
    setFieldError(input, '');
    return true;
  }

  function setupLogin() {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;

    const summary = form.querySelector('[data-login-error]');
    const notice = document.querySelector('[data-login-notice]');
    const submit = form.querySelector('[data-login-submit]');
    const inputs = Array.from(form.querySelectorAll('input'));

    const noticeParams = new URLSearchParams(window.location.search);
    const noticeText = noticeParams.get('withdrawn') === '1'
      ? t('member.notice.withdrawn', '회원 탈퇴가 완료되었습니다.')
      : noticeParams.get('passwordChanged') === '1'
        ? t('member.notice.passwordChanged', '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.')
        : '';
    if (notice && noticeText) {
      notice.textContent = noticeText;
      notice.hidden = false;
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 칸을 벗어날 때 확인합니다. 제출할 때만 알려주면 다 채우고 나서야 틀린 걸 압니다.
    inputs.forEach(input => input.addEventListener('blur', () => validate(input)));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      summary.hidden = true;

      const bad = inputs.filter(i => !validate(i));
      if (bad.length) {
        summary.textContent = t('member.login.error.summary', '입력하신 내용을 다시 확인해 주세요.');
        summary.hidden = false;
        summary.focus();          // 화면을 못 보는 분도 실패를 알 수 있게
        bad[0].focus();
        return;
      }

      // 눌렀다는 티를 냅니다 — 반응이 없으면 다시 누릅니다.
      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      const original = submit.textContent;
      submit.textContent = t('member.login.checking', '확인 중…');

      try {
        await signIn(form.email.value.trim(), form.password.value);
        submit.textContent = t('member.login.moving', '이동 중…');
        window.location.href = '../mypage/index.html';
      } catch (error) {
        summary.textContent = error.message || t('member.login.error.failed', '로그인하지 못했습니다.');
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

  const consentLabel = on => (on
    ? t('member.newsletter.on', '수신 동의함')
    : t('member.newsletter.off', '수신하지 않음'));

  function renderInfo(member) {
    const dl = document.querySelector('[data-my-info]');
    if (!dl) return;

    const d = member.detail || {};
    const rows = [[t('member.field.type', '회원 유형'), typeLabel(member.memberType)]];
    if (d.orgName) rows.push([t('member.field.orgName', '기관명'), d.orgName]);
    if (d.contactDept) rows.push([t('member.field.dept', '부서 · 직위'), d.contactDept]);
    if (d.membershipGrade) rows.push([t('member.field.grade', '회원 등급'), d.membershipGrade]);
    rows.push([t('member.field.email', '이메일'), member.email],
              [t('member.field.phone', '연락처'), member.phone || '-']);
    rows.push([t('member.field.createdAt', '가입 신청일'), formatDate(member.createdAt)]);
    if (member.approvedAt) rows.push([t('member.field.approvedAt', '승인일'), formatDate(member.approvedAt)]);
    const status = member.status || 'pending';
    /* 뉴스레터는 읽기만 하던 줄이었다. 받고 싶어진 사람도, 그만 받고 싶은
       사람도 사무국에 연락하는 수밖에 없었다. 여기서 바로 바꾼다. */
    dl.innerHTML = `
      <dt>${esc(t('member.field.status', '상태'))}</dt>
      <dd><span class="status-pill status-${esc(status)}">${esc(statusLabel(status))}</span></dd>
      ${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
      <dt>${esc(t('member.field.newsletter', '뉴스레터'))}</dt>
      <dd>
        <label class="consent-toggle">
          <input type="checkbox" data-newsletter-consent${member.newsletterConsent ? ' checked' : ''}>
          <span data-newsletter-label>${esc(consentLabel(member.newsletterConsent))}</span>
        </label>
        <p class="consent-note">${esc(t('member.newsletter.note', '협회 소식·교육 안내를 이메일로 받습니다. 언제든 여기서 끌 수 있습니다.'))}</p>
      </dd>`;
  }

  /* 켜고 끌 때마다 서버에 남긴다. 동의는 값 하나가 아니라 이력이라,
     화면 상태만 바꿔 두면 무엇에 언제 동의했는지 말할 수 없다. */
  async function bindNewsletterConsent() {
    document.addEventListener('change', async event => {
      const box = event.target.closest('[data-newsletter-consent]');
      if (!box) return;
      const label = document.querySelector('[data-newsletter-label]');
      const wanted = box.checked;
      box.disabled = true;
      try {
        const payload = await request('/member/newsletter', {
          method: 'PATCH', body: { consent: wanted },
        });
        const granted = Boolean(payload.member && payload.member.newsletterConsent);
        box.checked = granted;
        if (label) label.textContent = consentLabel(granted);
      } catch (error) {
        // 실패했는데 켜진 채로 두면, 안 받는 사람이 받는 줄 안다.
        box.checked = !wanted;
        window.alert(`${t('member.newsletter.error', '수신 설정을 바꾸지 못했습니다')}: ${error.message}`);
      } finally {
        box.disabled = false;
      }
    });
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
          <p>${esc(t('member.inquiry.empty', '아직 남기신 문의가 없습니다.'))}</p>
          <button type="button" class="btn-ghost-link" data-my-inquiry-empty-open>${esc(t('member.inquiry.emptyCta', '문의하기'))}</button>
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
            <div class="who">${esc(inquiryLabel(item.inquiryType))} · ${esc(t('member.inquiry.mine', '내가 남긴 내용'))}</div>
            <p>${esc(item.message)}</p>
          </div>
          ${answered ? `
          <div class="inquiry-answer">
            <div class="who">${esc(t('member.inquiry.answer', '협회 답변'))}${item.answeredByName || item.answeredBy ? ` · ${esc(item.answeredByName || item.answeredBy)}` : ''}</div>
            <p>${esc(item.answer)}</p>
            ${item.answeredAt ? `<div class="when">${esc(formatDate(item.answeredAt))}</div>` : ''}
          </div>` : `
          <div class="inquiry-waiting">
            ${esc(t('member.inquiry.waiting', '담당 팀이 확인하고 있습니다. 답변이 등록되면 이 자리에 표시됩니다.'))}
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

  function setupInquiryComposer(onSaved) {
    const form = document.querySelector('[data-my-inquiry-form]');
    const openButton = document.querySelector('[data-my-inquiry-open]');
    const closeButton = document.querySelector('[data-my-inquiry-close]');
    if (!form || !openButton) return;
    const error = form.querySelector('[data-my-inquiry-error]');

    function setOpen(open) {
      form.hidden = !open;
      openButton.setAttribute('aria-expanded', String(open));
      if (open) form.querySelector('[name="subject"]').focus();
    }

    openButton.addEventListener('click', () => setOpen(form.hidden));
    const emptyButton = document.querySelector('[data-my-inquiry-empty-open]');
    if (emptyButton) emptyButton.addEventListener('click', () => setOpen(true));
    if (closeButton) closeButton.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const invalid = Array.from(form.elements).find(el => el.willValidate && !el.checkValidity());
      if (invalid) {
        error.textContent = invalid.type === 'checkbox'
          ? t('member.inquiry.error.consent', '개인정보 수집·이용 동의를 확인해 주세요.')
          : t('member.inquiry.error.required', '문의 제목과 내용을 입력해 주세요.');
        error.hidden = false;
        invalid.focus();
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      error.hidden = true;
      try {
        await createInquiry({
          inquiryType: form.inquiryType.value,
          subject: form.subject.value.trim(),
          message: form.message.value.trim(),
          privacyConsent: form.privacyConsent.checked,
        });
        form.reset();
        setOpen(false);
        window.location.hash = 'inquiries';
        await onSaved();
      } catch (requestError) {
        if (requestError.status === 401) {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.replace('../login/index.html');
          return;
        }
        error.textContent = requestError.message || t('member.inquiry.error.failed', '문의를 등록하지 못했습니다.');
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  }

  function setupWithdrawal() {
    const form = document.querySelector('[data-withdraw-form]');
    const openButton = document.querySelector('[data-withdraw-open]');
    const cancelButton = document.querySelector('[data-withdraw-cancel]');
    if (!form || !openButton || !cancelButton) return;
    const error = form.querySelector('[data-withdraw-error]');
    const submit = form.querySelector('[type="submit"]');

    function setOpen(open) {
      form.hidden = !open;
      openButton.setAttribute('aria-expanded', String(open));
      if (open) form.password.focus();
      else {
        form.reset();
        error.hidden = true;
      }
    }

    openButton.addEventListener('click', () => setOpen(form.hidden));
    cancelButton.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.password.value) {
        error.textContent = t('member.withdraw.error.password', '본인 확인을 위해 비밀번호를 입력해 주세요.');
        error.hidden = false;
        form.password.focus();
        return;
      }
      if (!form.confirmation.checked) {
        error.textContent = t('member.withdraw.error.confirm', '탈퇴 안내를 확인해 주세요.');
        error.hidden = false;
        form.confirmation.focus();
        return;
      }

      const original = submit.textContent;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = t('member.withdraw.processing', '처리 중…');
      error.hidden = true;
      try {
        await withdraw(form.password.value);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace('../login/index.html?withdrawn=1');
      } catch (requestError) {
        if (requestError.status === 401) {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.replace('../login/index.html');
          return;
        }
        error.textContent = requestError.message || t('member.withdraw.error.failed', '회원 탈퇴를 처리하지 못했습니다.');
        error.hidden = false;
        error.focus();
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = original;
      }
    });
  }

  function setupPasswordChange() {
    const form = document.querySelector('[data-password-form]');
    const openButton = document.querySelector('[data-password-open]');
    const cancelButton = document.querySelector('[data-password-cancel]');
    if (!form || !openButton || !cancelButton) return;
    const error = form.querySelector('[data-password-error]');
    const submit = form.querySelector('[type="submit"]');

    function setOpen(open) {
      form.hidden = !open;
      openButton.setAttribute('aria-expanded', String(open));
      if (open) form.currentPassword.focus();
      else {
        form.reset();
        error.hidden = true;
      }
    }

    function validationMessage() {
      const current = form.currentPassword.value;
      const next = form.newPassword.value;
      if (!current) return t('member.password.error.current', '현재 비밀번호를 입력해 주세요.');
      if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
        return t('member.password.error.rule', '새 비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.');
      }
      if (current === next) return t('member.password.error.same', '새 비밀번호는 현재 비밀번호와 다르게 입력해 주세요.');
      if (next !== form.newPasswordConfirm.value) return t('member.password.error.mismatch', '새 비밀번호가 서로 일치하지 않습니다.');
      return '';
    }

    openButton.addEventListener('click', () => setOpen(form.hidden));
    cancelButton.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const validationError = validationMessage();
      if (validationError) {
        error.textContent = validationError;
        error.hidden = false;
        error.focus();
        return;
      }

      const original = submit.textContent;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = t('member.password.changing', '변경 중…');
      error.hidden = true;
      try {
        await changePassword(form.currentPassword.value, form.newPassword.value);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace('../login/index.html?passwordChanged=1');
      } catch (requestError) {
        if (requestError.status === 401) {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.replace('../login/index.html');
          return;
        }
        error.textContent = requestError.message || t('member.password.error.failed', '비밀번호를 변경하지 못했습니다.');
        error.hidden = false;
        error.focus();
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = original;
      }
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
    const session = readSession();
    if (!session || !session.token) {
      window.location.replace('../login/index.html');
      return;
    }
    setupMyNav();

    /* 사전이 늦게 오면 여기서 그린 것만 한국어로 남는다. i18n.js 가 사전을
       받은 뒤 이 함수를 불러 같은 자리를 다시 그린다 — 서버에 다시 묻지
       않도록 마지막으로 받은 것을 들고 있는다. */
    let current = null;                 // 마지막으로 받은 응답
    const paint = data => {
      current = data;
      const member = data.member || {};
      const name = esc(member.name || t('member.greeting.fallbackName', '회원'));
      // 이름만 굵게. 번역문은 {name} 자리만 갖고 굵기는 여기서 입힌다 —
      // 번역자가 태그를 빠뜨려도 화면이 깨지지 않는다.
      greeting.innerHTML = t('member.greeting', '{name}님, 안녕하세요.')
        .replace('{name}', `<b>${name}</b>`);
      renderInfo(member);
      renderInquiries(data.consultations || []);
    };

    try {
      paint(await loadMe());
      NS.refreshMemberCopy = () => { if (current) paint(current); };
      bindNewsletterConsent();
      setupPasswordChange();
      setupWithdrawal();
      // 새 문의를 올린 뒤에도 같은 자리를 다시 그린다. 목록만 갈아끼우면
      // 사전이 늦게 와서 repaint 할 때 옛 목록으로 되돌아간다.
      setupInquiryComposer(async () => { paint(await loadMe()); });
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace('../login/index.html');
        return;
      }
      greeting.textContent = error.message || t('member.error.load', '정보를 불러오지 못했습니다.');
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
