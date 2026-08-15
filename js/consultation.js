/* 공개 상담신청 — 회원가입과 별도 API/상태로 접수한다. */
(function () {
  'use strict';

  const form = document.querySelector('[data-consultation-form]');
  if (!form) return;

  const API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다
  const errorEl = document.querySelector('[data-consultation-error]');
  const orgField = document.querySelector('[data-org-field]');
  const orgInput = orgField && orgField.querySelector('input');

  function selected(name) {
    return (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
  }

  function syncApplicantType() {
    const isCorp = selected('신청자 유형') === 'corp';
    if (orgField) orgField.hidden = !isCorp;
    if (orgInput) orgInput.required = isCorp;
  }

  function payload() {
    const data = {
      applicantType: selected('신청자 유형'),
      inquiryType: selected('상담 유형'),
      preferredContact: selected('답변 방법'),
      privacyConsent: form.elements['개인정보 동의'].checked,
    };
    form.querySelectorAll('[data-api]').forEach(el => { data[el.dataset.api] = el.value.trim(); });
    return data;
  }

  function mailto(data) {
    const type = data.applicantType === 'corp' ? '법인·기관' : '개인';
    const body = [
      '[KMTPA 상담 신청]',
      `신청자 유형: ${type}`,
      `이름: ${data.name}`,
      `기관명: ${data.orgName || '-'}`,
      `이메일: ${data.email}`,
      `연락처: ${data.phone}`,
      `제목: ${data.subject}`,
      '',
      data.message,
    ].join('\n');
    return `mailto:info@kmtpa.org?subject=${encodeURIComponent(`[KMTPA 상담] ${data.subject}`)}&body=${encodeURIComponent(body)}`;
  }

  form.querySelectorAll('input[name="신청자 유형"]').forEach(el => {
    el.addEventListener('change', syncApplicantType);
  });
  syncApplicantType();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    form.classList.add('is-validated');
    const invalid = Array.from(form.elements).find(el => el.willValidate && !el.checkValidity());
    if (invalid) {
      errorEl.textContent = invalid.type === 'checkbox'
        ? '개인정보 수집·이용 동의를 확인해 주세요.'
        : '필수 항목을 모두 올바르게 입력해 주세요.';
      errorEl.hidden = false;
      invalid.focus();
      return;
    }

    errorEl.hidden = true;
    const data = payload();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(`${API_BASE}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        if ([400, 409, 422].includes(response.status)) {
          throw Object.assign(new Error((detail && detail.error) || '입력을 다시 확인해 주세요.'), { inputError: true });
        }
        throw new Error('접수 서버에 연결하지 못했습니다.');
      }
      document.querySelector('[data-consultation-view="form"]').hidden = true;
      document.querySelector('[data-consultation-view="done"]').hidden = false;
      document.querySelector('[data-consultation-mail]').href = mailto(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.inputError) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
      } else {
        const href = mailto(data);
        document.querySelector('[data-consultation-view="form"]').hidden = true;
        document.querySelector('[data-consultation-view="done"]').hidden = false;
        document.querySelector('[data-consultation-done-message]').textContent = '접수 서버에 연결되지 않아 메일 작성 화면을 열었습니다. 내용을 확인한 뒤 메일을 보내 주세요.';
        document.querySelector('[data-consultation-mail]').href = href;
        window.location.href = href;
      }
    } finally {
      button.disabled = false;
    }
  });
})();
