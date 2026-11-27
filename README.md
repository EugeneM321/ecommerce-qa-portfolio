# E-commerce QA Portfolio

[![E-commerce QA CI](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml?query=branch%3Amain)

An independent e-commerce QA case study using synthetic data. The release question is whether a shopper can recover an interrupted payment confirmation without creating a second order or deducting inventory twice. The risks are informed by my sole-QA e-commerce experience.

**Flagship evidence:** Retrying the interrupted checkout returned the original paid order. The API and read-only SQLite checks confirmed one paid order and a single stock deduction from 5 to 3.

## Verified results

| Verification | Result |
| --- | --- |
| Manual | 14 Pass, 0 Fail, 0 Blocked |
| Release decision | PASS / READY FOR RELEASE |
| API + SQLite | 7 passed locally. The previous main CI run verified 4 tests. |
| Playwright | 4 passed, 0 failed |
| CI | Passing on `main` |

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

| Time | Evidence |
| --- | --- |
| 1 minute | [Test strategy](docs/test-strategy.md), [14 manual cases](docs/manual-test-cases.md), and [completed manual run and release decision](docs/test-runs/2026-11-24-v1.md) |
| 1 minute | [Release gate and EC-R03 traceability](docs/risk-and-release-gate.md#flagship-traceability) and the [change-impact note](docs/change-impact.md) on asynchronous confirmation |
| 1 minute | [API + SQLite suite](tests/api-sql.test.mjs) and [Playwright UI-04](tests/ui/checkout.spec.ts#L79). Follow A04/SQL-01, [A07/SQL-02](tests/overlapping-recovery.test.mjs), and UI-04 to see sequential retries, overlapping HTTP requests, and keyboard recovery. |
| 1 minute | [GitHub Actions workflow](.github/workflows/qa.yml) and the [failure investigation](docs/failure-investigation.md), with a Playwright screenshot and passing retest |

## Project boundaries

The test strategy and regression scope were authored for this portfolio. The storefront, simulated checkout, API and SQLite checks, Playwright TypeScript tests, and GitHub Actions workflow were created for this repository. All code, fixtures, and test cases are original to this portfolio. It contains no client code, internal test cases, or customer data.
