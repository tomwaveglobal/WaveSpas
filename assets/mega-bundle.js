/*
 * Mega Bundle — single-click add-to-cart for a curated bundle block.
 *
 * Each <mega-bundle> element wraps one bundle. Its items carry a
 * [data-mega-bundle-item] element with data-variant-id + data-qty.
 * On click the whole set is POSTed to /cart/add.js in one request,
 * mirroring the theme's existing product-bundle.js behaviour (cart-page
 * fallback, pub/sub cart update, cart drawer open).
 */
if (!customElements.get('mega-bundle')) {
  customElements.define(
    'mega-bundle',
    class MegaBundle extends HTMLElement {
      constructor() {
        super();
        this.addButton = this.querySelector('[data-mega-bundle-add]');
        if (this.addButton) {
          this.addButton.addEventListener('click', this.onSubmitHandler.bind(this));
        }
      }

      get items() {
        return Array.from(this.querySelectorAll('[data-mega-bundle-item]'));
      }

      get cartDrawer() {
        return document.querySelector('cart-drawer');
      }

      onSubmitHandler(event) {
        const data = {
          items: this.items
            .map((el) => ({
              id: el.getAttribute('data-variant-id'),
              quantity: parseInt(el.getAttribute('data-qty'), 10) || 1
            }))
            .filter((item) => item.id)
        };

        if (!data.items.length) return;

        // Cart-page / page-cart themes: hard POST so the cart page reloads.
        if (document.body.classList.contains('template-cart') || theme.settings.cartType === 'page') {
          theme.utils.postLink2(theme.routes.cart_add_url, { parameters: { ...data } });
          return;
        }

        event.preventDefault();
        if (this.addButton.hasAttribute('aria-disabled')) return;
        this.activeElement = event.submitter || event.currentTarget;

        this.handleErrorMessage();

        let sectionsToBundle = [];
        document.documentElement.dispatchEvent(
          new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } })
        );

        const body = JSON.stringify({
          ...data,
          sections: sectionsToBundle,
          sections_url: window.location.pathname
        });

        this.addButton.setAttribute('aria-disabled', 'true');
        this.addButton.setAttribute('aria-busy', 'true');

        fetch(theme.routes.cart_add_url, { ...theme.utils.fetchConfig('javascript'), body })
          .then((response) => response.json())
          .then(async (parsedState) => {
            if (parsedState.status) {
              this.handleErrorMessage(parsedState.description);
              document.dispatchEvent(
                new CustomEvent('ajaxProduct:error', { detail: { errorMessage: parsedState.description } })
              );
              return;
            }

            const cartJson = await (
              await fetch(theme.routes.cart_url, { ...theme.utils.fetchConfig('json', 'GET') })
            ).json();
            cartJson['sections'] = parsedState['sections'];

            theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'mega-bundle', cart: cartJson });
            document.dispatchEvent(new CustomEvent('ajaxProduct:added', { detail: { product: parsedState } }));

            this.cartDrawer?.show(this.activeElement);
          })
          .catch((error) => {
            console.log(error);
          })
          .finally(() => {
            this.addButton.removeAttribute('aria-busy');
            this.addButton.removeAttribute('aria-disabled');
          });
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessage = this.errorMessage || this.querySelector('.product-form__error-message');
        if (!this.errorMessage) return;

        this.errorMessage.toggleAttribute('hidden', !errorMessage);
        this.errorMessage.innerText = errorMessage || '';
      }
    }
  );
}
