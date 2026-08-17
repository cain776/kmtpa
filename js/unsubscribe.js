/* =========================================================================
   unsubscribe.js — 뉴스레터 수신거부(unsubscribe/)

   메일 본문의 링크로 들어온 사람이 로그인 없이 수신을 끊는 화면입니다.

   여는 것만으로는 끊지 않습니다. 메일 프로그램과 보안 장비가 본문 링크를
   사람 대신 미리 열어 보기 때문입니다 — 그때 끊어 버리면 열어 보지도 않은
   사람이 수신거부된 것으로 남습니다. 그래서 여기서는 누구 것인지만 확인해
   보여 주고, 실제 해제는 사람이 버튼을 눌렀을 때 POST 로 보냅니다.
   ========================================================================= */

(function () {
  'use strict';

  const API_BASE = window.KMTPA_API_BASE || '/api';   // 판단은 runtime-config.js 한 곳에서 한다

  const token = new URLSearchParams(location.search).get('token') || '';
  const el = selector => document.querySelector(selector);

  function show(selector, text) {
    const node = el(selector);
    if (!node) return;
    if (text != null) node.textContent = text;
    node.hidden = false;
  }

  function hide(selector) {
    const node = el(selector);
    if (node) node.hidden = true;
  }

  function fail(message) {
    hide('[data-unsub-loading]');
    hide('[data-unsub-ready]');
    show('[data-unsub-error]', message);
    const box = el('[data-unsub-error]');
    if (box) box.focus();
  }

  async function call(path, options) {
    const response = await fetch(`${API_BASE}${path}`, options);
    let body = null;
    try { body = await response.json(); } catch { /* 본문이 없을 수 있다 */ }
    if (!response.ok) {
      const error = new Error((body && (body.error || body.message)) || '요청을 처리하지 못했습니다');
      error.status = response.status;
      throw error;
    }
    return body || {};
  }

  async function load() {
    if (!token) {
      fail('수신거부 주소가 올바르지 않습니다. 메일의 링크를 그대로 눌러 주세요.');
      return;
    }
    try {
      const target = await call(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
      hide('[data-unsub-loading]');
      if (target.consent === false) {
        // 이미 꺼져 있는데 버튼을 보이면, 눌러야 끝나는 줄 알고 한 번 더 누른다.
        show('[data-unsub-done]', '이미 수신이 해제되어 있습니다. 더 보내지 않습니다.');
        return;
      }
      const email = el('[data-unsub-email]');
      if (email) email.textContent = target.email || '';
      show('[data-unsub-ready]');
    } catch (error) {
      fail(error.status === 404
        ? '이미 처리되었거나 더 이상 쓸 수 없는 주소입니다.'
        : error.message);
    }
  }

  async function submit() {
    const button = el('[data-unsub-submit]');
    if (button) { button.disabled = true; button.textContent = '해제하는 중…'; }
    try {
      await call('/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      hide('[data-unsub-ready]');
      show('[data-unsub-done]', '수신을 해제했습니다. 앞으로 뉴스레터를 보내지 않습니다.');
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = '수신 해제하기'; }
      fail(error.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = el('[data-unsub-submit]');
    if (button) button.addEventListener('click', submit);
    load();
  });
})();
