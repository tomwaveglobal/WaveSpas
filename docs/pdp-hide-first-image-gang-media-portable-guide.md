# PDP — Hide first image / use variant gang media as gallery

Portable guide for adding a per-template setting that drives the product page gallery from a variant's `theme.gang_media` metafield (and falls back to "hide first product image" when no gang_media is set).

## What it does

When the toggle is enabled on a product page template:

- **If the selected variant has `theme.gang_media` set** (a list-of-file-reference variant metafield), the PDP gallery is built **only** from those gang_media items. The variant's own `featured_media` (the "hero" image) is filtered out, so the gallery starts from the first non-hero gang_media item.
- **If the variant has no gang_media**, the gallery falls back to: hide `product.media.first` and use `product.media[1]` as the featured image.
- The setting is stored on the `main-product` section, so it's saved **per template instance** — `product.json` can have it off while `product.product-new2.json` has it on.

The product's `featured_image` for collection cards, social sharing, sticky-cart thumbnails, etc. is **not** affected — only the in-gallery rendering changes.

## Files modified

1. `sections/main-product.liquid` — adds the section setting, passes it to the gallery snippet, updates the mobile/desktop aspect-ratio CSS variable.
2. `snippets/product-media-gallery.liquid` — accepts the new `hide_first_media` parameter and contains the gang_media / fallback logic.

## Prerequisites in the host theme

The theme **must already use** a `product-media-gallery` snippet rendered from a `main-product` section, with per-item rendering via `product-media` / `product-thumbnail` snippets. The Concept theme (and themes derived from it) ships with this pattern. The variant gang_media filter inside `product-media.liquid` / `product-thumbnail.liquid` must reference `product_variant.metafields.theme.gang_media`.

The variant metafield itself needs to exist:

- **Namespace:** `theme`
- **Key:** `gang_media`
- **Type:** List of file references (images)
- **Owner:** Variant

Populate it on each variant with the media items you want to appear in the gallery for that variant.

## Implementation

### 1. Section schema — `sections/main-product.liquid`

Add this checkbox inside the existing "Media" settings group, near the `hide_variants` toggle:

```json
{
  "type": "checkbox",
  "id": "hide_first_media",
  "default": false,
  "label": "Hide first image / use variant gang media as gallery",
  "info": "When the selected variant has a 'Gang media' metafield set, the gallery shows only those gang_media items (sticky/featured uses the first non-hero gang media). Otherwise the first product image is hidden from the gallery. Featured image for collection cards and sharing is unaffected."
}
```

### 2. Pass through to the snippet — `sections/main-product.liquid`

In the `{% render 'product-media-gallery' %}` call, add the new parameter alongside `hide_variants`:

```liquid
{%- render 'product-media-gallery',
  product: product,
  ...
  hide_variants: section.settings.hide_variants,
  hide_first_media: section.settings.hide_first_media,
  ...
-%}
```

### 3. Aspect-ratio CSS — `sections/main-product.liquid`

If the section sets a `--aspect-ratio` CSS variable from `first_media` (Concept-derived themes do), update it to respect the toggle:

```liquid
{%- assign first_media = product.selected_or_first_available_variant.featured_media | default: product.media.first -%}
{%- if section.settings.hide_first_media -%}
  {%- assign _first_media_variant_gang = product.selected_or_first_available_variant.metafields.theme.gang_media.value -%}
  {%- if _first_media_variant_gang != blank and product.selected_or_first_available_variant.metafields.theme.gang_media.list? and _first_media_variant_gang.size > 0 -%}
    {%- assign first_media = _first_media_variant_gang | first | default: first_media -%}
  {%- elsif first_media.id == product.media.first.id and product.media.size > 1 -%}
    {%- assign first_media = product.media[1] -%}
  {%- endif -%}
{%- endif -%}
```

Also subtract 1 from `media_count` when the toggle is on and we're in the fallback path (so the outer gallery render guard `media_count > 0` works for single-image products):

```liquid
assign media_count = product.media.size
if section.settings.hide_first_media and media_count > 0
  assign media_count = media_count | minus: 1
endif
```

### 4. Gallery snippet — `snippets/product-media-gallery.liquid`

Replace the existing top-of-file `{%- liquid ... -%}` block (the one that assigns `media_count`, `product_variant`, `featured_media`) with the version below. The key additions are `hide_first_media_active`, `use_gang_media_only`, `variant_gang_media`, `hidden_first_media_id`, the hero detection, and the swap of `featured_media`:

```liquid
{%- liquid
  assign variant_images = product.images | where: 'attached_to_variant?', true | map: 'src'

  assign media_count = product.media.size
  if hide_variants and media_count > 1
    assign media_count = media_count | minus: variant_images.size | plus: 1
  endif

  assign product_variant = product.selected_or_first_available_variant
  assign featured_media = product_variant.featured_media | default: product.featured_media

  assign hide_first_media_active = false
  assign hidden_first_media_id = 0
  assign use_gang_media_only = false
  assign variant_gang_media = blank

  if hide_first_media and product.media.size > 0
    assign hide_first_media_active = true
    assign variant_gang_media = product_variant.metafields.theme.gang_media.value

    if variant_gang_media != blank and variant_gang_media.size > 0
      assign use_gang_media_only = true

      assign hero_media_id = 0
      if product_variant.featured_media != blank
        assign hero_media_id = product_variant.featured_media.id
      elsif product.featured_media != blank
        assign hero_media_id = product.featured_media.id
      elsif product.media.first != blank
        assign hero_media_id = product.media.first.id
      endif
      assign hidden_first_media_id = hero_media_id

      assign featured_media = blank
      assign visible_gang_count = 0
      for gang_item in variant_gang_media
        if gang_item.id == hero_media_id
          continue
        endif
        assign visible_gang_count = visible_gang_count | plus: 1
        if featured_media == blank
          assign featured_media = gang_item
        endif
      endfor
      assign media_count = visible_gang_count
    else
      assign hidden_first_media_id = product.media.first.id
      if media_count > 0
        assign media_count = media_count | minus: 1
      endif
      if product.media.size > 1
        assign featured_media = product.media[1]
      else
        assign featured_media = blank
      endif
    endif
  endif
-%}
```

