import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const file = resolve(process.env.DEMO_DB ?? '.local/store.sqlite')
mkdirSync(dirname(file), { recursive: true })
const db = new DatabaseSync(file, { enableForeignKeyConstraints: true })
db.exec(`
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL CHECK (stock >= 0)
  );
  CREATE TABLE IF NOT EXISTS cart_items (
    sku TEXT PRIMARY KEY REFERENCES products(sku), quantity INTEGER NOT NULL CHECK (quantity > 0)
  );
  CREATE TABLE IF NOT EXISTS checkout_attempts (
    id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('approved', 'declined', 'canceled', 'unconfirmed')),
    total INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY, attempt_id INTEGER NOT NULL UNIQUE REFERENCES checkout_attempts(id),
    status TEXT NOT NULL CHECK (status = 'paid'), total INTEGER NOT NULL, items TEXT NOT NULL
  );
`)

export class DemoError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function transaction(work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function seed() {
  const insert = db.prepare('INSERT INTO products (sku, name, price, stock) VALUES (?, ?, ?, ?)')
  insert.run('harbor', 'Harbor Soap Dish', 1200, 5)
  insert.run('meadow', 'Meadow Travel Pouch', 1800, 3)
  insert.run('dune', 'Dune Bath Brush', 900, 0)
}

transaction(() => {
  if (!db.prepare('SELECT 1 FROM products LIMIT 1').get()) seed()
})

export function reset() {
  transaction(() => {
    db.exec('DELETE FROM orders; DELETE FROM checkout_attempts; DELETE FROM cart_items; DELETE FROM products;')
    seed()
  })
}

export function products() {
  return db.prepare('SELECT * FROM products ORDER BY rowid').all()
}

export function product(sku) {
  const item = db.prepare('SELECT * FROM products WHERE sku = ?').get(sku)
  if (!item) throw new DemoError('Product not found.', 404)
  return item
}

export function cart() {
  const items = db.prepare(`
    SELECT products.sku, name, price, stock, quantity
    FROM cart_items JOIN products USING (sku) ORDER BY products.rowid
  `).all()
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = items.length ? 500 : 0
  return { currency: 'USD', items, subtotal, shipping, total: items.length ? subtotal + shipping : null }
}

export function pendingAttempt() {
  return db.prepare("SELECT id FROM checkout_attempts WHERE status = 'unconfirmed' LIMIT 1").get()
}

export function updateCart(sku, quantity) {
  return transaction(() => {
    if (pendingAttempt()) throw new DemoError('Recover the existing checkout attempt first.', 409)
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new DemoError('Enter a whole quantity of zero or more.')
    const item = product(sku)
    if (quantity > item.stock) throw new DemoError('Requested quantity exceeds available stock.', 409)
    if (quantity === 0) db.prepare('DELETE FROM cart_items WHERE sku = ?').run(sku)
    else db.prepare(`
      INSERT INTO cart_items (sku, quantity) VALUES (?, ?)
      ON CONFLICT(sku) DO UPDATE SET quantity = excluded.quantity
    `).run(sku, quantity)
    return cart()
  })
}

export function attempt(id) {
  const row = db.prepare('SELECT * FROM checkout_attempts WHERE id = ?').get(id)
  if (!row) throw new DemoError('Checkout attempt not found.', 404)
  // The stored order is intentionally withheld until an interrupted confirmation is recovered.
  const order = row.status === 'approved'
    ? db.prepare('SELECT id, status, total FROM orders WHERE attempt_id = ?').get(id)
    : null
  return { id: row.id, status: row.status, total: row.total, currency: 'USD', order }
}

export function checkout(outcome) {
  if (!['approved', 'declined', 'canceled', 'interrupted'].includes(outcome)) {
    throw new DemoError('Choose a simulator outcome.')
  }
  return transaction(() => {
    const pending = pendingAttempt()
    if (pending) throw new DemoError(`Recover checkout attempt ${pending.id} first.`, 409)
    const basket = cart()
    if (!basket.items.length) throw new DemoError('The cart is empty.', 409)
    const status = outcome === 'interrupted' ? 'unconfirmed' : outcome
    const id = Number(db.prepare('INSERT INTO checkout_attempts (status, total) VALUES (?, ?)')
      .run(status, basket.total).lastInsertRowid)

    if (status === 'approved' || status === 'unconfirmed') {
      const deduct = db.prepare('UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?')
      for (const { sku, quantity } of basket.items) {
        if (deduct.run(quantity, sku, quantity).changes !== 1) {
          throw new DemoError('Cart stock changed before payment acceptance.', 409)
        }
      }
      const lines = basket.items.map(({ sku, name, price, quantity }) => ({ sku, name, price, quantity }))
      db.prepare("INSERT INTO orders (attempt_id, status, total, items) VALUES (?, 'paid', ?, ?)")
        .run(id, basket.total, JSON.stringify(lines))
      db.exec('DELETE FROM cart_items')
    }
    return attempt(id)
  })
}

export function retry(id) {
  return transaction(() => {
    const previous = attempt(id)
    if (previous.status === 'approved') return previous
    if (previous.status !== 'unconfirmed') throw new DemoError('Only accepted attempts can be recovered.', 409)
    db.prepare("UPDATE checkout_attempts SET status = 'approved' WHERE id = ?").run(id)
    return attempt(id)
  })
}
