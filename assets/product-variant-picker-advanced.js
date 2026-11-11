/* Stepped variant picker (snippets/product-variant-picker-advanced.liquid).
   The per-product data is pushed inline by the snippet:
     (window.WaveVPA = window.WaveVPA || []).push({ id: 'vpa-…', … });
   This file can load before or after those pushes. */
(function () {
  'use strict';

  function init(cfg) {
    var root = document.getElementById(cfg.id);
    if (!root) return;

    // ═══ Constants & state ═══════════════════════════════════════════════
    var vpaId          = root.id;
    var optionCount    = cfg.optionCount;
    var formId         = root.dataset.formId;
    var enableDynamic  = root.dataset.dynamic === 'true';
    var productHandle  = root.dataset.productHandle;
    var productTitle   = root.dataset.productTitle || '';
    var sectionId      = root.dataset.sectionId;
    var productId      = cfg.productId;
    var galleryElId    = 'ProductGallery-' + sectionId + '-' + productId;
    // Section Rendering fetches must go to the *market-local* product URL.
    // '/products/<handle>' only resolves on the primary market: on /en-us the
    // -etl handles carry a Shopify URL redirect, so Shopify 301s the fetch to
    // /collections/hot-tub-full-range, the parsed document has no
    // ProductGallery element, and every server-driven update below silently
    // no-ops — colour changes, images/prices don't. product.url is what the
    // rest of the theme uses and is already prefixed ('/en-us/products/...'),
    // so it is correct on every market without any string surgery here.
    var productUrl     = (root.dataset.productUrl || ('/products/' + productHandle)).split('?')[0];
    function sectionUrl(params) {
      return productUrl + '?' + params;
    }
    var chipPrefix     = cfg.chipPrefix;
    // Same trim patterns the Liquid uses, applied identically in JS so the
    // chip text doesn't suddenly diverge when the JS re-renders it on
    // selection change. One pattern per line in the textarea setting.
    var chipTrimRaw    = cfg.chipTrimRaw;
    var chipTrimPatterns = chipTrimRaw.split('\n').map(function (p) { return p.trim(); }).filter(Boolean);
    function cleanPreOrderText(s) {
      if (!s) return '';
      var out = String(s);
      for (var i = 0; i < chipTrimPatterns.length; i++) {
        out = out.split(chipTrimPatterns[i]).join('');
      }
      return out.trim();
    }
    var moneyFormat    = cfg.moneyFormat;
    // Max characters of the spa SKU prefix used to find a matching add-on
    // variant (e.g. "GAR4" from "GAR4CHARATUK"). Matcher walks DOWN from
    // this length until it finds a hit, so 4 is a safe ceiling for the
    // current SKU naming convention (4-char model+size codes).
    var skuPrefixLength = cfg.skuPrefixLength;
    var skuMatchingEnabled = cfg.skuMatchingEnabled;
    var mostPopularMinStock = cfg.mostPopularMinStock;
    // When true, a sold-out tile shows only the Sold Out pill; when false
    // (default) the % OFF pill stays and Sold Out stacks below it.
    var soldOutHideDiscount = cfg.soldOutHideDiscount;
    // Add-on row visibility, one flag per stock state. Defaults reproduce the
    // previous hardcoded behaviour: out-of-stock hidden, everything else shown.
    var addonsShowInStock  = cfg.addonsShowInStock;
    var addonsShowPreOrder = cfg.addonsShowPreOrder;
    var addonsShowOOS      = cfg.addonsShowOOS;
    var addonSoldOutLabel  = cfg.addonSoldOutLabel;

    // Spa model token, auto-derived from product title (first word).
    // Used as a required keyword for add-ons with model-prefixed variants
    // like "Tahoe / 4 Person", "Garda / 4 Person", "Como / 6 Person".
    var spaModelToken = (productTitle.split(/\s+/)[0] || '').toLowerCase();
    if (spaModelToken.length < 3) spaModelToken = '';

    // Currently-resolved main spa variant — JS state, not the form's hidden
    // input (which is server-rendered disabled in this theme).
    var currentMainVariantId = cfg.currentMainVariantId;

    // User's current option selections, keyed by Shopify option position (1..N).
    var selected = {};

    // ═══ Server-side data maps ═══════════════════════════════════════════
    // Each map uses a prefix-comma pattern so a blank-metafield entry can't
    // leave a trailing comma (which would break the inline script).
    var variants = cfg.variants;

    // variant id → pre-order date string (market-aware)
    var preOrderByVariant = cfg.preOrderByVariant;

    // variant id → featured image URL (for swapping tile media on colour
    // change). Tile media is 48-64px depending on the Size preset, so 128px
    // covers 2x retina on the largest case without delivering a 1MB jpeg.
    var variantImageUrl = cfg.variantImageUrl;

    // variant id → inventory_quantity (for variant-level Most Popular gating)
    var inventoryByVariant = cfg.inventoryByVariant;

    // variant id → SKU (for add-on SKU-prefix matching)
    var spaVariantSku = cfg.spaVariantSku;

    // variant id → first gang_media item. This theme stores per-variant media
    // in variant.metafields.theme.gang_media (a list), and the media-gallery
    // section reads it server-side. But the gallery's variant:change listener
    // only looks at variant.featured_media — so for variants that use
    // gang_media but not featured_media, the gallery wouldn't swap. We
    // surface the first gang_media item here and synthesise it as
    // featured_media when dispatching, so the gallery's setActiveMedia call
    // hits the right media id.
    var gangMediaByVariant = cfg.gangMediaByVariant;

    // addon handle → variants[] (for resolving the right add-on variant per spa selection)
    var addonVariants = cfg.addonVariants;

    // ═══ Schema-driven match tables (parsed from textarea settings) ══════
    // Parses "key: value\nkey: value" textareas into a JS map. Defaults to
    // lowercased keys (for case-insensitive lookup), but the optional
    // transforms let callers normalise either side — e.g. uppercase both
    // for the SKU map.
    function parseKVLines(text, valueTransform, keyTransform) {
      var map = {};
      var keyT = keyTransform || function (k) { return k.toLowerCase(); };
      String(text || '').split('\n').forEach(function (line) {
        var idx = line.indexOf(':');
        if (idx === -1) return;
        var k = line.slice(0, idx).trim();
        var v = line.slice(idx + 1).trim();
        if (k && v) map[keyT(k)] = valueTransform ? valueTransform(v) : v;
      });
      return map;
    }
    var upper = function (s) { return s.toUpperCase(); };

    // Explicit spa-SKU → add-on-SKU map. Keys & values stored UPPER for case-insensitive matching.
    var skuExplicitMap = parseKVLines(
      cfg.addonSkuMatchMap,
      upper, upper
    );
    // Longest-pattern-first so specific entries override broad ones.
    var skuExplicitKeys = Object.keys(skuExplicitMap).sort(function (a, b) { return b.length - a.length; });

    // Fallback keyword map for non-SKU matching: spa size value → comma-separated keywords.
    var addonMatchMap = parseKVLines(cfg.addonVariantMatchMap);

    // ═══ Cached DOM references ═══════════════════════════════════════════
    var addonsStepEl = root.querySelector('[data-addons-step]');
    var sizeStepEl   = root.querySelector('.vpa__step[data-is-size="true"]');
    var sizeOptionPos = sizeStepEl ? +sizeStepEl.dataset.optionPosition : null;

    // ═══ Utilities ═══════════════════════════════════════════════════════
    function formatMoney(cents) {
      var n = (cents / 100).toFixed(2);
      var withCommas = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return moneyFormat
        .replace(/\{\{\s*amount\s*\}\}/g, withCommas)
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(cents / 100))
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, withCommas)
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, Math.round(cents / 100))
        .replace(/<[^>]*>/g, ''); // strip HTML so textContent renders the glyph not markup
    }

    // ═══ Variant resolution ═════════════════════════════════════════════
    // Option-value comparisons are normalised (trim + lowercase) because
    // merchant-entered Shopify option values aren't always byte-identical
    // across variants — e.g. one set of variants stores "Pebble White" and
    // another stores "Pebble White " with a trailing space, which makes a
    // strict === colour filter silently drop those variants and the
    // resolver falls back to the wrong colour. Normalisation costs nothing
    // and is safe because every value flows through here, including the
    // ones we read off radio inputs (`data-value`).
    function normOpt(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

    // Variant that matches ALL current selections (used for the main spa variant).
    function findVariant() {
      return variants.find(function (v) {
        for (var i = 1; i <= optionCount; i++) {
          if (normOpt(selected[i]) !== normOpt(v['option' + i])) return false;
        }
        return true;
      });
    }

    // Variant that matches a tile's option value + the user's OTHER selections
    // (used for per-tile chip/image/Most-Popular evaluation).
    function variantForTile(pos, value) {
      var tileVal = normOpt(value);
      return variants.find(function (v) {
        if (normOpt(v['option' + pos]) !== tileVal) return false;
        for (var i = 1; i <= optionCount; i++) {
          if (i === pos) continue;
          if (selected[i] && normOpt(selected[i]) !== normOpt(v['option' + i])) return false;
        }
        return true;
      });
    }

    // ═══ UI updaters — keep DOM in sync with `selected` ══════════════════
    function updateAvailability() {
      if (!enableDynamic) return;
      root.querySelectorAll('input[data-option-position]').forEach(function (input) {
        // Colour step is always interactive — stock/availability cascades
        // through size + edition rather than locking colour choices.
        var step = input.closest('.vpa__step');
        if (step && step.dataset.isColor === 'true') return;

        var pos = +input.dataset.optionPosition;
        var value = normOpt(input.dataset.value);
        var possible = variants.some(function (v) {
          // Selectable if available in stock, back-orderable, OR has a pre-order date.
          if (!v.available && !preOrderByVariant[v.id]) return false;
          if (normOpt(v['option' + pos]) !== value) return false;
          for (var i = 1; i <= optionCount; i++) {
            if (i === pos) continue;
            if (selected[i] && normOpt(selected[i]) !== normOpt(v['option' + i])) return false;
          }
          return true;
        });
        var label = input.closest('label');
        if (label) label.classList.toggle('vpa__choice--unavailable', !possible);
        input.disabled = !possible;
      });
    }

    // A colour counts as sold out only when EVERY variant of that colour is
    // unsellable — no stock and no pre-order date. Marked, never disabled: the
    // colour stays clickable so availability keeps cascading through the size
    // + edition steps and the shopper can see which combinations are gone.
    // Selection-independent, so this doesn't belong in updateAllTiles; it's
    // re-run when the live pre-order map lands, since a pre-order date is
    // what can flip a colour back to sellable.
    function markSoldOutColours() {
      root.querySelectorAll('.vpa__step[data-is-color="true"] input[data-option-position]').forEach(function (input) {
        var pos = +input.dataset.optionPosition;
        var value = normOpt(input.dataset.value);
        var anySellable = variants.some(function (v) {
          return normOpt(v['option' + pos]) === value && (v.available || preOrderByVariant[v.id]);
        });
        var label = input.closest('label');
        if (label) label.classList.toggle('vpa__choice--sold-out', !anySellable);
      });
    }

    // Lock later steps until earlier steps have a value; renumber badges in
    // display order; reveal/hide the Add-Ons step.
    function renumberAndLock() {
      var optionSteps = Array.prototype.slice
        .call(root.querySelectorAll('.vpa__step[data-option-position]'))
        .sort(function (a, b) { return +a.dataset.stepNum - +b.dataset.stepNum; });

      var allChosen = true;
      optionSteps.forEach(function (step, i) {
        var pos = +step.dataset.optionPosition;
        var prevAllChosen = i === 0 || optionSteps.slice(0, i).every(function (s) { return selected[+s.dataset.optionPosition]; });
        var chosen = selected[pos];

        step.classList.toggle('vpa__step--locked', !prevAllChosen);
        step.classList.toggle('vpa__step--complete', !!chosen);

        var num = step.querySelector('[data-num-label]');
        if (num) num.textContent = i + 1;
        var status = step.querySelector('[data-status]');
        if (status && !/optional/i.test(status.textContent)) status.textContent = chosen || '';

        if (!chosen) allChosen = false;
      });

      if (addonsStepEl) {
        if (allChosen) {
          addonsStepEl.setAttribute('data-revealed', 'true');
          addonsStepEl.setAttribute('aria-hidden', 'false');
        } else {
          addonsStepEl.removeAttribute('data-revealed');
          addonsStepEl.setAttribute('aria-hidden', 'true');
        }
        var addonsNum = addonsStepEl.querySelector('[data-num-label]');
        if (addonsNum) addonsNum.textContent = optionSteps.length + 1;
      }
      return allChosen;
    }

    // Per-tile UI: pre-order chip text, variant image swap, Most Popular pill,
    // Sold Out treatment. All evaluated at the variant resolved for the tile
    // under the user's current selections (not the colour-level rep variant).
    // Lazy-cache per-tile child element references the update functions
    // need. Caching on the label itself avoids re-querying the DOM on every
    // selection click — with ~30 tiles per page it removes ~150 querySelector
    // calls per updateAllTiles() pass.
    function tileRefs(label) {
      if (label._vpa) return label._vpa;
      return label._vpa = {
        chip:       label.querySelector('[data-pre-order-chip]'),
        chipText:   label.querySelector('[data-pre-order-chip-text]'),
        img:        label.querySelector('.vpa__tile-media img'),
        soldOutTag: label.querySelector('[data-sold-out]'),
        mostPopTag: label.querySelector('[data-most-popular]'),
        discount:   label.querySelector('[data-tile-discount]'),
        name:       label.querySelector('.vpa__tile-name')
      };
    }

    function updateTilePreOrderChip(label, variant) {
      var refs = tileRefs(label);
      if (!refs.chip) return;
      // Text node lives in a child span so the calendar icon next to it
      // isn't wiped on every update.
      var textEl = refs.chipText || refs.chip;
      var date = variant ? preOrderByVariant[variant.id] : null;
      if (date) {
        // Use the merchant-controlled trim patterns (same as the Liquid path)
        // so the prefix doesn't double up with whatever's in the metafield.
        var cleaned = cleanPreOrderText(date);
        textEl.textContent = (chipPrefix ? chipPrefix + ' ' : '') + cleaned;
        refs.chip.hidden = false;
      } else {
        textEl.textContent = '';
        refs.chip.hidden = true;
      }
    }

    // Edition tiles read "<size> <edition>" — e.g. "6 Person Standard". The
    // size is taken off the variant the tile resolves to (not the raw
    // selection, so it stays right during a partial selection) with everything
    // from the first "|" onward dropped: "6 Person | 185x65cm" → "6 Person".
    // Re-derived on every pass so switching size relabels the edition tiles.
    // Mirrors the Liquid path exactly — refreshSectionFromServer merges
    // server-rendered tiles into this DOM, so the two must agree.
    function updateTileName(label, variant) {
      if (label.dataset.tilePrefixSize !== 'true') return;
      var nameEl = tileRefs(label).name;
      if (!nameEl) return;
      var base = label.dataset.tileValue || '';
      var raw = (variant && sizeOptionPos) ? variant['option' + sizeOptionPos] : null;
      var prefix = raw ? String(raw).split('|')[0].trim() : '';
      nameEl.textContent = prefix ? prefix + ' ' + base : base;
    }

    function updateTileMedia(label, variant) {
      if (!variant) return;
      var img = tileRefs(label).img;
      if (!img) return;
      var url = variantImageUrl[variant.id];
      if (url && img.src !== url) {
        img.src = url;
        img.removeAttribute('srcset');
        img.removeAttribute('data-src');
      }
    }

    function updateTilePills(label, variant, opts) {
      var refs = tileRefs(label);
      var hasPreOrder = variant ? !!preOrderByVariant[variant.id] : false;
      var sellable = variant ? (variant.available || hasPreOrder) : false;
      var soldOut = !sellable;

      // Sold Out applies to every tile step — Size, Edition, and any other
      // option. The old `opts.isSize &&` gate left an unbuyable edition
      // looking perfectly buyable.
      if (refs.soldOutTag) refs.soldOutTag.hidden = !soldOut;
      label.classList.toggle('vpa__tile--sold-out', soldOut);

      // Discount pill. Only ever un-hide a tile that actually has a discount
      // to show (data-has-discount) — otherwise we'd reveal an empty pill.
      if (refs.discount && refs.discount.dataset.hasDiscount === 'true') {
        refs.discount.hidden = soldOut && soldOutHideDiscount;
      }

      // Most Popular: first-of-its-option, sellable, inventory > threshold.
      // `sellable` already excludes sold-out, so no separate soldOut term.
      if (refs.mostPopTag) {
        var qty = variant ? (inventoryByVariant[variant.id] || 0) : 0;
        refs.mostPopTag.hidden = !(opts.isFirst && sellable && qty > mostPopularMinStock);
      }
    }

    function updateAllTiles() {
      root.querySelectorAll('label[data-tile-option-position]').forEach(function (label) {
        var pos = +label.dataset.tileOptionPosition;
        var value = label.dataset.tileValue;
        var variant = variantForTile(pos, value);
        updateTilePreOrderChip(label, variant);
        updateTileName(label, variant);
        updateTileMedia(label, variant);
        updateTilePills(label, variant, {
          isFirst: label.dataset.tileIsFirst === 'true'
        });
      });
    }

    // Fire the variant:change event the theme's media gallery + other PDP
    // blocks listen for. Works for any variant — full match or partial.
    // If the variant lacks Shopify's built-in featured_media but has the
    // theme's per-variant gang_media metafield, synthesise a featured_media
    // from the first gang_media item so the gallery's setActiveMedia call
    // still finds the right media id and swaps the hero image.
    function dispatchVariantChange(variant) {
      if (!variant) return;
      if (!variant.featured_media && gangMediaByVariant[variant.id]) {
        var gm = gangMediaByVariant[variant.id];
        variant = Object.assign({}, variant, {
          featured_media: { id: gm.id, alt: gm.alt, position: gm.position, preview_image: gm.preview_image, media_type: gm.media_type }
        });
      }
      var form = document.getElementById(formId);
      if (!form) return;
      // media-gallery.setActiveMedia (theme.js) calls scrollIntoView on the
      // newly-active media item, which yanks the page back up to the gallery
      // every time the user picks a variant. Neutralise scrollIntoView for
      // the duration of the dispatch (handler chain is synchronous) and
      // restore it immediately after, so smooth scroll never schedules.
      var origScrollIntoView = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function () {};
      try {
        form.dispatchEvent(new CustomEvent('variant:change', {
          bubbles: true,
          detail: { variant: variant }
        }));
      } finally {
        Element.prototype.scrollIntoView = origScrollIntoView;
      }
    }

    // First variant compatible with the user's current selections (any subset).
    // Used to surface a representative image for the gallery / price block
    // while the user is still mid-flow (e.g. has only picked colour so far).
    function findFirstCompatibleVariant() {
      return variants.find(function (v) {
        for (var i = 1; i <= optionCount; i++) {
          if (selected[i] && normOpt(selected[i]) !== normOpt(v['option' + i])) return false;
        }
        return true;
      });
    }

    // Reflect the resolved variant in the address bar (?variant=<id>), the same
    // as Shopify's standard picker (ProductInfo.updateURL) — keeps the URL
    // shareable/deep-linkable and matches the other Wave storefronts. The
    // advanced picker bypasses ProductInfo, so it has to do this itself. Mirror
    // the theme's guard: skip when the host product-info opts out via
    // data-update-url="false" (e.g. quick-view / featured-product embeds), and
    // skip entirely when there's no product-info wrapper so we never rewrite the
    // URL from a homepage/quick-view context.
    function updateUrlForVariant(variantId) {
      if (!variantId) return;
      var info = root.closest('product-info');
      if (!info || info.getAttribute('data-update-url') === 'false') return;
      try {
        var url = new URL(window.location.href);
        if (url.searchParams.get('variant') === String(variantId)) return;
        url.searchParams.set('variant', variantId);
        window.history.replaceState({ path: url.toString() }, '', url.toString());
      } catch (e) { /* URL API unavailable — non-fatal */ }
    }

    // Sync the host form's hidden id input, the URL, AND fire variant:change.
    function syncFormVariant(variant) {
      if (!variant) return;
      currentMainVariantId = variant.id;
      updateUrlForVariant(variant.id);
      var form = document.getElementById(formId);
      if (!form) return;
      var idInput = form.querySelector('input[name="id"]');
      if (idInput && idInput.value != variant.id) {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      dispatchVariantChange(variant);
    }

    // ═══ Add-to-Cart button + pre-order message state ════════════════════
    // The standard theme drives the submit button (disabled state + Sold Out /
    // Pre-Order / Add to Cart label) and the per-variant "ships …" pre-order
    // message through ProductInfo, triggered by the *standard* <variant-picker>.
    // This advanced picker replaces that picker and runs its own section
    // refresh, which doesn't touch either — so without this the button and the
    // pre-order message stay frozen on the previously-selected colour. That let
    // a sold-out colour add the prior colour to cart, and left an out-of-stock
    // colour showing the wrong (stuck) pre-order message. We assert both here
    // from the resolved variant.

    // The primary Add-to-Cart button(s) bound to the host form. Excludes the
    // dynamic-checkout / payment button (it carries no name="add").
    function buyButtonEls() {
      var els = [];
      var form = document.getElementById(formId);
      if (form) {
        form.querySelectorAll('button[name="add"], button.product-form__submit').forEach(function (b) {
          if (els.indexOf(b) === -1) els.push(b);
        });
      }
      document.querySelectorAll('button[name="add"][form="' + formId + '"], button.product-form__submit[form="' + formId + '"]').forEach(function (b) {
        if (els.indexOf(b) === -1) els.push(b);
      });
      return els;
    }

    // Resolve the variant representing the current (possibly partial) selection.
    // Prefer a full match; otherwise the first compatible variant, preferring a
    // sellable one (in stock or pre-orderable) so a colour with one sold-out
    // size/edition doesn't read as sold-out when another combo is buyable.
    function resolveActiveVariant() {
      var full = findVariant();
      if (full) return full;
      var fallback = null;
      for (var k = 0; k < variants.length; k++) {
        var v = variants[k];
        var ok = true;
        for (var i = 1; i <= optionCount; i++) {
          if (selected[i] && normOpt(selected[i]) !== normOpt(v['option' + i])) { ok = false; break; }
        }
        if (!ok) continue;
        if (v.available || preOrderByVariant[v.id]) return v;
        if (!fallback) fallback = v;
      }
      return fallback;
    }

    // Show only the pre-order "ships …" message block for the given variant id
    // (matches ProductInfo.updatePreOrderMessagesVisibility, which this picker
    // bypasses — hence the message stayed stuck on the previously-shown colour).
    // Pass null to hide them all. Scoped to this product's <product-info>.
    function setActivePreOrderMessage(variantId) {
      var scope = root.closest('product-info') || document;
      var blocks = scope.querySelectorAll('.pre-order-message-block[data-pre-order]');
      if (!blocks.length) return;
      var idStr = variantId != null ? String(variantId) : '';
      blocks.forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-pre-order') === idStr);
      });
    }

    function setBuyButtonState(state) {
      // state: 'buy' | 'preorder' | 'soldout'
      var strings = (window.theme && theme.variantStrings) || {};
      var soldOut = state === 'soldout';
      var preorder = state === 'preorder';
      var label = soldOut ? (strings.soldOut || 'Sold out')
        : preorder ? (strings.preOrder || 'Pre-Order')
        : (strings.addToCart || 'Add to cart');
      buyButtonEls().forEach(function (btn) {
        var textEl = btn.querySelector('.btn-text > span') || btn.querySelector('.btn-text');
        // Keep data-pre-order in sync with the resolved variant so the theme's
        // own label-restore logic (e.g. after an add-to-cart error) doesn't
        // revert an in-stock variant back to "Pre-Order".
        btn.toggleAttribute('data-pre-order', preorder);
        if (soldOut) {
          btn.disabled = true;
          btn.setAttribute('disabled', '');
        } else {
          btn.disabled = false;
          btn.removeAttribute('disabled');
          btn.removeAttribute('aria-disabled');
        }
        if (textEl) textEl.textContent = label;
      });
    }

    // Re-assert the Add-to-Cart button + pre-order message from the resolved
    // variant. The standard <variant-picker> does this via ProductInfo; this
    // picker replaces that, so without it the button label, disabled state and
    // "ships …" message stay frozen on the previously-selected colour.
    //
    // A pre-order date is the merchant's authoritative "this is a pre-order"
    // signal and MUST win over `available`: pre-order colours use inventory
    // policy "continue", so Shopify reports them available:true at 0 stock —
    // checking availability first would mislabel them "Add to cart" and drop
    // their ships message. Rule, in priority order:
    //   has pre-order date  → "Pre-Order"  + ships message  (even if available)
    //   else available      → "Add to cart"                 (genuinely in stock)
    //   else                → "Sold out"   + disabled        (e.g. Pebble White)
    function updateBuyButtons() {
      var variant = resolveActiveVariant();
      var hasDate = variant ? !!preOrderByVariant[variant.id] : false;
      var available = variant ? variant.available : false;
      var state = hasDate ? 'preorder'
        : available ? 'buy'
        : 'soldout';
      setBuyButtonState(state);
      setActivePreOrderMessage(state === 'preorder' ? variant.id : null);
    }

    // ═══ Add-on variant matching ═════════════════════════════════════════
    // Three-stage cascade: explicit SKU map → SKU prefix → keyword/title.

    function matchAddonBySkuExplicit(list, spaSku) {
      for (var i = 0; i < skuExplicitKeys.length; i++) {
        var key = skuExplicitKeys[i];
        if (spaSku.indexOf(key) !== 0) continue;
        var targetSku = skuExplicitMap[key];
        var hit = null;
        list.forEach(function (v) {
          if (hit || !v.sku) return;
          if (v.sku.toUpperCase() === targetSku) hit = v;
        });
        if (hit) return hit;
      }
      return null;
    }

    function matchAddonBySkuPrefix(list, spaSku) {
      var maxLen = Math.min(skuPrefixLength, spaSku.length);
      for (var len = maxLen; len >= 3; len--) {
        var prefix = spaSku.slice(0, len);
        var hit = null;
        list.forEach(function (v) {
          if (hit || !v.sku) return;
          if (v.sku.toUpperCase().slice(0, len) === prefix) hit = v;
        });
        if (hit) return hit;
      }
      return null;
    }

    function pickAddonVariantBySku(list) {
      if (!skuMatchingEnabled) return null;
      var spaSku = (spaVariantSku[currentMainVariantId] || '').toUpperCase();
      if (spaSku.length < 3) return null;
      // Note: NO availability filter here — we want the right variant even if
      // it's out of stock. The UI hides the row when the matched variant is
      // sold out, rather than mis-matching to a wrong-model alternative.
      return matchAddonBySkuExplicit(list, spaSku) || matchAddonBySkuPrefix(list, spaSku);
    }

    function matchAddonByKeyword(list) {
      var spaSize = sizeOptionPos ? selected[sizeOptionPos] : null;
      if (!spaSize) return null;
      var spaSizeLc = spaSize.toLowerCase();

      // Keyword source: explicit map entry > auto-tokenise on | / , em-dash.
      var raw = addonMatchMap[spaSizeLc];
      var sizeKeywords;
      if (raw) {
        sizeKeywords = raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      } else {
        sizeKeywords = spaSizeLc.split(/[|/,—]+/).map(function (t) { return t.trim(); }).filter(function (t) { return t.length >= 2; });
      }
      if (sizeKeywords.length === 0) return null;

      // If the add-on has model-prefixed variants (e.g. Tahoe / 4 Person),
      // require a model match. If our model isn't among them (e.g. Pacific
      // on a foam-tub-only cover), bail to avoid wrong-model matches.
      var anyVariantHasModel = spaModelToken && list.some(function (v) { return v.title.toLowerCase().indexOf(spaModelToken) >= 0; });
      var requireModelMatch = anyVariantHasModel;
      if (!requireModelMatch && spaModelToken) {
        var hasModelPrefixDelim = list.some(function (v) { return /[\/|]/.test(v.title); });
        if (hasModelPrefixDelim) return null;
      }

      var best = null;
      var bestScore = 0;
      list.forEach(function (v) {
        if (!v.available) return;
        var titleLc = v.title.toLowerCase();
        var hasModelMatch = spaModelToken ? titleLc.indexOf(spaModelToken) >= 0 : false;
        if (requireModelMatch && !hasModelMatch) return;
        var sizeScore = sizeKeywords.reduce(function (acc, kw) { return acc + (titleLc.indexOf(kw) >= 0 ? 1 : 0); }, 0);
        if (requireModelMatch && sizeScore === 0) return; // require size too once model matches
        var score = sizeScore + (hasModelMatch ? 2 : 0); // model match weighted heavier
        if (score > bestScore) { bestScore = score; best = v; }
      });
      return bestScore > 0 ? best : null;
    }

    function pickAddonVariant(handle) {
      var list = addonVariants[handle];
      if (!list || list.length < 2) return null;
      return pickAddonVariantBySku(list) || matchAddonByKeyword(list);
    }

    // Apply the matched variant to an add-on row + enforce in-stock-only.
    // Runs for every add-on row regardless of whether a better variant match
    // was found, so single-variant and unmatched add-ons also get hidden when
    // their currently-assigned variant is out of stock.
    // Stock state for an add-on variant: 'preorder' | 'instock' | 'oos'.
    // The pre-order metafield MUST win over `available` — pre-order variants use
    // inventory policy "continue" and so report available:true at zero stock,
    // which is why `available` alone can't separate the two. Same precedence the
    // buy-button and tile logic use.
    function addonStockState(v) {
      if (!v) return 'oos';
      // Pre-order requires the metafield to actually hold a value. Guard against
      // a whitespace-only entry, which would otherwise read as truthy and badge
      // the row as pre-order with an empty ships date.
      if (v.preOrder && String(v.preOrder).trim()) return 'preorder';
      return v.available ? 'instock' : 'oos';
    }

    function applyAddonMatch(addonEl) {
      var handle = addonEl.dataset.addonHandle;
      if (!handle) return;
      var list = addonVariants[handle];
      if (!list || list.length === 0) return;

      var check = addonEl.querySelector('.vpa__addon-check');
      var priceEl = addonEl.querySelector('[data-addon-price-display]');
      var labelEl = addonEl.querySelector('[data-addon-variant-label]');
      var mediaEl = addonEl.querySelector('[data-addon-media]');

      // Try to match a better variant for the current spa selection (only
      // makes sense for multi-variant add-ons).
      var matched = list.length > 1 ? pickAddonVariant(handle) : null;
      if (matched) {
        if (check && check.dataset.addonVariantId != matched.id) {
          check.dataset.addonVariantId = matched.id;
          check.dataset.addonPrice = matched.price;
        }
        if (priceEl) priceEl.textContent = formatMoney(matched.price);
        if (labelEl) labelEl.textContent = matched.title;
        if (mediaEl && matched.image) {
          var img = mediaEl.querySelector('img');
          if (img) {
            if (img.src !== matched.image) {
              img.src = matched.image;
              // Drop the server-rendered srcset / data-src — the variant URL is
              // already sized for the media box (96px wide, fine for 2x retina).
              img.removeAttribute('srcset');
              img.removeAttribute('data-src');
            }
          } else {
            var newImg = document.createElement('img');
            newImg.src = matched.image;
            newImg.loading = 'eager';
            newImg.width = 48;
            newImg.height = 48;
            newImg.alt = matched.title;
            mediaEl.appendChild(newImg);
          }
        }
      }

      // Look up the variant the row is currently pointing at (matched or
      // server-rendered default) and decide visibility from its stock state.
      var currentId = check ? parseInt(check.dataset.addonVariantId, 10) : null;
      var current = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === currentId) { current = list[i]; break; }
      }
      if (!current) current = list[0];

      var state = addonStockState(current);
      var visible = state === 'preorder' ? addonsShowPreOrder
                  : state === 'instock'  ? addonsShowInStock
                  : addonsShowOOS;
      addonEl.hidden = !visible;
      addonEl.classList.toggle('vpa__addon--sold-out', state === 'oos');

      // A shown out-of-stock row stays informational: add-ons are submitted
      // sequentially through /cart/add.js, so an unavailable line item would
      // fail the cart add and could break the whole submit chain.
      if (check) {
        check.disabled = state === 'oos';
        if (check.disabled) check.checked = false;
      }

      // "Sold out" label — only on an OOS row, and only if the merchant kept a label.
      var statusEl = addonEl.querySelector('[data-addon-status]');
      if (statusEl) {
        var showStatus = state === 'oos' && !!addonSoldOutLabel;
        statusEl.textContent = showStatus ? addonSoldOutLabel : '';
        statusEl.hidden = !showStatus;
      }

      // Pre-order chip, formatted through the same helper as the size tiles so
      // the prefix and trim patterns stay consistent across the picker.
      var chipEl = addonEl.querySelector('[data-addon-chip]');
      if (chipEl) {
        if (state === 'preorder') {
          chipEl.textContent = (chipPrefix ? chipPrefix + ' ' : '') + cleanPreOrderText(current.preOrder);
          chipEl.hidden = false;
        } else {
          chipEl.textContent = '';
          chipEl.hidden = true;
        }
      }
    }

    function applyAllAddonMatches() {
      root.querySelectorAll('label.vpa__addon').forEach(applyAddonMatch);
    }

    // Self-contained section refresh on selection — same mechanism the
    // standard <variant-picker> block uses (Section Rendering API + the
    // updateSourceFromDestination pattern in theme.js's ProductInfo), but
    // driven directly so it works regardless of the wrapping section's
    // wiring. One fetch handles four things:
    //   1. Gallery swap (replace media list with the fetched section's).
    //   2. Picker tile merge — copies .vpa__tile-price / [data-tile-discount]
    //      / [data-sold-out] from the freshly-rendered section so tile
    //      prices stay Liquid-authoritative (Markets / B2B-catalog-aware).
    //   3. Product-info region update — Price, StickyPrice, BuyButtonPrice,
    //      Sku, Badges, Inventory, etc., matching the standard picker.
    //   4. Fires variant:change for the media-gallery + other listeners
    //      that don't read directly from the section response.
    var lastSectionFetch = '';
    var sectionAbort = null;
    function refreshSectionFromServer() {
      if (!sectionId || !productHandle) return;

      // Resolve the variant from the JS state (findVariant uses the
      // normalised option-value comparison) rather than from input:checked.
      // input:checked can lie when hydrate failed to tick a radio because
      // the merchant-entered option value isn't byte-identical to the
      // radio's data-value — and then ?option_values=... silently drops
      // that option and Shopify falls back to first-available, which is
      // why tiles after a click were rendering with Charcoal Black as the
      // colour context. A direct ?variant=<id> is unambiguous.
      var fullV = findVariant() || findFirstCompatibleVariant();
      if (!fullV) return;
      if (fullV.id === lastSectionFetch) return;
      lastSectionFetch = fullV.id;

      var url = sectionUrl('section_id=' + encodeURIComponent(sectionId) + '&variant=' + fullV.id);
      if (sectionAbort) sectionAbort.abort();
      sectionAbort = new AbortController();
      fetch(url, { credentials: 'same-origin', signal: sectionAbort.signal })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) {
          if (!html) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');

          // (1) Gallery swap
          var srcGallery = doc.getElementById(galleryElId);
          var destGallery = document.getElementById(galleryElId);
          if (srcGallery && destGallery) {
            destGallery.innerHTML = srcGallery.innerHTML;
            destGallery.removeAttribute('hidden');
          } else if (window.console) {
            console.warn('[vpa] gallery swap skipped — source/dest missing', { srcFound: !!srcGallery, destFound: !!destGallery, galleryElId: galleryElId });
          }

          // (2) Picker tile price/discount/sold-out merge — keyed by
          // option position + value so the source and dest tiles match
          // regardless of DOM order.
          var srcPicker = doc.getElementById(vpaId);
          if (srcPicker) {
            var destByKey = {};
            root.querySelectorAll('label[data-tile-option-position]').forEach(function (dl) {
              destByKey[dl.dataset.tileOptionPosition + '|' + dl.dataset.tileValue] = dl;
            });
            srcPicker.querySelectorAll('label[data-tile-option-position]').forEach(function (sl) {
              var dl = destByKey[sl.dataset.tileOptionPosition + '|' + sl.dataset.tileValue];
              if (!dl) return;
              var srcPrice = sl.querySelector('.vpa__tile-price');
              var destPrice = dl.querySelector('.vpa__tile-price');
              if (srcPrice && destPrice) destPrice.innerHTML = srcPrice.innerHTML;
              var srcDiscount = sl.querySelector('[data-tile-discount]');
              var destDiscount = dl.querySelector('[data-tile-discount]');
              if (srcDiscount && destDiscount) {
                destDiscount.textContent = srcDiscount.textContent;
                // Carry data-has-discount across too — different colours have
                // different discounts, and updateTilePills reads this flag to
                // decide whether the pill is safe to un-hide.
                destDiscount.dataset.hasDiscount = srcDiscount.dataset.hasDiscount || 'false';
                destDiscount.hidden = srcDiscount.hasAttribute('hidden');
              }
              var srcSoldOut = sl.querySelector('[data-sold-out]');
              var destSoldOut = dl.querySelector('[data-sold-out]');
              if (srcSoldOut && destSoldOut) {
                destSoldOut.hidden = srcSoldOut.hasAttribute('hidden');
                dl.classList.toggle('vpa__tile--sold-out', !srcSoldOut.hasAttribute('hidden'));
              }
            });
          }

          // (3) Update the same product-info regions the standard
          // <variant-picker> updates (Price, Sticky Price, Badges, Sku,
          // Inventory, etc.). Mirrors ProductInfo.updateSourceFromDestination
          // in theme.js — for each known prefix, find live elements by
          // exact ID and replace innerHTML from the parsed section so the
          // Liquid-rendered (Markets / B2B-catalog-aware) values flow into
          // the page. Without this the main top price stayed on the
          // initial Charcoal Black render no matter what was selected.
          ['Price', 'BuyButtonPrice', 'StickyPrice', 'Sku', 'Badges', 'BadgesOverlay', 'Inventory', 'Volume', 'PricePerItem', 'BackInStock', 'ProductBundle', 'VolumeNote'].forEach(function (prefix) {
            document.querySelectorAll('[id^="' + prefix + '-"]').forEach(function (destEl) {
              var srcEl = doc.getElementById(destEl.id);
              if (!srcEl) return;
              destEl.innerHTML = srcEl.innerHTML;
              destEl.removeAttribute('hidden');
            });
          });

          // (4) Fire variant:change so the media-gallery + any other
          // listeners that don't read from the section response react.
          var v = findVariant() || findFirstCompatibleVariant();
          if (v) dispatchVariantChange(v);
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (window.console) console.error('[vpa] section refresh failed', err);
        });
    }

    // Clear the selections of every step displayed AFTER the one that changed
    // (by display order / step number). Changing an earlier step — most often
    // the colour — invalidates the later picks: the previously-chosen size or
    // edition may not exist for the new colour, which would leave the picker
    // stuck on an unavailable combination. Resetting the later steps forces the
    // shopper to re-pick a valid path for the new colour. Earlier steps and the
    // step that changed are left untouched.
    function resetLaterSteps(changedPos) {
      var changedStep = root.querySelector('.vpa__step[data-option-position="' + changedPos + '"]');
      if (!changedStep) return;
      var changedNum = +changedStep.dataset.stepNum;
      root.querySelectorAll('.vpa__step[data-option-position]').forEach(function (step) {
        if (+step.dataset.stepNum <= changedNum) return;
        var pos = +step.dataset.optionPosition;
        if (!selected[pos]) return;
        delete selected[pos];
        step.querySelectorAll('input[data-option-position="' + pos + '"]:checked').forEach(function (r) {
          r.checked = false;
        });
      });
    }

    // ═══ Event handlers ══════════════════════════════════════════════════
    root.addEventListener('change', function (e) {
      var input = e.target.closest('input[data-option-position]');
      if (!input) return;

      selected[+input.dataset.optionPosition] = input.dataset.value;
      // Reset later steps so a size/edition that doesn't exist for the newly
      // chosen colour can't leave the picker stuck on an unavailable variant.
      resetLaterSteps(+input.dataset.optionPosition);
      updateAvailability();
      renumberAndLock();
      updateAllTiles();
      // Always point the form's hidden id at the best variant for the current
      // selection — a full match if every step is chosen, otherwise the
      // representative variant for the chosen colour. syncFormVariant updates
      // [name="id"], fires its change event and dispatches variant:change, so
      // the native cart, the media gallery AND third-party apps that read
      // [name="id"] (e.g. the STOQ pre-order app, which injects its "ships …"
      // bar from the selected variant) all follow the colour switch. Leaving
      // the id on the last-committed value was the root cause behind both the
      // cart adding the previously-selected colour and STOQ's pre-order bar
      // lingering after switching to a sold-out colour like Pebble White.
      var activeVariant = resolveActiveVariant();
      if (activeVariant) syncFormVariant(activeVariant);
      // Sync the Add-to-Cart button to the resolved selection so a sold-out
      // colour (no stock, no pre-order date) disables the button and shows
      // "Sold out" instead of silently adding the previously-selected colour.
      updateBuyButtons();
      applyAllAddonMatches();
      // Fetch the freshly-rendered section: swaps in the new ProductGallery
      // HTML AND merges the picker's Liquid-rendered tile prices (Markets /
      // catalog-aware) back into the live picker so prices follow the active
      // price list without any client-side override logic.
      refreshSectionFromServer();
    });

    // Size-chart trigger
    var sizeChartBtn = root.querySelector('.vpa__size-chart-link');
    if (sizeChartBtn) {
      sizeChartBtn.addEventListener('click', function () {
        var modal = document.getElementById('SizeChart-' + vpaId);
        if (!modal) return;
        modal.hidden = false;
        modal.setAttribute('aria-expanded', 'true');
      });
    }

    // ═══ Cart submission ═════════════════════════════════════════════════
    // Capture-phase intercept on the Add to Cart button click. The buy_buttons
    // form is a `<form is="product-form">` custom element with its own submit
    // handler; intercepting at the click stage runs before that handler. When
    // add-ons are checked we route through /cart/add.js. With no add-ons we
    // let the native product-form flow run untouched.

    function buildCartItems(form) {
      var qty = 1;
      if (form) {
        var qtyInput = form.querySelector('input[name="quantity"]:not([disabled])');
        if (qtyInput && qtyInput.value) qty = parseInt(qtyInput.value, 10) || 1;
      }
      var items = [{ id: currentMainVariantId, quantity: qty }];
      root.querySelectorAll('.vpa__addon-check:checked').forEach(function (a) {
        var vid = parseInt(a.dataset.addonVariantId, 10);
        if (!vid) return;
        var item = { id: vid, quantity: 1 };
        var wrap = a.closest('.vpa__addon');
        var planSelect = wrap ? wrap.querySelector('.vpa__addon-plan') : null;
        if (planSelect && planSelect.value) item.selling_plan = parseInt(planSelect.value, 10);
        items.push(item);
      });
      return items;
    }

    function showCartError(message) {
      var existing = root.querySelector('[data-vpa-error]');
      if (existing) existing.remove();
      var el = document.createElement('div');
      el.setAttribute('data-vpa-error', '');
      el.style.cssText = 'margin: var(--sp-3) 0; padding: var(--sp-3) var(--sp-4); background: rgb(254 226 226); color: rgb(127 29 29); border-radius: 8px; font-size: 14px;';
      el.textContent = message;
      root.appendChild(el);
    }

    // Option B for 3rd-party app compatibility (VEX Auto Add, upsell apps,
    // free-gift apps, etc.):
    //
    //   1. Add the add-ons via /cart/add.js up-front (sequential — Shopify's
    //      bulk endpoint can silently drop selling_plan items in mixed batches).
    //   2. Dispatch cart events so app cart-watchers fire.
    //   3. Programmatically submit the host form via requestSubmit() so the
    //      browser fires a real `submit` event — every app/theme listener
    //      runs exactly as if the user had clicked Add to Cart normally, and
    //      the form's standard post handles the main variant + navigation.
    //
    // Net effect: VEX and similar apps see the exact same add-to-cart flow
    // they always see — we just front-load our add-ons before the form runs.

    function addOnsToCart(items) {
      var chain = Promise.resolve();
      var failed = null;
      items.forEach(function (item) {
        chain = chain.then(function () {
          if (failed) return;
          return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(item),
            credentials: 'same-origin'
          }).then(function (res) {
            if (res.ok) return;
            return res.json().then(function (err) {
              failed = { item: item, err: err };
              console.error('VPA /cart/add.js failed:', item, err);
            });
          });
        });
      });
      return chain.then(function () { return failed; });
    }

    function dispatchCartEvents(items) {
      var detail = { source: 'variant-picker-advanced', itemCount: items.length };
      ['cart:updated', 'cart:refresh', 'cart:added', 'cart:change'].forEach(function (name) {
        document.documentElement.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail }));
      });
    }

    function submitAddOnsThenForm(form, originatingBtn) {
      // Collect only the add-on items (main variant goes through the standard
      // form submission, so VEX & co. see Shopify's normal add-to-cart flow).
      var addOnItems = [];
      root.querySelectorAll('.vpa__addon-check:checked').forEach(function (a) {
        var vid = parseInt(a.dataset.addonVariantId, 10);
        if (!vid) return;
        var item = { id: vid, quantity: 1 };
        var wrap = a.closest('.vpa__addon');
        var planSelect = wrap ? wrap.querySelector('.vpa__addon-plan') : null;
        if (planSelect && planSelect.value) item.selling_plan = parseInt(planSelect.value, 10);
        addOnItems.push(item);
      });

      if (originatingBtn) {
        originatingBtn.disabled = true;
        originatingBtn.setAttribute('aria-busy', 'true');
      }

      addOnsToCart(addOnItems).then(function (failed) {
        if (failed) {
          showCartError(failed.err.description || failed.err.message || 'Could not add add-on to cart.');
          if (originatingBtn) {
            originatingBtn.disabled = false;
            originatingBtn.removeAttribute('aria-busy');
          }
          return;
        }
        dispatchCartEvents(addOnItems);
        // Trigger the form's real submit event so any app or theme listener
        // (VEX, the product-form custom element, analytics, etc.) runs exactly
        // as if the user had clicked Add to Cart with no add-ons selected.
        // requestSubmit() fires the submit event; submit() does NOT.
        try {
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit(originatingBtn || undefined);
          } else {
            form.submit();
          }
        } catch (err) {
          console.error('VPA form submit failed:', err);
          // Last-resort fallback: redirect to /cart so the user at least lands
          // somewhere sensible with the add-ons we added.
          window.location.href = '/cart';
        }
      }).catch(function (err) {
        console.error('VPA cart submit error:', err);
        showCartError('Network error adding to cart.');
        if (originatingBtn) {
          originatingBtn.disabled = false;
          originatingBtn.removeAttribute('aria-busy');
        }
      });
    }

    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[type="submit"], input[type="submit"]') : null;
      if (!btn) return;
      // Resolve associated form via the button's HTML form property (covers
      // both DOM-nested buttons and buttons using the form="..." attribute).
      var form = btn.form || btn.closest('form');
      var btnFormAttr = btn.getAttribute('form');
      if (!form && !btnFormAttr) return;
      if ((!form || form.id !== formId) && btnFormAttr !== formId) return;

      var addonsChecked = root.querySelectorAll('.vpa__addon-check:checked');
      if (addonsChecked.length === 0) return; // no add-ons → standard flow, no intercept needed

      // preventDefault only — let other click listeners on the button
      // (analytics, upsell apps, etc.) still fire. We re-trigger the form's
      // submit event ourselves via requestSubmit once our add-ons land.
      e.preventDefault();
      submitAddOnsThenForm(form || document.getElementById(formId), btn);
    }, true /* capture */);

    // ═══ Live pre-order data refresh ═════════════════════════════════════
    // The pre-order chip's metafield value is baked into the HTML at render
    // time and Shopify's CDN caches PDPs for anonymous visitors. To keep the
    // chip in sync with the live metafield, we refetch this section via the
    // Section Rendering API (with a cache-bust query) on every page load and
    // update the in-memory preOrderByVariant map from the fresh JSON blob.

    function loadPreOrderMapFromDocument(docLike) {
      var sel = '[data-vpa-preorder-map="' + vpaId + '"]';
      var el = docLike.querySelector(sel);
      if (!el) return null;
      try {
        return JSON.parse(el.textContent);
      } catch (e) {
        return null;
      }
    }

    function refreshPreOrderFromServer() {
      if (!sectionId || !productHandle) return;
      var url = sectionUrl('section_id=' + encodeURIComponent(sectionId) + '&_=' + Date.now());
      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) {
          if (!html) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = loadPreOrderMapFromDocument(doc);
          if (!fresh) return;
          // Replace map in-place so closures over preOrderByVariant pick up new values.
          Object.keys(preOrderByVariant).forEach(function (k) { delete preOrderByVariant[k]; });
          Object.keys(fresh).forEach(function (k) { preOrderByVariant[k] = fresh[k]; });
          updateAllTiles();
          // Pre-order dates feed sellability, so re-assert the button and the
          // colour marks once the live map lands (a variant could flip
          // sellable/sold-out vs render).
          markSoldOutColours();
          updateBuyButtons();
        })
        .catch(function () { /* network failure → keep server-rendered values */ });
    }

    // ═══ Initial paint ═══════════════════════════════════════════════════
    // Belt-and-braces: strip any stale "unavailable" state from colour
    // swatches/buttons. Earlier server versions added the class when all
    // variants for a colour were sold out; we now want colour always
    // clickable, so clear any cached HTML that came in with the class set.
    root.querySelectorAll('.vpa__step[data-is-color="true"] label').forEach(function (l) {
      l.classList.remove('vpa__choice--unavailable');
    });
    root.querySelectorAll('.vpa__step[data-is-color="true"] input[disabled]').forEach(function (i) {
      i.disabled = false;
    });
    markSoldOutColours();

    // Hydrate `selected` and tick the matching radios — but ONLY when the
    // URL explicitly points at a variant (?variant=… or ?option_values=…).
    // A clean PDP load (no query string) should still start with `selected`
    // empty so the picker walks the user through step 1 → 2 → 3 with the
    // locked-step styling and the Step 4 add-ons reveal animation fires
    // when step 3 lands. Without this guard, `currentMainVariantId` falls
    // back to first-available and we'd auto-complete every step on first
    // paint, killing the guided flow.
    (function hydrateInitialSelection() {
      try {
        var params = new URLSearchParams(window.location.search);
        if (!params.has('variant') && !params.has('option_values')) return;
      } catch (e) { return; }
      var initial = null;
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].id === currentMainVariantId) { initial = variants[i]; break; }
      }
      if (!initial) return;
      for (var pos = 1; pos <= optionCount; pos++) {
        var value = initial['option' + pos];
        if (!value) continue;
        selected[pos] = value;
        var target = normOpt(value);
        var inputs = root.querySelectorAll('input[data-option-position="' + pos + '"]');
        for (var j = 0; j < inputs.length; j++) {
          if (normOpt(inputs[j].dataset.value) === target) {
            inputs[j].checked = true;
            break;
          }
        }
      }
    })();

    updateAvailability();
    renumberAndLock();
    updateAllTiles();
    // If the page loaded already pointing at a complete selection (?variant=…),
    // make sure the button reflects whether that variant is actually sellable.
    updateBuyButtons();
    applyAllAddonMatches();
    refreshPreOrderFromServer();
  }

  var queued = window.WaveVPA;
  window.WaveVPA = {
    push: function (cfg) {
      try { init(cfg); } catch (e) { console.error('[vpa]', e); }
    }
  };
  if (Array.isArray(queued)) queued.forEach(window.WaveVPA.push);
})();
