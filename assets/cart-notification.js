class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    this.cartItemKey = parsedState.key;
    this.getSectionsToRender().forEach((section) => {
      document.getElementById(section.id).innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    this.updateSetOffer(parsedState);

    if (this.header) this.header.reveal();
    this.open();
  }

  // 6JOHAN セット割: カート内点数に応じた1行案内
  updateSetOffer(parsedState) {
    const el = document.getElementById('cart-notification-setoffer');
    if (!el) return;

    const count = parseInt(parsedState.item_count, 10) || 0;

    if (count >= 2) {
      let amount = '';
      const apps = parsedState.cart_level_discount_applications || [];
      if (apps.length && typeof apps[0].total_allocated_amount === 'number') {
        try {
          amount =
            '　−' +
            new Intl.NumberFormat('ja-JP', {
              style: 'currency',
              currency: 'JPY',
              maximumFractionDigits: 0,
            }).format(apps[0].total_allocated_amount / 100);
        } catch (e) {
          amount = '';
        }
      }
      el.innerHTML = '<span class="setoffer-pop__tag">セット割</span>2点以上5%OFFが適用中' + amount;
      el.hidden = false;
    } else if (count === 1) {
      el.innerHTML = 'あと1点追加で<strong>5%OFF</strong>が自動適用されます';
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
      },
      {
        id: 'cart-notification-button',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
