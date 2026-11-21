/* ============================================================
   6JOHAN AI CONCIERGE
   ① ページ内はチップ＋1行入力だけ（回答は展開しない）
   ② タップで画面下からLINE風チャットシートが立ち上がる
      AI＝左の吹き出し／自分＝右の吹き出し（チップ→右→左とポンポン並ぶ）
   ③ 価格・カートに追加・担当者に相談は下部の固定バー1か所だけ
   方針:
     - 事実（寸法・在庫/納期・送料・返品条件）は Liquid が商品データから確定し、
       ここでは文章にするだけ。数値を推測しない。
     - 根拠がない質問・人でないと危ない相談は固定バーの「担当者に相談」へ寄せる。
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

  /* ---------------- アップセルの計測（GA4＋localStorage集計） ----------------
     外販アプリ「AI Concierge」の実績データ用に、インプレッション・クリック・
     カート追加を1日単位で localStorage にも積む（送信失敗時も端末側に残す）。 */
  var STAT_KEY = 'j6ac_upsell_stats_v1';

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function dayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function readStats() {
    try {
      return JSON.parse(window.localStorage.getItem(STAT_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function bumpStat(key) {
    try {
      var s = readStats();
      var day = dayKey();
      s.days = s.days || {};
      var row = s.days[day] || {};
      row[key] = (row[key] || 0) + 1;
      s.days[day] = row;
      s[key] = (s[key] || 0) + 1;
      s.updated_at = new Date().toISOString();
      window.localStorage.setItem(STAT_KEY, JSON.stringify(s));
    } catch (e) {
      /* プライベートモード等で保存できなくてもUIは動かす */
    }
  }

  function trackUpsell(event, params) {
    track(event, params);
    if (event === 'ai_upsell_impression') bumpStat('impressions');
    if (event === 'ai_upsell_click') bumpStat('clicks');
    if (event === 'ai_upsell_add_to_cart') bumpStat('adds');
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

  /* LINE風の時刻（HH:MM）と日付ピル */
  function timeLabel() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function dateLabel() {
    var d = new Date();
    var w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return d.getMonth() + 1 + '月' + d.getDate() + '日(' + w + ')';
  }

  /* ---------------- 回答の組み立て ---------------- */

  function answerDelivery(d) {
    if (d.state === 'unavailable') {
      return {
        id: 'delivery_unavailable',
        html: '現在この商品はお取り扱いがありません。再入荷のご予定は担当者にご確認ください。',
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
        human: false
      };
    }
    return {
      id: 'delivery_instock',
      html:
        '<b>在庫あり</b>です。最短7日以内に発送し、' +
        esc(deliveryDate(7)) +
        '頃までにお届けします。',
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
        human: true
      };
    }
    if (d.assembly === true) {
      parts.push('組み立てが必要な商品です。');
    } else if (d.assembly === false) {
      parts.push('完成品でお届けします。');
    }
    parts.push('設置場所の間口・エレベーターの奥行とあわせてご確認ください。');
    return { id: 'size', html: parts.join(''), human: false };
  }

  function answerReturn() {
    return {
      id: 'return',
      html:
        '商品到着後<b>30日以内</b>であれば、理由を問わず返品・返金を承ります。' +
        'お客様都合の返送料はお客様負担、不良品・誤配送は当社負担です。' +
        'お問い合わせフォームから事前にご連絡ください。',
      human: false
    };
  }

  function answerCarry(d) {
    var html =
      (d.size ? '<b>' + esc(d.size) + '</b>の商品です。' : '') +
      '搬入は梱包したまま行うため、玄関の間口・エレベーターの奥行・階段の曲がりに余裕が必要です。' +
      '設置場所の寸法が分かれば、担当者が搬入可否を確認します。';
    return { id: 'carry', html: html, human: true };
  }

  function answerShipping(d) {
    if (!d.shipKanto) {
      return {
        id: 'shipping_unknown',
        html: '送料は梱包サイズとお届け先で変わります。この商品の送料は担当者がご案内します。',
        human: true
      };
    }
    return {
      id: 'shipping',
      html:
        '送料は梱包サイズとお届け先で変わります。関東へのお届けで<b>' +
        yen(d.shipKanto) +
        '〜</b>です。沖縄・離島は別途お見積りとなります。',
      human: false,
      link: { href: '/pages/022', label: '送料について' }
    };
  }

  function answerMaterial(d) {
    if (!d.material) {
      return {
        id: 'material_missing',
        html: '素材の詳細は担当者にご確認ください。',
        human: true
      };
    }
    return {
      id: 'material',
      html: '素材は<b>' + esc(d.material) + '</b>です。',
      human: false
    };
  }

  function answerAssembly(d) {
    if (d.assembly === true) {
      return {
        id: 'assembly_yes',
        html: '組み立てが必要な商品です。組み立てサービス・設置のご相談は担当者が承ります。',
        human: true
      };
    }
    if (d.assembly === false) {
      return { id: 'assembly_no', html: '完成品でお届けします。開梱後すぐにお使いいただけます。', human: false };
    }
    return {
      id: 'assembly_missing',
      html: '組み立ての要否は商品により異なります。この商品の詳細は担当者にご確認ください。',
      human: true
    };
  }

  function answerUnknown() {
    return {
      id: 'human_fallback',
      html:
        'この内容は担当者が確認してご案内します。平日10–17時にお返事します。' +
        '画面下の「担当者に相談」からそのままご連絡いただけます。',
      human: true
    };
  }

  function answerUpsell() {
    return {
      id: 'upsell',
      upsell: true,
      html:
        '合わせて使うなら、こちらの商品がおすすめです。' +
        '<b>2点以上で自動5%OFF</b>（セット・コーディネート）が適用されます。' +
        '在庫品は最短7日、受注生産品は約2〜3ヶ月でお届けします（各商品のバッジ参照）。',
      human: false
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

  /* いま選ばれているバリエーション（カートフォームの hidden id → URLの?variant= の順で見る） */
  function currentVariant(d) {
    var idInput =
      document.querySelector('form[data-type="add-to-cart-form"] input[name="id"]') ||
      document.querySelector('form[action*="/cart/add"] input[name="id"]');
    var id = idInput && idInput.value ? String(idInput.value) : '';
    if (!id) {
      try {
        id = String(new URLSearchParams(window.location.search).get('variant') || '');
      } catch (e) {
        id = '';
      }
    }
    if (!id) id = String(d.variantId);
    var list = d.variants || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) return list[i];
    }
    return { id: d.variantId, price: d.price, available: d.state !== 'unavailable', title: d.variantTitle, state: d.state, lead: d.lead };
  }

  /* バリエーション単位の在庫区分（未指定のときだけページ初期値にフォールバック） */
  function variantState(variant, d) {
    if (variant && variant.state === 'instock') return 'instock';
    if (variant && variant.state === 'backorder') return 'backorder';
    if (variant && variant.state === 'unavailable') return 'unavailable';
    if (variant && variant.available === false) return 'unavailable';
    return d.state;
  }

  /* 回答を作る直前に、選択中バリエーションの在庫・納期を重ねたデータを返す */
  function withVariant(d) {
    var variant = currentVariant(d);
    var out = {};
    for (var k in d) {
      if (Object.prototype.hasOwnProperty.call(d, k)) out[k] = d[k];
    }
    out.state = variantState(variant, d);
    out.lead = (variant && variant.lead) || d.lead;
    if (variant && typeof variant.price === 'number') out.price = variant.price;
    out.variantId = (variant && variant.id) || d.variantId;
    out.variantTitle = (variant && variant.title) || d.variantTitle;
    return out;
  }

  function humanHref(d, question) {
    if (d.humanUrl) return d.humanUrl;
    var base = d.lineUrl || 'https://line.me/R/oaMessage/@505xknxn/';
    /* LINE公式の書式: oaMessage/{ID}/?{URLエンコードした文章}（?text= は使わない） */
    var text = d.title + 'について相談' + (question ? '：' + question : '');
    return base + (base.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent(text);
  }

  /* ---------------- アップセル（2点以上で自動5%OFF） ----------------
     提案は必ず「いま在庫のあるバリエーション」がある商品だけ。
     取得順序: /recommendations/products.json（関連商品・実ストア）
             → 失敗時は Liquid が出力した即納商品のフォールバック。 */

  function yenText(n) {
    return '¥' + Number(n || 0).toLocaleString('ja-JP');
  }

  function pctOff(price) {
    return Math.round(Number(price || 0) * 0.95);
  }

  function normalizeImg(src) {
    var s = String(src || '');
    if (s.indexOf('//') === 0) return 'https:' + s;
    return s;
  }

  /* ---- 在庫/納期（商品ページと共通の判定ソース） ----
     /recommendations/products.json も /products/{handle}.js も inventory_quantity を返さず、
     available は受注生産（在庫0・販売継続）でも true。
     そのため Liquid（snippets/ai-concierge-variant-map.liquid）が
     snippets/6johan-delivery-state で全商品のバリエーションを判定し、
     data-j6ac-data の variantStates に埋め込む。ここでは引くだけで判定はしない。
       "i"  = 在庫あり（最短7日）
       "b"  = 受注生産（約2〜3ヶ月）
       "b4" = 受注生産（約4ヶ月・例外3商品） */

  var STATE_CODE = {
    i: { state: 'instock', lead: '最短7日' },
    b: { state: 'backorder', lead: '約2〜3ヶ月' },
    b4: { state: 'backorder', lead: '約4ヶ月' }
  };

  function stateOf(ui, variantId) {
    var map = (ui.data && ui.data.variantStates) || {};
    return map[String(variantId)] || '';
  }

  /* 商品の販売中バリエーションを、確定した在庫区分つきで組み立てる */
  function itemVariants(it, ui) {
    var raw = it.rawVariants || [];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var v = raw[i];
      if (!v || v.available === false) continue;
      var code = stateOf(ui, v.id);
      if (!code || !STATE_CODE[code]) continue;
      var price = Number(v.price);
      if (!it.priceIsYen) price = Math.round(price / 100);
      var img = v.featured_image || v.image || '';
      if (img && typeof img === 'object') img = img.src || '';
      out.push({
        id: v.id,
        title: v.title || '',
        price: price,
        image: normalizeImg(img),
        state: STATE_CODE[code].state,
        lead: STATE_CODE[code].lead
      });
    }
    return out;
  }

  function setItemVariant(it, v) {
    if (!v) return;
    it.variantId = v.id;
    it.variantTitle = v.title || '';
    if (typeof v.price === 'number') it.price = v.price;
    if (v.image) it.image = normalizeImg(v.image);
    it.state = v.state || '';
    it.lead = v.lead || '';
  }

  function variantText(t) {
    t = t == null ? '' : String(t);
    return t === 'Default Title' ? '' : t;
  }

  /* 「アームなし / ナチュラル」→「ナチュラル（アームなし）」
     セレクトが狭くても色名が先に見えるようにする */
  function variantDisplay(t) {
    var s = variantText(t);
    if (!s) return '';
    var parts = s.split(' / ');
    if (parts.length < 2) return s;
    var color = parts[parts.length - 1];
    return color + '（' + parts.slice(0, -1).join(' / ') + '）';
  }

  function stateLabel(v) {
    if (!v) return '';
    if (v.state === 'instock') return '在庫あり（最短7日）';
    if (v.state === 'backorder') return '受注生産（' + (v.lead || '約2〜3ヶ月') + '）';
    return '';
  }

  /* 候補3点に、確定した在庫区分とカラー選択肢を付ける
     初期表示 = ① いま見ている商品と同じ色名 → ② 在庫あり → ③ 既存の選択 → ④ 先頭 */
  function applyStates(items, ui) {
    var color = variantText((currentVariant(ui.data) || {}).title);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var list = itemVariants(it, ui);
      if (!list.length) continue;
      it.variants = list;
      var chosen = null;
      var j;
      if (color) {
        for (j = 0; j < list.length; j++) {
          if (list[j].title === color) {
            chosen = list[j];
            break;
          }
        }
      }
      if (!chosen) {
        for (j = 0; j < list.length; j++) {
          if (list[j].state === 'instock') {
            chosen = list[j];
            break;
          }
        }
      }
      if (!chosen) {
        for (j = 0; j < list.length; j++) {
          if (String(list[j].id) === String(it.variantId)) {
            chosen = list[j];
            break;
          }
        }
      }
      if (!chosen) chosen = list[0];
      setItemVariant(it, chosen);
    }
    return items;
  }

  function normalizeFallback(list) {
    var out = [];
    list = list || [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || !it.variantId) continue;
      if (it.available === false) continue;
      if (!it.image) continue;
      if (['CHAIR', 'TABLE', 'SOFA', 'STORAGE'].indexOf(it.type) === -1) continue;
      out.push({
        id: it.id,
        handle: it.handle,
        title: it.title,
        type: it.type || '',
        url: it.url || '/products/' + it.handle,
        image: normalizeImg(it.image),
        price: Number(it.price) || 0,
        variantId: it.variantId,
        variantTitle: it.variantTitle || '',
        tags: it.tags || [],
        rawVariants: it.variants || [],
        priceIsYen: true
      });
    }
    return out;
  }

  /* 関連商品API（価格はセント）を、在庫ありの1バリエーションにそろえる */
  function fromRecommendation(p, colorTitle, priceIsYen) {
    if (!p || !p.handle) return null;
    var vs = p.variants || [];
    var avail = [];
    for (var i = 0; i < vs.length; i++) {
      if (vs[i] && vs[i].available !== false) avail.push(vs[i]);
    }
    if (!avail.length) return null;
    var chosen = avail[0];
    if (colorTitle) {
      for (var j = 0; j < avail.length; j++) {
        if (avail[j].title === colorTitle) {
          chosen = avail[j];
          break;
        }
      }
    }
    var img =
      p.featured_image ||
      (p.images && p.images[0]) ||
      (p.image && p.image.src) ||
      (chosen.featured_image && chosen.featured_image.src) ||
      '';
    var raw = chosen.price != null ? chosen.price : p.price;
    var price = Number(raw) || 0;
    if (!priceIsYen) price = Math.round(price / 100);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      type: p.type || '',
      url: '/products/' + p.handle,
      image: normalizeImg(img),
      price: price,
      variantId: chosen.id,
      variantTitle: chosen.title || '',
      rawVariants: vs,
      priceIsYen: !!priceIsYen
    };
  }

  function tagScore(tags, currentTags) {
    var n = 0;
    tags = tags || [];
    currentTags = currentTags || [];
    for (var i = 0; i < tags.length; i++) {
      for (var j = 0; j < currentTags.length; j++) {
        if (tags[i] === currentTags[j]) {
          n++;
          break;
        }
      }
    }
    return n;
  }

  /* 商品タイプを散らす（同タイプばかりの3点にならないように） */
  function diversify(items, max) {
    var first = [];
    var rest = [];
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var t = items[i].type || 'other';
      if (!seen[t]) {
        seen[t] = 1;
        first.push(items[i]);
      } else {
        rest.push(items[i]);
      }
    }
    return first.concat(rest).slice(0, max || 3);
  }

  function loadUpsellItems(ui) {
    if (ui.upsellLoading) return ui.upsellLoading;
    var d = ui.data;
    var fallbackList = normalizeFallback(d.upsellFallback);
    for (var fi = 0; fi < fallbackList.length; fi++) {
      fallbackList[fi].score = tagScore(fallbackList[fi].tags, d.tags);
    }
    fallbackList.sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    var fallback = diversify(fallbackList, 3);
    ui.upsellLoading = new Promise(function (resolve) {
      var done = false;
      var timer = window.setTimeout(function () {
        if (done) return;
        if (fallback.length) {
          done = true;
          resolve(fallback);
          return;
        }
        finishFromCollection();
      }, 2500);

      function finish(items) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(items && items.length ? items : fallback);
      }

      /* 関連商品APIもLiquidのリストも空のときの最終手段：即納コレクションのJSON */
      function finishFromCollection() {
        if (fallback.length) return finish(fallback);
        var color = (currentVariant(d) || {}).title;
        fetch('/collections/express-deliver/products.json?limit=12', {
          headers: { Accept: 'application/json' }
        })
          .then(function (r) {
            if (!r.ok) throw new Error('collection ' + r.status);
            return r.json();
          })
          .then(function (j) {
            var list = (j && j.products) || [];
            var items = [];
            for (var i = 0; i < list.length; i++) {
              if (list[i].handle === d.handle) continue;
              var it = fromRecommendation(list[i], color, true);
              if (!it) continue;
              it.score = tagScore(list[i].tags, d.tags);
              items.push(it);
            }
            items.sort(function (a, b) {
              return (b.score || 0) - (a.score || 0);
            });
            finish(diversify(items, 3));
          })
          .catch(function () {
            finish(fallback);
          });
      }

      try {
        var color = (currentVariant(d) || {}).title;
        var url =
          '/recommendations/products.json?product_id=' +
          encodeURIComponent(d.productId) +
          '&limit=6&intent=related';

        function tryFetch(attempt) {
          fetch(url, { headers: { Accept: 'application/json' } })
            .then(function (r) {
              if (r.status === 429 && attempt < 1) {
                window.setTimeout(function () {
                  tryFetch(attempt + 1);
                }, 900);
                return null;
              }
              if (!r.ok) throw new Error('recommendations ' + r.status);
              return r.json();
            })
            .then(function (j) {
              if (!j) return;
              var list = (j.products) || [];
              var items = [];
              for (var i = 0; i < list.length; i++) {
                if (list[i].handle === d.handle) continue;
                var it = fromRecommendation(list[i], color);
                if (!it) continue;
                it.score = tagScore(list[i].tags, d.tags);
                items.push(it);
              }
              items.sort(function (a, b) {
                return (b.score || 0) - (a.score || 0);
              });
              var picked = diversify(items, 3);
              if (!picked.length) return finishFromCollection();
              finish(picked);
            })
            .catch(function () {
              finishFromCollection();
            });
        }
        tryFetch(0);
      } catch (e) {
        finishFromCollection();
      }
    });
    return ui.upsellLoading;
  }

  function upsellNoteText(ui) {
    var n = ui.cartCount || 0;
    if (n >= 2) {
      return 'いまカートに' + n + '点入っています（5%OFF適用中）。追加分も5%OFFになります。';
    }
    if (n === 1) {
      return 'いまカートに1点。あと1点で2点以上5%OFF（セット・コーディネート）が適用されます。';
    }
    return ui.data.upsellNote || '2点以上で自動5%OFF（セット・コーディネート）が適用されます。';
  }

  function scrollToUpsell(ui, el) {
    if (!ui.thread || !el) return;
    var top = el.offsetTop - 24;
    ui.thread.scrollTop = top < 0 ? 0 : top;
  }

  /* 行の表示（サムネ・価格・在庫バッジ・色名）を選択中バリエーションに合わせる */
  function paintItem(row, it) {
    if (!row) return;
    row.setAttribute('data-variant-id', String(it.variantId));
    row.setAttribute('data-variant-title', it.variantTitle || '');
    row.setAttribute('data-price', String(it.price));
    row.setAttribute('data-state', it.state || '');

    var img = row.querySelector('[data-j6ac-upsell-img]');
    if (img && it.image) img.src = it.image;

    var price = row.querySelector('[data-j6ac-upsell-price]');
    if (price) {
      price.innerHTML =
        '<s>' +
        yenText(it.price) +
        '</s><b>' +
        yenText(pctOff(it.price)) +
        '</b><i>5%OFF目安</i>';
    }

    var colorName = row.querySelector('[data-j6ac-upsell-color]');
    if (colorName) colorName.textContent = variantDisplay(it.variantTitle);

    var badge = row.querySelector('[data-j6ac-upsell-state]');
    if (badge) {
      var label = stateLabel(it);
      badge.textContent = label;
      badge.className =
        'j6ac-upsell__state' +
        (label ? (it.state === 'backorder' ? ' is-backorder' : ' is-instock') : '');
      if (label) badge.removeAttribute('hidden');
      else badge.setAttribute('hidden', '');
    }

    var select = row.querySelector('[data-j6ac-upsell-select]');
    if (select && select.value !== String(it.variantId)) select.value = String(it.variantId);
  }

  function createUpsellItem(ui, it) {
    var row = document.createElement('div');
    row.className = 'j6ac-upsell__item';
    row.setAttribute('data-j6ac-upsell-item', '');
    row.setAttribute('data-variant-id', String(it.variantId));
    row.setAttribute('data-handle', String(it.handle || ''));
    row.setAttribute('data-product-id', String(it.id || ''));
    row.setAttribute('data-price', String(it.price));

    var url = it.url || '/products/' + it.handle;

    var thumb = document.createElement('a');
    thumb.className = 'j6ac-upsell__thumb';
    thumb.href = url;
    thumb.setAttribute('data-j6ac-upsell-link', '');
    thumb.setAttribute('aria-label', it.title + 'の商品ページを見る');
    thumb.innerHTML =
      '<img data-j6ac-upsell-img src="' +
      esc(it.image) +
      '" alt="' +
      esc(it.title) +
      '" width="48" height="48" loading="lazy">';

    var body = document.createElement('div');
    body.className = 'j6ac-upsell__body';

    var name = document.createElement('a');
    name.className = 'j6ac-upsell__name';
    name.href = url;
    name.setAttribute('data-j6ac-upsell-link', '');
    name.textContent = it.title;

    /* 色名 / 在庫バッジの行。販売可能な色が2つ以上ならセレクトで切替。 */
    var meta = document.createElement('div');
    meta.className = 'j6ac-upsell__meta';

    var options = it.variants || [];
    if (options.length > 1) {
      var sel = document.createElement('select');
      sel.className = 'j6ac-upsell__select';
      sel.setAttribute('data-j6ac-upsell-select', '');
      sel.setAttribute('aria-label', it.title + 'のカラーを選ぶ');
      for (var i = 0; i < options.length; i++) {
        var opt = document.createElement('option');
        opt.value = String(options[i].id);
        opt.textContent = variantDisplay(options[i].title) || options[i].title || '';
        if (String(options[i].id) === String(it.variantId)) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', function () {
        var picked = null;
        for (var j = 0; j < options.length; j++) {
          if (String(options[j].id) === String(sel.value)) {
            picked = options[j];
            break;
          }
        }
        if (!picked) return;
        setItemVariant(it, picked);
        paintItem(row, it);
        trackUpsell('ai_upsell_variant_select', {
          product_id: ui.data.productId,
          product_handle: ui.data.handle,
          item_id: it.id,
          item_name: it.title,
          item_variant: it.variantTitle,
          item_state: it.state
        });
      });
      meta.appendChild(sel);
    } else {
      var colorName = document.createElement('span');
      colorName.className = 'j6ac-upsell__color';
      colorName.setAttribute('data-j6ac-upsell-color', '');
      colorName.textContent = variantDisplay(it.variantTitle);
      if (!colorName.textContent) colorName.setAttribute('hidden', '');
      meta.appendChild(colorName);
    }

    var price = document.createElement('span');
    price.className = 'j6ac-upsell__price';

    var amount = document.createElement('span');
    amount.className = 'j6ac-upsell__amount';
    amount.setAttribute('data-j6ac-upsell-price', '');

    var badge = document.createElement('span');
    badge.className = 'j6ac-upsell__state';
    badge.setAttribute('data-j6ac-upsell-state', '');

    price.appendChild(amount);
    price.appendChild(badge);

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(price);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'j6ac-upsell__add';
    btn.setAttribute('data-j6ac-upsell-add', '');
    btn.innerHTML = '<span>＋ カートに追加</span>';

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(btn);

    paintItem(row, it);
    return row;
  }

  function createUpsellCard(ui, items) {
    var wrap = document.createElement('div');
    wrap.className = 'j6ac-upsell';
    wrap.setAttribute('data-j6ac-upsell', '');

    var head = document.createElement('div');
    head.className = 'j6ac-upsell__head';
    head.innerHTML =
      '<span class="j6ac-upsell__lead">✨ ' +
      esc(ui.data.upsellTitle || '一緒に買うとお得') +
      '</span><span class="j6ac-upsell__badge">' +
      esc(ui.data.upsellBadge || '2点以上で5%OFF') +
      '</span>';

    var list = document.createElement('div');
    list.className = 'j6ac-upsell__list';
    for (var i = 0; i < items.length; i++) {
      list.appendChild(createUpsellItem(ui, items[i]));
    }

    var note = document.createElement('p');
    note.className = 'j6ac-upsell__note';
    note.setAttribute('data-j6ac-upsell-note', '');
    note.textContent = upsellNoteText(ui);

    wrap.appendChild(head);
    wrap.appendChild(list);
    wrap.appendChild(note);
    return wrap;
  }

  function showUpsell(ui, source) {
    if (!ui.thread) return;
    if (ui.upsellEl && ui.upsellEl.parentNode) {
      if (source === 'chip') scrollToUpsell(ui, ui.upsellEl);
      return;
    }
    loadUpsellItems(ui)
      .then(function (items) {
        return applyStates(items || [], ui);
      })
      .then(function (items) {
        if (!items || !items.length || ui.upsellEl) return;
        var card = createUpsellCard(ui, items);
        ui.thread.appendChild(card);
        ui.upsellEl = card;
        scrollBottom(ui.thread);
        var ids = [];
        var names = [];
        var variants = [];
        var states = [];
        for (var i = 0; i < items.length; i++) {
          ids.push(items[i].id);
          names.push(items[i].title);
          variants.push(variantDisplay(items[i].variantTitle) || '-');
          states.push(items[i].state || '-');
        }
        trackUpsell('ai_upsell_impression', {
          product_id: ui.data.productId,
          product_handle: ui.data.handle,
          source: source || 'auto',
          item_ids: ids.join(','),
          item_names: names.join(' / '),
          item_variants: variants.join(' / '),
          item_states: states.join(','),
          item_count: items.length,
          cart_item_count: ui.cartCount || 0
        });
      });
  }

  function refreshCartCount(ui) {
    if (typeof fetch !== 'function') return;
    fetch('/cart.js', {headers: {Accept: 'application/json'}})
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        ui.cartCount = cart.item_count || 0;
        if (ui.upsellEl) {
          var note = ui.upsellEl.querySelector('[data-j6ac-upsell-note]');
          if (note) note.textContent = upsellNoteText(ui);
        }
      })
      .catch(function () {
        /* カート件数が取れなくてもカードは出す */
      });
  }

  function cartDiscount(cart) {
    var apps = (cart && cart.cart_level_discount_applications) || [];
    for (var i = 0; i < apps.length; i++) {
      var a = apps[i];
      if (!a) continue;
      if (Number(a.total_allocated_amount) > 0 || /5%|５％|2点|２点/.test(a.title || '')) {
        return {
          title: a.title || '',
          amount: Math.round((Number(a.total_allocated_amount) || 0) / 100)
        };
      }
    }
    if (cart && Number(cart.total_discount) > 0) {
      return { title: '', amount: Math.round(Number(cart.total_discount) / 100) };
    }
    return null;
  }

  function showUpsellDone(ui, row, disc, cart) {
    var card = row ? row.parentNode : null;
    while (card && !card.hasAttribute('data-j6ac-upsell')) card = card.parentNode;
    if (!card) return;
    var done = card.querySelector('[data-j6ac-upsell-done]');
    if (!done) {
      done = document.createElement('div');
      done.className = 'j6ac-upsell__done';
      done.setAttribute('data-j6ac-upsell-done', '');
      done.innerHTML =
        '<span data-j6ac-upsell-done-text></span><a href="/cart">カートを見る ›</a>';
      card.appendChild(done);
    }
    var text = done.querySelector('[data-j6ac-upsell-done-text]');
    var count = (cart && cart.item_count) || 0;
    if (disc) {
      text.textContent =
        '✓ カートに追加しました（2点以上で5%OFF適用中' +
        (disc.amount ? '：-' + yenText(disc.amount) : '') +
        '）';
    } else if (count <= 1) {
      text.textContent = '✓ カートに追加しました（あと1点で5%OFF適用）';
    } else {
      text.textContent = '✓ カートに追加しました';
    }
    done.hidden = false;
    var note = card.querySelector('[data-j6ac-upsell-note]');
    if (note) note.textContent = upsellNoteText(ui);
    scrollBottom(ui.thread);
  }

  function upsellAdd(ui, btn, row) {
    if (!btn || btn.disabled || !row) return;
    var label = btn.querySelector('span') || btn;
    var nameEl = row.querySelector('.j6ac-upsell__name');
    var item = {
      variantId: row.getAttribute('data-variant-id'),
      variantTitle: row.getAttribute('data-variant-title') || '',
      state: row.getAttribute('data-state') || '',
      productId: row.getAttribute('data-product-id'),
      handle: row.getAttribute('data-handle'),
      price: Number(row.getAttribute('data-price') || 0),
      name: nameEl ? nameEl.textContent : ''
    };
    btn.disabled = true;
    btn.classList.add('is-busy');
    label.textContent = '追加中…';

    trackUpsell('ai_upsell_click', {
      product_id: ui.data.productId,
      product_handle: ui.data.handle,
      item_id: item.variantId,
      item_variant: item.variantTitle,
      item_state: item.state,
      item_name: item.name,
      price: item.price,
      currency: 'JPY',
      source: 'upsell_add'
    });

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: Number(item.variantId), quantity: 1 })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j && (j.description || j.message)) || 'cart error');
          return j;
        });
      })
      .then(function () {
        return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) {
          return r.json();
        });
      })
      .then(function (cart) {
        ui.cartCount = cart.item_count || 0;
        var disc = cartDiscount(cart);
        btn.classList.remove('is-busy');
        btn.classList.add('is-done');
        label.textContent = '✓ 追加済み';
        showUpsellDone(ui, row, disc, cart);
        trackUpsell('ai_upsell_add_to_cart', {
          product_id: ui.data.productId,
          product_handle: ui.data.handle,
          item_id: item.variantId,
          item_variant: item.variantTitle,
          item_state: item.state,
          item_name: item.name,
          price: item.price,
          currency: 'JPY',
          quantity: 1,
          cart_item_count: ui.cartCount,
          discount_title: disc ? disc.title : '',
          discount_amount: disc ? disc.amount : 0
        });
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        window.setTimeout(function () {
          btn.disabled = false;
          btn.classList.remove('is-done');
          label.textContent = '＋ カートに追加';
        }, 4000);
      })
      .catch(function () {
        btn.classList.remove('is-busy');
        btn.disabled = false;
        label.textContent = '追加できませんでした';
        window.setTimeout(function () {
          label.textContent = '＋ カートに追加';
        }, 2600);
      });
  }

  /* ---- LINE風の吹き出し ---- */

  function buildRow(kind) {
    var row = document.createElement('div');
    row.className = 'j6ac-line j6ac-line--' + kind;
    return row;
  }

  function appendAi(thread, html) {
    var row = buildRow('ai');
    row.innerHTML =
      '<span class="j6ac-line__avatar" aria-hidden="true">AI</span>' +
      '<div class="j6ac-line__bubble">' + html + '</div>' +
      '<span class="j6ac-line__time">' + timeLabel() + '</span>';
    thread.appendChild(row);
    return row;
  }

  function appendUser(thread, text) {
    var row = buildRow('user');
    row.innerHTML =
      '<span class="j6ac-line__time">' + timeLabel() + '</span>' +
      '<div class="j6ac-line__bubble"><p>' + esc(text) + '</p></div>';
    thread.appendChild(row);
    return row;
  }

  function appendTyping(thread) {
    var row = buildRow('typing');
    row.setAttribute('aria-hidden', 'true');
    row.innerHTML =
      '<span class="j6ac-line__avatar" aria-hidden="true">AI</span>' +
      '<div class="j6ac-line__bubble j6ac-line__bubble--typing"><i></i><i></i><i></i></div>';
    thread.appendChild(row);
    return row;
  }

  function answerHtml(answer) {
    var html = '<p>' + answer.html + '</p>';
    if (answer.link) {
      html +=
        '<span class="j6ac-line__link"><a href="' +
        esc(answer.link.href) +
        '">' +
        esc(answer.link.label) +
        ' ›</a></span>';
    }
    return html;
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
    var state = variantState(variant, d);
    if (ui.price) ui.price.textContent = yen(variant.price);
    if (ui.variant)
      ui.variant.textContent = variant.title && variant.title !== 'Default Title' ? variant.title : '';
    if (ui.stock) {
      ui.stock.textContent = state === 'backorder' ? '受注生産' : state === 'unavailable' ? '在庫切れ' : '在庫あり';
      ui.stock.setAttribute('data-j6ac-state', state);
    }
  }

  /* カラー（バリエーション）切替にヘッダー・価格・相談文面を追随させる */
  function refreshVariant(ui) {
    if (!ui) return;
    var d = withVariant(ui.data);
    var key = String(d.variantId) + '|' + d.state;
    syncHead(ui, d);
    setHumanHref(ui, null);
    /* 会話が始まっていれば、切替後の在庫区分を区切りとして1行だけ残す */
    if (ui.lastKey && key !== ui.lastKey && ui.greeted && ui.thread) {
      appendNotice(ui.thread, d);
      scrollBottom(ui.thread);
    }
    ui.lastKey = key;
  }

  function appendNotice(thread, d) {
    var label = d.variantTitle && d.variantTitle !== 'Default Title' ? d.variantTitle : '';
    var stateText = d.state === 'backorder' ? '受注生産' : d.state === 'unavailable' ? '在庫切れ' : '在庫あり';
    var row = document.createElement('div');
    row.className = 'j6ac-line__notice';
    row.innerHTML = '<span>' + esc(label ? label + '（' + stateText + '）に切り替えました' : stateText + 'に切り替えました') + '</span>';
    thread.appendChild(row);
  }

  function setHumanHref(ui, question) {
    if (!ui.human) return;
    ui.human.setAttribute('href', humanHref(ui.data, question));
  }

  function renderGreeting(ui, d) {
    if (ui.greeted || !ui.thread) return;
    ui.greeted = true;
    var dateRow = document.createElement('div');
    dateRow.className = 'j6ac-line__date';
    dateRow.innerHTML = '<span>' + dateLabel() + '</span>';
    ui.thread.appendChild(dateRow);
    appendAi(ui.thread, '<p>' + esc(d.greeting || 'この商品の寸法・在庫・送料を確認して、その場でお答えします。') + '</p>');
    if (d.greetingSub) {
      appendAi(ui.thread, '<p>' + esc(d.greetingSub) + '</p>');
    }
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

  /* Channel Talk（#ch-plugin / z-index 10,000,000）のランチャーが右下にあり、
     シートを開いている間は吹き出しが二重に見え、送信ボタンのタップも奪われる。
     対応① CSS でシートを最前面へ（assets/ai-concierge.css の z-index）。
     対応② ここでシート開閉に合わせてランチャーを隠す／戻す（APIが無ければ何もしない）。 */
  function channelTalk(command) {
    try {
      if (typeof window.ChannelIO === 'function') {
        window.ChannelIO(command);
      }
    } catch (e) {
      /* Channel Talk 未導入・API変化でもAI接客は止めない */
    }
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
    channelTalk('hideChannelButton');
    if (ui.panel && ui.panel.focus) {
      try {
        ui.panel.focus({ preventScroll: true });
      } catch (e) {
        ui.panel.focus();
      }
    }
    scrollBottom(ui.thread);
    track('ai_sheet_open', { product_id: ui.data.productId, product_handle: ui.data.handle });
    /* すでにカートに1点あるかを取り、提案文と5%OFFの案内を合わせる */
    refreshCartCount(ui);
    loadUpsellItems(ui);
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
    channelTalk('showChannelButton');
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

  /* 1往復（質問→回答）をLINE風に積む */
  function appendTurn(ui, question, answer) {
    var thread = ui.thread;
    if (!thread) return;

    if (question) {
      appendUser(thread, question);
      setHumanHref(ui, question);
    }

    var typing = appendTyping(thread);
    scrollBottom(thread);

    window.setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      appendAi(thread, answerHtml(answer));
      scrollBottom(thread);
      track('ai_answer_show', {
        answer_id: answer.id,
        product_id: ui.data.productId,
        product_handle: ui.data.handle
      });
      /* 回答のあとにアップセルカード（初回のみ）。チップからは何度でも先頭に戻す */
      if (answer && answer.upsell) {
        showUpsell(ui, 'chip');
      } else if (!ui.upsellEl) {
        showUpsell(ui, 'auto');
      }
    }, 420);
  }

  /* ---------------- カートに追加（固定バーの1ボタン） ---------------- */

  function addLabel(button) {
    return button.querySelector('[data-j6ac-add-label]') || button.querySelector('span');
  }

  function addToCart(button, d) {
    var form = document.querySelector('form[data-type="add-to-cart-form"]');
    var variant = currentVariant(d);
    var label = addLabel(button);
    if (button.classList.contains('is-done') || button.classList.contains('is-busy')) return;

    track('ai_cart_add_click', {
      product_id: d.productId,
      product_handle: d.handle,
      variant_id: variant.id,
      value: variant.price,
      currency: 'JPY',
      source: 'fixed_bar'
    });

    if (form) {
      var idInput = form.querySelector('input[name="id"]');
      if (idInput && String(idInput.value) !== String(variant.id)) {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var addBtn = form.querySelector('button[name="add"]');
      if (!addBtn || addBtn.disabled || !variant.available) {
        if (label) label.textContent = '現在在庫切れです';
        window.setTimeout(function () {
          if (label) label.textContent = 'カートに追加する';
        }, 2500);
        return;
      }
      button.classList.add('is-done');
      if (label) label.textContent = 'カートに追加しました';
      addBtn.click();
      window.setTimeout(function () {
        button.classList.remove('is-done');
        if (label) label.textContent = 'カートに追加する';
      }, 2600);
      return;
    }

    /* フォームが見つからないときは直接カートAPIへ */
    if (!variant.available) {
      if (label) label.textContent = '現在在庫切れです';
      window.setTimeout(function () {
        if (label) label.textContent = 'カートに追加する';
      }, 2500);
      return;
    }
    button.classList.add('is-busy');
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
        button.classList.remove('is-busy');
        button.classList.add('is-done');
        if (label) label.textContent = 'カートに追加しました';
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        window.setTimeout(function () {
          button.classList.remove('is-done');
          if (label) label.textContent = 'カートに追加する';
        }, 2600);
      })
      .catch(function () {
        button.classList.remove('is-busy');
        if (label) label.textContent = 'カートに追加できませんでした';
        window.setTimeout(function () {
          if (label) label.textContent = 'カートに追加する';
        }, 2600);
      });
  }

  /* ---------------- 初期化 ---------------- */

  function chipAnswer(type, d) {
    if (type === 'delivery') return answerDelivery(d);
    if (type === 'size') return answerSize(d);
    if (type === 'upsell') return answerUpsell();
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
      human: sheet ? sheet.querySelector('[data-j6ac-human="fixed"]') : null,
      buy: sheet ? sheet.querySelector('[data-j6ac-add]') : null,
      open: false,
      greeted: false,
      lastTrigger: null,
      lastKey: null,
      cartCount: typeof d.cartItemCount === 'number' ? d.cartItemCount : 0,
      upsellEl: null,
      upsellLoading: null
    };
    if (!sheet) return;

    /* テーマの共通CSS（div:empty{display:none} 等）で暗幕が消されている場合の保険 */
    var scrim = sheet.querySelector('.j6ac-sheet__scrim');
    if (scrim && window.getComputedStyle(scrim).display === 'none') {
      scrim.style.setProperty('display', 'block', 'important');
    }

    /* 親の overflow / transform に邪魔されないよう body 直下へ移す */
    if (sheet.parentNode !== document.body) {
      var accent = root.style.getPropertyValue('--j6ac-accent');
      if (accent) sheet.style.setProperty('--j6ac-accent', accent);
      document.body.appendChild(sheet);
    }

    /* 固定バーの相談リンクは、最初は商品名だけを入れておく */
    setHumanHref(ui, null);

    var inlineInput = root.querySelector('[data-j6ac-input="inline"]');
    var inlineForm = root.querySelector('[data-j6ac-form="inline"]');
    var sheetForm = sheet.querySelector('[data-j6ac-form="sheet"]');
    var sheetInput = sheet.querySelector('[data-j6ac-input="sheet"]');

    function ask(type, label, trigger) {
      var answer = chipAnswer(type, withVariant(d));
      track('ai_chip_click', { chip: type, product_id: d.productId, product_handle: d.handle });
      openSheet(ui, trigger);
      root.querySelectorAll('.j6ac__bar .j6ac__chip').forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-j6ac-chip') === type);
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
        var answer = chipAnswer(type, withVariant(d));
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
        var answer = answerFor(text, withVariant(d));
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
        var answer = answerFor(text, withVariant(d));
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

    /* 固定バー：カート追加 / 担当者に相談 */
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
          answer_id: human.getAttribute('data-j6ac-human'),
          source: 'fixed_bar'
        });
      }
    });

    /* アップセルカード：ワンタップ追加・商品リンクの計測 */
    if (ui.thread) {
      ui.thread.addEventListener('click', function (e) {
        var addBtn = e.target.closest('[data-j6ac-upsell-add]');
        if (addBtn) {
          e.preventDefault();
          upsellAdd(ui, addBtn, addBtn.closest('[data-j6ac-upsell-item]'));
          return;
        }
        var link = e.target.closest('[data-j6ac-upsell-link]');
        if (link) {
          var row = link.closest('[data-j6ac-upsell-item]');
          trackUpsell('ai_upsell_click', {
            product_id: d.productId,
            product_handle: d.handle,
            item_id: row ? row.getAttribute('data-variant-id') : '',
            item_name: row && row.querySelector('.j6ac-upsell__name') ? row.querySelector('.j6ac-upsell__name').textContent : '',
            price: row ? Number(row.getAttribute('data-price') || 0) : 0,
            currency: 'JPY',
            source: 'product_link'
          });
        }
      });
    }

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

    /* カラー（バリエーション）切替に追随：ヘッダーの在庫表示・価格・相談文面
       - テーマの商品情報（variant-radios / variant-selects → ?variant= 更新）
       - Shopify標準の publish/subscribe（variantChange）
       - ブラウザの戻る／進む
       のどれでも同じ処理に乗せる。 */
    var variantTimer = null;
    function onVariantChange() {
      window.clearTimeout(variantTimer);
      variantTimer = window.setTimeout(function () {
        refreshVariant(ui);
      }, 80);
    }
    document.querySelectorAll('variant-radios, variant-selects').forEach(function (el) {
      el.addEventListener('change', onVariantChange);
    });
    window.addEventListener('popstate', onVariantChange);
    var _pushState = history.pushState;
    history.pushState = function () {
      _pushState.apply(history, arguments);
      onVariantChange();
    };
    var _replaceState = history.replaceState;
    history.replaceState = function () {
      _replaceState.apply(history, arguments);
      onVariantChange();
    };
    if (typeof window.subscribe === 'function' && window.PUB_SUB_EVENTS && window.PUB_SUB_EVENTS.variantChange) {
      window.subscribe(window.PUB_SUB_EVENTS.variantChange, onVariantChange);
    }
    refreshVariant(ui);

    /* Esc で閉じる / Tab をシート内に閉じ込める */
    document.addEventListener('keydown', function (e) {
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
    /* 検証・外販アプリの実績確認用：localStorage のアップセル集計を読めるようにする */
    window.getJ6acUpsellStats = readStats;
    document.querySelectorAll('[data-j6ac]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
