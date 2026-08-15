/* API 서버 주소 — 모든 스크립트보다 먼저 로드됩니다.

   홈페이지는 GitHub Pages(kmtpa.org)에서 나가고, 회원·문의·CMS API 는
   api.kmtpa.org 의 Java 서버가 받습니다. 그래서 운영 도메인에서는 절대
   주소가 필요하고, 로컬(Java 가 홈페이지를 직접 서빙)에서는 같은 서버라
   상대경로면 됩니다.

   이 파일이 로드되지 않아도 각 스크립트는 '/api' 로 동작합니다 —
   로컬은 그대로 살고, 운영에서만 API 가 끊깁니다. */
(function () {
  'use strict';

  var host = window.location.hostname;

  // GitHub Pages 로 배포된 운영 도메인들. 커스텀 도메인을 붙이기 전에는
  // *.github.io 로도 접속되므로 둘 다 적습니다.
  var PROD = ['kmtpa.org', 'www.kmtpa.org', 'cain776.github.io'];

  if (PROD.indexOf(host) !== -1) {
    window.KMTPA_API_BASE = 'https://api.kmtpa.org/api';
  } else if (window.location.protocol === 'file:') {
    // 파일로 직접 열었을 때 — 로컬 Java 서버(8080)를 바라봅니다.
    window.KMTPA_API_BASE = 'http://127.0.0.1:8080/api';
  } else {
    // 로컬 개발: Java 가 홈페이지와 API 를 같은 포트에서 서빙합니다.
    window.KMTPA_API_BASE = '/api';
  }
})();
