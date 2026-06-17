/*
 * Mega Bundle — per-card variant buttons (allowed variants only), live total,
 * and single-click add-to-cart for the whole bundle.
 */
if (!customElements.get('mega-bundle')) {
  customElements.define(
    'mega-bundle',
    class MegaBundle extends HTMLElement {
      constructor() {
        super();
        this.discount = parseFloat(this.getAttribute('data-discount')) || 0;
        this.addButton = this.querySelector('[data-mega-add]');
        this.regularEl = this.querySelector('[data-mega-regular]');
        this.totalEl = this.querySelector('[data-mega-total]');
        this.savingAmtEl = this.querySelector('[data-mega-saving-amt]');
      }

      connectedCallback() {
        this.addEventListener('click', this.onClick.bind(this));
        this.updateTotal();
      }

      get cards() {
        return Array.from(this.querySelectorAll('[data-mega-card]'));
      }

      get cartDrawer() {
        return document.querySelector('cart-drawer');
      }

      money(cents) {
        return theme.Currency.formatMoney(cents, theme.settings.moneyFormat);
      }

      onClick(event) {
        const btn = event.target.closest('.mega-variant-btn');
        if (btn) {
          this.selectVariant(btn);
          return;
        }
        if (event.target.closest('[data-mega-add]')) {
          this.addToCart(event);
        }
      }

      selectVariant(btn) {
        const card = btn.closest('[data-mega-card]');
        if (!card) return;
        card.querySelectorAll('.mega-variant-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const price = parseInt(btn.getAttribute('data-price'), 10) || 0;
        const priceEl = card.querySelector('[data-mega-price]');
        if (priceEl) priceEl.innerHTML = this.money(price);

        const img = btn.getAttribute('data-image');
        const imgEl = card.querySelector('[data-mega-image]');
        if (img && imgEl) {
          imgEl.removeAttribute('srcset');
          imgEl.src = img;
        }

        const hidden = card.querySelector('[data-mega-variant-id]');
        if (hidden) hidden.value = btn.getAttribute('data-variant-id');

        this.updateTotal();
      }

      cardState(card) {
        const active = card.querySelector('.mega-variant-btn.is-active') || card.querySelector('.mega-variant-btn');
        const hidden = card.querySelector('[data-mega-variant-id]');
        const id = hidden ? hidden.value : (active ? active.getAttribute('data-variant-id') : null);
        const price = active ? (parseInt(active.getAttribute('data-price'), 10) || 0) : 0;
        const qty = parseInt(card.getAttribute('data-qty'), 10) || 1;
        return { id, price, qty };
      }

      updateTotal() {
        let regular = 0;
        this.cards.forEach((card) => {
          const s = this.cardState(card);
          regular += s.price * s.qty;
        });
        const saving = Math.round((regular * this.discount) / 100);
        const total = regular - saving;

        if (this.totalEl) this.totalEl.innerHTML = this.money(total);
        if (this.regularEl) this.regularEl.innerHTML = this.money(regular);
        if (this.savingAmtEl) this.savingAmtEl.innerHTML = this.money(saving);
      }

      addToCart(event) {
        event.preventDefault();
        if (this.addButton.hasAttribute('aria-disabled')) return;

        const items = this.cards
          .map((card) => {
            const s = this.cardState(card);
            return s.id ? { id: s.id, quantity: s.qty } : null;
          })
          .filter(Boolean);
        if (!items.length) return;

        const data = { items: items };

        if (document.body.classList.contains('template-cart') || theme.settings.cartType === 'page') {
          theme.utils.postLink2(theme.routes.cart_add_url, { parameters: { ...data } });
          return;
        }

        this.activeElement = event.currentTarget;
        this.showError(false);

        let sectionsToBundle = [];
        document.documentElement.dispatchEvent(
          new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } })
        );

        const body = JSON.stringify({ ...data, sections: sectionsToBundle, sections_url: window.location.pathname });

        this.addButton.setAttribute('aria-disabled', 'true');
        this.addButton.setAttribute('aria-busy', 'true');

        fetch(theme.routes.cart_add_url, { ...theme.utils.fetchConfig('javascript'), body })
          .then((r) => r.json())
          .then(async (parsedState) => {
            if (parsedState.status) {
              this.showError(parsedState.description);
              document.dispatchEvent(new CustomEvent('ajaxProduct:error', { detail: { errorMessage: parsedState.description } }));
              return;
            }
            const cartJson = await (await fetch(theme.routes.cart_url, { ...theme.utils.fetchConfig('json', 'GET') })).json();
            cartJson['sections'] = parsedState['sections'];
            theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'mega-bundle', cart: cartJson });
            document.dispatchEvent(new CustomEvent('ajaxProduct:added', { detail: { product: parsedState } }));
            this.cartDrawer?.show(this.activeElement);
          })
          .catch((e) => console.log(e))
          .finally(() => {
            this.addButton.removeAttribute('aria-busy');
            this.addButton.removeAttribute('aria-disabled');
          });
      }

      showError(message) {
        this.errorEl = this.errorEl || this.querySelector('[data-mega-error]');
        if (!this.errorEl) return;
        this.errorEl.toggleAttribute('hidden', !message);
        this.errorEl.innerText = message || '';
      }
    }
  );
}
