#!/bin/bash
set -e

echo "=== 6JOHAN Feature Template Deploy ==="
echo ""

# Check we're in the right directory
if [ ! -d ".git" ]; then
  echo "Error: .git not found. Run this from ~/6johan-theme/"
  exit 1
fi

echo "1/4 Pulling latest from origin..."
git pull origin main --no-rebase

echo "2/4 Creating files..."


# --- assets/6johan-feature.css ---
cat > assets/6johan-feature.css << 'EOF_CSS'
/* ============================================
   6JOHAN Feature Page — Editorial Template
   ============================================ */

/* --- Hero --- */
.feature-hero {
  position: relative;
  overflow: hidden;
}
.feature-hero__image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
}
.feature-hero__image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.feature-hero__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%);
}
.feature-hero__subtitle {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.15em;
  margin-bottom: 8px;
}
.feature-hero__title {
  font-family: 'Noto Serif JP', 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 400;
  color: #fff;
  line-height: 1.5;
  letter-spacing: 0.08em;
}

@media (min-width: 750px) {
  .feature-hero__image-wrap { aspect-ratio: 21 / 9; }
  .feature-hero__subtitle { font-size: 14px; }
  .feature-hero__title { font-size: 36px; }
}

/* --- Lead / Introduction --- */
.feature-lead {
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px 32px;
}
.feature-lead__text {
  font-size: 14px;
  line-height: 2;
  color: #292724;
}
.feature-lead__text p { margin-bottom: 1em; }
.feature-lead__text p:last-child { margin-bottom: 0; }

/* TOC */
.feature-toc {
  margin-top: 32px;
  border: 1px solid #E8E5DC;
  border-radius: 4px;
  overflow: hidden;
}
.feature-toc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  background: #FAFAF7;
}
.feature-toc__header-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #292724;
}
.feature-toc__header-label svg {
  width: 18px;
  height: 18px;
  color: #6B5B4F;
}
.feature-toc__toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}
.feature-toc__toggle svg {
  width: 16px;
  height: 16px;
  color: #292724;
}
.feature-toc[open] .feature-toc__toggle { transform: rotate(180deg); }
.feature-toc__list {
  list-style: none;
  padding: 0 20px 16px;
  margin: 0;
}
.feature-toc__item {
  border-top: 1px solid #F2F2F0;
}
.feature-toc__item:first-child { border-top: none; }
.feature-toc__link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 14px;
  color: #292724;
  text-decoration: none;
  transition: color 0.2s;
}
.feature-toc__link:hover { color: #6B5B4F; }
.feature-toc__link::before {
  content: '▸';
  color: #6B5B4F;
  font-size: 11px;
}

/* --- Chapter --- */
.feature-chapter {
  padding: 0 0 48px;
}
.feature-chapter + .feature-chapter {
  border-top: 8px solid #F2F2F0;
}
.feature-chapter__heading {
  padding: 40px 20px 20px;
  max-width: 680px;
  margin: 0 auto;
}
.feature-chapter__number {
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  color: #6B5B4F;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.feature-chapter__title {
  font-family: 'Noto Serif JP', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  color: #292724;
  line-height: 1.5;
}
.feature-chapter__hero {
  width: 100%;
  margin-bottom: 0;
}
.feature-chapter__hero img {
  width: 100%;
  height: auto;
  display: block;
}
.feature-chapter__body {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 20px 0;
  font-size: 14px;
  line-height: 2;
  color: #292724;
}
.feature-chapter__body p { margin-bottom: 1em; }
.feature-chapter__body p:last-child { margin-bottom: 0; }

@media (min-width: 750px) {
  .feature-chapter__title { font-size: 26px; }
}

/* --- Product Item (inline card) --- */
.feature-product-item {
  max-width: 680px;
  margin: 28px auto 0;
  padding: 0 20px;
}
.feature-product-item__sub-heading {
  font-size: 16px;
  font-weight: 500;
  color: #292724;
  line-height: 1.6;
  margin-bottom: 12px;
  padding-left: 14px;
  border-left: 3px solid #6B5B4F;
}
.feature-product-item__image {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}
.feature-product-item__image img {
  width: 100%;
  height: auto;
  display: block;
}
.feature-product-item__description {
  font-size: 14px;
  line-height: 2;
  color: #292724;
  margin-bottom: 16px;
}
.feature-product-item__description p { margin-bottom: 1em; }
.feature-product-item__description p:last-child { margin-bottom: 0; }

/* Product Card (LOWYA-style inline) */
.feature-product-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #E8E5DC;
  border-radius: 4px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s;
}
.feature-product-card:hover {
  border-color: #6B5B4F;
}
.feature-product-card__thumb {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
  background: #F2F2F0;
}
.feature-product-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.feature-product-card__info {
  flex: 1;
  min-width: 0;
}
.feature-product-card__name {
  font-size: 13px;
  font-weight: 400;
  color: #292724;
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feature-product-card__price {
  font-size: 16px;
  font-weight: 500;
  color: #292724;
  margin-bottom: 4px;
}
.feature-product-card__price-compare {
  font-size: 12px;
  color: #8A8A7A;
  text-decoration: line-through;
  margin-right: 8px;
}
.feature-product-card__link-text {
  font-size: 12px;
  color: #6B5B4F;
}

/* --- Feature Grid (product listing) --- */
.feature-grid {
  border-top: 8px solid #F2F2F0;
  padding: 40px 20px 48px;
}
.feature-grid__header {
  max-width: 680px;
  margin: 0 auto 24px;
}
.feature-grid__title {
  font-family: 'Noto Serif JP', 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  color: #292724;
  line-height: 1.5;
  margin-bottom: 8px;
}
.feature-grid__description {
  font-size: 14px;
  line-height: 1.8;
  color: #292724;
}
.feature-grid__products {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 680px;
  margin: 0 auto;
}
.feature-grid__card {
  text-decoration: none;
  color: inherit;
}
.feature-grid__card-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 3px;
  overflow: hidden;
  background: #F2F2F0;
  margin-bottom: 8px;
}
.feature-grid__card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.feature-grid__card-name {
  font-size: 12px;
  color: #292724;
  line-height: 1.5;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feature-grid__card-price {
  font-size: 14px;
  font-weight: 500;
  color: #292724;
}
.feature-grid__card-price-compare {
  font-size: 11px;
  color: #8A8A7A;
  text-decoration: line-through;
  margin-right: 6px;
}
.feature-grid__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 680px;
  margin: 28px auto 0;
  padding: 14px 24px;
  border: 1px solid #292724;
  background: transparent;
  color: #292724;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.feature-grid__cta:hover {
  background: #292724;
  color: #fff;
}
.feature-grid__cta svg {
  width: 16px;
  height: 16px;
}

