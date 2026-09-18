/* Wave FY27 product page — behaviour for sections/wave-fy27-*.liquid.
   Everything lives in custom elements: the theme swaps pages with instant
   navigation, where document.currentScript is null and inline init breaks. */
(() => {
  if (window.WaveFY27) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const money = (amount, currency) => {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-GB', {
        style: 'currency',
        currency: currency || 'GBP',
        maximumFractionDigits: amount >= 100 ? 0 : 2,
        minimumFractionDigits: amount >= 100 ? 0 : 2
      }).format(amount);
    } catch (e) {
      return amount.toFixed(2);
    }
  };

  const productForm = () =>
    document.querySelector('form[action*="/cart/add"][data-type="add-to-cart-form"]') ||
    document.querySelector('.product-info form[action*="/cart/add"], form[action*="/cart/add"]');

  const scrollToBuy = () => {
    const target = document.querySelector('.product-info, [id^="ProductInfo-"], .product') || productForm();
    if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  // Theme dispatches variant:change on the product form without bubbling, so listen at capture phase.
  const onVariant = (fn) => document.addEventListener('variant:change', (e) => e.detail && e.detail.variant && fn(e.detail.variant), true);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        entry.target.dispatchEvent(new CustomEvent('wf:in'));
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  /* <wf-section> — reveal children, run counters */
  class WfSection extends HTMLElement {
    connectedCallback() {
      this.querySelectorAll('[data-wf-reveal]').forEach((el) => io.observe(el));
      this.querySelectorAll('[data-wf-count]').forEach((el) => {
        el.addEventListener('wf:in', () => this.count(el), { once: true });
        io.observe(el);
      });
    }
    count(el) {
      const end = parseFloat(el.dataset.wfCount);
      const dp = parseInt(el.dataset.dp || '0', 10);
      const prefix = el.dataset.prefix || '';
      if (reduced || !isFinite(end)) return;
      const t0 = performance.now();
      const dur = 1400;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = prefix + (end * eased).toFixed(dp);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  /* <wf-localnav> — builds its links from every [data-wf-nav] section on the page */
  class WfLocalNav extends HTMLElement {
    connectedCallback() {
      const list = this.querySelector('[data-links]');
      const targets = [...document.querySelectorAll('[data-wf-nav]')];
      list.innerHTML = '';
      targets.forEach((t) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${t.id}`;
        a.textContent = t.dataset.wfNav;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const y = t.getBoundingClientRect().top + window.scrollY - this.offsetHeight + 1;
          window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      const links = [...list.querySelectorAll('a')];
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((a) => a.setAttribute('aria-current', a.hash === `#${entry.target.id}` ? 'true' : 'false'));
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      targets.forEach((t) => spy.observe(t));
      this.querySelector('[data-buy]')?.addEventListener('click', scrollToBuy);
      const price = this.querySelector('[data-price]');
      const currency = this.dataset.currency;
      if (price) onVariant((v) => (price.textContent = money(v.price / 100, currency)));
    }
  }

  /* <wf-toggle> — generic segmented control that writes data-<attr> onto a target */
  class WfToggle extends HTMLElement {
    connectedCallback() {
      const target = this.closest('[data-toggle-root]') || this;
      const attr = this.dataset.attr || 'state';
      const buttons = [...this.querySelectorAll('button[data-value]')];
      buttons.forEach((b) =>
        b.addEventListener('click', () => {
          buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          target.setAttribute(`data-${attr}`, b.dataset.value);
          target.dispatchEvent(new CustomEvent('wf:toggle', { detail: b.dataset.value }));
        })
      );
    }
  }

  /* <wf-foam> — swaps the wall cross-section between last year's and this year's wall */
  class WfFoam extends HTMLElement {
    connectedCallback() {
      const svg = this.querySelector('svg');
      if (!svg) return;
      const geo = JSON.parse(this.querySelector('[data-geo]').textContent);
      const apply = (state) => {
        const g = geo[state];
        svg.querySelectorAll('[data-wall]').forEach((r) => {
          const side = r.dataset.wall;
          r.setAttribute('width', g.wall);
          r.setAttribute('x', side === 'l' ? geo.shell : geo.w - geo.shell - g.wall);
        });
        svg.querySelectorAll('[data-dots]').forEach((p) => {
          p.setAttribute('width', g.wall);
          p.setAttribute('x', p.dataset.dots === 'l' ? geo.shell : geo.w - geo.shell - g.wall);
          p.setAttribute('fill', `url(#${g.pattern})`);
        });
        const water = svg.querySelector('[data-water]');
        water.setAttribute('x', geo.shell + g.wall);
        water.setAttribute('width', geo.w - 2 * (geo.shell + g.wall));
        svg.querySelectorAll('[data-loss]').forEach((p) => (p.style.opacity = g.loss));
        this.querySelectorAll('[data-show]').forEach((el) => (el.hidden = el.dataset.show !== state));
      };
      this.addEventListener('wf:toggle', (e) => apply(e.detail));
      apply(this.dataset.state || 'new');
    }
  }

  /* <wf-cost> — running cost calculator, standard vs EnergySave */
  class WfCost extends HTMLElement {
    connectedCallback() {
      this.data = JSON.parse(this.querySelector('[data-sizes]').textContent);
      this.currency = this.dataset.currency;
      this.saving = parseFloat(this.dataset.saving) / 100;
      this.size = 0;
      this.days = parseFloat(this.dataset.days);
      this.rate = parseFloat(this.dataset.rate);
      this.unit = this.dataset.unit;

      this.querySelectorAll('[data-size]').forEach((b) =>
        b.addEventListener('click', () => {
          this.size = parseInt(b.dataset.size, 10);
          this.press(b, '[data-size]');
          this.render();
        })
      );
      this.querySelectorAll('[data-days]').forEach((b) =>
        b.addEventListener('click', () => {
          this.days = parseFloat(b.dataset.days);
          this.press(b, '[data-days]');
          this.render();
        })
      );
      const range = this.querySelector('input[type="range"]');
      range?.addEventListener('input', () => {
        this.rate = parseFloat(range.value) / 100;
        this.render();
      });
      this.querySelector('[data-add-es]')?.addEventListener('click', () => this.chooseEnergySave());
      this.render();
    }
    press(btn, sel) {
      this.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    }
    out(key, value) {
      this.querySelectorAll(`[data-out="${key}"]`).forEach((el) => (el.textContent = value));
    }
    render() {
      const s = this.data[this.size] || this.data[0];
      const kwh = parseFloat(s.kwh);
      if (!isFinite(kwh)) return;
      const std = kwh * this.days * this.rate;
      const es = std * (1 - this.saving);
      const stdYear = std * 12;
      const esYear = es * 12;
      this.out('std-month', money(std, this.currency));
      this.out('es-month', money(es, this.currency));
      this.out('std-year', money(stdYear, this.currency));
      this.out('es-year', money(esYear, this.currency));
      this.out('save-year', money(stdYear - esYear, this.currency));
      this.out('rate', this.unit === 'p' ? `${Math.round(this.rate * 100)}p` : money(this.rate, this.currency));
      this.out('kwh', `${kwh}`);
      this.out('days', `${this.days}`);
      const bars = this.querySelectorAll('.wf-rc__bar i');
      if (bars[0]) bars[0].style.transform = 'scaleX(1)';
      if (bars[1]) bars[1].style.transform = `scaleX(${1 - this.saving})`;

      const payback = this.querySelector('[data-payback]');
      if (payback) {
        const extra = (s.es - s.price) / 100;
        const monthly = std - es;
        if (s.es > 0 && extra > 0 && monthly > 0) {
          payback.hidden = false;
          this.out('extra', money(extra, this.currency));
          this.out('payback', `${Math.ceil(extra / monthly)}`);
        } else {
          payback.hidden = true;
        }
      }
    }
    chooseEnergySave() {
      const form = productForm();
      const scope = form?.closest('.product-info, .product, section') || document;
      const input = [...scope.querySelectorAll('input[type="radio"]')].find((i) => /energysave/i.test(i.value));
      if (input) {
        input.click();
      } else {
        const select = [...scope.querySelectorAll('select')].find((s) => [...s.options].some((o) => /energysave/i.test(o.value)));
        if (select) {
          select.value = [...select.options].find((o) => /energysave/i.test(o.value)).value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      scrollToBuy();
    }
  }

  /* <wf-price> — live price that follows the chosen variant */
  class WfPrice extends HTMLElement {
    connectedCallback() {
      const currency = this.dataset.currency;
      const now = this.querySelector('[data-now]');
      const was = this.querySelector('[data-was]');
      onVariant((v) => {
        if (now) now.textContent = money(v.price / 100, currency);
        if (was) {
          const show = v.compare_at_price && v.compare_at_price > v.price;
          was.hidden = !show;
          if (show) was.textContent = money(v.compare_at_price / 100, currency);
        }
      });
    }
  }

  /* <wf-buy> — any button that should take you back to the buy box */
  class WfBuy extends HTMLElement {
    connectedCallback() {
      this.querySelector('button, a')?.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToBuy();
      });
    }
  }


  /* <wf-explode> — exploded diagram hotspots: hover on desktop, tap on touch */
  class WfExplode extends HTMLElement {
    connectedCallback() {
      this.hots = [...this.querySelectorAll('.wf-xp__hot')];
      const set = (hot) => {
        this.hots.forEach((h) => h.classList.toggle('is-active', h === hot));
        if (hot) this.dataset.active = hot.dataset.layer;
        else delete this.dataset.active;
      };
      this.hots.forEach((hot) => {
        hot.addEventListener('mouseenter', () => set(hot));
        hot.addEventListener('focus', () => set(hot));
        hot.addEventListener('click', (e) => {
          e.stopPropagation();
          set(hot.classList.contains('is-active') && e.pointerType !== 'mouse' ? null : hot);
        });
      });
      this.addEventListener('mouseleave', () => set(null));
      this.addEventListener('focusout', (e) => { if (!this.contains(e.relatedTarget)) set(null); });
      this.onDoc = () => set(null);
      document.addEventListener('click', this.onDoc);
    }
    disconnectedCallback() {
      document.removeEventListener('click', this.onDoc);
    }
  }

  /* <wf-model> — Shopify's 3D viewer; loads on desktop when in view, on tap elsewhere */
  class WfModel extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('[data-load]');
      this.button?.addEventListener('click', () => this.load());
      const big = window.matchMedia('(min-width: 990px)').matches && !(navigator.connection && navigator.connection.saveData);
      if (big) {
        const obs = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); this.load(); }
        }, { rootMargin: '200px' });
        obs.observe(this);
      }
    }
    load() {
      if (this.loading) return;
      this.loading = true;
      this.classList.add('is-loading');
      const done = () => {
        const tpl = this.querySelector('template');
        if (!tpl) return;
        this.querySelector('[data-viewer]').appendChild(tpl.content.cloneNode(true));
        const mv = this.querySelector('model-viewer');
        mv?.addEventListener('load', () => this.classList.add('is-ready'), { once: true });
        mv?.addEventListener('error', () => this.classList.remove('is-loading'), { once: true });
      };
      if (customElements.get('model-viewer')) return done();
      if (window.Shopify && Shopify.loadFeatures) {
        customElements.whenDefined('model-viewer').then(done);
        Shopify.loadFeatures([{ name: 'model-viewer-ui', version: '1.0', onLoad: () => {
          if (!customElements.get('model-viewer')) Shopify.loadFeatures([{ name: 'model-viewer', version: '1.12', onLoad: () => {} }]);
        } }]);
      }
    }
  }

  const define = (name, cls) => customElements.get(name) || customElements.define(name, cls);
  define('wf-section', WfSection);
  define('wf-localnav', WfLocalNav);
  define('wf-toggle', WfToggle);
  define('wf-foam', WfFoam);
  define('wf-cost', WfCost);
  define('wf-price', WfPrice);
  define('wf-buy', WfBuy);
  define('wf-explode', WfExplode);
  define('wf-model', WfModel);

  window.WaveFY27 = { money };
})();
