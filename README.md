# E-commerce QA Portfolio

An independent, synthetic e-commerce QA case study inspired by the regression and checkout risks I worked with professionally as a sole QA engineer. Version 1 centers on a release decision: can a guest retry an interrupted checkout without creating a duplicate order or deducting inventory twice?

All demo code, data, requirements, test cases, and automation will be created specifically for this repository. No employer or client source code, internal test cases, customer data, credentials, proprietary assets, or confidential materials are included.

## Quick review

- [Test strategy](docs/test-strategy.md) — regression priorities, manual and automation split, and exploratory charters
- [Scope and requirements](docs/scope-and-requirements.md) — synthetic fixtures and checkout rules
- [14 manual test cases](docs/manual-test-cases.md) — planned catalog, cart, and checkout coverage
- [Risk and release gate](docs/risk-and-release-gate.md) — release blockers and the EC-R03 evidence chain
- [Change-impact note](docs/change-impact.md) — how coverage changes if payment confirmation becomes asynchronous

**Status:** Step 2 storefront and simulator implemented. The formal manual run and automated test suites are planned.

## Run locally

Use Node.js 24 and run `node demo/server.mjs` from the repository root. Open <http://127.0.0.1:3000/>. There are no install steps or external services. **Reset demo** restores the three products and their starting stock, clears the shared demo cart, and deletes synthetic attempts and orders.

The demo uses one local guest cart. The default SQLite file is `.local/store.sqlite` (ignored by Git). Set `DEMO_DB` to use a separate file and `PORT` to change the local port. Monetary values are stored and returned by the JSON API in integer USD cents.

| Local endpoint | Purpose |
| --- | --- |
| `GET /api/products`, `GET /api/products/:sku` | Read catalog, price, and stock |
| `GET /api/cart`, `PUT /api/cart` | Read cart totals or set a SKU quantity. Send `{"sku":"harbor","quantity":2}` and use zero to remove it. |
| `POST /api/checkout` | Submit a simulator outcome such as `{"outcome":"interrupted"}`. Other values are `approved`, `declined`, and `canceled`. |
| `GET /api/checkout/:id`, `POST /api/checkout/:id/retry` | Read an attempt or recover the original paid order after interrupted confirmation |
| `POST /api/reset` | Restore the synthetic fixtures |
