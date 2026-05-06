# 6JOHAN — Shopifyテーマ開発

## プロジェクト概要
北欧インスパイア家具ブランド「6JOHAN」のShopifyストア。Dawn テーマベースのフルカスタマイズ。

- **リポジトリ:** `https://github.com/6johan-dev/6johan-theme.git`
- **ローカルパス:** `~/6johan-theme/`
- **デプロイ:** `git push origin main` → Shopify自動反映

## Git運用ルール（重要）
必ず `git pull origin main --no-rebase` → 編集 → `git push origin main` の順序。Shopifyカスタマイザーが自動コミットするため pull 必須。

## macOS注意点
- `sed -i ''`（Linux式 `sed -i` は不可）
- zsh複数行コマンド内の `#` コメントはエラーになる。スクリプトファイル化して実行
- CSS stylesheet_tag 追加は theme.liquid の行番号指定で挿入

## デザインシステム
| 用途 | 値 |
|------|-----|
| 背景 | `#FFFFFF` |
| テキスト | `#292724` |
| CTA | `#6B5B4F` |
| 即納バッジ | `#5E7A5E` |
| 残りわずか | `#C4956A` |
| セクション区切り | `#F2F2F0`（8px帯） |
| CSS変数プレフィックス | `--6j-` |

フォント: システムフォントスタック（Google Fonts廃止済み）
--6j-font-heading / --6j-font-body 共通:
-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic Medium", "Yu Gothic", "Meiryo", sans-serif

## ビジネスルール
- 在庫あり: 7日以内発送（動的日付表示）
- 受注生産: 約3ヶ月
- 返品: 30日間
- 組み立て判定: メタフィールド `custom.is_assembly`（boolean）
- ターゲット: ファミリー層 > 一人暮らし > 法人

## 過去の教訓
- Shopifyカスタマイザー自動コミット → push前に必ず pull
- Dawn組み込みボタンのCSS上書きは効かない → カスタマイザー設定を使う
- バックオーダーバッジはコレクションカードで意図的に非表示（CVR影響）
- JSON-LD: 6johan-track-view の render は構造化データタグの外に置く
- フォント参照: .liquid だけでなく assets/*.css にも直書きあり。grepは --include="*.css" も含める

## 作業スタイル
- 変更はバッチでまとめて1回のpush
- スクリーンショットで結果確認 → 修正を繰り返す
- 率直なフィードバックを好む

## 重要ルール
- git push は自動で行わない。変更内容を説明して承認を待つこと
- main-product.liquid や theme.liquid の構造変更は必ず差分を提示してレビューを受けること
