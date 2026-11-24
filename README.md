# E-commerce QA Portfolio

An independent, synthetic e-commerce QA case study inspired by the regression and checkout risks I worked with professionally as a sole QA engineer. Version 1 centers on a release decision: can a guest retry an interrupted checkout without creating a duplicate order or deducting inventory twice?

All demo code, data, requirements, test cases, and automation will be created specifically for this repository. No employer or client source code, internal test cases, customer data, credentials, proprietary assets, or confidential materials are included.

## Quick review

- [Test strategy](docs/test-strategy.md) — regression priorities, manual and automation split, and exploratory charters
- [Scope and requirements](docs/scope-and-requirements.md) — synthetic fixtures and checkout rules
- [14 manual test cases](docs/manual-test-cases.md) — planned catalog, cart, and checkout coverage
- [Risk and release gate](docs/risk-and-release-gate.md) — release blockers and the EC-R03 evidence chain
- [Change-impact note](docs/change-impact.md) — how coverage changes if payment confirmation becomes asynchronous

**Status:** [Manual release gate passed](docs/test-runs/2026-11-24-v1.md) with 14 Pass, 0 Fail, 0 Blocked. Four API/SQL scenarios and four Playwright browser tests pass locally. CI is planned.

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


## Run API and SQL checks

With Node.js 24, run from the repository root:

```sh
node --test tests/api-sql.test.mjs
```

The suite starts the demo on an ephemeral loopback port with a temporary SQLite file. It resets the data through the API before each scenario and again before the cancellation variant in A03. SQL reads use a separate read-only connection. The suite stops the server and removes its temporary database at the end.

[API/SQL scenarios](tests/api-sql.test.mjs) cover catalog and inventory limits (A01), cart totals (A02), decline and cancellation (A03), and interrupted confirmation with repeated retry (A04). A04 verifies request and response behavior. SQL-01 verifies the original paid order, $29 total, two purchased units, and stock of 3 after both retries. See the [flagship traceability chain](docs/risk-and-release-gate.md#flagship-traceability).


## Run browser checks

With Node.js 24, install the development dependencies and Chromium headless shell once:

```sh
npm ci
npx playwright install chromium --only-shell
```

Run the full headless UI suite with `npm run test:ui`. Run the flagship scenario alone with `npm run test:ui -- --grep UI-04`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the path to a compatible installed Chromium if needed. Failure screenshots and traces are saved under `test-results/`.

The [Playwright fixture](tests/ui/fixtures.ts) starts a private loopback server and temporary database per worker and removes both at teardown. Each test gets a fresh browser context and resets the demo through its API before opening the catalog. The UI tests submit cart and checkout changes through the browser. [A04 and SQL-01](tests/api-sql.test.mjs) separately verify API behavior and persisted state.
