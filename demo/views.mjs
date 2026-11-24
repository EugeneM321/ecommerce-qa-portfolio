const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const money = (cents) => dollars.format(cents / 100)
const stockLabel = ({ stock }) => stock ? `In stock (${stock} available)` : 'Out of stock'

export function page(title, body, error = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Harbor & Meadow</title>
<style>
  body { max-width: 48rem; margin: auto; padding: 1rem; font: 1rem/1.5 system-ui, sans-serif; }
  nav, form { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; }
  input, select, button { max-width: 100%; font: inherit; }
  input[type=number] { width: 5rem; }
  article, main, footer { margin-block: 1rem; }
  :focus-visible { outline: 3px solid #194cac; outline-offset: 2px; }
  [role=alert] { color: #9e1919; font-weight: bold; }
</style>
</head>
<body>
<header><strong>Harbor &amp; Meadow · Synthetic QA demo</strong>
<nav aria-label="Store"><a href="/">Catalog</a><a href="/cart">Cart</a></nav></header>
<main><h1>${title}</h1>${error ? `<p role="alert" tabindex="-1" autofocus>${error}</p>` : ''}
${body}</main>
<footer><form method="post" action="/reset"><button>Reset demo</button></form></footer>
</body>
</html>`
}

export function catalog(items, pending) {
  return page('Catalog', `${pending ? recoveryLink(pending.id) : ''}
${items.map((item) => `<article><h2><a href="/products/${item.sku}">${item.name}</a></h2>
<p>${money(item.price)} USD · ${stockLabel(item)}</p></article>`).join('')}`)
}

function quantityForm(item, quantity, action) {
  return `<form method="post" action="/cart">
  <input type="hidden" name="sku" value="${item.sku}">
  <label for="qty-${item.sku}">Quantity for ${item.name}</label>
  <input type="number" id="qty-${item.sku}" name="quantity" min="1" step="1" required value="${quantity}">
  <button>${action}</button>
</form>`
}

export function details(item, quantity, pending) {
  return page(item.name, `<p>${money(item.price)} USD · ${stockLabel(item)}</p>
${pending ? recoveryLink(pending.id) : item.stock ? quantityForm(item, quantity || 1, 'Add to cart') : '<button disabled>Add to cart</button>'}`)
}

function totals({ subtotal, shipping, total }) {
  return `<p>Subtotal: ${money(subtotal)}<br>Shipping: ${money(shipping)}<br><strong>Total: ${money(total)} USD</strong></p>`
}

function recoveryLink(id) {
  return `<p><a href="/checkout/${id}">Recover checkout attempt ${id}</a></p>`
}

export function cartPage(basket, pending, error) {
  const items = basket.items.map((item) => `<article>
<h2>${item.name}</h2><p>${money(item.price)} each</p>
${quantityForm(item, item.quantity, 'Update quantity')}
<form method="post" action="/cart">
  <input type="hidden" name="sku" value="${item.sku}">
  <input type="hidden" name="quantity" value="0">
  <button>Remove ${item.name}</button>
</form></article>`).join('')
  return page('Cart', `${pending ? recoveryLink(pending.id) : ''}
${basket.items.length ? `${items}${totals(basket)}<a href="/checkout">Guest checkout</a>` : '<p>Your cart is empty.</p>'}`, error)
}

export function checkoutPage(basket, error) {
  return page('Guest checkout', `${totals(basket)}
<form method="post" action="/checkout">
  <label for="outcome">Local payment simulator outcome</label>
  <select name="outcome" id="outcome">
    <option value="approved">Approved</option>
    <option value="declined">Declined</option>
    <option value="canceled">Canceled</option>
    <option value="interrupted">Interrupt confirmation after acceptance</option>
  </select>
  <button>Submit checkout</button>
</form>`, error)
}

export function attemptPage(result, error = '') {
  if (result.order) {
    return page('Order paid', `<p>Order reference: <strong>${result.order.id}</strong></p>
<p>Checkout attempt: ${result.id}</p><p>Total paid: ${money(result.order.total)} USD</p>`, error)
  }
  if (result.status === 'unconfirmed') {
    return page('Payment unconfirmed', `<p role="status">The confirmation was interrupted. Retry checkout attempt ${result.id} to retrieve its final status.</p>
<form method="post" action="/checkout/${result.id}/retry"><button>Retry confirmation</button></form>`, error)
  }
  return page(result.status === 'declined' ? 'Payment declined' : 'Payment canceled',
    `<p role="status">Your cart is still available. This attempt did not create a paid order.</p>
<p><a href="/cart">Return to cart</a></p>`, error)
}
