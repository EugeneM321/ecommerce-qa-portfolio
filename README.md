# E-commerce QA Portfolio

[![E-commerce QA CI](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml?query=branch%3Amain)

A flagship SDET case study about interrupted checkout. If payment is accepted but confirmation is interrupted, retrying the same attempt must return the original paid order without deducting inventory twice. The case study uses a synthetic storefront and payment simulator. Its risks draw on my sole-QA e-commerce experience.

**How it is verified:** Playwright with TypeScript checks recovery in the browser. REST API tests hold two requests at the recovery handler before releasing either one. Both return the original order. An independent, read-only SQLite query confirms one paid order and stock moving from 5 to 3 once. This is transaction-level idempotency evidence for the demo.

## Verified results

| Verification | Result |
| --- | --- |
| Manual | 14 Pass, 0 Fail, 0 Blocked |
| Release decision | PASS / READY FOR RELEASE |
| API + SQLite | 7 passed, 0 failed |
| Playwright | 4 passed, 0 failed |
| CI | [Passing Ubuntu run on `main`](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/runs/46077689281) · JUnit reports |

## Quick start

Use Node.js 24 from the repository root.

**API and SQLite checks** (start isolated demo instances).

The recovery suite holds two HTTP retry handlers at a test-only barrier, checks that the original checkout remains unconfirmed, then releases both. A read-only SQLite connection verifies the original paid order, line items, and one inventory deduction. UI-04 refreshes the unconfirmed page and recovers via the keyboard.

```sh
node --test tests/*.test.mjs
```

**Playwright browser tests** (starts its own demo).

```sh
npm ci
npx playwright install chromium --only-shell
npm run test:ui
```

On Linux, use `npx playwright install --with-deps chromium --only-shell` if browser system dependencies are missing. Run just the interrupted checkout test with `npm run test:ui -- --grep UI-04`.

**Explore the storefront** in a separate terminal.

```sh
node demo/server.mjs
```

Open <http://127.0.0.1:3000/>. Add two Harbor Soap Dishes and choose **Interrupt confirmation after acceptance** in guest checkout. **Reset demo** restores the synthetic fixture.

The suites use disposable SQLite state. Playwright resets the cart and inventory before each case and saves failure screenshots and traces under `test-results/`.

The pull-request and main-branch workflow generates JUnit results and a job summary. Playwright retains traces and screenshots on failure.

## Quick Review

| Start with | What to look for |
| --- | --- |
| [Overlapping retry and SQL-02](tests/overlapping-recovery.test.mjs) · [API/SQLite suite](tests/api-sql.test.mjs) | Two HTTP handlers reach the barrier before either proceeds. The original attempt, order contents, and stock are verified independently. |
| [Playwright UI-04](tests/ui/checkout.spec.ts#L79) · [GitHub Actions workflow](.github/workflows/qa.yml) | Refresh while payment is still unconfirmed, recover by keyboard, and verify the original paid reference. CI publishes JUnit and retains browser diagnostics on failure. |
| [Release gate and traceability](docs/risk-and-release-gate.md#flagship-traceability) · [Change-impact note](docs/change-impact.md) | Follow the checkout risk from requirement through manual, API, browser, and SQL evidence. |
| [Strategy](docs/test-strategy.md) · [14 manual cases](docs/manual-test-cases.md) · [Manual run and release decision](docs/test-runs/2026-11-24-v1.md) · [Controlled failure and retest](docs/failure-investigation.md) | Review the original release decision and the documented Playwright assertion failure, screenshot, and passing retest. |


## Project boundaries

The test strategy and regression scope were authored for this portfolio. The storefront, simulated checkout, API and SQLite checks, Playwright TypeScript tests, and GitHub Actions workflow were created for this repository. All code, fixtures, and test cases are original to this portfolio. It contains no client code, internal test cases, or customer data.
