/* ============================================================
   6JOHAN AI CONCIERGE
   ① ページ内はチップ＋1行入力だけ（回答は展開しない）
   ② タップで画面下から会話シート（オーバーレイ）が立ち上がる
   方針:
     - 事実（寸法・在庫/納期・送料・返品条件）は Liquid が商品データから確定し、
       ここでは文章にするだけ。数値を推測しない。
     - 根拠がない質問・人でないと危ない相談は「担当者に相談」へ寄せる。
     - 計測は GA4（gtag / dataLayer）に ai_* イベントで送る。
   ============================================================ */
(function () {
  'use strict';

  var booted = false;

  function yen(n) {
    return '¥' + Number(n || 0).toLocaleString('ja-JP');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function track(event, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, params || {}));
      if (typeof window.gtag === 'function') {
        window.gtag('event', event, params || {});
      }
    } catch (e) {
      /* 計測失敗はUIを止めない */
    }
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 749px)').matches;
  }

  /* Shopifyのプレビューバー（画面下に固定）の高さぶん、シートを上へずらす */
  function barOffset() {
    var el = document.getElementById('PBarNextFrameWrapper') || document.getElementById('preview-bar-iframe');
    if (!el) return 0;
    var r = el.getBoundingClientRect();
    return r.height > 4 ? Math.round(r.height) : 0;
  }

  function deliveryDate(days) {
    var d = new Date();
    d.setDate(d.getDate() + (days || 7));
    return d.getMonth() + 1 + '月' + d.getDate() + '日';
  }

  /* ---------------- 回答の組み立て ---------------- */

  function answerDelivery(d) {
    if (d.state === 'unavailable') {
      return {
        id: 'delivery_unavailable',
        html: '現在この商品はお取り扱いがありません。再入荷のご予定は担当者にご確認ください。',
        refs: ['在庫・納期'],
        human: true
      };
    }
    if (d.state === 'backorder') {
      return {
        id: 'delivery_backorder',
        html:
          '<b>受注生産</b>のため、ご注文後にお作りします。お届けまで' +
          esc(d.lead || '約2〜3ヶ月') +
          'です。',
        refs: ['在庫・納期'],
        human: false
      };
    }
    return {
      id: 'delivery_instock',
      html:
        '<b>在庫あり</b>です。最短7日以内に発送し、' +
        esc(deliveryDate(7)) +
        '頃までにお届けします。',
      refs: ['在庫・納期'],
      human: false
    };
  }

  function answerSize(d) {
    var parts = [];
    if (d.size) {
      parts.push('<b>' + esc(d.size) + '</b>です。');
    } else {
      return {
        id: 'size_missing',
        html: 'この商品の寸法データが登録されていません。正確な寸法は担当者にご確認ください。',
        refs: ['商品寸法'],
        human: true
      };
    }
    if (d.assembly === true) {
      parts.push('組み立てが必要な商品です。');
    } else if (d.assembly === false) {
      parts.push('完成品でお届けします。');
    }
    parts.push('設置場所の間口・エレベーターの奥行とあわせてご確認ください。');
    return { id: 'size', html: parts.join(''), refs: ['商品寸法'], human: false };
  }

  function answerReturn() {
    return {
      id: 'return',
      html:
        '商品到着後<b>30日以内</b>であれば、理由を問わず返品・返金を承ります。' +
        'お客様都合の返送料はお客様負担、不良品・誤配送は当社負担です。' +
        'お問い合わせフォームから事前にご連絡ください。',
      refs: ['配送ポリシー'],
      human: false
    };
  }

  function answerCarry(d) {
    var html =
      (d.size ? '<b>' + esc(d.size) + '</b>の商品です。' : '') +
      '搬入は梱包したまま行うため、玄関の間口・エレベーターの奥行・階段の曲がりに余裕が必要です。' +
      '設置場所の寸法が分かれば、担当者が搬入可否を確認します。';
    return { id: 'carry', html: html, refs: ['商品寸法'], human: true };
  }

  function answerShipping(d) {
    if (!d.shipKanto) {
      return {
        id: 'shipping_unknown',
        html: '送料は梱包サイズとお届け先で変わります。この商品の送料は担当者がご案内します。',
        refs: ['配送ポリシー'],
        human: true
      };
    }
    return {
      id: 'shipping',
      html:
        '送料は梱包サイズとお届け先で変わります。関東へのお届けで<b>' +
        yen(d.shipKanto) +
        '〜</b>です。沖縄・離島は別途お見積りとなります。',
      refs: ['配送ポリシー'],
      human: false,
      link: { href: '/pages/022', label: '送料について' }
    };
  }

  function answerMaterial(d) {
    if (!d.material) {
      return {
        id: 'material_missing',
        html: '素材の詳細は担当者にご確認ください。',
        refs: ['商品情報'],
        human: true
      };
    }
    return {
      id: 'material',
      html: '素材は<b>' + esc(d.material) + '</b>です。',
      refs: ['商品情報'],
      human: false
    };
  }

  function answerAssembly(d) {
    if (d.assembly === true) {
      return {
        id: 'assembly_yes',
        html: '組み立てが必要な商品です。組み立てサービス・設置のご相談は担当者が承ります。',
        refs: ['商品情報'],
        human: true
      };
    }
    if (d.assembly === false) {
      return { id: 'assembly_no', html: '完成品でお届けします。開梱後すぐにお使いいただけます。', refs: ['商品情報'], human: false };
    }
    return {
      id: 'assembly_missing',
      html: '組み立ての要否は商品により異なります。この商品の詳細は担当者にご確認ください。',
      refs: ['商品情報'],
      human: true
    };
  }

  function answerUnknown() {
    return {
      id: 'human_fallback',
      html:
        'この内容は担当者が確認してご案内します。平日10–18時にお返事します。' +
        '下の「担当者に相談」からそのままご連絡いただけます。',
      refs: [],
      human: true
    };
  }

  var KEYWORDS = [
    { re: /エレベーター|エレベータ|搬入|搬送|階段|間口|入る|通る|運搬/, fn: function (d) { return answerCarry(d); } },
    { re: /送料|配送料|送料は|いくら|費用|料金/, fn: function (d) { return answerShipping(d); } },
    { re: /納期|届く|届き|いつ|発送|到着|在庫|ありますか/, fn: function (d) { return answerDelivery(d); } },
    { re: /返品|返金|返却|キャンセル|交換/, fn: function () { return answerReturn(); } },
    { re: /素材|材質|木|ラタン|レザー|布|ファブリック|合皮/, fn: function (d) { return answerMaterial(d); } },
    { re: /組み立て|組立|設置|施工/, fn: function (d) { return answerAssembly(d); } },
    { re: /サイズ|寸法|大きさ|幅|奥行|高さ|収納/, fn: function (d) { return answerSize(d); } }
  ];

  function answerFor(text, d) {
    var q = String(text || '');
    for (var i = 0; i < KEYWORDS.length; i++) {
      if (KEYWORDS[i].re.test(q)) return KEYWORDS[i].fn(d);
    }
    return answerUnknown();
  }

  /* ---------------- 部品 ---------------- */

  function currentVariant(d) {
    var idInput = document.querySelector('form[data-type="add-to-cart-form"] input[name="id"]');
    var id = idInput && idInput.value ? String(idInput.value) : String(d.variantId);
    var list = d.variants || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) return list[i];
    }
    return { id: d.variantId, price: d.price, available: d.state !== 'unavailable', title: d.variantTitle };
  }

  function humanHref(d, question) {
    if (d.humanUrl) return d.humanUrl;
    var base = d.lineUrl || 'https://line.me/R/ti/p/@505xknxn';
    var sep = base.indexOf('?') > -1 ? '&' : '?';
    var text = d.title + 'について相談' + (question ? '：' + question : '');
    return base + sep + 'text=' + encodeURIComponent(text);
  }

  function buildCard(d, answer, question) {
    var variant = currentVariant(d);
    var card = document.createElement('div');
    card.className = 'j6ac__a';

    var refs = '';
    if (answer.refs && answer.refs.length) {
      refs = answer.refs
        .map(function (r) {
          return '<i>' + esc(r) + '</i>';
        })
        .join('');
      if (answer.link) {
        refs += '<a href="' + esc(answer.link.href) + '">' + esc(answer.link.label) + '</a>';
      }
      refs = '<div class="j6ac__src">参照 ' + refs + '</div>';
    }

    card.innerHTML =
      '<div class="j6ac__who"><span class="j6ac__dot">AI</span><b>6JOHAN AI</b><span>商品ページを参照して回答</span></div>' +
      '<p class="j6ac__txt">' + answer.html + '</p>' +
      refs +
      '<div class="j6ac__acts">' +
      '<button type="button" class="j6ac__buy" data-j6ac-add>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' +
      '<span>カートに追加 ' + yen(variant.price) + '</span>' +
      '</button>' +
      '<a class="j6ac__human" href="' + esc(humanHref(d, question)) + '" target="_blank" rel="noopener" data-j6ac-human="' + esc(answer.id) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.2 20c.6-3.4 3.4-5.6 6.8-5.6s6.2 2.2 6.8 5.6"/></svg>' +
      '<span>' + esc(d.humanLabel || '担当者に相談') + '</span>' +
      '</a>' +
      '</div>';

    return card;
  }

  /* ---------------- シート ---------------- */

  function scrollBottom(thread) {
    if (!thread) return;
    window.requestAnimationFrame(function () {
      thread.scrollTop = thread.scrollHeight;
    });
  }

  function syncHead(ui, d) {
    var variant = currentVariant(d);
    if (ui.price) ui.price.textContent = yen(variant.price);
    if (ui.variant) ui.variant.textContent = variant.title && variant.title !== 'Default Title' ? variant.title : '';
    if (ui.stock) {
      ui.stock.textContent =
        d.state === 'backorder' ? '受注生産' : d.state === 'unavailable' ? '在庫切れ' : '在庫あり';
    }
  }

  function renderGreeting(ui, d) {
    if (ui.greeted || !ui.thread) return;
    ui.greeted = true;
    var hello = document.createElement('div');
    hello.className = 'j6ac__hello';
    hello.innerHTML =
      '<b>6JOHAN AI CONCIERGE</b>' +
      esc(d.greeting || 'この商品の寸法・在庫・送料を確認して、その場でお答えします。');
    ui.thread.appendChild(hello);
  }

  function applyOffset(ui) {
    if (!ui.sheet) return;
    var off = barOffset();
    var vv = window.visualViewport;
    if (vv && window.innerHeight - vv.height > 120) {
      /* ソフトキーボードが開いた分だけ持ち上げる（iOS） */
      off += Math.round(window.innerHeight - vv.height);
    }
    ui.sheet.style.setProperty('--j6ac-bar-offset', off + 'px');
  }

  function openSheet(ui, trigger) {
    if (!ui.sheet) return;
    ui.lastTrigger = trigger || ui.lastTrigger;
    renderGreeting(ui, ui.data);
    syncHead(ui, ui.data);
    applyOffset(ui);

    ui.sheet.hidden = false;
    ui.sheet.setAttribute('aria-hidden', 'false');
    /* 表示直後にトランジションを効かせる */
    window.requestAnimationFrame(function () {
      ui.sheet.classList.add('is-open');
    });
    ui.open = true;
    ui.root.querySelectorAll('.j6ac__chip').forEach(function (c) {
      c.setAttribute('aria-expanded', 'true');
    });
    if (isMobile()) document.body.classList.add('j6ac-lock');
    if (ui.panel && ui.panel.focus) {
      try {
        ui.panel.focus({ preventScroll: true });
      } catch (e) {
        ui.panel.focus();
      }
    }
    scrollBottom(ui.thread);
    track('ai_sheet_open', { product_id: ui.data.productId, product_handle: ui.data.handle });
  }

  function closeSheet(ui) {
    if (!ui.sheet || !ui.open) return;
    ui.open = false;
    ui.sheet.classList.remove('is-open');
    ui.sheet.classList.add('is-closing');
    ui.sheet.setAttribute('aria-hidden', 'true');
    ui.root.querySelectorAll('.j6ac__chip').forEach(function (c) {
      c.setAttribute('aria-expanded', 'false');
    });
    document.body.classList.remove('j6ac-lock');
    window.setTimeout(function () {
      if (ui.open) return;
      ui.sheet.classList.remove('is-closing');
      ui.sheet.hidden = true;
    }, 300);
    if (ui.lastTrigger && ui.lastTrigger.focus) {
      try {
        ui.lastTrigger.focus({ preventScroll: true });
      } catch (e) {
        /* noop */
      }
    }
    track('ai_sheet_close', { product_id: ui.data.productId, product_handle: ui.data.handle });
  }

  /* 1往復（質問→回答）をシートに積む */
  function appendTurn(ui, question, answer) {
    var thread = ui.thread;
    if (!thread) return;

    if (question) {
      var q = document.createElement('div');
      q.className = 'j6ac__q';
      q.innerHTML = '<p>' + esc(question) + '</p>';
      thread.appendChild(q);
    }

    var typing = document.createElement('div');
    typing.className = 'j6ac__typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    thread.appendChild(typing);
    scrollBottom(thread);

    window.setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      thread.appendChild(buildCard(ui.data, answer, question));
      scrollBottom(thread);
      track('ai_answer_show', {
        answer_id: answer.id,
        product_id: ui.data.productId,
        product_handle: ui.data.handle
      });
    }, 320);
  }

  /* ---------------- カートに追加 ---------------- */

  function addToCart(button, d) {
    var form = document.querySelector('form[data-type="add-to-cart-form"]');
    var variant = currentVariant(d);
    track('ai_cart_add_click', {
      product_id: d.productId,
      product_handle: d.handle,
      variant_id: variant.id,
      value: variant.price,
      currency: 'JPY'
    });

    if (form) {
      var idInput = form.querySelector('input[name="id"]');
      if (idInput && String(idInput.value) !== String(variant.id)) {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var addBtn = form.querySelector('button[name="add"]');
      if (addBtn && !addBtn.disabled) {
        addBtn.click();
        return;
      }
    }

    /* フォームが見つからない/売り切れのときは直接カートAPIへ */
    if (!variant.available) {
      button.querySelector('span').textContent = '現在在庫切れです';
      return;
    }
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: variant.id, quantity: 1 })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('cart error');
        return r.json();
      })
      .then(function () {
        button.querySelector('span').textContent = 'カートに追加しました';
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        window.setTimeout(function () {
          button.querySelector('span').textContent = 'カートに追加 ' + yen(variant.price);
        }, 2500);
      })
      .catch(function () {
        button.querySelector('span').textContent = 'カートに追加できませんでした';
      });
  }

  /* ---------------- 初期化 ---------------- */

  function chipAnswer(type, d) {
    if (type === 'delivery') return answerDelivery(d);
    if (type === 'size') return answerSize(d);
    return answerReturn();
  }

  function init(root) {
    var dataNode = root.querySelector('[data-j6ac-data]');
    if (!dataNode) return;
    var d;
    try {
      d = JSON.parse(dataNode.textContent);
    } catch (e) {
      return;
    }

    var sheet = root.querySelector('[data-j6ac-sheet]');
    var ui = {
      root: root,
      data: d,
      sheet: sheet,
      panel: sheet ? sheet.querySelector('[data-j6ac-panel]') : null,
      thread: sheet ? sheet.querySelector('[data-j6ac-thread]') : null,
      price: sheet ? sheet.querySelector('[data-j6ac-price]') : null,
      variant: sheet ? sheet.querySelector('[data-j6ac-variant]') : null,
      stock: sheet ? sheet.querySelector('[data-j6ac-stock]') : null,
      open: false,
      greeted: false,
      lastTrigger: null
    };
    if (!sheet) return;

    /* 親の overflow / transform に邪魔されないよう body 直下へ移す */
    if (sheet.parentNode !== document.body) {
      var accent = root.style.getPropertyValue('--j6ac-accent');
      if (accent) sheet.style.setProperty('--j6ac-accent', accent);
      document.body.appendChild(sheet);
    }

    var inlineInput = root.querySelector('[data-j6ac-input="inline"]');
    var inlineForm = root.querySelector('[data-j6ac-form="inline"]');
    var sheetForm = sheet.querySelector('[data-j6ac-form="sheet"]');
    var sheetInput = sheet.querySelector('[data-j6ac-input="sheet"]');

    function ask(type, label, trigger) {
      var answer = chipAnswer(type, d);
      track('ai_chip_click', { chip: type, product_id: d.productId, product_handle: d.handle });
      openSheet(ui, trigger);
      root.querySelectorAll('.j6ac__chip').forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-j6ac-chip') === type && c.closest('.j6ac__bar') !== null);
      });
      appendTurn(ui, label, answer);
    }

    /* ページ内チップ */
    root.querySelectorAll('.j6ac__bar [data-j6ac-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        ask(chip.getAttribute('data-j6ac-chip'), chip.textContent.trim(), chip);
      });
    });

    /* シート内の追加質問チップ */
    sheet.querySelectorAll('.j6ac-sheet__quick [data-j6ac-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var type = chip.getAttribute('data-j6ac-chip');
        var answer = chipAnswer(type, d);
        track('ai_chip_click', { chip: type, product_id: d.productId, product_handle: d.handle, source: 'sheet' });
        appendTurn(ui, chip.textContent.trim(), answer);
      });
    });

    /* ページ内の1行入力 → 送信でシートを開く */
    if (inlineForm) {
      inlineForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (inlineInput && inlineInput.value ? inlineInput.value : '').trim();
        if (!text) {
          if (inlineInput) inlineInput.focus();
          return;
        }
        var answer = answerFor(text, d);
        track('ai_question_submit', {
          product_id: d.productId,
          product_handle: d.handle,
          answer_id: answer.id,
          question_length: text.length,
          question: text.slice(0, 120),
          source: 'inline'
        });
        if (inlineInput) inlineInput.value = '';
        openSheet(ui, inlineInput);
        appendTurn(ui, text, answer);
      });
    }

    /* シート内の追加質問 */
    if (sheetForm) {
      sheetForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (sheetInput && sheetInput.value ? sheetInput.value : '').trim();
        if (!text) {
          if (sheetInput) sheetInput.focus();
          return;
        }
        var answer = answerFor(text, d);
        track('ai_question_submit', {
          product_id: d.productId,
          product_handle: d.handle,
          answer_id: answer.id,
          question_length: text.length,
          question: text.slice(0, 120),
          source: 'sheet'
        });
        if (sheetInput) sheetInput.value = '';
        appendTurn(ui, text, answer);
        if (sheetInput) sheetInput.focus();
      });
    }

    /* 閉じる（暗幕・×） */
    sheet.querySelectorAll('[data-j6ac-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        closeSheet(ui);
      });
    });

    /* カート追加 / 担当者に相談 */
    sheet.addEventListener('click', function (e) {
      var add = e.target.closest('[data-j6ac-add]');
      if (add) {
        addToCart(add, d);
        return;
      }
      var human = e.target.closest('[data-j6ac-human]');
      if (human) {
        track('ai_human_click', {
          product_id: d.productId,
          product_handle: d.handle,
          answer_id: human.getAttribute('data-j6ac-human')
        });
      }
    });

    /* 画面サイズ・ソフトキーボードの変化に追随 */
    window.addEventListener('resize', function () {
      if (ui.open) applyOffset(ui);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (ui.open) applyOffset(ui);
        scrollBottom(ui.thread);
      });
    }

    /* Esc で閉じる / Tab をシート内に閉じ込める */    document.addEventListener('keydown', function (e) {
      if (!ui.open) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeSheet(ui);
        return;
      }
      if (e.key === 'Tab' && ui.panel) {
        var items = ui.panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    /* 表示計測 */
    if ('IntersectionObserver' in window) {
      var seen = false;
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !seen) {
              seen = true;
              track('ai_concierge_view', { product_id: d.productId, product_handle: d.handle });
              io.disconnect();
            }
          });
        },
        { threshold: 0.5 }
      );
      io.observe(inlineForm || root);
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    document.querySelectorAll('[data-j6ac]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
