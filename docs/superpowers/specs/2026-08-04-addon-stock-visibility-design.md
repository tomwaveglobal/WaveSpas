# Add-on stock visibility controls — design

Date: 2026-08-04
Scope: `snippets/product-variant-picker-advanced.liquid`, `sections/main-product.liquid` (schema)

## Problem

The Add-Ons step (step 4, fed by `product.metafields.custom.popular_upgrades`) hides
any add-on row whose resolved variant is out of stock. That is hardcoded — one line
in `applyAddonMatch()`:

```js
var isSoldOut = !current.available;
addonEl.hidden = isSoldOut;
```

Merchants have no control over it, and there is no way to surface a pre-orderable
add-on as such. Pre-order variants use inventory policy "continue" and therefore
report `available: true`, so today they show but are indistinguishable from
in-stock items — a shopper can add one with no indication it will delay the whole
order.

## Behaviour

Three independent visibility toggles, one per stock state. Defaults reproduce
current behaviour exactly, so shipping this changes nothing until a merchant
opts in.

| Block setting | Default | Current behaviour |
| --- | --- | --- |
| `addons_show_in_stock` | on | shows |
| `addons_show_pre_order` | on | shows (incidentally, via `available: true`) |
| `addons_show_out_of_stock` | off | hidden |

Classification is single-source, mirroring the tile logic so the two cannot drift:

```js
function addonStockState(v) {
  if (v.preOrder) return 'preorder';   // metafield wins over `available`
  return v.available ? 'instock' : 'oos';
}
```

The pre-order metafield must win over `available` for the reason documented
against the buy-button logic: policy "continue" reports `available: true` at zero
stock, so `available` alone cannot separate pre-order from in-stock.

### Selectability

An out-of-stock row, when shown, stays **unselectable** — checkbox `disabled`,
never `checked`. This is deliberate: add-ons are submitted sequentially through
`/cart/add.js`, so an unavailable line item would fail the cart add and could
break the whole submit chain. Showing OOS rows is informational only.

Pre-order and in-stock rows are selectable as they are today.

### Row markers

- **OOS row:** dimmed, with a "Sold out" label. Merchant-editable, blank to hide.
- **Pre-order row:** the same `Pre-order · ships DD/MM/YY` chip the size tiles
  use, reusing the existing `cleanPreOrderText()` helper and chip styling so the
  date formatting and trim patterns stay consistent across the picker.

## Data

`addonVariants` currently emits `{id, title, sku, price, available, image}` per
variant. Add `preOrder`, read from `v.metafields.custom[pre_order_key]` — the
same market-aware key (`pre_order_date_uk|eu|usa`) resolved at the top of the
snippet from `localization.market.metafields.country.code`.

Without this field the pre-order state cannot be detected at all, so it is a
prerequisite rather than an enhancement.

## Deliberate non-goals

- `pickAddonVariant()` keeps matching purely on spa size. If the size-matched
  variant is OOS and OOS rows are hidden, the row disappears — as it does today.
  Substituting a different size to keep a row visible would offer the shopper the
  wrong item.
- No back-in-stock wiring. The theme has `snippets/back-in-stock.liquid` but
  hooking add-on rows into it is a separate piece of work.

## Verification

Test on the real rendered theme via the `WaveSpas/Development` preview
(id `195552018819`), driving a product whose `popular_upgrades` include variants
in more than one stock state. Assert, for each of the toggle combinations that
matter:

- an in-stock add-on shows only when `addons_show_in_stock` is on
- a pre-order add-on shows only when `addons_show_pre_order` is on, and carries
  the ships-date chip
- an OOS add-on shows only when `addons_show_out_of_stock` is on, and when shown
  is `disabled` and unchecked
- defaults reproduce today's behaviour (OOS hidden, others shown)
