# Risk and release gate

| Release-blocking risk | Shopper or business impact | Evidence expected |
| --- | --- | --- |
| Incorrect cart or order totals | The shopper sees or pays an incorrect amount. | M05 and M08 agree on subtotal, shipping, and paid order total. |
| Failed payment produces a paid order | The merchant could fulfill an unpaid order. | M09 and M10 show usable cart recovery, no paid order, and unchanged stock. |
| Duplicate order creation | One checkout attempt can produce multiple fulfillment records. | M11 and M12 resolve to one order reference. A04 checks the API result and SQL-01 independently verifies the order count. |
| Duplicate inventory deduction | Available stock becomes inaccurate after a retry. | M08, M11, and M12 verify stock after payment. SQL-01 verifies the persisted quantity. |
| Ambiguous final state after payment retry | The shopper cannot tell whether to pay again. | M11 and M12 distinguish unconfirmed from paid and show a clear final status for the original attempt. |

Block release when a listed risk is reproduced or when its required evidence is missing, blocked, or inconclusive. For Version 1 sign-off, require passing smoke and release-critical coverage, agreement across shopper-visible and technical evidence, and a recorded decision for any remaining non-blocking findings. Record the decision in the run report. See the [Version 1 manual run and release decision](test-runs/2026-11-24-v1.md).

## Flagship traceability

**EC-R03 → M11 → A04 → planned UI-04 → SQL-01 → planned CI evidence**

| Link | Evidence |
| --- | --- |
| EC-R03 | One accepted payment attempt may resolve to one paid order and one stock deduction, including after an interrupted confirmation and retry. |
| M11 | Start with five HSD in stock and two in the cart. Simulate payment acceptance with an interrupted confirmation. Retry the same attempt and record the final state and order reference. |
| A04 — API behavior | The [local suite](../tests/api-sql.test.mjs) checks the unconfirmed response, retries the original attempt twice, and independently reads back the same paid order and stock from the API. |
| Planned UI-04 — Playwright browser behavior | Exercise the shopper flow and verify the visible unconfirmed message, retry action, and clear paid status with the expected order reference. |
| SQL-01 — SQLite persistence | A separate read-only connection verifies one paid order tied to the original attempt, a $29 total, and two Harbor Soap Dishes. Stock moves from 5 to 3 at acceptance and stays 3 after both retries. |
| Planned CI evidence | Link the future automated run and durable evidence showing the requirement, scenario, and outcome. Retain relevant failure evidence when available. |
