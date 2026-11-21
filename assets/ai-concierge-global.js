/* ============================================================
   6JOHAN AI CONCIERGE — 全ページ版（商品ページ以外）
   右下のランチャー → LINE風シートで、7カテゴリ＋自由入力に即答する。

   方針
     - 事実は work/6johan/line/cs_knowledge.md（公開ページ・テーマ・実メール由来）に沿う。
     - 日付・金額・交換可否・返金額は断定しない。シリアス（破損・部品不足・届かない等）は
       お詫び＋写真と注文番号の依頼＋「担当者より改めてご案内」で止める。
     - 判断が必要なものは LINE（@505xknxn）／お問い合わせへ送る。
     - 計測は GA4（gtag / dataLayer）に ai_* イベントで送る。
   ============================================================ */
(function () {
  'use strict';

  var booted = false;

  /* ---------------- ナレッジ（7カテゴリ） ---------------- */
  /* q: チップを押したときに「自分の吹き出し」へ出す質問文／LINE相談の直前言 */
  var TOPICS = {
    account: {
      id: 'account',
      q: '会員登録・マイページについて',
      keywords: /会員|マイページ|ログイン|ログアウト|新規登録|会員登録|退会|アカウント|パスワード|認証コード/,
      html:
        '<p><b>マイページ</b>は、画面右上のアカウント（<a href="/account">6johan.com/account</a>）からログインできます。ご登録のメールアドレスに届く認証コードでログインする方式です。</p>' +
        '<p>注文履歴・配送状況・お届け先の確認はマイページから行えます。初めての方は「新規登録」からアカウントを作成できます。</p>' +
        '<p>メールアドレスの変更・退会（アカウント削除）は、マイページの設定からお手続きいただけます。画面から操作できない場合は、担当者が本人確認のうえ対応します。</p>',
      suggests: [
        { label: '注文履歴を見たい', topic: 'orders' },
        { label: 'ログインできない', topic: 'account' },
        { label: '退会したい', topic: 'account' }
      ]
    },

    products: {
      id: 'products',
      q: '商品について（素材・サイズ・納期）',
      keywords: /商品|在庫|受注生産|組み立て|セット割|5%|５％|何日|いつ届|届きます/,
      html:
        '<p><b>在庫品</b>はご注文から1〜2営業日以内に発送し、最短7日でお届けします。<b>受注生産品</b>はご注文後にお作りするため、お届けまで約2〜3ヶ月です（ウッドサークルテーブルなど一部の商品は約4ヶ月）。</p>' +
        '<p>同じ商品でも<b>色・サイズによって在庫と納期が異なります</b>。商品ページの「在庫あり／受注生産」の表示と配送欄でご確認ください。</p>' +
        '<p>素材・寸法・組み立ての要否は、各商品ページの「商品仕様」に記載しています。2点以上の同時購入で5%OFFが自動適用されます。</p>',
      suggests: [
        { label: 'サイズ・寸法を知りたい', topic: 'products_size' },
        { label: '在庫と納期', topic: 'products' },
        { label: '素材について', topic: 'products_material' }
      ]
    },

    products_size: {
      id: 'products_size',
      q: 'サイズ・寸法を知りたい',
      keywords: /サイズ|寸法|大きさ|幅|奥行|高さ|設置場所|入るか|搬入|エレベーター|階段/,
      html:
        '<p>寸法は商品ページの「商品仕様」に<b>幅×奥行×高さ</b>で記載しています。設置場所の間口・エレベーターの奥行・階段の曲がりに余裕があるかもあわせてご確認ください。</p>' +
        '<p>「この商品が入るか不安」という場合は、設置場所の寸法とご検討の商品名をLINEでお送りください。担当者が搬入可否を確認します。</p>',
      suggests: [
        { label: '在庫と納期', topic: 'products' },
        { label: '開梱・設置について', topic: 'shipping' }
      ]
    },

    products_material: {
      id: 'products_material',
      q: '素材について',
      keywords: /素材|材質|木目|ラタン|レザー|ファブリック|合皮|お手入れ|耐荷重|無垢/,
      html:
        '<p>素材は商品ページの「商品仕様」に記載しています。天然素材（ラタン・無垢材など）は色味や木目に個体差があり、画像と多少異なる場合があります。</p>' +
        '<p>お手入れ方法や耐荷重など、掲載のない仕様は担当者にご確認ください。</p>',
      suggests: [
        { label: 'サイズ・寸法を知りたい', topic: 'products_size' },
        { label: '在庫と納期', topic: 'products' }
      ]
    },

    orders: {
      id: 'orders',
      q: 'ご注文・納期について',
      keywords: /注文|注文番号|注文確認|注文メール|確認メール|注文内容|納品書/,
      html:
        '<p><b>注文確認</b>：ご注文後に自動返信メールをお送りしています。届かない場合は迷惑メールフォルダをご確認のうえ、注文番号を添えてお問い合わせください。</p>' +
        '<p><b>納期</b>：在庫品は最短7日、受注生産品は約2〜3ヶ月（一部の商品は約4ヶ月）です。色・サイズで異なるため、商品ページの配送欄でご確認ください。</p>' +
        '<p><b>領収書・インボイス</b>：宛名・但し書き（例：家具代として）・送付先のメールアドレスをお知らせいただければ、担当者が発行します。適格請求書発行事業者登録番号は <b>T9010603008463</b> です。</p>' +
        '<p><b>配送日時の変更</b>：大型家具は配達希望日と時間帯（12〜15時／15〜18時／18〜21時、地域により2区分）を伺って手配します。</p>' +
        '<p><b>キャンセル・内容変更</b>：出荷前であれば承れる場合があります。注文番号とご希望の内容をご連絡ください。確定は担当者からのご案内となります。</p>',
      suggests: [
        { label: '領収書がほしい', topic: 'orders_receipt' },
        { label: '配送日時を変えたい', topic: 'orders_schedule' },
        { label: '注文をキャンセルしたい', topic: 'returns_cancel' }
      ]
    },

    orders_receipt: {
      id: 'orders_receipt',
      q: '領収書・インボイスがほしい',
      keywords: /領収書|インボイス|請求書|適格請求書|宛名/,
      html:
        '<p><b>領収書・請求書</b>は、下記をお知らせいただければ担当者が発行します。</p>' +
        '<p>・ご注文番号<br>・宛名（会社名・ご担当者名）<br>・但し書き（例：家具代として）<br>・送付先のメールアドレス</p>' +
        '<p>適格請求書発行事業者登録番号は <b>T9010603008463</b>（合同会社TINT）です。発行まで少しお時間をいただく場合があります。</p>',
      suggests: [
        { label: 'ご注文・納期について', topic: 'orders' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    orders_schedule: {
      id: 'orders_schedule',
      q: '配送日時を変えたい',
      keywords: /日時.*(変更|変え)|配送日.*(変更|変え)|配達.*(変更|変え)|時間帯|日付.*変|届け先|住所.*変|お届け先/,
      html:
        '<p>お届け日時のご希望は、<b>配達希望日</b>と<b>時間帯</b>をお知らせください。大型家具（家財宅配便）は <b>12〜15時／15〜18時／18〜21時</b> の3区分（地域により2区分）で手配します。</p>' +
        '<p>お届け先の変更は、発送前であれば承れる場合があります。ご注文番号と新しいご住所を添えてご連絡ください。確定は担当者からのご案内となります。</p>',
      suggests: [
        { label: 'ご注文・納期について', topic: 'orders' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    payment: {
      id: 'payment',
      q: 'お支払いについて',
      keywords: /支払|お支払|決済|クレカ|クレジット|カード|コンビニ|ペイディ|Paidy|ペイディー|PayPay|メルペイ|Amazon ?Pay|Shop ?Pay|Apple ?Pay|Google ?Pay|後払い|あと払い/,
      html:
        '<p>お支払い方法は、クレジットカード（Visa / Mastercard / American Express / JCB）、Shop Pay、Apple Pay、Google Pay、コンビニ決済、あと払い（Paidy）、PayPay、メルペイ、Amazon Pay です。</p>' +
        '<p>コンビニ決済は<b>ご注文から7日以内</b>のお支払いで、決済手数料220円（税込）がかかります。</p>' +
        '<p>LINE登録クーポン<b>「LINE2000」</b>は2,000円OFF（税込3万円以上のご注文・お一人1回）。自動適用の「2点以上で5%OFF」とは併用できないため、2点以上では有利な方だけが適用されます。</p>',
      suggests: [
        { label: 'クーポンについて', topic: 'payment_coupon' },
        { label: 'コンビニで払いたい', topic: 'payment' },
        { label: 'ご注文・納期について', topic: 'orders' }
      ]
    },

    payment_coupon: {
      id: 'payment_coupon',
      q: 'クーポンについて',
      keywords: /クーポン|LINE2000|割引コード|プロモ|値引き/,
      html:
        '<p>クーポンコードは<b>「LINE2000」</b>です。<b>2,000円OFF</b>（税込3万円以上のご注文・お一人1回）で、お会計の「割引コード」欄に入力してください。</p>' +
        '<p>自動適用の「2点以上で5%OFF」とは併用できません。2点以上のご注文では、自動的に有利な方だけが適用されます。</p>' +
        '<p>コードが通らない場合は、エラー画面とご注文内容を添えてLINEからご連絡ください。</p>',
      suggests: [
        { label: 'お支払いについて', topic: 'payment' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    shipping: {
      id: 'shipping',
      q: '配送・送料について',
      keywords: /送料|配送|送り|発送|家財宅配便|佐川|追跡|伝票|開梱|設置|沖縄|離島|運送|送ってもら/,
      html:
        '<p><b>大型家具は家財宅配便</b>、<b>小物は佐川急便</b>でお届けします。追跡番号は出荷時にメールでご案内します。</p>' +
        '<p>送料は<b>梱包サイズ×お届け先の都道府県</b>で決まり、商品ページの「送料」欄でご確認いただけます（目安：関東で120cm 2,250円／180cm 3,130円／240cm 5,500円〜）。沖縄・離島は別途お見積りです。</p>' +
        '<p>お届け時間帯は12〜15時／15〜18時／18〜21時の3区分（地域により2区分）。時間帯を指定できない地域は、当日の午前10時までに配送業者から訪問時刻（約2時間幅）のご連絡があります。</p>' +
        '<p>開梱・設置は家財宅配便で承ります（<b>1台につき1,000円</b>）。基本は玄関渡しです。</p>',
      suggests: [
        { label: '送料を知りたい', topic: 'shipping' },
        { label: '開梱・設置について', topic: 'shipping' },
        { label: '配達時間帯を指定したい', topic: 'orders_schedule' }
      ]
    },

    returns: {
      id: 'returns',
      q: '返品・交換・キャンセルについて',
      keywords: /返品|交換|返送|30日|返したい/,
      html:
        '<p>商品到着後<b>30日以内</b>であれば、理由を問わず返品・返金を承ります（商品の状態・使用の有無は問いません）。<b>事前のご連絡が必要</b>です。</p>' +
        '<p>お客様都合の返送料はお客様負担、不良品・誤配送の場合は当社負担です。大型家具は当社で集荷を手配します。</p>' +
        '<p>返金は、当社の返信から3営業日以内を目処に処理し、お支払いに使われた決済方法へ返金されます（入金まで最大10営業日程度）。</p>' +
        '<p><b>破損・傷・部品不足・お届けのトラブル</b>は、お写真と注文番号をご用意のうえ、LINEまたはお問い合わせフォームからご連絡ください。担当者が確認のうえ対応をご案内します。</p>',
      suggests: [
        { label: '返品したい', topic: 'returns' },
        { label: '返金のタイミング', topic: 'returns_refund' },
        { label: '破損・部品不足の連絡', topic: 'serious' }
      ]
    },

    returns_refund: {
      id: 'returns_refund',
      q: '返金のタイミング',
      keywords: /返金|いつ返|返ってこ/,
      html:
        '<p>返金は、当社の返信から<b>3営業日以内</b>を目処に処理します。処理後はメールでご案内し、お支払いに使われた決済方法へ返金されます（入金まで最大<b>10営業日</b>程度かかる場合があります）。</p>' +
        '<p>10営業日を過ぎても反映がない場合は、カード会社など決済手段側の処理の問題となるため、決済会社へご確認いただく流れになります。</p>',
      suggests: [
        { label: '返品・交換について', topic: 'returns' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    returns_cancel: {
      id: 'returns_cancel',
      q: '注文をキャンセルしたい',
      keywords: /キャンセル|取り消し|取消/,
      html:
        '<p>ご注文のキャンセルは、<b>出荷前</b>であれば承れる場合があります。ご注文番号をお知らせください。</p>' +
        '<p>出荷後のお届け前の場合は、返品（当社で集荷を手配）としてご案内します。返金は返信から3営業日以内を目処に処理し、入金まで最大10営業日程度かかる場合があります。</p>' +
        '<p>キャンセルの可否・返金額の確定は担当者からのご案内となります。</p>',
      suggests: [
        { label: '返品・交換について', topic: 'returns' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    other: {
      id: 'other',
      q: 'その他（法人・取り置き・連絡先）',
      keywords: /法人|見積|お見積|取り置き|取置|問い合わせ|お問合せ|連絡先|電話|営業時間|ショールーム|サンプル|大量|B2B|請求/,
      html:
        '<p><b>法人・大量注文・お見積り</b>は、<a href="/pages/business">法人のお客様ページ</a>からご相談ください。数量・納期・納品先を伺って担当者がお見積りします。</p>' +
        '<p><b>お取り置き</b>は1週間程度承ります。</p>' +
        '<p><b>お問い合わせ</b>：LINE <a href="https://line.me/R/ti/p/@505xknxn">@505xknxn</a> ／ <a href="https://form.run/@main-1626080086">サイト内フォーム</a>。電話での対応は行っておりません。営業時間は平日10:00〜18:00（土日祝休）、返信は72時間以内を目処にしています。</p>',
      suggests: [
        { label: '法人の見積をお願いしたい', topic: 'other' },
        { label: '取り置きしたい', topic: 'other' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    },

    serious: {
      id: 'serious',
      q: '破損・部品不足・お届けのトラブル',
      keywords: /破損|傷|キズ|きず|不良|部品不足|部品が足り|部品がな|付属品|欠品|届かない|届きません|まだ届|届いていません|壊れ|故障|誤配送|違う商品|クレーム|返金され|返金まだ|返金の連絡|届いた商品/,
      html:
        '<p>ご不便をおかけし、誠に申し訳ございません。お届けした商品の不備・破損、またはお届けのトラブルとのこと、ご心配をおかけしております。</p>' +
        '<p>お手数ですが、下記をご用意のうえ、LINEまたはお問い合わせフォームからご連絡ください。</p>' +
        '<p>・ご注文番号<br>・商品名と色（サイズ）<br>・該当箇所の写真（商品全体＋不備箇所のアップ）<br>・梱包材（ダンボール）の状態がわかる写真</p>' +
        '<p>お送りいただいた内容を確認のうえ、メーカーへ確認し、交換・返品の対応を担当者より改めてご案内いたします。その場で返金・交換の可否をお約束することはできかねます。</p>',
      suggests: [
        { label: '返品・交換について', topic: 'returns' },
        { label: 'LINEで担当者に相談', human: true }
      ]
    }
  };

  /* キーワードの判定順（先に当たったものが勝ち） */
  var ORDER = [
    'serious',
    'account',
    'products_size',
    'products_material',
    'payment_coupon',
    'orders_receipt',
    'orders_schedule',
    'returns_cancel',
    'returns_refund',
    'returns',
    'shipping',
    'payment',
    'other',
    'products',
    'orders'
  ];

  var FALLBACK = {
    id: 'fallback',
    html:
      '<p>この内容は担当者が確認してご案内します。平日10:00〜18:00に順次お返事します。いちばん下の「LINEで担当者に相談」から、いまのご質問をそのまま送れます。</p>',
    suggests: [
      { label: 'ご注文・納期について', topic: 'orders' },
      { label: '配送・送料について', topic: 'shipping' },
      { label: 'LINEで担当者に相談', human: true }
    ]
  };

  /* ---------------- ユーティリティ ---------------- */

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

  /* Shopifyのプレビューバー（画面下に固定）の高さぶん、シートを上へずらす */
  function barOffset() {
    var el = document.getElementById('PBarNextFrameWrapper') || document.getElementById('preview-bar-iframe');
    if (!el) return 0;
    var r = el.getBoundingClientRect();
    return r.height > 4 ? Math.round(r.height) : 0;
  }

  /* Channel Talk（#ch-plugin / z-index 10,000,000）の吹き出し制御。
     ChannelIO が無い・APIが変わってもAI接客は止めない。 */
  function channelTalk(command) {
    try {
      if (typeof window.ChannelIO === 'function') {
        window.ChannelIO(command);
      }
    } catch (e) {
      /* noop */
    }
  }

  /* ---------------- 回答の選択 ---------------- */

  function route(text) {
    var q = String(text || '');
    for (var i = 0; i < ORDER.length; i++) {
      var t = TOPICS[ORDER[i]];
      if (t && t.keywords && t.keywords.test(q)) return t;
    }
    return FALLBACK;
  }

  /* ---------------- 吹き出し ---------------- */

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

  function scrollBottom(thread) {
    if (!thread) return;
    window.requestAnimationFrame(function () {
      thread.scrollTop = thread.scrollHeight;
    });
  }

  /* ---------------- シート ---------------- */

  function applyOffset(ui) {
    if (!ui.sheet) return;
    var off = barOffset();
    var vv = window.visualViewport;
    if (vv && window.innerHeight - vv.height > 120) {
      off += Math.round(window.innerHeight - vv.height);
    }
    ui.sheet.style.setProperty('--j6ac-bar-offset', off + 'px');
  }

  function renderGreeting(ui) {
    if (ui.greeted || !ui.thread) return;
    ui.greeted = true;
    var dateRow = document.createElement('div');
    dateRow.className = 'j6ac-line__date';
    dateRow.innerHTML = '<span>' + dateLabel() + '</span>';
    ui.thread.appendChild(dateRow);
    appendAi(
      ui.thread,
      '<p>' + esc(ui.data.greeting || 'こんにちは。6JOHANのAIコンシェルジュです。') + '</p>'
    );
    if (ui.data.greetingSub) {
      appendAi(ui.thread, '<p>' + esc(ui.data.greetingSub) + '</p>');
    }
  }

  function openSheet(ui, trigger) {
    if (!ui.sheet) return;
    if (ui.open) {
      scrollBottom(ui.thread);
      return;
    }
    ui.lastTrigger = trigger || ui.lastTrigger;
    renderGreeting(ui);
    applyOffset(ui);

    ui.sheet.hidden = false;
    ui.sheet.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(function () {
      ui.sheet.classList.add('is-open');
    });
    ui.root.classList.add('is-open');
    ui.open = true;
    ui.launcher && ui.launcher.setAttribute('aria-expanded', 'true');
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
    track('ai_sheet_open', { surface: 'global', page_type: ui.data.pageType, page: ui.data.pageTitle });
  }

  function closeSheet(ui) {
    if (!ui.sheet || !ui.open) return;
    ui.open = false;
    ui.sheet.classList.remove('is-open');
    ui.sheet.classList.add('is-closing');
    ui.sheet.setAttribute('aria-hidden', 'true');
    ui.root.classList.remove('is-open');
    ui.launcher && ui.launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('j6ac-lock');
    if (ui.data.channelMode === 'keep') {
      channelTalk('showChannelButton');
    } else {
      channelTalk('hideChannelButton');
    }
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
    track('ai_sheet_close', { surface: 'global', page_type: ui.data.pageType });
  }

  /* LINE相談のリンクに「直前の質問」を入れる
     LINE公式の書式: https://line.me/R/oaMessage/{ID}/?{URLエンコードした文章}
     （?text= は入力欄に「text=…」がそのまま入るため使わない） */
  function setHumanHref(ui, question) {
    if (!ui.human) return;
    var base = ui.data.lineUrl || 'https://line.me/R/oaMessage/@505xknxn/';
    var text = '6JOHANについて相談' + (question ? '：' + question : '');
    var url = base + (base.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent(text.slice(0, 240));
    ui.human.setAttribute('href', url);
  }

  function answerHtml(answer) {
    return answer.html;
  }

  /* 回答の下に「次に聞かれそうなこと」を並べる（会話を止めない） */
  function appendSuggests(ui, answer) {
    if (!answer.suggests || !answer.suggests.length) return;
    /* 直前の回答の候補は消して、いまの回答の候補だけを残す（吹き出し履歴を汚さない） */
    ui.thread.querySelectorAll('.j6ag-suggests').forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
    var wrap = document.createElement('div');
    wrap.className = 'j6ag-suggests';
    answer.suggests.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'j6ag-suggest';
      b.textContent = s.label;
      b.addEventListener('click', function () {
        if (s.human) {
          track('ai_human_click', { surface: 'global', source: 'suggest', page_type: ui.data.pageType });
          /* 固定の相談リンク（直前の質問入り・別タブ）をそのまま押す */
          if (ui.human) ui.human.click();
          return;
        }
        track('ai_chip_click', {
          chip: s.topic,
          source: 'suggest',
          surface: 'global',
          page_type: ui.data.pageType
        });
        askTopic(ui, s.topic, null, 'suggest');
      });
      wrap.appendChild(b);
    });
    ui.thread.appendChild(wrap);
    scrollBottom(ui.thread);
  }

  /* 1往復（質問→回答）をLINE風に積む */
  function appendTurn(ui, question, answer, source) {
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
      appendSuggests(ui, answer);
      track('ai_answer_show', {
        answer_id: answer.id,
        surface: 'global',
        page_type: ui.data.pageType,
        source: source || ''
      });
    }, 420);
  }

  function askTopic(ui, topicId, trigger, source) {
    var t = TOPICS[topicId] || FALLBACK;
    openSheet(ui, trigger);
    appendTurn(ui, t.q || '', t, source || 'chip');
  }

  function askText(ui, text, source) {
    var t = route(text);
    openSheet(ui, ui.input);
    appendTurn(ui, text, t, source || 'input');
  }

  /* ---------------- 初期化 ---------------- */

  function init(root) {
    var dataNode = root.querySelector('[data-j6ag-data]');
    var data = {};
    if (dataNode) {
      try {
        data = JSON.parse(dataNode.textContent);
      } catch (e) {
        data = {};
      }
    }

    var sheet = root.querySelector('[data-j6ag-sheet]');
    if (!sheet) return;

    var ui = {
      root: root,
      data: data,
      sheet: sheet,
      panel: sheet.querySelector('[data-j6ag-panel]'),
      thread: sheet.querySelector('[data-j6ag-thread]'),
      launcher: root.querySelector('[data-j6ag-open]'),
      human: sheet.querySelector('[data-j6ag-human]'),
      input: sheet.querySelector('[data-j6ag-input]'),
      form: sheet.querySelector('[data-j6ag-form]'),
      open: false,
      greeted: false,
      lastTrigger: null
    };

    /* テーマ共通CSS（div:empty{display:none} 等）で暗幕が消されている場合の保険 */
    var scrim = sheet.querySelector('.j6ac-sheet__scrim');
    if (scrim && window.getComputedStyle(scrim).display === 'none') {
      scrim.style.setProperty('display', 'block', 'important');
    }

    /* 親の overflow / transform に邪魔されないよう body 直下へ移す */
    if (sheet.parentNode !== document.body) {
      document.body.appendChild(sheet);
    }

    setHumanHref(ui, null);
    if (data.channelMode !== 'keep') {
      hideChannelLauncher();
    }

    /* プレビューバー（Shopifyの下固定バー）の高さをランチャーとシートに逃がす */
    function placeLauncher() {
      root.style.setProperty('--j6ag-bar-offset', barOffset() + 'px');
    }
    placeLauncher();
    window.setTimeout(placeLauncher, 1200);
    window.setTimeout(placeLauncher, 3000);
    window.addEventListener('load', placeLauncher);

    /* ランチャー */
    ui.launcher &&
      ui.launcher.addEventListener('click', function () {
        track('ai_global_launcher_click', { page_type: data.pageType, page: data.pageTitle });
        if (ui.open) {
          closeSheet(ui);
        } else {
          openSheet(ui, ui.launcher);
        }
      });

    /* カテゴリチップ */
    sheet.querySelectorAll('[data-j6ag-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var id = chip.getAttribute('data-j6ag-chip');
        track('ai_chip_click', {
          chip: id,
          source: 'foot',
          surface: 'global',
          page_type: data.pageType
        });
        askTopic(ui, id, chip, 'chip');
      });
    });

    /* 自由入力 */
    if (ui.form) {
      ui.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (ui.input && ui.input.value ? ui.input.value : '').trim();
        if (!text) {
          if (ui.input) ui.input.focus();
          return;
        }
        track('ai_question_submit', {
          surface: 'global',
          page_type: data.pageType,
          answer_id: route(text).id,
          question_length: text.length,
          question: text.slice(0, 120),
          source: 'input'
        });
        if (ui.input) ui.input.value = '';
        askText(ui, text, 'input');
        if (ui.input && !isMobile()) ui.input.focus();
      });
    }

    /* 閉じる（暗幕・×） */
    sheet.querySelectorAll('[data-j6ag-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        closeSheet(ui);
      });
    });

    /* LINE相談・ガイドの計測 */
    sheet.addEventListener('click', function (e) {
      var human = e.target.closest('[data-j6ag-human]');
      if (human) {
        track('ai_human_click', {
          surface: 'global',
          source: 'foot',
          page_type: data.pageType,
          question: (document.querySelector('[data-j6ag-input]') || {}).value || ''
        });
      }
      var guide = e.target.closest('[data-j6ag-guide]');
      if (guide) {
        track('ai_guide_click', { surface: 'global', page_type: data.pageType });
      }
    });

    /* 画面サイズ・ソフトキーボードの変化に追随 */
    window.addEventListener('resize', function () {
      placeLauncher();
      if (ui.open) applyOffset(ui);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (ui.open) applyOffset(ui);
        scrollBottom(ui.thread);
      });
    }

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

    /* 表示計測（ランチャーが見えたら1回） */
    if ('IntersectionObserver' in window && ui.launcher) {
      var seen = false;
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !seen) {
              seen = true;
              track('ai_global_view', { page_type: data.pageType, page: data.pageTitle });
              io.disconnect();
            }
          });
        },
        { threshold: 0.5 }
      );
      io.observe(ui.launcher);
    }

    /* 検証・デバッグ用のフック（表示には影響しない） */
    window.j6ag = {
      open: function () {
        openSheet(ui, ui.launcher);
      },
      close: function () {
        closeSheet(ui);
      },
      ask: function (topicId) {
        askTopic(ui, topicId, ui.launcher, 'debug');
      },
      askText: function (text) {
        askText(ui, text, 'debug');
      },
      route: route,
      ui: ui
    };
  }

  /* Channel Talk のランチャーを隠す（何度かリトライ：プラグインの読み込みが遅れるため） */
  function hideChannelLauncher() {
    [0, 400, 1200, 2500, 5000].forEach(function (ms) {
      window.setTimeout(function () {
        channelTalk('hideChannelButton');
      }, ms);
    });
    window.addEventListener('load', function () {
      window.setTimeout(function () {
        channelTalk('hideChannelButton');
      }, 300);
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    var root = document.querySelector('[data-j6ag]');
    if (root) init(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
