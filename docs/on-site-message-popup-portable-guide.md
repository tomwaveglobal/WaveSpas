# On Site Message — Clickable Image Popup (portable implementation guide)

Drop-in recipe for adding a clickable popup to the payment-method icons in an **On Site Message** (or equivalent payment-message) block on a Shopify product page. Self-contained — paste this file into any theme repo's `docs/` folder and follow the steps.

## What it does

When a merchant adds a URL to the new **Image Popup Link** field on the block:

- The payment-method icon becomes a clickable button
- Clicking it opens a modal styled to match the theme's existing popups
- The modal loads the provided URL inside an `<iframe>`
- A floating round X button (top-right) closes the popup on all viewport sizes
- A fallback "Open in a new tab" link appears below the iframe in case the destination blocks iframe embedding (`X-Frame-Options`)

If the URL is left blank, the icon renders exactly as before — no behaviour change.

## Files to change

You will edit two files. Names will vary by theme:

| File (typical names) | Change |
| --- | --- |
| `sections/main-product.liquid` (or whichever section defines the product page blocks) | Add two new settings to the payment-message block's schema |
| `snippets/on-site-message.liquid` (or the snippet rendering the payment message) | Wrap the icon in a popup trigger when URL is set, and render the modal |

If the block doesn't exist yet in the target theme, look for a block named anything like `on_site_message`, `payment_message`, `finance_message`, or similar inside the product section's `{% schema %}`.

## Step 1 — Schema additions

Locate the payment-message block inside the product section's `{% schema %}`. Add two settings (placement: after the existing image/checkbox settings, before the message richtext is a good spot):

```json
{
  "type": "url",
  "id": "message_image_link",
  "label": "Image Popup Link",
  "info": "Optional. If set, clicking the image opens this URL in a popup."
},
{
  "type": "text",
  "id": "message_image_popup_title",
  "label": "Popup Title",
  "default": "Finance Options"
}
```

If your block uses different setting `id`s, adjust the snippet code in step 2 to match.

## Step 2 — Snippet changes

Open the snippet that renders the payment message (the one that outputs the icon image). Locate the block that renders the icon — typically something like:

```liquid
{%- if block.settings.message_image_checkbox -%}
  <div class="on-site-container__icon" style="max-width:{{ block.settings.message_icon_width }}px;">
    {{ block.settings.message_custom_icon | img_url: 'master' | img_tag }}
  </div>
{%- endif -%}
```

Replace it with a conditional that wraps the image in a `<button>` when a URL is provided:

```liquid
{%- assign popup_id = 'OnSiteMessagePopup-' | append: block.id -%}
{%- assign popup_title = block.settings.message_image_popup_title | default: 'Finance Options' -%}

{%- if block.settings.message_image_checkbox -%}
  {%- if block.settings.message_image_link != blank -%}
    <button
      type="button"
      class="on-site-container__icon on-site-container__icon--button"
      style="max-width:{{ block.settings.message_icon_width }}px; margin-left: 12px; flex-shrink: 0; background: none; border: 0; padding: 0; cursor: pointer;"
      aria-controls="{{ popup_id }}"
      aria-expanded="false"
      aria-label="{{ popup_title | escape }}"
    >
      {{ block.settings.message_custom_icon | img_url: 'master' | img_tag }}
    </button>
  {%- else -%}
    <div class="on-site-container__icon" style="max-width:{{ block.settings.message_icon_width }}px; margin-left: 12px; flex-shrink: 0;">
      {{ block.settings.message_custom_icon | img_url: 'master' | img_tag }}
    </div>
  {%- endif -%}
{%- endif -%}
```

Then append the modal markup **after** the message container's closing tag, still inside the same `{%- if block.settings.message != blank -%}` (or equivalent) guard:

