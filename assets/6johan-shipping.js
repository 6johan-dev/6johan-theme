/*
  6JOHAN 送料テーブル（単一ソース）
  商品ページの送料目安（snippets/6johan-shipping-estimate.liquid）と
  カートの送料目安（snippets/6johan-cart-summary.liquid）が共用する。

  前提（2026-10 時点の配送プロファイル）:
    - 商品メタフィールド custom._new に梱包サイズ（120/140/160/180/200/220/240/260）
    - 送料はサイズ×エリア。同一商品の複数点は 4点目までを加算（5点以上は4点分）
    - 沖縄県はプロファイルに料金がないため「個別案内」
  表を変えるときは、このファイルだけを直せば両方に反映される。
*/
(function () {
  if (window.SixjShipping) return;

  var STORAGE_KEY = '6johan_pref';
  var MAX_MULTIPLIER = 4;

  var TABLE = {
    120: { flat: 2250 },
    140: { flat: 2500 },
    160: { flat: 2750 },
    180: { hokkaido: 3750, tohoku: 3440, kanto: 3130, chubu: 3500, kansai: 3750, chushikoku: 4000, kyushu: 4380 },
    200: { hokkaido: 4750, tohoku: 4000, kanto: 3630, chubu: 4130, kansai: 4380, chushikoku: 4750, kyushu: 5130 },
    220: { hokkaido: 5750, tohoku: 4880, kanto: 4380, chubu: 5000, kansai: 5250, chushikoku: 5750, kyushu: 6250 },
    240: { hokkaido: 7750, tohoku: 6500, kanto: 5500, chubu: 6250, kansai: 6500, chushikoku: 7000, kyushu: 7750 },
    260: { hokkaido: 10000, tohoku: 8380, kanto: 6750, chubu: 7500, kansai: 7940, chushikoku: 8500, kyushu: 10000 }
  };

  var AREA_LABEL = {
    hokkaido: '北海道',
    tohoku: '東北',
    kanto: '関東',
    chubu: '信越・東海・北陸',
    kansai: '関西',
    chushikoku: '四国・中国',
    kyushu: '九州'
  };

  var PREF_AREA = {
    '北海道': 'hokkaido',
    '青森県': 'tohoku', '秋田県': 'tohoku', '岩手県': 'tohoku', '宮城県': 'tohoku', '山形県': 'tohoku', '福島県': 'tohoku',
    '茨城県': 'kanto', '栃木県': 'kanto', '群馬県': 'kanto', '埼玉県': 'kanto', '千葉県': 'kanto', '東京都': 'kanto', '神奈川県': 'kanto',
    '山梨県': 'chubu', '新潟県': 'chubu', '長野県': 'chubu', '富山県': 'chubu', '岐阜県': 'chubu', '福井県': 'chubu', '石川県': 'chubu', '静岡県': 'chubu', '愛知県': 'chubu',
    '大阪府': 'kansai', '京都府': 'kansai', '兵庫県': 'kansai', '滋賀県': 'kansai', '三重県': 'kansai', '奈良県': 'kansai', '和歌山県': 'kansai',
    '岡山県': 'chushikoku', '広島県': 'chushikoku', '鳥取県': 'chushikoku', '島根県': 'chushikoku', '山口県': 'chushikoku',
    '香川県': 'chushikoku', '徳島県': 'chushikoku', '愛媛県': 'chushikoku', '高知県': 'chushikoku',
    '福岡県': 'kyushu', '佐賀県': 'kyushu', '長崎県': 'kyushu', '大分県': 'kyushu', '熊本県': 'kyushu', '宮崎県': 'kyushu', '鹿児島県': 'kyushu'
    // 沖縄県は配送プロファイルに料金なし → 個別案内
  };

  function yen(n) {
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  }

  function lookupFee(size, pref) {
    var row = TABLE[size];
    if (!row) return null;
    if (row.flat != null) return { fee: row.flat, area: '全国一律' };
    var area = PREF_AREA[pref];
    if (!area || row[area] == null) return null;
    return { fee: row[area], area: AREA_LABEL[area] };
  }

  function readPref() {
    var v = null;
    try { v = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!v) return '東京都';
    if (v === '沖縄県' || PREF_AREA[v]) return v;
    return '東京都';
  }

  function writePref(pref) {
    try { window.localStorage.setItem(STORAGE_KEY, pref); } catch (e) {}
  }

  window.SixjShipping = {
    STORAGE_KEY: STORAGE_KEY,
    MAX_MULTIPLIER: MAX_MULTIPLIER,
    TABLE: TABLE,
    AREA_LABEL: AREA_LABEL,
    PREF_AREA: PREF_AREA,
    yen: yen,
    lookupFee: lookupFee,
    readPref: readPref,
    writePref: writePref
  };
})();
