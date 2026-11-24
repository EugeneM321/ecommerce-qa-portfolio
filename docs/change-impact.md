# Change impact — asynchronous payment confirmation

**Proposed change:** Payment acceptance and final order confirmation arrive separately. This is a regression-planning exercise. The Version 1 baseline uses the synchronous simulator behavior defined in the scope.

| Coverage | What to change |
| --- | --- |
| M08 — approved checkout | Expect Pending first, then Paid for the original reference when confirmation arrives. Verify inventory is deducted at the paid transition. |
| M09/M10 — decline or cancellation | Verify a pending attempt can resolve to a failed or canceled state without producing a paid order or deducting stock. Preserve the shopper's recovery path. |
| M11/M12 — interrupted checkout, retry, and reload | Check that retry and refresh before confirmation preserve the original attempt. Exercise repeat and delayed confirmation delivery. Verify one paid order and one stock deduction after convergence. |
| M13/M14 — keyboard and narrow viewport | Check whether the pending status and the final outcome remain discoverable without stealing focus or obscuring recovery controls. |
| M01–M07 — catalog, cart, and totals | Keep expected behavior. Rerun the smoke path through checkout to catch regressions at the cart-to-payment boundary. |

For planned A04, UI-04, and SQL-01, use deterministic simulator controls to deliver confirmation at a known point. Assert Pending before delivery, then assert the eventual state within an agreed time limit. Prefer bounded condition checks over fixed sleeps. Capture the attempt reference, status sequence, final order count, and stock evidence.

Keep one approval path in smoke. Expand targeted payment regression to delayed confirmation, repeated delivery, timeout, and refresh or retry while pending. Agree on the maximum wait and shopper recovery behavior before sign-off. Block release if an attempt can remain unexplained beyond that window, transition to Paid incorrectly, create duplicates, or deduct stock more than once.
