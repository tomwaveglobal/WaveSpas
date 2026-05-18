# On Site Message — Clickable Image Popup

Adds optional click-to-open popup behaviour to the payment-method icons in the **On Site Message** block on the product page. Used to surface external finance/retailer detail pages (e.g. Payl8r, DivideBuy, Klarna) without taking the customer away from the product.

## What it does

When the merchant adds a URL to the new **Image Popup Link** field on an On Site Message block:

- The payment-method icon becomes a clickable button
- Clicking it opens a modal styled to match the existing Size Chart / Share popups
- The modal loads the provided URL inside an iframe
- A floating round X button (top-right of the modal) closes the popup on all viewport sizes
- A fallback "Open in a new tab" link appears below the iframe in case the destination blocks iframe embedding (`X-Frame-Options`)

If the URL field is left blank, the icon renders exactly as before — no behaviour change.

## Files changed

| File | Change |
| --- | --- |
| `sections/main-product.liquid` | Added two new settings to the `on_site_message` block schema |
| `snippets/on-site-message.liquid` | Wrapped icon in a popup trigger when URL is set, and rendered the modal |

## Schema additions (`sections/main-product.liquid`)

Two new fields inside the `on_site_message` block, placed after `message_image_checkbox`:

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

## Snippet structure (`snippets/on-site-message.liquid`)

The render is gated by `block.settings.message_image_checkbox AND block.settings.message_image_link != blank`. When both are true:

1. The icon `<div>` is replaced by a `<button>` with `aria-controls` pointing to a unique modal id (`OnSiteMessagePopup-{{ block.id }}`).
2. An `x-modal` (re-using the theme's existing modal system) is rendered below the message:
   - Uses the same `drawer / drawer__inner / drawer__content / drawer__scrollable` skeleton as the Size Chart modal
   - Contains an `<iframe>` that loads `message_image_link`
   - Has a floating absolutely-positioned round X close button at top-right with explicit inline styles so it shows on every viewport — does NOT rely on the gesture-element's `[active]` opacity animation
   - Includes a fallback "Open in a new tab" link below the iframe

### Why a custom floating X (not the standard `drawer__close`)

The theme's drawer close button uses `hidden sm:flex` and depends on the `gesture-element` becoming visible on `[active]`. On mobile, the drawer normally closes via the swipe-down gesture — but with an iframe inside, swipe events go to the iframe content, so the gesture-based close is unreliable. A standalone absolute-positioned X with hardcoded styles guarantees the button is visible and tappable on mobile too.

## How to configure (in Shopify admin)

1. Online Store → Themes → **Customize**
2. In the top template selector, switch to a product using one of:
   - `product.product-new`
   - `product.product-new2`
   - `product.product-new2-finance`
3. In the sidebar, find the **On Site Message** block (e.g. the Payl8r one)
4. Tick **Image Checkbox**, upload the icon
5. Paste the URL into the new **Image Popup Link** field (e.g. `https://payl8r.com/retailers/payment-detail?retailer=...`)
6. Optionally change **Popup Title** (defaults to "Finance Options")
7. **Save** → click the icon on the storefront preview to verify

## Testing checklist

- Desktop: click icon → modal opens centered → iframe loads → X (top-right) closes it → overlay click also closes it
- Mobile: tap icon → drawer slides up from bottom → iframe loads → floating round X at top-right closes it
- Blank URL: icon renders unchanged (no click behaviour, no modal in DOM)
- Multiple On Site Message blocks on one page: each has a unique modal id, no collisions
- iframe is blocked by destination's `X-Frame-Options`: customer sees blank iframe + "Open in a new tab" fallback link below

## Replicating on another theme / site

1. Locate the equivalent of `on-site-message.liquid` (or the snippet rendering the payment-message block).
2. Locate the schema for that block (usually inside `sections/main-product.liquid` or similar).
3. Add the two new schema settings (`message_image_link` url, `message_image_popup_title` text).
4. Inside the snippet, wrap the icon in a `<button>` with `aria-controls` when the URL is set, otherwise keep the original `<div>` wrapper.
5. Append the `x-modal` block after the message container. **Use a unique id** — `block.id` (or `section.id`-based) works.
6. If the destination site uses a different modal/drawer system (not the dawn-derived `x-modal` / `overlay-element` / `gesture-element` pattern), swap the modal markup for whatever the host theme uses but keep the floating-X pattern for the close button.
7. Confirm `is="hover-button"` is registered as a custom element in the host theme; if not, drop the attribute (the button still works via standard `aria-controls` modal bindings).

## Commits

- `61ad1c7` — Add clickable popup to On Site Message payment block
- `5746464` — Show On Site Message popup close button on mobile (superseded)
- `e77adb9` / `29c27bd` (main) — Replace popup close button with always-visible floating X

## Known caveats

- The iframe height defaults to `min-height: 60vh` and grows to fill the modal. If the embedded page is short, there'll be empty space below it. If it's long, the iframe scrolls internally.
- The fallback "Open in a new tab" link is always shown — visible even when the iframe loads successfully. If this becomes noisy, gate it behind a JS error handler on the iframe (`onerror` doesn't fire for X-Frame-Options blocks, so a load-timeout detector is needed for a proper auto-hide).
- The Payl8r retailer detail URL is per-retailer (contains a token). Each site replicating this needs its own URL.
