# E-commerce QA Portfolio

[![E-commerce QA CI](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/workflows/qa.yml?query=branch%3Amain)

An independent e-commerce QA case study using synthetic data. The release question is whether a shopper can recover an interrupted payment confirmation without creating a second order or deducting inventory twice. The risks are informed by my sole-QA e-commerce experience.

The test strategy and regression scope were authored for this portfolio. The storefront, simulated checkout, API and SQLite checks, Playwright TypeScript tests, and GitHub Actions workflow were created for this repository. All code, fixtures, and test cases are original to this portfolio. It contains no client code, internal test cases, or customer data.

| Verification | Result |
| --- | --- |
| Manual | 14 Pass, 0 Fail, 0 Blocked |
| Release decision | PASS / READY FOR RELEASE |
| API + SQLite | 4 passed, 0 failed |
| Playwright | 4 passed, 0 failed |
| CI | Passing on `main` |

## Quick Review

| Time | Evidence |
| --- | --- |
| 1 minute | [Test strategy](docs/test-strategy.md), [14 manual cases](docs/manual-test-cases.md), and [completed manual run and release decision](docs/test-runs/2026-11-24-v1.md) |
| 1 minute | [Release gate and EC-R03 traceability](docs/risk-and-release-gate.md#flagship-traceability) and the [change-impact note](docs/change-impact.md) on asynchronous confirmation |
| 1 minute | [API + SQLite suite](tests/api-sql.test.mjs) and [Playwright UI-04](tests/ui/checkout.spec.ts#L79). Follow A04, SQL-01, and UI-04 to see how the same retry risk is verified at each layer. |
| 1 minute | [GitHub Actions workflow](.github/workflows/qa.yml) and the [failure investigation](docs/failure-investigation.md), with a Playwright screenshot and passing retest |

## Run locally

From the repository root with Node.js 24:

```sh
node demo/server.mjs
```

Open <http://127.0.0.1:3000/>. Add two Harbor Soap Dishes and choose **Interrupt confirmation after acceptance** in guest checkout to try the recovery flow. **Reset demo** restores the synthetic fixture.

Run the automated suites with:

```sh
node --test tests/api-sql.test.mjs

npm ci
npx playwright install chromium --only-shell
npm run test:ui
npm run test:ui -- --grep UI-04
```

The automated suites each start a local demo using disposable SQLite state. The Playwright fixture resets the cart and inventory before each case. Failure screenshots and traces are saved under `test-results/`.
