# Mega menu: icon toggle, 3-column groups, and colour auto-pull

Date: 2026-08-12

## Problem

The tabbed mega menu (`mega_menu_tab` block) renders a left rail of grouped links —
Shop by range, Shop by size, Shop by shape, Shop by colour. Three things are wrong
or missing:

1. Every tab carries an icon image. Icons force wide rows, which caps the
   multi-column groups at two columns.
2. Sizes are 6/4 Person only, and Shape is Square/Round only. 2 Person and
   Octagonal are missing.
3. **Shop by colour is broken.** Its four links point at `TaxonomyValue` GIDs, but
   Search & Discovery now serves the colour filter from metaobjects. Verified
   2026-08-12: all four return 0 products, e.g.

   ```
   /collections/hot-tub-full-range?filter.v.t.shopify.color-pattern=gid://shopify/TaxonomyValue/1
   → 0 results
   ```

   The live filter exposes 8 values: Black, Charcoal Black, Flint Grey,
   Graphite Grey, Grey, Navy, Pebble White, White.

## Decisions

- Colour group **auto-pulls** from the collection's live Search & Discovery filter
  rather than being maintained by hand. Self-healing: links cannot go stale again.
  All 8 values render; no curation setting.
- Only **Size and Shape** go to three columns. The range group keeps its large
  icons and one-column rows — it is the hero of the menu.
- Icon toggle is **per group**, not per tab and not menu-wide.
- Octagonal points at a real collection (`octagonal-hot-tubs`), not a search URL.

## Design

### 1. Per-group icon toggle

New checkbox `tab_group_no_icons_N`. A group heading sets it for every tab after
it until the next heading, exactly as `tab_group_columns_N`, `tab_group_hidden_N`
and `tab_group_heading_hidden_N` already do in `header-nav-mega.liquid`.

It suppresses **icon images only**. Swatches still render — otherwise the colour
group, which is the main consumer of the toggle, would go blank.

### 2. Three columns

No CSS work. `tab_group_columns_N` already offers "3" and `--of-3` (span 4 of a
12-track grid) already exists in `assets/theme.css`. Mobile already collapses
of-3 and of-4 to span 6 (2-up). Size and Shape are set to "3" in the customiser.

### 3. Tab resequencing

Slots are order-driven, so a new tab cannot simply take the next free index.
2 Person in free slot 9 would render after 6 Person.

| Slot  | Before                      | After                          |
|-------|-----------------------------|--------------------------------|
| 7–9   | 6 Person, 4 Person, —       | 2 Person, 4 Person, 6 Person   |
| 10–12 | Square, Round, *Shop by colour* | Square, Round, Octagonal   |
| 13    | Grey                        | Shop by colour (auto-pull)     |
| 14–16 | White, Navy, —              | freed                          |

Auto-pull collapses four manual colour tabs into one group anchor, which is what
frees the slots for Octagonal.

### 4. Colour auto-pull

New per-group setting `tab_group_colors_from_N` (collection picker). When set, the
group renders one nav item per value of that collection's `color-pattern` filter —
label, URL and swatch all from Shopify.

**`collection.filters` does not work here.** Verified on the Development theme
2026-08-12: the same header section rendered from the homepage reported
`filters.size = 0`, and from the collection URL reported the full 8 values. The
docs state no template restriction, but in practice `filters` is only populated
on the collection and search templates. Rendering the group from it would have
left the heading with nothing under it on every page except the collection.

The colours therefore come from the products' `shopify--color-pattern` taxonomy
metafield, which resolves from anywhere:

1. Walk `collection.products` and union each product's colour metaobject ids.
2. Walk `shop.metaobjects['shopify--color-pattern'].values` and render only the
   ids in that union.

Pass 2 exists for ordering: shop order is alphabetical and stable, whereas
product order depends on which product happens to be listed first.

Membership still matches the storefront filter exactly. The shop holds 12 colour
metaobjects; only the 8 present in the collection render. Blue, Gray, Multicolor
and Orange live on accessories and would have produced empty result pages —
the exact failure this change exists to remove.

The filter parameter (`filter.v.t.shopify.color-pattern`) is now hardcoded rather
than read off the filter object. A colour filter built on a product option rather
than the taxonomy would need a different param.

`collection.products` is unpaginated here and so returns the first 50 products.
Point the setting at a curated collection, not the full catalog.

One structural change: the tab loop currently renders nothing unless
`tab_target_link_N` is set. A group heading with an auto-source must be allowed to
render without its own link. The generated items each advance `reveal_index` so
the stagger animation stays in sequence.

### 5. Swatch resolution

`nav-swatch.liquid` gains a `swatch` parameter. Resolution order, most specific
first:

1. a texture mapped in Theme settings > Swatches for that colour name
2. `swatch.image` (native Shopify swatch image)
3. that mapping's hex, if it set one
4. `swatch.color` (native swatch colour)
5. a guess from the last word of the name (existing fallback behaviour)

An explicit theme mapping outranks the flat taxonomy colour because it is a
deliberate choice and because the taxonomy flattens distinct finishes: Flint Grey,
Graphite Grey and Grey all sit on `#808080`. Charcoal Black, Flint Grey, Graphite
Grey and Pebble White carry mapped textures, so they stay visually distinct.

## Verification

Rendered from the homepage via the Section Rendering API on the Development theme:

- Range group — 1 column, icons present
- Shop by size — 3 columns, no icons, 2 / 4 / 6 Person
- Shop by shape — 3 columns, no icons, Square / Round / Octagonal
- Shop by colour — 4 columns, 8 swatches, correct metaobject GIDs
- Mobile drawer — all three groups and all 8 swatches present

Four sampled colour links return 3, 2, 1 and 2 products. The `TaxonomyValue`
links they replace returned 0.

## Files

- `sections/header.liquid` — schema, 2 new settings × 16 repeats
- `snippets/header-nav-mega.liquid` — desktop rail
- `snippets/header-nav-drawer.liquid` — mobile drawer
- `snippets/nav-swatch.liquid` — native swatch support
- `sections/header-group.json` — values, pushed separately

Per `reference-shopify-new-setting-two-pushes`, the schema ships first and the
values follow in a second push, or Shopify drops them. Per
`reference-theme-settings-json-sync-gap`, values go via `shopify theme push --only`,
never through git.

## Out of scope / blocked

Creating the `octagonal-hot-tubs` collection and deleting the existing
`octagonal-hot-tubs → hot-tub-full-range` redirect are admin changes. There is no
stored Admin API auth (`shopify store auth` needs an interactive browser login),
so the merchant does this. The tab is built and wired to the handle; it renders
once the collection exists.

Format to match Square:

- H1: `Octagonal Hot Tubs`
- Title: `Octagonal Hot Tubs | ... | Wave Spas`
- Description in the style of: "Square hot tubs that fit flush to a fence or
  decking edge. Inflatable, eco foam and rigid frame builds seating four to six
  adults."

Search finds 4 octagonal products today, so the products exist.
