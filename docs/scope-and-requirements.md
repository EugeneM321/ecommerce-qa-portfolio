# Version 1 scope and requirements

The fictional storefront supports catalog browsing, product detail, cart edits, guest checkout, and order status. Currency is USD. Shipping is a flat $5.00 for each submitted order. Taxes and discounts are outside Version 1. All payment outcomes come from a local simulator. Real PayPal, Zelle, social login, and other external payment providers are outside scope.

## Seed catalog

| Product | Unit price | Starting stock |
| --- | ---: | ---: |
| Harbor Soap Dish | $12.00 | 5 |
| Meadow Travel Pouch | $18.00 | 3 |
| Dune Bath Brush | $9.00 | 0 |

Start with an empty cart and no orders or payment attempts. For the flagship fixture, put two Harbor Soap Dishes in the cart. The subtotal is $24.00 and the checkout total is $29.00.

| ID | Requirement |
| --- | --- |
| EC-R01 | Catalog and detail pages show the same product price and availability. The cart rejects out-of-stock products and quantities above available stock. |
| EC-R02 | Cart subtotal equals unit price multiplied by quantity across all lines. Checkout adds $5.00 shipping once. An empty cart has no checkout total or checkout action. The paid order total matches the submitted checkout total. |
| EC-R03 | If payment is accepted but its confirmation response is interrupted, retrying the same checkout attempt resolves to exactly one paid order for that attempt, using the same order reference. Inventory for that order is deducted once. For the flagship fixture, stock decreases from 5 to 3. The final state is explicitly shown as paid. |
| EC-R04 | Approved payment produces a paid order and deducts purchased stock. A decline or cancellation creates no paid order, preserves stock, and returns the shopper to a usable cart. |
| EC-R05 | The shopper can distinguish paid, unsuccessful, and unconfirmed outcomes. Refresh during an unconfirmed attempt preserves the retry path for that attempt. Checkout feedback and recovery controls remain usable with keyboard navigation and at a narrow viewport. |

## Local simulator outcomes

| Outcome | Expected behavior |
| --- | --- |
| Approved | Show the paid order reference and deduct inventory once. |
| Declined | Explain the decline, keep the cart, and preserve stock. |
| Canceled | Return the shopper to the cart with a cancellation message and preserve stock. |
| Interrupted confirmation after acceptance | Record acceptance locally while withholding confirmation from the shopper. Show an unconfirmed state and retry action. Retrying the same attempt resolves the original order and leaves only one stock deduction. |
