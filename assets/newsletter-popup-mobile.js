if (!customElements.get('newsletter-mobile-modal')) {
  customElements.define(
    'newsletter-mobile-modal',
    class NewsletterMobileModal extends ModalElement {
      constructor() {
        super();

        if (window.location.pathname === '/challenge' || !theme.cookiesEnabled) {
          return;
        }

        if (window.location.search.includes('awc=')) {
          sessionStorage.setItem('awin_referral', 'true');
          return;
        }
        if (sessionStorage.getItem('awin_referral')) {
          return;
        }

        if (!theme.config.isTouch || Shopify.designMode) {
          this.init();
        } else {
          new theme.initWhenVisible(theme.utils.throttle(this.init.bind(this)));
        }
      }

      get shouldLock() {
        return true;
      }

      get testMode() {
        return this.getAttribute('data-test-mode') === 'true';
      }

      get delay() {
        return this.hasAttribute('data-delay') ? parseInt(this.getAttribute('data-delay')) : 5;
      }

      get expiry() {
        return this.hasAttribute('data-expiry') ? parseInt(this.getAttribute('data-expiry')) : 30;
      }

      get cookieName() {
        return 'concept:newsletter-popup-mobile';
      }

      get submited() {
        return this.querySelector('.alert') !== null;
      }

      init() {
        if (this.initialized) return;
        this.initialized = true;

        this.bindSteps();

        if (this.submited) {
          this.load(1);
          return;
        }

        if (this.testMode || !this.getCookie(this.cookieName)) {
          this.load(this.delay);
        }
      }

      bindSteps() {
        this.form = this.querySelector('form');
        if (!this.form) return;

        this.tagsInput = this.form.querySelector('[data-newsletter-tags]');
        this.noteInput = this.form.querySelector('[data-newsletter-note]');

        // Sort steps by their data-step order
        this.stepEls = Array.from(this.form.querySelectorAll('.newsletter-step'))
          .sort((a, b) => Number(a.dataset.step) - Number(b.dataset.step));
        this.currentStep = 1;

        this.form.querySelectorAll('[data-newsletter-next]').forEach((btn) => {
          btn.addEventListener('click', this.onNext.bind(this));
        });
        this.form.querySelectorAll('[data-newsletter-skip]').forEach((btn) => {
          btn.addEventListener('click', this.onSkip.bind(this));
        });

        // If Shopify reloaded with errors, jump to the step matching the failing field
        if (this.submited && this.form.querySelector('.alert--error')) {
          const phone = this.form.querySelector('[data-newsletter-phone]');
          if (phone && phone.value) {
            this.showStepByName('mobile');
          }
        }
      }

      currentStepEl() {
        return this.stepEls.find((el) => Number(el.dataset.step) === this.currentStep);
      }

      validateStep(el) {
        if (!el) return true;
        const inputs = el.querySelectorAll('input[required]:not([type=hidden])');
        for (const input of inputs) {
          if (!input.checkValidity()) {
            input.reportValidity();
            return false;
          }
        }
        return true;
      }

      onNext(e) {
        e.preventDefault();
        const cur = this.currentStepEl();
        if (!this.validateStep(cur)) return;
        this.currentStep += 1;
        this.showStep(this.currentStep);
        const next = this.currentStepEl();
        if (next) {
          const firstInput = next.querySelector('input:not([type=hidden]):not([type=checkbox])');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
      }

      onSkip(e) {
        e.preventDefault();
        const cur = this.currentStepEl();
        if (!this.validateStep(cur)) return;

        // Disable any step after the current one so its fields don't post and required checks don't block submit
        let droppedMobile = false;
        this.stepEls.forEach((el) => {
          if (Number(el.dataset.step) > this.currentStep) {
            if (el.dataset.stepName === 'mobile') droppedMobile = true;
            el.querySelectorAll('input').forEach((input) => {
              input.required = false;
              if (input.type === 'checkbox') {
                input.checked = false;
              } else if (input.type !== 'hidden') {
                input.value = '';
              }
              input.disabled = true;
            });
          }
        });

        // Strip SMS consent tag if mobile step was skipped
        if (droppedMobile && this.tagsInput) {
          this.tagsInput.value = 'newsletter';
        }
        if (droppedMobile && this.noteInput) {
          this.noteInput.value = '';
        }

        this.form.submit();
      }

      showStep(n) {
        if (!this.stepEls) return;
        this.stepEls.forEach((el) => {
          el.classList.toggle('is-active', Number(el.dataset.step) === Number(n));
        });
      }

      showStepByName(name) {
        const target = this.stepEls.find((el) => el.dataset.stepName === name);
        if (target) {
          this.currentStep = Number(target.dataset.step);
          this.showStep(this.currentStep);
        }
      }

      load(delay) {
        if (Shopify.designMode) return;
        setTimeout(() => this.show(), delay * 1000);
      }

      afterShow() {
        super.afterShow();
        this.classList.add('show-image');

        // Stamp consent note with timestamp on open (used if user submits with mobile step intact)
        if (this.noteInput) {
          this.noteInput.value = 'SMS marketing consent captured ' + new Date().toISOString() + ' via newsletter popup';
        }
      }

      afterHide() {
        super.afterHide();
        this.classList.remove('show-image');

        if (this.testMode) {
          this.removeCookie(this.cookieName);
          return;
        }

        this.setCookie(this.cookieName, this.expiry);
      }

      getCookie(name) {
        const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
        return match ? match[2] : null;
      }

      setCookie(name, expiry) {
        document.cookie = `${name}=true; max-age=${(expiry * 24 * 60 * 60)}; path=/`;
      }

      removeCookie(name) {
        document.cookie = `${name}=; max-age=0`;
      }
    }
  );
}