@media (min-width: 750px) {
  .feature-grid__products { grid-template-columns: repeat(3, 1fr); }
}

/* --- Share --- */
.feature-share {
  border-top: 8px solid #F2F2F0;
  padding: 40px 20px;
  max-width: 680px;
  margin: 0 auto;
}
.feature-share__heading {
  font-size: 16px;
  font-weight: 500;
  color: #292724;
  text-align: center;
  margin-bottom: 20px;
}
.feature-share__buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.feature-share__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  color: #fff;
  min-width: 100px;
  transition: opacity 0.2s;
}
.feature-share__btn:hover { opacity: 0.85; }
.feature-share__btn--line { background: #06C755; }
.feature-share__btn--x { background: #000; }
.feature-share__btn--facebook { background: #1877F2; }
.feature-share__btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* --- Breadcrumb override for feature pages --- */
.feature-breadcrumb {
  max-width: 680px;
  margin: 0 auto;
  padding: 12px 20px;
  font-size: 11px;
  color: #8A8A7A;
}
.feature-breadcrumb a {
  color: #8A8A7A;
  text-decoration: none;
}
.feature-breadcrumb a:hover {
  color: #6B5B4F;
}
.feature-breadcrumb span { margin: 0 6px; }

/* --- JSON-LD (hidden) --- */
.feature-jsonld { display: none; }

/* --- Responsive fine-tuning --- */
@media (max-width: 749px) {
  .feature-hero__image-wrap { aspect-ratio: 4 / 3; }
  .feature-hero__title { font-size: 22px; }
  .feature-share__buttons { flex-direction: column; }
  .feature-share__btn { width: 100%; }
}

EOF_CSS
echo "  ✓ assets/6johan-feature.css"

# --- sections/6johan-feature-hero.liquid ---
cat > sections/6johan-feature-hero.liquid << 'EOF_HERO'
{% comment %}
  6JOHAN Feature Hero
  Full-width hero image with title overlay.
  Supports separate PC/SP images.
{% endcomment %}

{{ '6johan-feature.css' | asset_url | stylesheet_tag }}

{%- liquid
  assign hero_image = section.settings.hero_image
  assign hero_image_mobile = section.settings.hero_image_mobile
  assign title = section.settings.title
  assign subtitle = section.settings.subtitle
  assign overlay_opacity = section.settings.overlay_opacity | default: 25
-%}

{% if hero_image != blank or title != blank %}
<section class="feature-hero" id="feature-hero">
  {% if hero_image != blank %}
    <div class="feature-hero__image-wrap">
      <picture>
        {% if hero_image_mobile != blank %}
          <source media="(max-width: 749px)" srcset="{{ hero_image_mobile | image_url: width: 800 }}">
        {% endif %}
        <img
          src="{{ hero_image | image_url: width: 1600 }}"
          srcset="{{ hero_image | image_url: width: 800 }} 800w,
                  {{ hero_image | image_url: width: 1200 }} 1200w,
                  {{ hero_image | image_url: width: 1600 }} 1600w"
          sizes="100vw"
          alt="{{ hero_image.alt | default: title | escape }}"
          loading="eager"
          width="{{ hero_image.width }}"
          height="{{ hero_image.height }}"
        >
      </picture>
      {% if title != blank or subtitle != blank %}
        <div class="feature-hero__overlay" style="background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,{{ overlay_opacity | divided_by: 100.0 }}) 100%);">
          {% if subtitle != blank %}
            <p class="feature-hero__subtitle">{{ subtitle }}</p>
          {% endif %}
          {% if title != blank %}
            <h1 class="feature-hero__title">{{ title }}</h1>
          {% endif %}
        </div>
      {% endif %}
    </div>
  {% else %}
    <div class="feature-hero__image-wrap" style="background: #F2F2F0; display: flex; align-items: center; justify-content: center;">
      <div class="feature-hero__overlay" style="background: none;">
        {% if subtitle != blank %}
          <p class="feature-hero__subtitle" style="color: #8A8A7A;">{{ subtitle }}</p>
        {% endif %}
        {% if title != blank %}
          <h1 class="feature-hero__title" style="color: #292724;">{{ title }}</h1>
        {% endif %}
      </div>
    </div>
  {% endif %}

  {%- comment -%} JSON-LD Article structured data {%- endcomment -%}
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": {{ article.title | json }},
      "description": {{ article.excerpt_or_content | strip_html | truncate: 160 | json }},
      {% if hero_image != blank %}
      "image": {{ hero_image | image_url: width: 1200 | json }},
      {% endif %}
      "datePublished": {{ article.published_at | date: "%Y-%m-%dT%H:%M:%S%z" | json }},
      "dateModified": {{ article.updated_at | date: "%Y-%m-%dT%H:%M:%S%z" | json }},
      "author": {
        "@type": "Organization",
        "name": "6JOHAN"
      },
      "publisher": {
        "@type": "Organization",
        "name": "6JOHAN",
        "url": "{{ shop.url }}"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "{{ shop.url }}{{ article.url }}"
      }
    }
  </script>
</section>
{% endif %}

{% schema %}
{
  "name": "特集ヒーロー",
  "tag": "div",
  "class": "feature-hero-section",
  "settings": [
    {
      "type": "image_picker",
      "id": "hero_image",
      "label": "ヒーロー画像（PC）",
      "info": "推奨: 1600×680px以上"
    },
    {
      "type": "image_picker",
      "id": "hero_image_mobile",
      "label": "ヒーロー画像（SP）",
      "info": "推奨: 800×600px。未設定時はPC画像を使用"
    },
    {
      "type": "text",
      "id": "title",
      "label": "タイトル",
      "default": "特集タイトル"
    },
    {
      "type": "text",
      "id": "subtitle",
      "label": "サブタイトル",
      "info": "タイトルの上に小さく表示"
    },
    {
      "type": "range",
      "id": "overlay_opacity",
      "label": "オーバーレイの濃さ",
      "min": 0,
      "max": 60,
      "step": 5,
      "default": 25,
      "unit": "%"
    }
  ],
  "presets": [
    {
      "name": "特集ヒーロー"
    }
  ]
}
{% endschema %}

EOF_HERO
echo "  ✓ sections/6johan-feature-hero.liquid"

# --- sections/6johan-feature-lead.liquid ---
cat > sections/6johan-feature-lead.liquid << 'EOF_LEAD'
{% comment %}
  6JOHAN Feature Lead
  Introduction text + auto-generated table of contents.
  TOC is built dynamically via JS from chapter h2 elements.
{% endcomment %}

{%- liquid
  assign show_breadcrumb = section.settings.show_breadcrumb | default: true
  assign lead_text = section.settings.lead_text
  assign show_toc = section.settings.show_toc | default: true
-%}

<section class="feature-lead-section">
  {%- if show_breadcrumb -%}
    <nav class="feature-breadcrumb" aria-label="パンくずリスト">
      <a href="{{ shop.url }}">TOP</a>
      <span>›</span>
      <a href="{{ blog.url }}">{{ blog.title }}</a>
      <span>›</span>
      <span>{{ article.title }}</span>
    </nav>
  {%- endif -%}

  <div class="feature-lead">
    {% if lead_text != blank %}
      <div class="feature-lead__text">
        {{ lead_text }}
      </div>
    {% endif %}

    {% if show_toc %}
      <details class="feature-toc" open>
        <summary class="feature-toc__header">
          <span class="feature-toc__header-label">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            目次
          </span>
          <span class="feature-toc__toggle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </summary>
        <ul class="feature-toc__list" id="feature-toc-list">
          {%- comment -%} Populated by JavaScript {%- endcomment -%}
        </ul>
      </details>
    {% endif %}
  </div>
</section>

{% if show_toc %}
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var tocList = document.getElementById('feature-toc-list');
    if (!tocList) return;

    var chapters = document.querySelectorAll('.feature-chapter__title');
    if (chapters.length === 0) return;

    chapters.forEach(function(chapter, index) {
      var id = 'chapter-' + (index + 1);
      chapter.id = id;

      var li = document.createElement('li');
      li.className = 'feature-toc__item';

      var a = document.createElement('a');
      a.className = 'feature-toc__link';
      a.href = '#' + id;
      a.textContent = chapter.textContent;
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.getElementById(id);
        if (target) {
          var headerHeight = 60;
          var y = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });

      li.appendChild(a);
      tocList.appendChild(li);
    });
  });
