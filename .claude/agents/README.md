# 6JOHAN Claude Code エージェント

このディレクトリは Claude Code のサブエージェント定義です。チーム共有のため Git 管理しています。

## 使い方

Claude Code で `@<エージェント名>` で呼び出すか、Claude が文脈に応じて自動で起動します。

## エージェント一覧

| エージェント | 用途 | 編集権限 |
|---|---|---|
| `shopify-liquid-dev` | Liquid セクション/スニペット/テンプレート実装 | 編集可 |
| `theme-reviewer` | コミット/push 前のコードレビュー | 読み取り専用 |
| `git-shopify-safe` | pull→push の安全な git 運用、コンフリクト対応 | bash 実行可 |
| `seo-writer-jp` | 商品説明・ブログ・メタ情報の日本語SEOライティング | 編集可 |
| `cvr-optimizer` | CVR 改善案の提案（実装はしない） | 読み取り専用 |
| `email-template-dev` | Shopify 通知メールテンプレ作成 | 編集可 |
| `product-data-curator` | 商品データと表示ロジックの整合性監査 | 編集可（テーマ側のみ） |
| `image-asset-manager` | picture タグ、バナー画像、ヒーロー枠 | 編集可 |
| `content-publisher` | お知らせ/ジャーナル/お客様の声の更新 | 編集可 |

## 設計方針

- すべてのエージェントは作業前に `CLAUDE.md` を読む
- 編集系エージェントは `--6j-` プレフィックス、デザイントークン、Dawn上書き禁止ルールを遵守
- 読み取り専用エージェント（`theme-reviewer`, `cvr-optimizer`）はファイルを変更せず提案だけ行う
- git 操作は `git-shopify-safe` に集約。他のエージェントは git コマンドを実行しない

## 追加・修正

エージェントを追加する場合は frontmatter（`name`, `description`, `tools`）と本文の役割定義を含めて `.md` ファイルを追加し、本 README に1行追加してください。
