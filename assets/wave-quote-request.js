/*
  Wave: Quote request.
  Opens the delivery & installation form and sends it to Zendesk as an anonymous request:
    1. each photo → POST https://<sub>.zendesk.com/api/v2/uploads.json  (returns a token)
    2. POST https://<sub>.zendesk.com/api/v2/requests.json with subject "<prefix> #<ref>"
  Zendesk allows both anonymously and sends CORS headers, so no app or proxy is needed.
*/
(() => {
  if (customElements.get('wave-quote-request')) return;

  const MAX_FILES = 8;
  const MAX_BYTES = 20 * 1024 * 1024;
  const SUPPORT_EMAIL = 'support@wavespas.com';

  const makeRef = () => {
    // 7 digits: last 5 of the timestamp + 2 random. Unique enough for a human-read reference.
    const t = String(Date.now()).slice(-5);
    const r = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `${t}${r}`.replace(/^0/, '1');
  };

  class WaveQuoteRequest extends HTMLElement {
    connectedCallback() {
      if (this.dialog) return;
      this.dialog = this.querySelector('dialog.wq');
      if (!this.dialog) return;
      // Move the dialog out of product-info / the product form.
      document.body.appendChild(this.dialog);

      this.form = this.dialog.querySelector('[data-wq-form]');
      this.errorEl = this.dialog.querySelector('[data-wq-error]');
      this.files = {}; // key → File[]
      try {
        this.variants = JSON.parse(this.dialog.querySelector('[data-wq-variants]')?.textContent || '{}');
      } catch (e) {
        this.variants = {};
      }

      this.querySelector('[data-wq-open]')?.addEventListener('click', () => this.open());
      this.dialog.querySelectorAll('[data-wq-close]').forEach((b) => b.addEventListener('click', () => this.close()));
      this.dialog.addEventListener('click', (e) => {
        if (e.target === this.dialog) this.close(); // backdrop
      });
      this.dialog.addEventListener('close', () => document.documentElement.classList.remove('wq-lock'));

      this.dialog.querySelectorAll('[data-wq-files]').forEach((input) => this.initDrop(input));
      this.form.addEventListener('submit', (e) => this.submit(e));
      this.form.addEventListener('change', (e) => {
        const q = e.target.closest('.wq-q');
        if (q) q.removeAttribute('data-invalid');
        if (e.target.matches('.wq-input')) e.target.removeAttribute('aria-invalid');
      });
      this.form.addEventListener('input', (e) => {
        if (e.target.matches('.wq-input')) e.target.removeAttribute('aria-invalid');
      });
    }

    open() {
      this.syncModel();
      this.dialog.showModal();
      document.documentElement.classList.add('wq-lock');
      this.dialog.querySelector('.wq__scroll').scrollTop = 0;
      window.dataLayer?.push({ event: 'sauna_quote_open', product: this.dialog.dataset.productTitle });
    }

    close() {
      this.dialog.close();
    }

    // Keep "model and size" in step with the variant picked on the page (unless the customer typed their own).
    syncModel() {
      const input = this.dialog.querySelector('[data-wq-model]');
      if (!input || input.dataset.touched) return;
      const fid = CSS.escape(this.dialog.dataset.productForm);
      const idInput = document.querySelector(`#${fid} [name="id"], [name="id"][form="${fid}"]`);
      const vid = idInput?.value || new URLSearchParams(location.search).get('variant');
      const title = this.dialog.dataset.productTitle;
      const vTitle = vid && this.variants[vid];
      // No variant found on the page → keep the server-rendered value (selected variant).
      if (title && vTitle) input.value = vTitle !== 'Default Title' ? `${title} – ${vTitle}` : title;
      if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => (input.dataset.touched = '1'));
      }
    }

    initDrop(input) {
      const key = input.dataset.wqFiles;
      const wrap = input.closest('[data-wq-drop]');
      const list = wrap.querySelector('[data-wq-list]');
      this.files[key] = [];

      const add = (fileList) => {
        const errors = [];
        [...fileList].forEach((f) => {
          if (!f.type.startsWith('image/')) return errors.push(`${f.name} isn’t a photo.`);
          if (f.size > MAX_BYTES) return errors.push(`${f.name} is over 20MB.`);
          if (this.files[key].length >= MAX_FILES) return errors.push(`Up to ${MAX_FILES} photos here.`);
          this.files[key].push(f);
        });
        render();
        if (errors.length) this.showError([...new Set(errors)].join(' '));
        else this.hideError();
      };

      const render = () => {
        list.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
        list.innerHTML = '';
        this.files[key].forEach((f, i) => {
          const li = document.createElement('li');
          li.className = 'wq-thumb';
          const img = document.createElement('img');
          img.src = URL.createObjectURL(f);
          img.alt = f.name;
          const rm = document.createElement('button');
          rm.type = 'button';
          rm.setAttribute('aria-label', `Remove ${f.name}`);
          rm.textContent = '×';
          rm.addEventListener('click', () => {
            this.files[key].splice(i, 1);
            render();
          });
          li.append(img, rm);
          list.appendChild(li);
        });
      };

      input.addEventListener('change', () => {
        add(input.files);
        input.value = '';
      });
      const zone = wrap.querySelector('.wq-drop__zone');
      ['dragenter', 'dragover'].forEach((t) =>
        zone.addEventListener(t, (e) => {
          e.preventDefault();
          wrap.setAttribute('data-over', '');
        })
      );
      ['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, () => wrap.removeAttribute('data-over')));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files) add(e.dataTransfer.files);
      });
    }

    validate() {
      let first = null;
      this.form.querySelectorAll('.wq-input[required]').forEach((el) => {
        const ok = el.value.trim() !== '' && el.checkValidity();
        if (ok) el.removeAttribute('aria-invalid');
        else el.setAttribute('aria-invalid', 'true');
        if (!ok && !first) first = el;
      });
      this.form.querySelectorAll('.wq-q').forEach((q) => {
        const req = q.querySelector('input[required]');
        if (!req) return;
        const ok = !!q.querySelector('input:checked');
        q.toggleAttribute('data-invalid', !ok);
        if (!ok && !first) first = q.querySelector('input');
      });
      if (first) {
        this.showError('Please add your name, email and delivery postcode.');
        first.focus({ preventScroll: true });
        first.closest('.wq-field, .wq-q')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      return true;
    }

    value(name) {
      return (this.form.elements[name]?.value || '').trim();
    }

    checked(name) {
      return [...this.form.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value);
    }

    async upload(sub, file, prefix, token) {
      const name = `${prefix}-${file.name}`.replace(/[^\w.\-]+/g, '-');
      const url = `https://${sub}.zendesk.com/api/v2/uploads.json?filename=${encodeURIComponent(name)}${token ? `&token=${token}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/binary' },
        body: file,
      });
      if (!res.ok) throw new Error(`upload ${res.status}`);
      const data = await res.json();
      return data.upload?.token;
    }

    async submit(e) {
      e.preventDefault();
      this.hideError();
      // The theme's hover-button marks the submit button busy on any form submit (it expects a page load).
      const unbusy = () => setTimeout(() => this.form.querySelector('[data-wq-submit]')?.removeAttribute('aria-busy'));
      if (this.value('company_website')) return unbusy(); // bot
      if (!this.validate()) return unbusy();

      const d = this.dialog.dataset;
      const sub = d.subdomain || 'waveglobal';
      const ref = makeRef();
      const subject = `${d.subject || 'Sauna Quote'} #${ref}`;
      const btn = this.form.querySelector('[data-wq-submit]');
      const label = this.form.querySelector('[data-wq-submit-label]');
      const idle = label.textContent;
      btn.setAttribute('aria-busy', 'true');

      const route = this.files['access-route'] || [];
      const base = this.files['base'] || [];
      const all = [...route.map((f) => ['access-route', f]), ...base.map((f) => ['base', f])];

      try {
        let token = null;
        for (let i = 0; i < all.length; i++) {
          label.textContent = `Uploading photo ${i + 1} of ${all.length}…`;
          // Reusing the first token attaches every photo to the same comment.
          token = (await this.upload(sub, all[i][1], all[i][0], token)) || token;
        }
        label.textContent = 'Sending…';

        const obstacles = this.checked('obstacles');
        const body = [
          `${subject}`,
          `Sent from: ${d.productUrl}`,
          '',
          '— Customer —',
          `Name: ${this.value('name')}`,
          `Email: ${this.value('email')}`,
          `Phone: ${this.value('phone')}`,
          `Delivery postcode: ${this.value('postcode').toUpperCase()}`,
          `Sauna model and size: ${this.value('model')}`,
          '',
          '— Site —',
          `Can a large lorry get to the property? ${this.checked('lorry')[0] || '-'}`,
          `Distance from the road to the sauna spot: ${this.checked('distance')[0] || '-'}`,
          `Obstacles on the way: ${obstacles.length ? obstacles.join(', ') : 'None ticked'}`,
          `Base already in place? ${this.checked('base')[0] || '-'}`,
          `Interested in assembly? ${this.checked('assembly')[0] || '-'}`,
          '',
          '— Photos —',
          `Access route / location: ${route.length}`,
          `Base: ${base.length}`,
          '',
          '— Anything else —',
          this.value('notes') || '(nothing added)',
        ].join('\n');

        const res = await fetch(`https://${sub}.zendesk.com/api/v2/requests.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: {
              requester: { name: this.value('name'), email: this.value('email') },
              subject,
              comment: token ? { body, uploads: [token] } : { body },
            },
          }),
        });
        if (!res.ok) throw new Error(`request ${res.status}`);

        window.dataLayer?.push({ event: 'sauna_quote_submit', product: d.productTitle, quote_ref: ref });
        this.done(ref);
      } catch (err) {
        console.warn('[WaveQuote]', err);
        const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
        this.showError(
          `Sorry, we couldn’t send that just now. Please try again, or email <a href="${mail}">${SUPPORT_EMAIL}</a> with your details and photos.`,
          true
        );
      } finally {
        btn.removeAttribute('aria-busy');
        label.textContent = idle;
      }
    }

    done(ref) {
      this.dialog.querySelector('[data-wq-view="form"]').hidden = true;
      const view = this.dialog.querySelector('[data-wq-view="done"]');
      view.querySelector('[data-wq-ref]').textContent = `#${ref}`;
      view.hidden = false;
      this.dialog.querySelector('.wq__scroll').scrollTop = 0;
      view.focus();
      // Reset for a second request on the same page.
      this.form.reset();
      delete this.dialog.querySelector('[data-wq-model]')?.dataset.touched;
      Object.keys(this.files).forEach((k) => (this.files[k] = []));
      this.dialog.querySelectorAll('[data-wq-list]').forEach((l) => (l.innerHTML = ''));
      this.dialog.addEventListener(
        'close',
        () => {
          view.hidden = true;
          this.dialog.querySelector('[data-wq-view="form"]').hidden = false;
        },
        { once: true }
      );
    }

    showError(msg, html = false) {
      this.errorEl[html ? 'innerHTML' : 'textContent'] = msg;
      this.errorEl.hidden = false;
    }

    hideError() {
      this.errorEl.hidden = true;
    }
  }

  customElements.define('wave-quote-request', WaveQuoteRequest);

  const style = document.createElement('style');
  style.textContent = 'html.wq-lock{overflow:hidden}';
  document.head.appendChild(style);
})();
