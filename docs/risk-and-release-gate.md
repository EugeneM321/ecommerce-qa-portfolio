# Risk and release gate

| Release-blocking risk | Shopper or business impact | Evidence expected |
| --- | --- | --- |
| Incorrect cart or order totals | The shopper sees or pays an incorrect amount. | M05 and M08 agree on subtotal, shipping, and paid order total. |
| Failed payment produces a paid order | The merchant could fulfill an unpaid order. | M09 and M10 show usable cart recovery, no paid order, and unchanged stock. |
| Duplicate order creation | One checkout attempt can produce multiple fulfillment records. | M11 and M12 resolve to one order reference. Planned A04 and SQL-01 independently verify the order count. |
| Duplicate inventory deduction | Available stock becomes inaccurate after a retry. | M08, M11, and M12 verify stock after payment. Planned SQL-01 verifies the persisted quantity. |
| Ambiguous final state after payment retry | The shopper cannot tell whether to pay again. | M11 and M12 distinguish unconfirmed from paid and show a clear final status for the original attempt. |

Block release when a listed risk is reproduced or when its required evidence is missing, blocked, or inconclusive. For Version 1 sign-off, require passing smoke and release-critical coverage, agreement across shopper-visible and technical evidence, and a recorded decision for any remaining non-blocking findings. Mark the current release decision **Not assessed** until the demo and evidence exist.

## Flagship traceability

**EC-R03 → M11 → planned A04 → planned UI-04 → planned SQL-01 → planned CI evidence**

| Link | Evidence |
| --- | --- |
| EC-R03 | One accepted payment attempt may resolve to one paid order and one stock deduction, including after an interrupted confirmation and retry. |
| M11 | Start with five HSD in stock and two in the cart. Simulate payment acceptance with an interrupted confirmation. Retry the same attempt and record the final state and order reference. |
| Planned A04 | Exercise the same interruption and retry through the demo API. Independently read back order and inventory state and compare the order reference to the retry result. |
| Planned UI-04 | Exercise the shopper flow. Verify the unconfirmed message, available retry action, and clear paid status with the expected order reference. |
| Planned SQL-01 | Query the synthetic database by checkout attempt and product. Verify exactly one order, that it is paid, and that persisted HSD stock is 3, down from 5. |
| Planned CI evidence | Link the future automated run and durable evidence showing the requirement, scenario, and outcome. Retain relevant failure evidence when available. |
