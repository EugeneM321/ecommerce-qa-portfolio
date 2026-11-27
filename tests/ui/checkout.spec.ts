import { expect, type Page } from '@playwright/test'
import { test } from './fixtures.js'

const quantityField = (page: Page) =>
  page.getByRole('spinbutton', { name: 'Quantity for Harbor Soap Dish', exact: true })

async function addHarborToCart(page: Page, quantity: 1 | 2) {
  await page.getByRole('link', { name: 'Harbor Soap Dish', exact: true }).click()
  await quantityField(page).fill(String(quantity))
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cart', exact: true })).toBeVisible()
}

async function submitCheckout(page: Page, outcome: 'approved' | 'declined' | 'interrupted') {
  await page.getByRole('link', { name: 'Guest checkout', exact: true }).click()
  await page.getByLabel('Local payment simulator outcome').selectOption(outcome)
  await page.getByRole('button', { name: 'Submit checkout', exact: true }).click()
}

async function expectCartTotals(page: Page, subtotal: string, total: string) {
  await expect(page.getByText(`Subtotal: ${subtotal}`)).toBeVisible()
  await expect(page.getByText('Shipping: $5.00')).toBeVisible()
  await expect(page.getByText(`Total: ${total} USD`, { exact: true })).toBeVisible()
}

async function paidOrderReference(page: Page) {
  await expect(page.getByRole('heading', { name: 'Order paid', exact: true })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Order paid', exact: true })).toBeVisible()
  await expect(page.getByText('Total paid: $29.00 USD', { exact: true })).toBeVisible()
  const reference = page.getByText(/^Order reference: \d+$/)
  await expect(reference).toBeVisible()
  return (await reference.innerText()).trim()
}

test.beforeEach(async ({ request, page }) => {
  const reset = await request.post('/api/reset')
  await expect(reset).toBeOK()
  await page.goto('/')
})

test('UI-01 — cart totals recalculate and persist after reload', async ({ page }) => {
  await addHarborToCart(page, 1)
  await expect(quantityField(page)).toHaveValue('1')
  await expectCartTotals(page, '$12.00', '$17.00')

  await quantityField(page).fill('2')
  await page.getByRole('button', { name: 'Update quantity', exact: true }).click()
  await expectCartTotals(page, '$24.00', '$29.00')

  await page.reload()
  await expect(quantityField(page)).toHaveValue('2')
  await expectCartTotals(page, '$24.00', '$29.00')
})

test('UI-02 — approved guest checkout shows a stable $29 paid confirmation', async ({ page }) => {
  await addHarborToCart(page, 2)
  await submitCheckout(page, 'approved')
  const reference = await paidOrderReference(page)

  await page.reload()
  expect(await paidOrderReference(page)).toBe(reference)
})

test('UI-03 — declined checkout preserves a usable cart', async ({ page }) => {
  await addHarborToCart(page, 2)
  await submitCheckout(page, 'declined')

  await expect(page.getByRole('heading', { name: 'Payment declined', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('This attempt did not create a paid order.')
  await expect(page.getByRole('heading', { name: 'Order paid', exact: true })).toHaveCount(0)
  await expect(page.getByText(/^Order reference:/)).toHaveCount(0)

  await page.getByRole('link', { name: 'Return to cart', exact: true }).click()
  await expect(quantityField(page)).toHaveValue('2')
  await expectCartTotals(page, '$24.00', '$29.00')
  await expect(page.getByRole('link', { name: 'Guest checkout', exact: true })).toBeVisible()
})

test('UI-04 — EC-R03/M11/A04/SQL-01 recover the same interrupted checkout', async ({ page }) => {
  await addHarborToCart(page, 2)
  await submitCheckout(page, 'interrupted')

  await expect(page.getByRole('heading', { name: 'Payment unconfirmed', exact: true })).toBeVisible()
  const status = page.getByRole('status')
  await expect(status).toHaveText(/The confirmation was interrupted\. Retry checkout attempt \d+/)
  const attempt = (await status.innerText()).match(/Retry checkout attempt (\d+)/)?.[1]
  expect(attempt).toBeDefined()
  const attemptUrl = page.url()
  await expect(page).toHaveURL(new RegExp(`/checkout/${attempt}$`))
  await expect(page.getByText(/^Order reference:/)).toHaveCount(0)

  await page.reload()
  await expect(page).toHaveURL(attemptUrl)
  await expect(page.getByRole('heading', { name: 'Payment unconfirmed', exact: true })).toBeVisible()
  await expect(status).toContainText(`Retry checkout attempt ${attempt}`)
  await expect(page.getByText(/^Order reference:/)).toHaveCount(0)

  const retry = page.getByRole('button', { name: 'Retry confirmation', exact: true })
  await expect(retry).toBeVisible()
  await page.getByRole('link', { name: 'Cart', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(retry).toBeFocused()
  await expect(retry).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  const reference = await paidOrderReference(page)
  await expect(page).toHaveURL(attemptUrl)
  await expect(page.getByText(`Checkout attempt: ${attempt}`, { exact: true })).toBeVisible()

  // Recovery removes the retry control. Revisit the original recovery URL.
  await expect(retry).toHaveCount(0)
  await page.goto(attemptUrl)
  expect(await paidOrderReference(page)).toBe(reference)
  await page.reload()
  expect(await paidOrderReference(page)).toBe(reference)
  await expect(page.getByText(`Checkout attempt: ${attempt}`, { exact: true })).toBeVisible()
})
