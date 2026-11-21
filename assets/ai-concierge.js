/* ============================================================
   6JOHAN AI CONCIERGE — 商品ページ即答チップ
   方針:
     - 事実（寸法・在庫/納期・送料・返品条件）は Liquid が商品データから確定し、
       ここでは文章にするだけ。数値を推測しない。
     - 根拠がない質問・人でないと危ない相談は「担当者に相談」へ寄せる。
     - 計測は GA4（gtag / dataLayer）に ai_* イベントで送る。
   ============================================================ */
(function () {
  'use strict';

  var initialized = false;

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
        "頃までにお届けします。",
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

  /* ---------------- 描画 ---------------- */

  function currentVariant(root, d) {
    var idInput = document.querySelector('form[data-type="add-to-cart-form"] input[name="id"]');
    var id = idInput && idInput.value ? String(idInput.value) : String(d.variantId);
    var list = d.variants || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) return list[i];
    }
    return { id: d.variantId, price: d.price, available: d.state !== 'unavailable' };
  }

  function humanHref(d, question) {
    if (d.humanUrl) return d.humanUrl;
    var base = d.lineUrl || 'https://line.me/R/ti/p/@505xknxn';
    if (d.lineUrl && question) {
      var sep = d.lineUrl.indexOf('?') > -1 ? '&' : '?';
      return d.lineUrl + sep + 'text=' + encodeURIComponent(d.title + '｜' + question);
    }
    return base;
  }

  function buildCard(root, d, answer, question) {
    var variant = currentVariant(root, d);
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

  function addQuestion(thread, text, answer) {
    var q = document.createElement('div');
    q.className = 'j6ac__q';
    q.innerHTML = '<p>' + esc(text) + '</p>';
    thread.appendChild(q);
  }

  function appendTurn(root, d, question, answer) {
    var thread = root.querySelector('[data-j6ac-thread]');
    var disclaimer = root.querySelector('[data-j6ac-disclaimer]');
    addQuestion(thread, question);
    thread.appendChild(buildCard(root, d, answer, question));
    thread.hidden = false;
    if (disclaimer) disclaimer.hidden = false;

    track('ai_answer_show', {
      answer_id: answer.id,
      product_id: d.productId,
      product_handle: d.handle
    });
  }

  /* ---------------- カートに追加 ---------------- */

  function addToCart(button, root, d) {
    var form = document.querySelector('form[data-type="add-to-cart-form"]');
    var variant = currentVariant(root, d);
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
        setTimeout(function () {
          button.querySelector('span').textContent = 'カートに追加 ' + yen(variant.price);
        }, 2500);
      })
      .catch(function () {
        button.querySelector('span').textContent = 'カートに追加できませんでした';
      });
  }

  /* ---------------- 初期化 ---------------- */

  function init(root) {
    var dataNode = root.querySelector('[data-j6ac-data]');
    if (!dataNode) return;
    var d;
    try {
      d = JSON.parse(dataNode.textContent);
    } catch (e) {
      return;
    }

    var input = root.querySelector('.j6ac__input');
    var form = root.querySelector('[data-j6ac-form]');
    var thread = root.querySelector('[data-j6ac-thread]');

    root.querySelectorAll('[data-j6ac-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var type = chip.getAttribute('data-j6ac-chip');
        var label = chip.textContent.trim();
        var answer;
        if (type === 'delivery') answer = answerDelivery(d);
        else if (type === 'size') answer = answerSize(d);
        else answer = answerReturn();

        root.querySelectorAll('[data-j6ac-chip]').forEach(function (c) {
          c.classList.remove('is-active');
        });
        chip.classList.add('is-active');

        track('ai_chip_click', {
          chip: type,
          product_id: d.productId,
          product_handle: d.handle
        });

        appendTurn(root, d, label, answer);
        if (window.matchMedia && window.matchMedia('(max-width: 749px)').matches) {
          thread.scrollIntoView({ block: 'nearest' });
        }
      });
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (input && input.value ? input.value : '').trim();
        if (!text) {
          if (input) input.focus();
          return;
        }
        var answer = answerFor(text, d);
        track('ai_question_submit', {
          product_id: d.productId,
          product_handle: d.handle,
          answer_id: answer.id,
          question_length: text.length,
          question: text.slice(0, 120)
        });
        appendTurn(root, d, text, answer);
        if (input) input.value = '';
        if (window.matchMedia && window.matchMedia('(max-width: 749px)').matches) {
          thread.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    root.addEventListener('click', function (e) {
      var add = e.target.closest('[data-j6ac-add]');
      if (add) {
        addToCart(add, root, d);
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
      io.observe(form || root);
    }
  }

  function boot() {
    if (initialized) return;
    initialized = true;
    document.querySelectorAll('[data-j6ac]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
