/* Wave FY27 product page modules. Registered here (not inline) so the components
   upgrade on every page load, section re-render and theme editor preview. */
(() => {
  if (!customElements.get('wave-size-costs')) {
          customElements.define('wave-size-costs', class extends HTMLElement {
            connectedCallback() {
              this.sizes = JSON.parse(this.querySelector('[data-sizes]').textContent);
              this.money = new Intl.NumberFormat(undefined, { style: 'currency', currency: this.dataset.currency || 'GBP' });
              this.saving = Number(this.dataset.saving || 30) / 100;
              this.cost = this.querySelector('.wpdp-cs__cost');
              this.kwh = this.cost ? parseFloat(this.cost.dataset.kwh) : NaN;
              this.price = this.querySelector('input[type="number"]');
              this.state = { size: 0, days: 15, edition: 'standard' };
              this.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => { this.state.size = Number(b.dataset.size); this.render(); }));
              this.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { this.state.days = Number(b.dataset.days); this.render(true); }));
              this.querySelectorAll('[data-edition]').forEach((b) => b.addEventListener('click', () => { this.state.edition = b.dataset.edition; this.render(true); }));
              if (this.price) this.price.addEventListener('input', () => this.render());
              this.render();
              if (this.cost && 'IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { this.countUp(); io.disconnect(); } }); }, { threshold: 0.35 });
                io.observe(this.cost);
              }
            }
            kwhFor() {
              const size = this.sizes[this.state.size] || {};
              const kwh = Number(size.kwh);
              return Number.isFinite(kwh) && kwh > 0 ? kwh : this.kwh;
            }
            monthly() {
              const rate = parseFloat(this.price && this.price.value) / 100;
              const base = this.kwhFor() * this.state.days * rate;
              return this.state.edition === 'es' ? base * (1 - this.saving) : base;
            }
            set(key, value) {
              const el = this.querySelector(`[data-out="${key}"]`);
              if (el) el.textContent = Number.isFinite(value) ? this.money.format(value) : '—';
            }
            render(animate) {
              const size = this.sizes[this.state.size] || {};
              this.querySelectorAll('[data-size-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.sizePanel) !== this.state.size; });
              this.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.size) === this.state.size)));
              this.querySelectorAll('[data-days]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.days) === this.state.days)));
              this.querySelectorAll('[data-edition]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.edition === this.state.edition)));
              const hasEs = Number(size.es) > 0;
              const wrap = this.querySelector('[data-edition-wrap]');
              if (wrap) wrap.hidden = !hasEs;
              if (!hasEs && this.state.edition === 'es') this.state.edition = 'standard';
              const note = this.querySelector('[data-saving-note]');
              if (note) note.hidden = this.state.edition !== 'es';
              const price = this.state.edition === 'es' && hasEs ? size.es : size.price;
              this.set('price', Number(price) / 100);
              const kwh = this.kwhFor();
              if (!this.cost || !Number.isFinite(kwh)) return;
              const month = this.monthly();
              if (animate) { this.countUp(); } else { this.set('month', month); }
              const rate = parseFloat(this.price.value) / 100;
              const perDay = this.state.edition === 'es' ? kwh * rate * (1 - this.saving) : kwh * rate;
              this.set('day', perDay);
              this.set('year', month * 12);
              const basis = this.querySelector('[data-basis]');
              if (basis) {
                const kwhShown = this.state.edition === 'es' ? (kwh * (1 - this.saving)).toFixed(1) : kwh;
                basis.textContent = `${kwhShown} kWh a day, used ${this.state.days} days a month, at ${this.price.value}p per kWh.`;
              }
            }
            countUp() {
              const target = this.monthly();
              const out = this.querySelector('[data-out="month"]');
              if (!out || !Number.isFinite(target)) return;
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.set('month', target); return; }
              const start = performance.now();
              const step = (now) => {
                const progress = Math.min((now - start) / 900, 1);
                out.textContent = this.money.format(target * (1 - Math.pow(1 - progress, 3)));
                if (progress < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
          });
        }

  if (!customElements.get('wave-jet-map')) {
          customElements.define('wave-jet-map', class extends HTMLElement {
            connectedCallback() {
              this.querySelectorAll('[data-layer]').forEach((button) => {
                button.addEventListener('click', () => {
                  const active = button.getAttribute('aria-pressed') === 'true';
                  this.querySelectorAll('[data-layer]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
                  if (active) { this.removeAttribute('data-focus'); return; }
                  button.setAttribute('aria-pressed', 'true');
                  this.setAttribute('data-focus', button.dataset.layer);
                });
              });
            }
          });
        }
})();
