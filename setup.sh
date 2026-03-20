#!/bin/bash
# =====================================================
# 6JOHAN Dawn Theme Setup Script
# =====================================================
# 使い方:
#   1. GitHub で Shopify/dawn をフォーク
#   2. フォークしたリポジトリをクローン
#   3. この 6johan-github フォルダの中身をクローン先にコピー
#   4. クローン先で ./setup.sh を実行
#   5. git push
#   6. Shopify → テーマ → GitHub から接続
# =====================================================

set -e

echo "🏠 6JOHAN Dawn Theme Setup"
echo "=========================="

# Check we're in a Dawn theme directory
if [ ! -f "layout/theme.liquid" ]; then
  echo "❌ Error: layout/theme.liquid が見つかりません。"
  echo "   Dawnテーマのルートディレクトリで実行してください。"
  exit 1
fi

echo "✅ Dawnテーマを検出しました"
echo ""
echo "📁 カスタムファイルをコピー中..."

# Assets
cp 6johan-files/assets/6johan-custom.css assets/
echo "  ✅ assets/6johan-custom.css"

# Snippets
for f in 6johan-files/snippets/*.liquid; do
  filename=$(basename "$f")
  cp "$f" "snippets/$filename"
  echo "  ✅ snippets/$filename"
done

# Sections
for f in 6johan-files/sections/*.liquid; do
  filename=$(basename "$f")
  cp "$f" "sections/$filename"
  echo "  ✅ sections/$filename"
done

# Templates
for f in 6johan-files/templates/*.json; do
  filename=$(basename "$f")
  cp "$f" "templates/$filename"
  echo "  ✅ templates/$filename"
done

# Patch theme.liquid
echo ""
echo "📝 layout/theme.liquid を修正中..."

# Backup
cp layout/theme.liquid layout/theme.liquid.bak
echo "  ✅ バックアップ作成: theme.liquid.bak"

# Add fonts and CSS before </head>
if ! grep -q "6johan-custom" layout/theme.liquid; then
  sed -i '/<\/head>/i \    <!-- 6JOHAN: Google Fonts -->\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400\&family=Noto+Sans+JP:wght@300;400;500;600\&family=Noto+Serif+JP:wght@300;400;500\&display=swap" rel="stylesheet">\n    <!-- 6JOHAN: Custom Styles -->\n    <link rel="stylesheet" href="{{ '"'"'6johan-custom.css'"'"' | asset_url }}?v=1">' layout/theme.liquid
  echo "  ✅ Fonts + CSS 追加完了"
else
  echo "  ⏭️  Fonts + CSS は既に追加済み"
fi

# Add trust bar before footer
if ! grep -q "6johan-global-trust-bar" layout/theme.liquid; then
  sed -i "/{% section 'footer' %}/i \    {% section '6johan-global-trust-bar' %}" layout/theme.liquid
  echo "  ✅ 信頼バー追加完了"
else
  echo "  ⏭️  信頼バーは既に追加済み"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "次のステップ:"
echo "  1. git add -A"
echo "  2. git commit -m 'Add 6JOHAN customizations'"  
echo "  3. git push origin main"
echo "  4. Shopify管理画面 → テーマ → テーマを追加 → GitHubから接続"
echo ""