### 5. Main media loop — `snippets/product-media-gallery.liquid`

Find the existing `{%- for media in product.media -%}` loop inside the `<slider-element>`. Wrap it so that when `use_gang_media_only` is true we iterate the gang_media list directly:

```liquid
{%- if use_gang_media_only -%}
  {%- for media in variant_gang_media -%}
    {%- if media.id != featured_media.id and media.id != hidden_first_media_id -%}
      {%- render 'product-media',
        product: product,
        product_id: product_id,
        section_id: section_id,
        product_variant: product_variant,
        media: media,
        featured_media: featured_media,
        variant_images: variant_images,
        hide_variants: hide_variants,
        gallery_layout: gallery_layout,
        image_zoom: image_zoom,
        image_fill: image_fill,
        image_ratio: image_ratio,
        image_ratio_mobile: image_ratio_mobile,
        preload: false,
        sizes: sizes,
        autoplay: enable_video_autoplay,
        loop: enable_video_looping
      -%}
    {%- endif -%}
  {%- endfor -%}
{%- else -%}
  {%- for media in product.media -%}
    {%- if media.id != featured_media.id and media.id != hidden_first_media_id -%}
      {%- render 'product-media',
        ...same args as above...
      -%}
    {%- endif -%}
  {%- endfor -%}
{%- endif -%}
```

### 6. Thumbnail loop — `snippets/product-media-gallery.liquid`

Same pattern for the `{%- for media in product.media -%}` loop inside `<media-dots>`:

```liquid
{%- if use_gang_media_only -%}
  {%- for media in variant_gang_media -%}
    {%- if media.id != featured_media.id and media.id != hidden_first_media_id -%}
      {%- render 'product-thumbnail',
        product: product,
        product_variant: product_variant,
        media: media,
        featured_media: featured_media,
        variant_images: variant_images,
        hide_variants: hide_variants,
        image_fill: image_fill,
        image_ratio: image_ratio,
        image_ratio_mobile: image_ratio_mobile,
        position: forloop.index
      -%}
    {%- endif -%}
  {%- endfor -%}
{%- else -%}
  {%- for media in product.media -%}
    {%- if media.id != featured_media.id and media.id != hidden_first_media_id -%}
      {%- render 'product-thumbnail',
        ...same args as above...
      -%}
    {%- endif -%}
  {%- endfor -%}
{%- endif -%}
```

## Enabling on a product page

1. Open the theme editor and switch to the product template instance you want to configure (`Default product`, `product-new2`, etc).
2. Click the **Product information** section.
3. Scroll the settings panel to the **Media** header.
4. Tick **"Hide first image / use variant gang media as gallery"** and click **Save**.

The setting is per-template-instance — flip it on each template independently.

## Verifying it works

A debug HTML comment is emitted whenever the toggle is active. View the rendered page source and search for `pdp-hide-first-media:v5`. You should see a block like:

```html
<!-- pdp-hide-first-media:v5
  variant-id=40889023496265
  variant-gang-blank=false
  variant-gang-list-flag=true
  variant-gang-size=7
  use-gang=true
  hero-id=69148050686339
  featured-id=<a different id>
  media-count=6
-->
```

- `use-gang=true` confirms the gang_media path is active for the current variant.
- `hero-id` should be the variant's hero / featured_media id.
- `featured-id` must be **different** from `hero-id` — if they match, the swap didn't happen (most likely because the variant's gang_media list only contains the hero).
- `media-count` is the number of gang_media items minus the hero, used by layout classes like `with-only1` and the thumbnail-rail visibility check.

If the comment is missing from source, either the toggle isn't saved on this template instance, or the snippet hasn't synced yet from GitHub to Shopify.

Once you're confident the feature is stable on the host site, the debug comment can be removed.

## Edge cases handled

- **Variant has no gang_media**: falls back to "hide first product image" (use `product.media[1]` as featured, skip `product.media.first` in the loops).
- **Variant gang_media contains only the hero**: `visible_gang_count` is 0, `featured_media` is blank, the gallery render guard in the parent section (`media_count > 0`) suppresses the gallery entirely. The merchant should add at least one non-hero gang_media item.
- **Product with a single media and no gang_media**: gallery is suppressed (page-width also flips to narrow, same as a product with no images).
- **Variant switching**: existing variant-image switching JS continues to work — only the initial render is affected by this toggle.

## Reverting

Remove:

1. The `hide_first_media` checkbox from the schema in `main-product.liquid`.
2. The `hide_first_media: section.settings.hide_first_media,` line from the `render 'product-media-gallery'` call.
3. The `hide_first_media` aspect-ratio extension at the top of `main-product.liquid`.
4. The `hide_first_media_active`, `use_gang_media_only`, `variant_gang_media`, `hidden_first_media_id` block from the gallery snippet.
5. The `use_gang_media_only` branches inside the main and thumbnail loops — restore the original `{%- for media in product.media -%}` loops with the simple `{%- if media.id != featured_media.id -%}` check.
6. The `<!-- pdp-hide-first-media:v5 -->` debug comment.