```liquid
{%- if block.settings.message_image_checkbox and block.settings.message_image_link != blank -%}
  <x-modal
    id="{{ popup_id }}"
    class="x-modal drawer z-30 fixed bottom-0 left-0 h-full w-full pointer-events-none on-site-message-modal"
    role="dialog"
    aria-modal="true"
    aria-label="{{ popup_title | escape }}"
    hidden
  >
    <overlay-element class="overlay fixed-modal invisible opacity-0 fixed bottom-0 left-0 w-full h-screen pointer-events-none" aria-controls="{{ popup_id }}" aria-expanded="false"></overlay-element>
    <div class="drawer__inner z-10 absolute top-0 flex flex-col w-full h-full overflow-hidden">
      <button
        class="on-site-message-modal__close"
        type="button"
        is="hover-button"
        aria-controls="{{ popup_id }}"
        aria-expanded="false"
        aria-label="{{ 'general.accessibility.close' | t | escape }}"
        style="position: absolute; top: 10px; right: 10px; z-index: 30; width: 40px; height: 40px; padding: 0; border-radius: 9999px; background: #ffffff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #111;"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <gesture-element class="drawer__header flex justify-between opacity-0 invisible relative" tabindex="0" style="padding-right: 60px;">
        <span class="drawer__title heading title-md">{{ popup_title | escape }}</span>
      </gesture-element>
      <div class="drawer__content opacity-0 invisible flex flex-col h-full grow shrink">
        <div class="drawer__scrollable relative flex flex-col grow shrink" style="padding: 0;">
          <iframe
            src="{{ block.settings.message_image_link }}"
            title="{{ popup_title | escape }}"
            loading="lazy"
            style="border: 0; width: 100%; height: 100%; min-height: 60vh; flex: 1 1 auto; display: block;"
            allow="payment"
          ></iframe>
          <p class="text-sm" style="padding: var(--sp-3) var(--sp-5) var(--sp-3); margin: 0; flex: 0 0 auto;">
            Having trouble viewing? <a href="{{ block.settings.message_image_link }}" target="_blank" rel="noopener noreferrer" class="link">Open in a new tab</a>.
          </p>
        </div>
      </div>
    </div>
  </x-modal>
{%- endif -%}
```

## Step 3 — Adapt to the target theme's modal system

The markup above assumes a **dawn-derived theme** using these custom elements:

- `<x-modal>` — modal container
- `<overlay-element>` — backdrop with click-to-close
- `<gesture-element>` — drawer header (swipe-to-close gesture handler on mobile)
- `is="hover-button"` — button with hover-state JS

If the target theme uses a **different modal pattern**, swap accordingly. Common cases:

### Dawn / Horizon (Shopify reference themes)
- Use `<modal-dialog>` or `<details>` summary patterns
- Replace `<x-modal>` outer wrapper with the theme's native modal element
- Keep the floating X button as-is — it's vanilla HTML + inline styles, works anywhere

