# Email notification templates

Shopify email notifications (Settings → Notifications) are **not** theme files and
are **not** covered by the GitHub theme sync. They also cannot be read or written
through any API — verified 2026-08-14 against the Admin GraphQL schema:

- no query field returns a notification template
- none of the 483 mutations writes one
- the Shopify CLI has no notification command

So this folder is the only version history these templates have. Editing them is
always a copy-paste into the Shopify admin, and the backup here is the only way
back if a paste goes wrong.

## Layout

```
wavespas/
  order-confirmation.BACKUP-2026-08-14.liquid   what was live before the change
  order-confirmation.liquid                     current, with the pre-order notice
render_test.py                                  32 render tests
preview-styles.css                              approximation of Shopify's notification CSS
```

`wavesupboards/` is missing on purpose — see "Second store" below.

## The pre-order notice

The order confirmation tells customers when a line is on pre-order and when it
will ship. It resolves each line from two sources, in order:

1. **The STOQ / Restock Rocket line item property.** STOQ writes a visible
   property whose *name* is the sentence and whose *value* is the date. Two
   wordings are in use (`…expected shipping date of`, `…expected delivery date
   of`), so the match is on the name containing `pre-order`. STOQ wins when
   present — it is what the customer was shown at purchase.
2. **The variant metafield**, when STOQ wrote nothing:
   `custom.pre_order_date_{uk,usa,eu}`, chosen from the shipping country
   (notification templates have no `localization` object; no address ⇒ UK).

Two rules that are easy to get wrong and are load-bearing:

- **Never reformat the date.** Both sources mix `d/m/y` and `m/d/y` across
  markets — `28/9/2026` on UK orders, `07/27/26` and `09/25/2026` on US ones.
  Reformatting misstates the date for one market or the other.
- **A populated date is not proof of a pre-order.** The fallback is gated on
  `custom.pre_order_control_{uk,us,eu}` (note `us`, while the date key is `usa`).
  It fires when that flag reads `Pre Order`-ish **or is blank** (the EU dates are
  maintained blank), and never when it says `In Stock` or `Out of Stock`. Without
  that gate, a WaveSupBoards customer buying an in-stock `Fin Clip | Tourer`
  would be told it ships "Test Pre Order Date 4th July".

Misconfigured STOQ variants emit the literal string `{{ date }}`; those fall
through to the metafield, then to an undated notice.

If notification Liquid cannot read variant metafields, every lookup is nil and
the template degrades to STOQ-only. Nothing breaks and no wrong date is shown.

## Tests

```
pip3 install python-liquid
cd docs/notifications && python3 render_test.py
```

32 cases, all built from live data: STOQ-wins, both real gap orders, both
metafield prefix forms, per-market key isolation across 12 countries, the
`{{ date }}` bug, both WaveSupBoards silent cases, and metafields-unavailable
degradation.

## Editing checklist

1. Copy the current live template out of the admin into a new `BACKUP-<date>` file
   here first — it may have drifted from what is committed.
2. Edit `order-confirmation.liquid`, run the tests.
3. Paste the whole file into Settings → Notifications → Order confirmation.
4. Send a test notification. This is the only way to confirm Shopify's renderer
   exposes `line.variant.metafields`; local rendering cannot prove it.

## Second store

WaveSupBoards runs the same STOQ app and the same metafield definitions, but its
notification template has never been captured and is probably not identical to
this one. Do **not** paste the WaveSpas file into it — that would overwrite
whatever store-specific customisation it carries. Copy its current template out
of its admin first, back it up alongside this one, then port the pre-order block
into it.