</script>
{% endif %}

{% schema %}
{
  "name": "特集リード文",
  "tag": "div",
  "class": "feature-lead-wrapper",
  "settings": [
    {
      "type": "checkbox",
      "id": "show_breadcrumb",
      "label": "パンくずリストを表示",
      "default": true
    },
    {
      "type": "richtext",
      "id": "lead_text",
      "label": "リード文",
      "info": "特集の導入文。世界観やテーマを伝える文章を入力"
    },
    {
      "type": "checkbox",
      "id": "show_toc",
      "label": "目次を表示",
      "default": true,
      "info": "チャプターの見出しから自動生成されます"
    }
  ],
  "presets": [
    {
      "name": "特集リード文"
    }
  ]
}
{% endschema %}

EOF_LEAD
echo "  ✓ sections/6johan-feature-lead.liquid"

# --- sections/6johan-feature-chapter.liquid ---
cat > sections/6johan-feature-chapter.liquid << 'EOF_CHAPTER'
{% comment %}
  6JOHAN Feature Chapter
  Repeatable editorial chapter section.
  Add multiple times in the customizer to create multi-chapter features.
  Each chapter can contain product blocks with images and descriptions.
{% endcomment %}

{%- liquid
  assign chapter_number = section.settings.chapter_number
  assign chapter_title = section.settings.chapter_title
  assign chapter_image = section.settings.chapter_image
  assign chapter_body = section.settings.chapter_body
-%}

