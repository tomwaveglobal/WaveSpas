"""Render the order confirmation against REAL line shapes pulled from both stores.

Every case below is copied from live data:
  - STOQ property names/values from 250 WaveSpas STOQ-preorder orders
  - variant metafields from 778 WaveSpas + 296 WaveSupBoards variants
"""
import os, re, sys
from liquid import Environment

HERE = os.path.dirname(os.path.abspath(__file__))
# Default to the WaveSpas template; pass another path to test a different store's.
TEMPLATE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    HERE, "wavespas", "order-confirmation.liquid")

env = Environment()
for n in ("money", "money_with_currency"):
    env.filters[n] = lambda v, *a, **k: f"GBP {v}"
for n in ("img_url", "shopify_asset_url", "payment_icon_png_url", "payment_type_img_url"):
    env.filters[n] = lambda v, *a, **k: "https://cdn.example/img.png"
env.filters["format_address"] = lambda v, *a, **k: "1 Test St"

tpl = env.from_string(open(TEMPLATE).read())

SHIP = "This item is on pre-order with an expected shipping date of"
DELIV = "This item is on pre-order with an expected delivery date of"


def line(title, variant="Default Title", props=None, mf=None):
    return {
        "title": title, "quantity": 1,
        "product": {"title": title},
        "variant": {"title": variant, "metafields": {"custom": mf or {}}},
        "properties": props or [], "image": None,
        "original_line_price": 100, "final_line_price": 100,
        "refunded_quantity": 0, "discount_allocations": [], "selling_plan_allocation": None,
    }


def ctx(lines, country="GB"):
    return {
        "line_items": lines, "subtotal_line_items": lines,
        "requires_shipping": True, "delivery_method": "shipping",
        "customer": {"first_name": "Sam"}, "order_name": "#TEST",
        "shop": {"name": "Wave", "url": "https://x", "email": "hi@x", "email_accent_color": "#000",
                 "email_logo_url": None, "email_logo_width": 200},
        "transactions": [], "discount_applications": [], "subtotal_price": 100,
        "shipping_price": 0, "tax_price": 0, "total_price": 100, "total_discounts": 0,
        "shipping_address": {"country_code": country} if country else None,
        "billing_address": None, "shipping_method": {"title": "Standard"},
        "order_status_url": "https://x", "delivery_instructions": "",
        "consolidated_estimated_delivery_time": None, "payment_terms": None,
        "total_duties": None, "total_tip": 0,
    }


# One variant carrying ALL THREE market dates with distinct values, so each
# market test can only pass by selecting the right metafield key.
ALL3 = {
    "pre_order_date_uk": "Pre-order | Ships 11/11/26",
    "pre_order_date_usa": "Pre-Order | Ships 22/22/26",
    "pre_order_date_eu": "Pre-order | Ships 33/33/26",
    "pre_order_control_uk": "Pre Order",
    "pre_order_control_us": "Pre Order",
    "pre_order_control_eu": "Pre Order",
}
THREE_MARKET = [
    (f"MARKET {cc} -> {want}", [line("Tri-market Tub", "A", [], ALL3)], cc,
     [want], [w for w in ("11/11/26", "22/22/26", "33/33/26") if w != want])
    for cc, want in [
        ("GB", "11/11/26"), ("GG", "11/11/26"), ("IM", "11/11/26"), ("JE", "11/11/26"),
        ("US", "22/22/26"), ("CA", "22/22/26"), ("AU", "22/22/26"),
        ("DE", "33/33/26"), ("IE", "33/33/26"), ("HU", "33/33/26"),
        ("ES", "33/33/26"), ("NL", "33/33/26"),
    ]
] + [
    # control flag is per-market too: UK says Pre Order, US says In Stock
    ("MARKET GB: uk control 'Pre Order' -> fires",
     [line("Split Tub", "A", [], {"pre_order_date_uk": "Pre-order | Ships 11/11/26",
                                  "pre_order_control_uk": "Pre Order",
                                  "pre_order_date_usa": "Pre-order | Ships 22/22/26",
                                  "pre_order_control_us": "In Stock"})],
     "GB", ["11/11/26"], ["22/22/26"]),
    ("MARKET US: us control 'In Stock' -> silent, must NOT borrow the UK date",
     [line("Split Tub", "A", [], {"pre_order_date_uk": "Pre-order | Ships 11/11/26",
                                  "pre_order_control_uk": "Pre Order",
                                  "pre_order_date_usa": "Pre-order | Ships 22/22/26",
                                  "pre_order_control_us": "In Stock"})],
     "US", [], ["11/11/26", "22/22/26", "pre-order"]),
    ("MARKET US: date_usa empty -> must NOT fall back to the UK date",
     [line("UK-only Tub", "A", [], {"pre_order_date_uk": "Pre-order | Ships 11/11/26",
                                    "pre_order_control_uk": "Pre Order",
                                    "pre_order_control_us": "Pre Order"})],
     "US", [], ["11/11/26", "pre-order"]),
]