### Custom themes (no special modal element)
- Wrap the modal content in a plain `<div class="modal" id="{{ popup_id }}" hidden>`
- Add a small inline script (or use the theme's modal JS) to toggle `[hidden]` on click of any element with `aria-controls="{{ popup_id }}"`
- The floating X already has `aria-controls` set — wire its click to the same toggle

Minimum-viable vanilla version (no theme dependencies) of the modal:

```liquid
<div id="{{ popup_id }}" class="osm-popup" hidden role="dialog" aria-modal="true" aria-label="{{ popup_title | escape }}"
     style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7);">
  <div style="position: relative; background: #fff; width: min(60rem, 92vw); height: min(90vh, 800px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;">
    <button type="button" data-osm-close
            style="position: absolute; top: 10px; right: 10px; z-index: 2; width: 40px; height: 40px; border-radius: 9999px; background: #fff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; cursor: pointer;"
            aria-label="Close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div style="padding: 18px 60px 12px 18px; font-weight: 600;">{{ popup_title | escape }}</div>
    <iframe src="{{ block.settings.message_image_link }}" title="{{ popup_title | escape }}" loading="lazy"
            style="border: 0; width: 100%; flex: 1 1 auto; display: block;" allow="payment"></iframe>
    <p style="padding: 8px 16px; margin: 0; font-size: 0.85rem;">
      Having trouble viewing? <a href="{{ block.settings.message_image_link }}" target="_blank" rel="noopener noreferrer">Open in a new tab</a>.
    </p>
  </div>
</div>

<script>
(function () {
  var id = '{{ popup_id }}';
  var modal = document.getElementById(id);
  if (!modal) return;
  function open()  { modal.hidden = false; document.body.style.overflow = 'hidden'; }
  function close() { modal.hidden = true;  document.body.style.overflow = ''; }
  document.querySelectorAll('[aria-controls="' + id + '"]').forEach(function (el) {
    el.addEventListener('click', open);
  });
  modal.querySelector('[data-osm-close]').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
})();
</script>
```

Use whichever version matches the host theme — dawn-derived gets the first block, fully custom themes use the vanilla version.

## Step 4 — Configure in Shopify admin

1. Online Store → Themes → **Customize**
2. Open a product page using the template that has the payment-message block
3. In the sidebar, find the **On Site Message** block (or whatever the host theme calls it)
4. Tick the image checkbox, upload the icon
5. Paste the retailer URL into the new **Image Popup Link** field — for example a Payl8r retailer URL like `https://payl8r.com/retailers/payment-detail?retailer=<token>`
6. Optionally change **Popup Title** (defaults to "Finance Options")
7. **Save** → click the icon on the storefront preview to verify

## Testing checklist

- **Desktop**: click icon → modal opens centered → iframe loads → floating round X (top-right) closes it → clicking the overlay also closes it
- **Mobile**: tap icon → modal slides up from bottom (or appears full-screen) → iframe loads → floating round X at top-right closes it
- **Blank URL**: icon renders unchanged (no click behaviour, no modal in DOM)
- **Multiple instances**: each On Site Message block on the same page has a unique modal id (driven by `block.id`) — no collisions
- **iframe blocked**: if the destination sets `X-Frame-Options: DENY` or `SAMEORIGIN`, the iframe is blank but the "Open in a new tab" fallback link below still works

## Why a custom floating X (not the host theme's standard drawer close)

Most theme drawers have a close button that's either hidden on mobile (relying on swipe-to-close) or animated in via the drawer's `[active]` state. With an iframe inside the drawer:

- **Swipe gestures** go to the iframe content, not the drawer — swipe-to-close becomes unreliable
- **Animated-in close buttons** can fail if the gesture-element wrapper's opacity transition doesn't fire on every browser/mobile combo

A standalone absolute-positioned X with hardcoded inline styles guarantees the close affordance is visible and tappable at every viewport size, regardless of the drawer's internal state.

## Caveats

- The iframe defaults to `min-height: 60vh` and grows to fill the modal. Short embedded pages will have empty space below; tall ones scroll internally.
- The "Open in a new tab" fallback link is always visible — even when the iframe loads successfully. If this becomes noisy, gate it behind an iframe load-timeout check (note: `iframe.onerror` doesn't fire for X-Frame-Options denials, so a setTimeout-based detector is needed).
- The retailer/finance URL is usually per-merchant (contains a retailer token). Each site needs its own URL.
- Don't enable this for payment providers that explicitly forbid embedding in their retailer terms.

## Quick reference: setting ids used in this implementation

| Setting id | Type | Purpose |
| --- | --- | --- |
| `message_image_checkbox` | checkbox | Existing — toggles the icon |
| `message_custom_icon` | image_picker | Existing — the icon image |
| `message_icon_width` | range | Existing — icon width in px |
| `message_image_link` | **url (new)** | Popup destination URL |
| `message_image_popup_title` | **text (new)** | Popup title shown in header |

Rename the new two settings if your block uses a different naming convention, but keep the snippet references in sync.