{% if chapter_title != blank %}
<section class="feature-chapter">
  <div class="feature-chapter__heading">
    {% if chapter_number != blank %}
      <div class="feature-chapter__number">{{ chapter_number }}</div>
    {% endif %}
    <h2 class="feature-chapter__title">{{ chapter_title }}</h2>
  </div>

  {% if chapter_image != blank %}
    <div class="feature-chapter__hero">
      <img
        src="{{ chapter_image | image_url: width: 1200 }}"
        srcset="{{ chapter_image | image_url: width: 600 }} 600w,
                {{ chapter_image | image_url: width: 900 }} 900w,
                {{ chapter_image | image_url: width: 1200 }} 1200w"
        sizes="100vw"
        alt="{{ chapter_image.alt | default: chapter_title | escape }}"
        loading="lazy"
        width="{{ chapter_image.width }}"
        height="{{ chapter_image.height }}"
      >
    </div>
  {% endif %}

  {% if chapter_body != blank %}
    <div class="feature-chapter__body">
      {{ chapter_body }}
    </div>
  {% endif %}

  {%- for block in section.blocks -%}
    {%- case block.type -%}

      {%- when 'product_item' -%}
        {%- liquid
          assign item_product = block.settings.product
          assign item_heading = block.settings.heading
          assign item_image = block.settings.image
          assign item_description = block.settings.description
        -%}

        <div class="feature-product-item" {{ block.shopify_attributes }}>
          {% if item_heading != blank %}
            <h3 class="feature-product-item__sub-heading">{{ item_heading }}</h3>
          {% endif %}

          {% if item_image != blank %}
            <div class="feature-product-item__image">
              <img
                src="{{ item_image | image_url: width: 1000 }}"
                srcset="{{ item_image | image_url: width: 500 }} 500w,
                        {{ item_image | image_url: width: 750 }} 750w,
                        {{ item_image | image_url: width: 1000 }} 1000w"
                sizes="(min-width: 750px) 680px, calc(100vw - 40px)"
                alt="{{ item_image.alt | default: item_heading | escape }}"
                loading="lazy"
                width="{{ item_image.width }}"
                height="{{ item_image.height }}"
              >
            </div>
          {% elsif item_product != blank and item_product.featured_image != blank %}
            <div class="feature-product-item__image">
              <img
                src="{{ item_product.featured_image | image_url: width: 1000 }}"
                srcset="{{ item_product.featured_image | image_url: width: 500 }} 500w,
                        {{ item_product.featured_image | image_url: width: 750 }} 750w,
                        {{ item_product.featured_image | image_url: width: 1000 }} 1000w"
                sizes="(min-width: 750px) 680px, calc(100vw - 40px)"
                alt="{{ item_product.featured_image.alt | default: item_product.title | escape }}"
                loading="lazy"
                width="{{ item_product.featured_image.width }}"
                height="{{ item_product.featured_image.height }}"
              >
            </div>
          {% endif %}

          {% if item_description != blank %}
            <div class="feature-product-item__description">
              {{ item_description }}
            </div>
          {% endif %}

          {% if item_product != blank %}
            <a href="{{ item_product.url }}" class="feature-product-card">
              <div class="feature-product-card__thumb">
                {% if item_product.featured_image != blank %}
                  <img
                    src="{{ item_product.featured_image | image_url: width: 200 }}"
                    alt="{{ item_product.title | escape }}"
                    loading="lazy"
                    width="80"
                    height="80"
                  >
                {% endif %}
              </div>
              <div class="feature-product-card__info">
                <div class="feature-product-card__name">{{ item_product.title }}</div>
                <div class="feature-product-card__price">
                  {% if item_product.compare_at_price > item_product.price %}
                    <span class="feature-product-card__price-compare">
                      {{ item_product.compare_at_price | money_without_trailing_zeros }}
                    </span>
                  {% endif %}
                  {{ item_product.price | money_without_trailing_zeros }}〜
                </div>
                <div class="feature-product-card__link-text">詳しくはこちら ›</div>
              </div>
            </a>
          {% endif %}
        </div>

      {%- when 'text_block' -%}
        <div class="feature-chapter__body" {{ block.shopify_attributes }}>
          {{ block.settings.text }}
        </div>

      {%- when 'image_block' -%}
        {%- assign block_image = block.settings.image -%}
        {% if block_image != blank %}
          <div class="feature-product-item" style="margin-top: 24px;" {{ block.shopify_attributes }}>
            <div class="feature-product-item__image">
              <img
                src="{{ block_image | image_url: width: 1000 }}"
                srcset="{{ block_image | image_url: width: 500 }} 500w,
                        {{ block_image | image_url: width: 750 }} 750w,
                        {{ block_image | image_url: width: 1000 }} 1000w"
                sizes="(min-width: 750px) 680px, calc(100vw - 40px)"
                alt="{{ block_image.alt | escape }}"
                loading="lazy"
                width="{{ block_image.width }}"
                height="{{ block_image.height }}"
              >
            </div>
            {% if block.settings.caption != blank %}
              <p style="font-size: 12px; color: #8A8A7A; margin-top: 8px;">{{ block.settings.caption }}</p>
            {% endif %}
          </div>
        {% endif %}

    {%- endcase -%}
  {%- endfor -%}