# (name, lines, country, must_contain, must_not_contain)
CASES = THREE_MARKET + [
    ("SPAS #W140041 real: STOQ present, metafield agrees -> STOQ wins",
     [line("Replacement Filter | Screw-On/Threaded", "4 Pack", [[DELIV, "28/9/2026"]],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 28/09/26"})],
     "GB", ["28/9/2026"], ["Ships"]),

    ("SPAS #W140035 real: STOQ and metafield DISAGREE -> STOQ wins (07/09/26 not 31/08/26)",
     [line("Garda | Eco Foam Hot Tub", "Charcoal Black / 6 Person", [[SHIP, "07/09/26"]],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 31/08/26"})],
     "GB", ["07/09/26"], ["31/08/26"]),

    ("SPAS #W140039 real GAP: no STOQ, metafield UK + control 'Pre Order' -> FALLBACK fires",
     [line("Replacement Filter | Screw-On/Threaded", "8 Pack", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 28/09/26"})],
     "GB", ["28/09/26", "expected shipping date of"], ["Pre-order |", "Ships 28"]),

    ("SPAS #W140032 real GAP: prefix 'Pre-Order | Ships 1/9/2026' -> stripped to 1/9/2026",
     [line("Atlantic | Inflatable Hot Tub", "Brown Rattan / 6 Person", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-Order | Ships 1/9/2026"})],
     "GB", ["1/9/2026"], ["Pre-Order |"]),

    ("SPAS real: US order picks pre_order_date_usa, m/d/y printed verbatim",
     [line("Replacement Filter", "4 Pack", [],
           {"pre_order_control_us": "Pre Order", "pre_order_date_usa": "Pre-Order | Ships 09/25/2026",
            "pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 28/09/26"})],
     "US", ["09/25/2026"], ["28/09/26"]),

    ("SPAS real: EU order, control BLANK + date present -> allowed through",
     [line("Pacific | Inflatable Hot Tub", "Dark Grey",
           [], {"pre_order_date_eu": "Pre-order | Ships 31/08/26"})],
     "ES", ["31/08/26"], []),

    ("SPAS real: variant with prefix 'Pre-Order | 09/25/2026' (no 'Ships')",
     [line("Some Tub", "A", [], {"pre_order_control_uk": "Pre Order",
                                 "pre_order_date_uk": "Pre-Order | 09/25/2026"})],
     "GB", ["09/25/2026"], ["Pre-Order |"]),

    ("SPAS real: control 'Pre Order' but NO date (Atlantic Slate Rattan) -> undated notice",
     [line("Atlantic | Inflatable Hot Tub", "Slate Rattan / 6 Person", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": ""})],
     "GB", [], ["pre-order"]),

    ("SPAS real: STOQ '{{ date }}' bug -> falls through to metafield",
     [line("Replacement Filter | Screw-On/Threaded", "2 Pack", [[DELIV, "{{ date }}"]],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 28/09/26"})],
     "GB", ["28/09/26"], ["{{"]),

    ("SPAS: STOQ '{{ date }}' AND no metafield -> undated notice, never the placeholder",
     [line("Replacement Filter", "2 Pack", [[DELIV, "{{ date }}"]], {})],
     "GB", ["We'll email you"], ["{{"]),

    ("SUPS real: Fin Clip, date populated but control 'In Stock' -> MUST stay silent",
     [line("Fin Clip | Tourer", "Default Title", [],
           {"pre_order_control_uk": "In Stock", "pre_order_control_us": "In Stock",
            "pre_order_date_uk": "Test Pre Order Date 4th July"})],
     "GB", [], ["pre-order", "Test Pre Order"]),

    ("SUPS real: Roamer Kayak, date populated but control 'Out of Stock' -> MUST stay silent",
     [line("Roamer | Inflatable Kayak", "1-2 Seater | 335x93x35cm", [],
           {"pre_order_control_uk": "Out of Stock", "pre_order_control_us": "Out of Stock",
            "pre_order_date_uk": "Pre-order | Ships 02/10/26"})],
     "GB", [], ["pre-order", "02/10/26"]),

    ("SUPS: same Roamer but control flipped to 'Pre Order' -> fallback fires",
     [line("Roamer | Inflatable Kayak", "1-2 Seater | 335x93x35cm", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 02/10/26"})],
     "GB", ["02/10/26"], []),

    ("Mixed order: 1 STOQ + 1 metafield-only + 1 normal line",
     [line("Chemical Starter Kit", "None", [], {"pre_order_control_uk": "In Stock"}),
      line("Garda | Eco Foam Hot Tub", "Charcoal", [[SHIP, "31/08/26"]],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 31/08/26"}),
      line("Atlantic | Inflatable Hot Tub", "Brown Rattan", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-Order | Ships 1/9/2026"})],
     "GB", ["31/08/26", "1/9/2026", "Any other items"], []),

    ("No pre-order anywhere -> completely silent",
     [line("Chlorine Tablets", "1KG", [], {"pre_order_control_uk": "In Stock"}),
      line("Filter Cleaner", "1L", [], {"pre_order_control_uk": "Out of Stock"})],
     "GB", [], ["pre-order", "Pre-order"]),

    ("No shipping address (warranty/digital) -> defaults to UK key, no crash",
     [line("Warranty Heater Unit Repair", "None", [],
           {"pre_order_control_uk": "Pre Order", "pre_order_date_uk": "Pre-order | Ships 28/09/26"})],
     None, ["28/09/26"], []),

    ("Metafields unavailable in notification Liquid -> degrades to STOQ only, no breakage",
     [line("Garda | Eco Foam Hot Tub", "Charcoal", [[SHIP, "31/08/26"]], None),
      line("Atlantic | Inflatable Hot Tub", "Brown", [], None)],
     "GB", ["31/08/26"], ["Atlantic | Inflatable Hot Tub</strong> &mdash; Brown<br>"]),
]

fails = 0
for name, lines, country, must, mustnt in CASES:
    html = tpl.render(**ctx(lines, country))
    flat = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    body = flat.split("Thank you for your purchase!")[-1].split("View your order")[0].strip()
    errs = [f"missing {m!r}" for m in must if m not in html]
    errs += [f"unexpected {m!r}" for m in mustnt if m in html]
    if "{%" in html:
        errs.append("unrendered Liquid tag")
    status = "PASS" if not errs else "FAIL"
    if errs:
        fails += 1
    print(f"[{status}] {name}")
    print(f"        -> {body[:190] if body else '(silent)'}")
    for e in errs:
        print(f"        !! {e}")
print()
print(f"{len(CASES) - fails}/{len(CASES)} passed")
sys.exit(1 if fails else 0)
