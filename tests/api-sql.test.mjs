import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { DatabaseSync } from 'node:sqlite'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const fixture = [
  { sku: 'harbor', name: 'Harbor Soap Dish', price: 1200, stock: 5 },
  { sku: 'meadow', name: 'Meadow Travel Pouch', price: 1800, stock: 3 },
  { sku: 'dune', name: 'Dune Bath Brush', price: 900, stock: 0 },
]
const [harbor] = fixture
let directory, server, closed, lines, database, baseUrl

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ecommerce-api-'))
  const path = join(directory, 'store.sqlite')
  server = spawn(process.execPath, [fileURLToPath(new URL('../demo/server.mjs', import.meta.url))], {
    env: { ...process.env, PORT: '0', DEMO_DB: path },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  closed = new Promise((resolve) => server.once('close', resolve))
  lines = createInterface({ input: server.stdout })
  const [line] = await Promise.race([
    once(lines, 'line', { signal: AbortSignal.timeout(5000) }),
    once(server, 'exit').then(([code, signal]) => {
      throw new Error(`Demo exited before readiness: ${code ?? signal}`)
    }),
  ])
  baseUrl = /^Storefront running at (http:\/\/127\.0\.0\.1:\d+)\/$/.exec(line)?.[1]
  assert.ok(baseUrl, `Expected a loopback demo URL, received: ${line}`)
  database = new DatabaseSync(path, { readOnly: true })
})

after(async () => {
  try {
    database?.close()
  } finally {
    lines?.close()
    if (server) {
      server.kill()
      await closed
    }
    if (directory) await rm(directory, { recursive: true, force: true })
  }
})

async function request(method, path, status, data) {
  const options = { method, signal: AbortSignal.timeout(5000) }
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(data)
  }
  const response = await fetch(`${baseUrl}/api${path}`, options)
  const body = await response.text()
  assert.equal(response.status, status, `${method} ${path}: ${body}`)
  return JSON.parse(body)
}

async function reset() {
  assert.deepEqual(await request('POST', '/reset', 200), { reset: true })
}

beforeEach(reset)

function setQuantity(quantity) {
  return request('PUT', '/cart', 200, { sku: harbor.sku, quantity })
}

function expectedCart(quantity) {
  return {
    currency: 'USD',
    items: [{ ...harbor, quantity }],
    subtotal: 1200 * quantity,
    shipping: 500,
    total: 1200 * quantity + 500,
  }
}

function paidOrders() {
  return database.prepare(
    "SELECT id, attempt_id, status, total, items FROM orders WHERE status = 'paid' ORDER BY id",
  ).all().map((row) => ({ ...row, items: JSON.parse(row.items) }))
}

function persistedStock() {
  return database.prepare('SELECT stock FROM products WHERE sku = ?').get(harbor.sku).stock
}

test('A01 — catalog, inventory, and stock-limit rejection', async () => {
  assert.deepEqual(await request('GET', '/products', 200), fixture)
  assert.deepEqual(await request('GET', '/products/harbor', 200), harbor)
  await setQuantity(1)
  const beforeRejection = await request('GET', '/cart', 200)
  assert.deepEqual(beforeRejection, expectedCart(1))
  assert.deepEqual(await request('PUT', '/cart', 409, { sku: harbor.sku, quantity: 6 }),
    { error: 'Requested quantity exceeds available stock.' })
  assert.deepEqual(await request('GET', '/cart', 200), beforeRejection)
})

test('A02 — cart totals and independent read-back', async () => {
  assert.deepEqual(await setQuantity(1), expectedCart(1))
  assert.deepEqual(await setQuantity(2), expectedCart(2))
  assert.deepEqual(await request('GET', '/cart', 200), expectedCart(2))
})

test('A03 — decline and cancellation preserve a usable cart', async () => {
  for (const outcome of ['declined', 'canceled']) {
    if (outcome === 'canceled') await reset()
    assert.deepEqual(await setQuantity(2), expectedCart(2), outcome)
    const result = await request('POST', '/checkout', 201, { outcome })
    assert.ok(Number.isSafeInteger(result.id) && result.id > 0, outcome)
    assert.deepEqual(result, { id: result.id, status: outcome, total: 2900, currency: 'USD', order: null })
    assert.deepEqual(await request('GET', `/checkout/${result.id}`, 200), result)
    assert.deepEqual(await request('GET', '/cart', 200), expectedCart(2), outcome)
    assert.deepEqual(await request('GET', '/products/harbor', 200), harbor, outcome)
    assert.deepEqual(paidOrders(), [], `${outcome} must persist no paid order`)
    assert.equal(persistedStock(), 5, `${outcome} must preserve stored inventory`)
    assert.deepEqual(await setQuantity(1), expectedCart(1), `${outcome} must leave the cart editable`)
  }
})

test('A04 / SQL-01 — EC-R03 and M11 recover the same paid order after interruption', async () => {
  assert.deepEqual(await request('GET', '/products/harbor', 200), harbor)
  assert.equal(persistedStock(), 5, 'SQL-01 starts with five units')
  assert.deepEqual(paidOrders(), [], 'SQL-01 starts with no paid orders')
  assert.deepEqual(await setQuantity(2), expectedCart(2))

  const interrupted = await request('POST', '/checkout', 202, { outcome: 'interrupted' })
  assert.ok(Number.isSafeInteger(interrupted.id) && interrupted.id > 0)
  const attempt = `/checkout/${interrupted.id}`
  assert.deepEqual(interrupted, { id: interrupted.id, status: 'unconfirmed', total: 2900, currency: 'USD', order: null })
  assert.deepEqual(await request('GET', attempt, 200), interrupted)

  const originalOrders = paidOrders()
  assert.equal(originalOrders.length, 1, 'SQL-01 expects exactly one paid order at acceptance')
  const [original] = originalOrders
  assert.equal(original.attempt_id, interrupted.id, 'SQL-01 ties payment to the original attempt')
  assert.equal(original.total, 2900, 'SQL-01 checks the persisted $29 total')
  assert.deepEqual(original.items, [{ sku: harbor.sku, name: harbor.name, price: 1200, quantity: 2 }],
    'SQL-01 checks the persisted SKU and quantity')
  assert.equal(persistedStock(), 3, 'SQL-01 verifies the 5 → 3 deduction at acceptance')

  const final = {
    id: interrupted.id, status: 'approved', total: 2900, currency: 'USD',
    order: { id: original.id, status: 'paid', total: 2900 },
  }
  for (const label of ['first retry', 'repeated retry']) {
    assert.deepEqual(await request('POST', `${attempt}/retry`, 200), final, label)
    assert.deepEqual(await request('GET', attempt, 200), final, label)
    assert.deepEqual(await request('GET', '/products/harbor', 200), { ...harbor, stock: 3 }, label)
    assert.deepEqual(paidOrders(), originalOrders, `SQL-01 preserves the single original order after ${label}`)
    assert.equal(persistedStock(), 3, `SQL-01 preserves stock after ${label}`)
  }
})
