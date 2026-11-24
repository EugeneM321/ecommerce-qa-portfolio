# Test strategy

The QA owner assesses each candidate build against the checkout release gate. Run smoke tests for catalog access, cart totals, and approved payment. Add targeted regression based on changes to product availability, pricing, payment, or checkout state. Run the full 14-case set before Version 1 sign-off.

| Tier | Coverage | Execution |
| --- | --- | --- |
| Smoke | M01, M04, M05, M08 | Open the catalog, build a cart, verify totals, and complete approved checkout. |
| Release-critical regression | M03, M05, M07–M12 | Verify stock, totals, rejected or canceled payment, and interrupted checkout recovery. |
| Broader regression | M02, M06, M13, M14 | Check product detail, empty-cart recovery, keyboard, and narrow-viewport behavior. |

Start each case from an independent synthetic seed unless the case calls for a state change. Record the build, environment, expectation, observation, outcome, and any evidence or defect link. Use Pass, Fail, Blocked, or Not Run. All cases are Not Run at Step 1.

Prioritize automation for stable, high-risk outcomes such as stock limits, server-calculated totals, payment status, and retry safety. Keep usability, focus, and recovery cues in the manual pass. Proposed API, browser, SQL, and CI checks apply to this synthetic demo.

## Exploratory charters

| Charter | Mission and evidence |
| --- | --- |
| EX-01 — Checkout interruption and recovery | Explore refresh, Back, repeated retry, and an interrupted confirmation after acceptance. Record the shopper message, order reference, final order state, and stock before and after. Identify any point where the shopper cannot tell whether to retry. Planned for the synthetic demo. |
| EX-02 — Identity handoff and cart continuity | Plan future checks for a canceled or unsuccessful sign-in handoff, return to guest checkout, and cart continuity. Record assumptions and expected behavior. Planned only. Version 1 has no sign-in integration and these checks are outside its release gate. |