</section>
{% endif %}

{% schema %}
{
  "name": "特集チャプター",
  "tag": "div",
  "class": "feature-chapter-section",
  "settings": [
    {
      "type": "text",
      "id": "chapter_number",
      "label": "チャプター番号",
      "info": "例: 01. / Chapter 1 / —",
      "placeholder": "01."
    },
    {
      "type": "text",
      "id": "chapter_title",
      "label": "チャプタータイトル",
      "default": "チャプタータイトル"
    },
    {
      "type": "image_picker",
      "id": "chapter_image",
      "label": "チャプター画像",
      "info": "ライフスタイル写真。推奨: 1200×800px"
    },
    {
      "type": "richtext",
      "id": "chapter_body",
      "label": "本文",
      "info": "チャプターの説明テキスト"
    }
  ],
  "blocks": [
    {
      "type": "product_item",
      "name": "商品紹介",
      "limit": 8,
      "settings": [
        {
          "type": "text",
          "id": "heading",
          "label": "商品の見出し",
          "info": "例: 天然木の温もりが伝わるダイニングテーブル"
        },
        {
          "type": "image_picker",
          "id": "image",
          "label": "ライフスタイル画像",
          "info": "未設定の場合、商品のメイン画像を使用"
        },
        {
          "type": "richtext",
          "id": "description",
          "label": "商品の説明",
          "info": "この商品を特集する理由やおすすめポイント"
        },
        {
          "type": "product",
          "id": "product",
          "label": "商品"
        }
      ]
    },
    {
      "type": "text_block",
      "name": "テキスト",
      "limit": 4,
      "settings": [
        {
          "type": "richtext",
          "id": "text",
          "label": "テキスト"
        }
      ]
    },
    {
      "type": "image_block",
      "name": "画像",
      "limit": 4,
      "settings": [
        {
          "type": "image_picker",
          "id": "image",
          "label": "画像"
        },
        {
          "type": "text",
          "id": "caption",
          "label": "キャプション"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "特集チャプター"
    }
  ]
}
{% endschema %}

EOF_CHAPTER
echo "  ✓ sections/6johan-feature-chapter.liquid"

# --- sections/6johan-feature-grid.liquid ---
cat > sections/6johan-feature-grid.liquid << 'EOF_GRID'
{% comment %}
  6JOHAN Feature Grid
  Product grid section for the bottom of feature pages.
  Can use a collection or manual product selection.
{% endcomment %}

{%- liquid
  assign grid_title = section.settings.title
  assign grid_description = section.settings.description
  assign collection = section.settings.collection
  assign product_count = section.settings.product_count | default: 6
  assign cta_text = section.settings.cta_text
  assign cta_link = section.settings.cta_link
-%}

{%- comment -%} Determine products to show {%- endcomment -%}
{%- assign manual_products = section.blocks | where: "type", "product" -%}
{%- assign has_manual = false -%}
{%- if manual_products.size > 0 -%}
  {%- assign has_manual = true -%}
{%- endif -%}

{% if collection != blank or has_manual %}
<section class="feature-grid">
  {% if grid_title != blank or grid_description != blank %}
    <div class="feature-grid__header">
      {% if grid_title != blank %}
        <h2 class="feature-grid__title">{{ grid_title }}</h2>
      {% endif %}
      {% if grid_description != blank %}
        <p class="feature-grid__description">{{ grid_description }}</p>
      {% endif %}
    </div>
  {% endif %}

  <div class="feature-grid__products">
    {% if has_manual %}
      {%- for block in section.blocks -%}
        {%- if block.type == 'product' -%}
          {%- assign grid_product = block.settings.product -%}
          {% if grid_product != blank %}
            <a href="{{ grid_product.url }}" class="feature-grid__card" {{ block.shopify_attributes }}>
              <div class="feature-grid__card-image">
                {% if grid_product.featured_image != blank %}
                  <img
                    src="{{ grid_product.featured_image | image_url: width: 400 }}"
                    srcset="{{ grid_product.featured_image | image_url: width: 300 }} 300w,
                            {{ grid_product.featured_image | image_url: width: 400 }} 400w"
                    sizes="(min-width: 750px) 220px, calc(50vw - 28px)"
                    alt="{{ grid_product.title | escape }}"
                    loading="lazy"
                    width="{{ grid_product.featured_image.width }}"
                    height="{{ grid_product.featured_image.height }}"
                  >
                {% endif %}
              </div>
              <div class="feature-grid__card-name">{{ grid_product.title }}</div>
              <div class="feature-grid__card-price">
                {% if grid_product.compare_at_price > grid_product.price %}
                  <span class="feature-grid__card-price-compare">
                    {{ grid_product.compare_at_price | money_without_trailing_zeros }}
                  </span>
                {% endif %}
                {{ grid_product.price | money_without_trailing_zeros }}〜
              </div>
            </a>
          {% endif %}
        {%- endif -%}
      {%- endfor -%}
    {% elsif collection != blank %}
      {%- for product in collection.products limit: product_count -%}
        <a href="{{ product.url }}" class="feature-grid__card">
          <div class="feature-grid__card-image">
            {% if product.featured_image != blank %}
              <img
                src="{{ product.featured_image | image_url: width: 400 }}"
                srcset="{{ product.featured_image | image_url: width: 300 }} 300w,
                        {{ product.featured_image | image_url: width: 400 }} 400w"
                sizes="(min-width: 750px) 220px, calc(50vw - 28px)"
                alt="{{ product.title | escape }}"
                loading="lazy"
                width="{{ product.featured_image.width }}"
                height="{{ product.featured_image.height }}"
              >
            {% endif %}
          </div>
          <div class="feature-grid__card-name">{{ product.title }}</div>
          <div class="feature-grid__card-price">
            {% if product.compare_at_price > product.price %}
              <span class="feature-grid__card-price-compare">
                {{ product.compare_at_price | money_without_trailing_zeros }}
              </span>
            {% endif %}
            {{ product.price | money_without_trailing_zeros }}〜
          </div>
        </a>
      {%- endfor -%}
    {% endif %}
  </div>

  {% if cta_text != blank and cta_link != blank %}
    <a href="{{ cta_link }}" class="feature-grid__cta">
      {{ cta_text }}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </a>
  {% endif %}
</section>
{% endif %}

{% schema %}
{
  "name": "特集 商品グリッド",
  "tag": "div",
  "class": "feature-grid-section",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "見出し",
      "default": "関連アイテムをもっと見る"
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "説明文"
    },
    {
      "type": "collection",
      "id": "collection",
      "label": "コレクション",
      "info": "手動で商品を追加する場合は空のままにしてください"
    },
    {
      "type": "range",
      "id": "product_count",
      "label": "表示件数（コレクション使用時）",
      "min": 2,
      "max": 12,
      "step": 1,
      "default": 6
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "ボタンテキスト",
      "default": "もっとアイテムを見る"
    },
    {
      "type": "url",
      "id": "cta_link",
      "label": "ボタンリンク先"
    }
  ],
  "blocks": [
    {
      "type": "product",
      "name": "商品",
      "limit": 12,
      "settings": [
        {
          "type": "product",
          "id": "product",
          "label": "商品"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "特集 商品グリッド"
    }
  ]
}
{% endschema %}

EOF_GRID
echo "  ✓ sections/6johan-feature-grid.liquid"

# --- sections/6johan-feature-share.liquid ---
cat > sections/6johan-feature-share.liquid << 'EOF_SHARE'
{% comment %}
  6JOHAN Feature Share
  Social sharing buttons for feature articles.
{% endcomment %}

{%- liquid
  assign page_url = shop.url | append: article.url
  assign page_title = article.title | url_param_escape
  assign heading = section.settings.heading | default: 'このページをシェア'
  assign show_line = section.settings.show_line | default: true
  assign show_x = section.settings.show_x | default: true
  assign show_facebook = section.settings.show_facebook | default: true
-%}

<section class="feature-share">
  <p class="feature-share__heading">{{ heading }}</p>
  <div class="feature-share__buttons">
    {% if show_line %}
      <a href="https://social-plugins.line.me/lineit/share?url={{ page_url | url_encode }}"
         target="_blank"
         rel="noopener noreferrer"
         class="feature-share__btn feature-share__btn--line"
         aria-label="LINEで送る">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        送る
      </a>
    {% endif %}

    {% if show_x %}
      <a href="https://twitter.com/intent/tweet?text={{ page_title }}&url={{ page_url | url_encode }}"
         target="_blank"
         rel="noopener noreferrer"
         class="feature-share__btn feature-share__btn--x"
         aria-label="Xでポスト">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        ポスト
      </a>
    {% endif %}

    {% if show_facebook %}
      <a href="https://www.facebook.com/sharer/sharer.php?u={{ page_url | url_encode }}"
         target="_blank"
         rel="noopener noreferrer"
         class="feature-share__btn feature-share__btn--facebook"
         aria-label="Facebookでシェア">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        シェア
      </a>
    {% endif %}
  </div>
</section>

{% schema %}
{
  "name": "特集シェア",
  "tag": "div",
  "class": "feature-share-section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "見出し",
      "default": "このページをシェア"
    },
    {
      "type": "checkbox",
      "id": "show_line",
      "label": "LINE",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "show_x",
      "label": "X（旧Twitter）",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "show_facebook",
      "label": "Facebook",
      "default": true
    }
  ],
  "presets": [
    {
      "name": "特集シェア"
    }
  ]
}
{% endschema %}

