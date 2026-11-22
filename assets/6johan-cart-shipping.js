/*
  6JOHAN カートの送料・合計目安（カートページ／カートドロワー共通）

  送料は Shopify の配送プロファイルから /cart/shipping_rates.json で取得する。
  取得できない場合は assets/6johan-shipping.js の送料テーブルで目安を計算する。
  取得結果はどちらも「目安」として表示し、確定はチェックアウトであると明記する。
*/
(function () {
  if (window.__sixjCsumBoot) return;
  window.__sixjCsumBoot = true;

  var SHIP = window.SixjShipping || {};
  var DEFAULT_PREF = '東京都';
  var ZIP = '100-0001';

  function yen(n) {
    if (SHIP.yen) return SHIP.yen(n);
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  }

  function readPref() {
    if (SHIP.readPref) return SHIP.readPref();
    try { return window.localStorage.getItem('6johan_pref') || DEFAULT_PREF; } catch (e) { return DEFAULT_PREF; }
  }

  function writePref(pref) {
    if (SHIP.writePref) return SHIP.writePref(pref);
    try { window.localStorage.setItem('6johan_pref', pref); } catch (e) {}
  }

  function subtotalOf(el) {
    var v = parseInt(el.getAttribute('data-subtotal'), 10);
    return isNaN(v) ? 0 : v; // 銭
  }

  function taxLabel(el) {
    return el.getAttribute('data-tax') || '税込';
  }

  function render(el, feeYen, feeTitle, pref) {
    var feeEl = el.querySelector('[data-sixj-csum-fee]');
    var totalEl = el.querySelector('[data-sixj-csum-total]');
    var subtotal = subtotalOf(el);
    if (feeEl) {
      if (feeYen === 0) {
        feeEl.innerHTML = '無料';
      } else {
        feeEl.innerHTML =
          yen(feeYen) +
          '<span class="sixj-csum__fee-note">' +
          (pref ? pref + 'にお届け' : '') +
          (feeTitle ? '・' + feeTitle : '') +
          '</span>';
      }
      if (feeTitle) feeEl.setAttribute('title', feeTitle);
    }
    if (totalEl) {
      totalEl.textContent = yen((subtotal + feeYen * 100) / 100) + '（' + taxLabel(el) + '）';
    }
  }

  function renderContact(el, pref) {
    var feeEl = el.querySelector('[data-sixj-csum-fee]');
    var totalEl = el.querySelector('[data-sixj-csum-total]');
    if (feeEl) {
      feeEl.innerHTML =
        '<span class="sixj-csum__contact">' + pref + 'へは送料を個別にご案内します</span>';
    }
    if (totalEl) totalEl.textContent = '商品合計＋送料（お問い合わせ）';
  }

  function renderFallback(el, pref) {
    var items = el.querySelectorAll('[data-sixj-csum-item]');
    var subtotal = subtotalOf(el);
    if (!SHIP.lookupFee || !items.length) {
      var feeEl = el.querySelector('[data-sixj-csum-fee]');
      if (feeEl) feeEl.innerHTML = '<span class="sixj-csum__fee-note">購入手続き画面で確定します</span>';
      var totalEl = el.querySelector('[data-sixj-csum-total]');
      if (totalEl) totalEl.textContent = yen(subtotal / 100) + '＋送料（' + taxLabel(el) + '）';
      return;
    }
    var fee = 0;
    var sizes = [];
    var capped = false;
    var unknown = 0;
    for (var i = 0; i < items.length; i++) {
      var size = parseInt(items[i].getAttribute('data-size'), 10);
      var qty = parseInt(items[i].getAttribute('data-qty'), 10) || 1;
      var hit = size > 0 ? SHIP.lookupFee(size, pref) : null;
      if (!hit) { unknown++; continue; } // サイズ未登録の商品は加算せず、注記で補う
      var mult = Math.min(qty, SHIP.MAX_MULTIPLIER || 4);
      if (qty > mult) capped = true;
      fee += hit.fee * mult;
      if (sizes.indexOf(size) === -1) sizes.push(size);
    }
    if (!sizes.length) { renderContact(el, pref); return; }
    var title =
      sizes.sort(function (a, b) { return a - b; }).join('・') +
      'サイズ送料' +
      (capped ? '（4点分まで）' : '') +
      (unknown ? '・一部商品は購入手続きで確定' : '');
    render(el, fee, title, pref);
  }

  function fetchRates(el, pref) {
    var el2 = el;
    el2.__seq = (el2.__seq || 0) + 1;
    var seq = el2.__seq;

    // 先にテーブルで目安を出しておく（通信中に「計算中」で止まらないように）
    renderFallback(el, pref);

    var url =
      '/cart/shipping_rates.json?shipping_address%5Bzip%5D=' +
      encodeURIComponent(ZIP) +
      '&shipping_address%5Bcountry%5D=Japan&shipping_address%5Bprovince%5D=' +
      encodeURIComponent(pref);

    if (typeof window.fetch !== 'function') return;

    window
      .fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (seq !== el2.__seq || !data) return;
        var rates = data.shipping_rates || [];
        if (!rates.length) { renderContact(el, pref); return; }
        var best = rates[0];
        for (var i = 1; i < rates.length; i++) {
          if (Number(rates[i].price) < Number(best.price)) best = rates[i];
        }
        var feeYen = Number(best.price);
        if (isNaN(feeYen)) return;
        var title = '';
        if (best.name) {
          // 「240サイズ送料_関東」→「240サイズ・関東」
          title = String(best.name).replace(/_/g, '・').replace(/送料/, '送料');
        }
        render(el, feeYen, title, pref);
      })
      .catch(function () {
        /* 失敗時はテーブルによる目安のまま */
      });
  }

  function init(el) {
    if (!el || el.__sixjInit) return;
    el.__sixjInit = true;

    var pref = readPref();
    var select = el.querySelector('[data-sixj-csum-pref]');
    if (select) {
      if (select.querySelector('option[value="' + pref + '"]')) select.value = pref;
      select.addEventListener('change', function () {
        var p = select.value || DEFAULT_PREF;
        writePref(p);
        el.__sixjLoaded = true;
        fetchRates(el, p);
      });
    }

    // ドロワーは閉じている間もHTMLに存在するため、見えてから取得する
    // （全ページ表示のたびに送料APIを叩かない）
    var load = function () {
      if (el.__sixjLoaded) return;
      el.__sixjLoaded = true;
      fetchRates(el, pref);
    };

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              load();
              io.disconnect();
              break;
            }
          }
        },
        { rootMargin: '200px' }
      );
      io.observe(el);
    } else {
      load();
    }
  }

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll('[data-sixj-csum]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }

  function boot() {
    initAll(document);

    // カート数量変更・ドロワー再描画でHTMLが差し替わるため、追加された分を初期化する
    if (window.MutationObserver) {
      var timer = null;
      var mo = new MutationObserver(function (records) {
        var relevant = false;
        for (var i = 0; i < records.length && !relevant; i++) {
          var nodes = records[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches('[data-sixj-csum]')) { relevant = true; break; }
            if (n.querySelector && n.querySelector('[data-sixj-csum]')) { relevant = true; break; }
          }
        }
        if (!relevant) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { initAll(document); }, 120);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
