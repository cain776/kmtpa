/* =========================================================================
   cms-newsletter.js — 뉴스레터 카드와 상세 본문을 만든다

   cms-data.js 가 다듬어 놓은 항목 하나를 받아 DOM 조각을 돌려준다. 바깥
   상태를 읽지 않는다 — 넣은 것만 보고 만든다. 목록에 꽂고 개수를 세는 일은
   cms.js 의 applyNewsletter 가 한다.

   cms.js 가 600줄을 넘어 이 덩어리를 뗐다.

   로드 순서: cms-data.js -> cms-newsletter.js -> cms.js
   ========================================================================= */

(function () {
  'use strict';

  function createNewsletterCard(item) {
    const article = document.createElement('article');
    article.className = 'pub';

    const trigger = item.href ? document.createElement('a') : document.createElement('button');
    trigger.className = item.href ? 'pub-trigger pub-trigger--link' : 'pub-trigger';

    if (item.href) {
      // 주소가 있으면 그 페이지로 간다. 발송본과 웹이 같은 양식이어야 하므로
      // 팝업으로 가로채지 않는다 — 팝업은 페이지가 아직 없는 호에만 쓴다.
      trigger.setAttribute('href', item.href);
    } else {
      trigger.setAttribute('type', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      if (item.pubId) trigger.dataset.pubId = item.pubId;
    }
    if (item.download) trigger.dataset.download = item.download;

    // 표지가 있으면 그림을, 없으면 지금까지처럼 호수 글자를 쓴다. 둘 다 같은
    // .pub-thumb 상자를 쓰므로 섞여 있어도 카드 높이가 어긋나지 않는다.
    const thumb = document.createElement('span');
    thumb.className = item.cover ? 'pub-thumb pub-thumb--image' : 'pub-thumb';
    if (item.cover) {
      const cover = document.createElement('img');
      cover.className = 'pub-cover';
      cover.src = item.cover;
      cover.alt = '';           // 제목이 바로 아래에 있어 읽어 줄 것이 없다
      cover.loading = 'lazy';
      cover.decoding = 'async';
      thumb.appendChild(cover);
      const label = document.createElement('span');
      label.className = 'pub-thumb-label';
      label.textContent = item.thumb;
      thumb.appendChild(label);
    } else {
      thumb.textContent = item.thumb;
    }

    const body = document.createElement('span');
    body.className = 'pub-body';

    const title = document.createElement('span');
    title.className = 'pub-title';
    title.textContent = item.title;

    const meta = document.createElement('span');
    meta.className = 'pub-meta';
    meta.textContent = item.meta;

    const cta = document.createElement('span');
    cta.className = 'pub-cta';
    cta.append('자세히 보기');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'arrow-right');
    cta.appendChild(icon);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(cta);
    trigger.appendChild(thumb);
    trigger.appendChild(body);
    article.appendChild(trigger);
    article.appendChild(createNewsletterDetailTemplate(item));

    return article;
  }

  /* 모달 본문. vol25 페이지와 같은 뼈대(.pub-card-body + .pub-modal-*)로 만든다.
     그 페이지가 이미 이 클래스들로 짜여 있어서, 같은 구조로 채우면 팝업과
     전용 페이지가 저절로 같은 모양이 된다 — 스타일을 새로 만들 일이 없다. */
  function createNewsletterDetailTemplate(item) {
    const template = document.createElement('template');
    template.className = 'pub-detail';

    const wrap = document.createElement('div');
    wrap.className = 'pub-card-body';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'pub-modal-eyebrow';
    eyebrow.textContent = item.thumb;
    wrap.appendChild(eyebrow);

    const title = document.createElement('h2');
    title.className = 'pub-modal-title';
    title.textContent = item.title;
    wrap.appendChild(title);

    const lede = document.createElement('p');
    lede.className = 'pub-modal-lede';
    lede.textContent = item.lede || item.summary || '뉴스레터 본문은 검수 후 공개될 예정입니다.';
    wrap.appendChild(lede);

    // '2026년 8월 · HTML 초안 · 기사 8건' 을 조각으로 끊어 나란히 둔다.
    if (item.meta) {
      const snapshot = document.createElement('div');
      snapshot.className = 'pub-modal-snapshot';
      item.meta.split('·').map(part => part.trim()).filter(Boolean).forEach(part => {
        const stat = document.createElement('div');
        stat.className = 'pub-modal-stat';
        stat.textContent = part;
        snapshot.appendChild(stat);
      });
      wrap.appendChild(snapshot);
    }

    // 구성안은 묶음마다 한 절로 세운다. 전에는 한 절 안에 h4 로 눌러 담아
    // 목차처럼 보였다.
    item.outline.forEach(outline => {
      const section = document.createElement('section');
      section.className = 'pub-modal-section';
      const heading = document.createElement('h3');
      heading.textContent = outline.heading;
      section.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'pub-modal-list';
      outline.bullets.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
      });
      section.appendChild(list);
      wrap.appendChild(section);
    });

    if (item.articles.length) {
      const section = document.createElement('section');
      section.className = 'pub-modal-refs';
      const heading = document.createElement('h3');
      heading.textContent = '참고 기사';
      section.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'pub-modal-list';
      item.articles.forEach(article => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = article.title;
        li.appendChild(strong);
        const meta = [article.sourceName, article.rawCategory, article.publishedAt]
          .filter(Boolean).join(' · ');
        if (meta) {
          const span = document.createElement('span');
          span.textContent = meta;
          li.appendChild(span);
        }
        list.appendChild(li);
      });
      section.appendChild(list);
      wrap.appendChild(section);
    }

    const callout = document.createElement('aside');
    callout.className = 'pub-modal-callout';
    if (item.href) {
      const link = document.createElement('a');
      link.className = 'link-cta';
      link.href = item.href;
      link.textContent = '전체 화면으로 보기';
      callout.appendChild(link);
    } else {
      callout.textContent = '원문 자료는 준비중입니다. 뉴스레터 및 협력 문의는 사무국으로 보내주세요.';
    }
    wrap.appendChild(callout);

    template.content.appendChild(wrap);
    return template;
  }

  window.KMTPACmsNewsletter = { card: createNewsletterCard };
})();
