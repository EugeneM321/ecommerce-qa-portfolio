# UI-04 failure investigation

This controlled exercise introduced an incorrect expectation on a temporary branch to verify that CI catches a regression-test failure and preserves evidence. The storefront displayed the correct total throughout.

| Evidence | Observation |
| --- | --- |
| [Controlled CI run](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/runs/45474435846) | API + SQLite passed 4 of 4. Playwright passed 3 of 4 and failed UI-04, `EC-R03/M11/A04/SQL-01 recover the same interrupted checkout`. CI failed. |
| Playwright error | `expect(locator).toBeVisible() failed`. The exact text `Total paid: $28.00 USD` was absent after 5 seconds. |
| [Screenshot](evidence/ui-04-controlled-failure.png) and [CI artifact](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/runs/45474435846/artifacts/14956829462) | The screenshot and captured page showed `Order paid` and `Total paid: $29.00 USD`. The upload included the screenshot, `trace.zip`, and `error-context.md`. The CI artifact has a seven-day retention period. |
| Root cause and correction | A deliberately added assertion expected $28.00. Two $12.00 items plus $5.00 shipping total $29.00. Removing the injected assertion let the existing $29.00 check run again. |
| [Passing retest](https://github.com/EugeneM321/ecommerce-qa-portfolio/actions/runs/45474762163) | With the original test restored, UI-04 and all other tests passed. The temporary branch's test code matched `main`. |

A **product defect** would mean the storefront violated its requirement, for example by charging the wrong total or creating a second order on retry. An **automation defect** means the test has a wrong expectation or implementation, as in this exercise. An **environment or CI defect** would prevent a valid test from running as intended, for example if the browser failed to launch.