EOF_SHARE
echo "  ✓ sections/6johan-feature-share.liquid"

# --- templates/article.feature.json ---
cat > templates/article.feature.json << 'EOF_TEMPLATE'
{
  "sections": {
    "feature_hero": {
      "type": "6johan-feature-hero",
      "settings": {
        "title": "特集タイトル",
        "subtitle": "",
        "overlay_opacity": 25
      }
    },
    "feature_lead": {
      "type": "6johan-feature-lead",
      "settings": {
        "show_breadcrumb": true,
        "lead_text": "<p>ここに特集のリード文を入力してください。特集のテーマや世界観を伝える導入文です。</p>",
        "show_toc": true
      }
    },
    "feature_chapter_1": {
      "type": "6johan-feature-chapter",
      "settings": {
        "chapter_number": "01.",
        "chapter_title": "チャプター1のタイトル"
      },
      "blocks": {
        "product_1": {
          "type": "product_item",
          "settings": {
            "heading": "商品の見出し"
          }
        }
      },
      "block_order": ["product_1"]
    },
    "feature_chapter_2": {
      "type": "6johan-feature-chapter",
      "settings": {
        "chapter_number": "02.",
        "chapter_title": "チャプター2のタイトル"
      },
      "blocks": {
        "product_2": {
          "type": "product_item",
          "settings": {
            "heading": "商品の見出し"
          }
        }
      },
      "block_order": ["product_2"]
    },
    "feature_chapter_3": {
      "type": "6johan-feature-chapter",
      "settings": {
        "chapter_number": "03.",
        "chapter_title": "チャプター3のタイトル"
      },
      "blocks": {
        "product_3": {
          "type": "product_item",
          "settings": {
            "heading": "商品の見出し"
          }
        }
      },
      "block_order": ["product_3"]
    },
    "feature_grid": {
      "type": "6johan-feature-grid",
      "settings": {
        "title": "関連アイテムをもっと見る",
        "cta_text": "もっとアイテムを見る"
      }
    },
    "feature_share": {
      "type": "6johan-feature-share",
      "settings": {
        "heading": "このページをシェア",
        "show_line": true,
        "show_x": true,
        "show_facebook": true
      }
    }
  },
  "order": [
    "feature_hero",
    "feature_lead",
    "feature_chapter_1",
    "feature_chapter_2",
    "feature_chapter_3",
    "feature_grid",
    "feature_share"
  ]
}

EOF_TEMPLATE
echo "  ✓ templates/article.feature.json"

echo ""
echo "3/4 Staging files..."
git add assets/6johan-feature.css
git add sections/6johan-feature-hero.liquid
git add sections/6johan-feature-lead.liquid
git add sections/6johan-feature-chapter.liquid
git add sections/6johan-feature-grid.liquid
git add sections/6johan-feature-share.liquid
git add templates/article.feature.json

echo "4/4 Committing and pushing..."
git commit -m "Add feature article template (editorial page system)"
git push origin main

echo ""
echo "=== Deploy complete! ==="
echo ""
echo "Next steps:"
echo "  1. Shopify管理画面 → オンラインストア → ブログ記事 → 「ブログを管理する」"
echo "     → タイトル「特集」、handle「feature」で新規作成"
echo "  2. 特集ブログに記事を1本追加 → テンプレート「article.feature」を選択"
echo "  3. テーマカスタマイズでその記事を開いて編集"
