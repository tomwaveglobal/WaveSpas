# Badge image radius — portable guide

A merchant-controlled corner radius for image-based product badges (e.g. the "Free Starter Kit & Filters" graphic that overlays product images). Adds a slider under **Theme settings → Products → Badges** and applies it to the existing `.badge-image` CSS rule.

## What it does

- New theme setting **"Badge image radius"** with a 0–50px range (default 10px).
- Applies a `border-radius` to every `<img class="badge-image">` rendered by the theme via `snippets/css-variables.liquid`.
- No layout side-effects — the existing `.badge-image` width and `display: block` rules are untouched.

## Prerequisites in the host theme

The host theme must already use:

1. A `snippets/css-variables.liquid` that emits a `<style>` block in the document head and contains a `.badge-image` rule driven by theme settings (Concept-derived themes ship with this).
2. A product badge rendering path that outputs `<img class="badge-image">` (Concept's `snippets/product-badges.liquid` does this when a badge text is mapped to an uploaded image).

If the host theme renders badge images with a different class name, swap `.badge-image` in the CSS rule for the right selector.

## Files modified

1. `config/settings_schema.json` — adds the `product_badge_image_radius` range setting under the Products → Badges section.
2. `snippets/css-variables.liquid` — adds a `border-radius` line to the existing `.badge-image` rule.

## Implementation

### 1. Theme setting — `config/settings_schema.json`

Find the **Badges** section under the Products settings page (look for the existing `product_badge_bg_color` setting). Insert the new range slider directly after `product_badge_bg_color`, before the `"Advanced Badges"` header:

```json
{
  "type": "range",
  "id": "product_badge_image_radius",
  "min": 0,
  "max": 50,
  "step": 1,
  "unit": "px",
  "default": 10,
  "label": "Badge image radius",
  "info": "Corner radius for image-based badges (e.g. Free Starter Kit). 0 = square corners."
}
```

### 2. CSS rule — `snippets/css-variables.liquid`

Find the existing `.badge-image` rule (it sets `display`, `width`, and `height`). Add one line for the border-radius using the new setting:

```liquid
.badge-image {
  display: block;
  width: {{ settings.advanced_badge_image_mobile | default: 60 }}px;
  height: auto;
  border-radius: {{ settings.product_badge_image_radius | default: 10 }}px;
}
```

That's it — no other files need to change. The setting reads on every page render, so changes in the theme editor take effect immediately.

## Configuring on the host site

1. Open the theme editor.
2. Click the **gear** (Theme settings) in the top-left.
3. Go to **Products** → scroll down to the **Badges** header.
4. Drag the new **"Badge image radius"** slider (right below *Badge background color*).
5. Click **Save**.

## Verifying

- Inspect a badge image in the browser dev tools. The `<img class="badge-image">` element should report a computed `border-radius` matching the slider value.
- A badge with the radius set to e.g. 16px should have visibly rounded corners on its rendered image; the surrounding pill (background) is unaffected and follows the existing badge styling.

## Edge cases / notes

- **Square corners**: set the slider to 0.
- **Transparent PNG badges**: the radius still applies to the image bounding box even if the visible content is transparent. That's usually invisible; useful only for opaque badge graphics.
- **Default value**: 10px is a soft default that looks good on most badge images. Bump the `default` value in both files if the host site prefers a different starting point.
- **Mobile/desktop variance**: not implemented — a single value applies at all viewports. Add a `_mobile` companion setting and a `@media (min-width: 768px)` block in `.badge-image` if per-viewport control is needed.

## Reverting

Remove the `product_badge_image_radius` block from `config/settings_schema.json` and delete the `border-radius` line from the `.badge-image` rule in `snippets/css-variables.liquid`. No other cleanup required.
