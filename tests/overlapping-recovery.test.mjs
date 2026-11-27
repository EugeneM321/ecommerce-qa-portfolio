import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

test('A07 / SQL-02 — two in-flight HTTP recoveries return one original paid order', { timeout: 10_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'checkout-overlap-'))
  process.env.DEMO_DB = join(directory, 'store.sqlite')
  const arrivals = []
  const bothArrived = Promise.withResolvers()
  const release = Promise.withResolvers()
  const { createStorefrontServer } = await import('../demo/server.mjs')
  const server = createStorefrontServer({
    async beforeRecovery(id) {
      arrivals.push(id)
      if (arrivals.length === 2) bothArrived.resolve()
      await release.promise
    },
  })
  const { closeStore } = await import('../demo/store.mjs')
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = 'http://127.0.0.1:' + server.address().port + '/api'
  const db = new DatabaseSync(process.env.DEMO_DB, { readOnly: true })
  t.after(async () => {
    release.resolve()
    db.close()
    await new Promise(resolve => server.close(resolve))
    closeStore()
    delete process.env.DEMO_DB
    await rm(directory, { recursive: true, force: true })
  })

  async function request(method, path, status, data) {
    const response = await fetch(base + path, {
      method, signal: AbortSignal.timeout(4000),
      ...(data && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    })
    const payload = await response.json()
    assert.equal(response.status, status, JSON.stringify(payload))
    return payload
  }

  const orders = () => db.prepare('SELECT * FROM orders ORDER BY id').all()
  const stock = () => db.prepare("SELECT stock FROM products WHERE sku = 'harbor'").get().stock
  assert.equal(stock(), 5)
  assert.deepEqual(orders(), [])
  await request('PUT', '/cart', 200, { sku: 'harbor', quantity: 2 })
  const pending = await request('POST', '/checkout', 202, { outcome: 'interrupted' })
  const path = '/checkout/' + pending.id
  const original = orders()
  assert.equal(original.length, 1)
  assert.equal(original[0].attempt_id, pending.id)
  assert.equal(original[0].status, 'paid')
  assert.equal(original[0].total, 2900)
  assert.deepEqual(JSON.parse(original[0].items), [{ sku: 'harbor', name: 'Harbor Soap Dish', price: 1200, quantity: 2 }])
  assert.equal(stock(), 3)

  const attempts = Promise.all([
    request('POST', path + '/retry', 200),
    request('POST', path + '/retry', 200),
  ])
  attempts.catch(() => {})
  try {
    await Promise.race([bothArrived.promise, attempts.then(() => assert.fail('Recoveries finished before the barrier'))])
    assert.deepEqual(arrivals, [pending.id, pending.id])
    assert.deepEqual(await request('GET', path, 200), pending)
    assert.equal(db.prepare('SELECT status FROM checkout_attempts WHERE id = ?').get(pending.id).status, 'unconfirmed')
    t.diagnostic('Both HTTP requests reached the recovery handler while the original attempt was still unconfirmed.')
  } finally {
    release.resolve()
  }

  const paid = { id: pending.id, status: 'approved', total: 2900, currency: 'USD',
    order: { id: original[0].id, status: 'paid', total: 2900 } }
  assert.deepEqual(await attempts, [paid, paid])
  assert.deepEqual(await request('GET', path, 200), paid)
  assert.deepEqual(orders(), original)
  assert.equal(stock(), 3)
})
