import { createServer } from 'node:http'
import * as store from './store.mjs'
import * as view from './views.mjs'

function send(response, status, body, contentType = 'text/html; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' })
  response.end(body)
}

function json(response, status, data) {
  send(response, status, JSON.stringify(data), 'application/json; charset=utf-8')
}

function redirect(response, path) {
  response.writeHead(303, { Location: path }).end()
}

async function body(request, isJson) {
  let data = ''
  request.setEncoding('utf8')
  for await (const chunk of request) {
    data += chunk
    if (data.length > 4096) throw new store.DemoError('The request body is too large.', 413)
  }
  if (!isJson) return Object.fromEntries(new URLSearchParams(data))
  try {
    const value = JSON.parse(data)
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  } catch {
    // Return the same client error for invalid JSON and non-object payloads.
  }
  throw new store.DemoError('Send a JSON object.')
}

function attemptId(raw) {
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw new store.DemoError('Checkout attempt not found.', 404)
  return id
}

async function api(request, response, path, beforeRecovery) {
  const { method } = request
  const productPath = /^\/products\/([a-z]+)$/.exec(path)
  const checkoutPath = /^\/checkout\/(\d+)(\/retry)?$/.exec(path)
  if (method === 'GET' && path === '/products') return json(response, 200, store.products())
  if (method === 'GET' && productPath) return json(response, 200, store.product(productPath[1]))
  if (method === 'GET' && path === '/cart') return json(response, 200, store.cart())
  if (method === 'PUT' && path === '/cart') {
    const { sku, quantity } = await body(request, true)
    if (typeof sku !== 'string') throw new store.DemoError('Specify a product SKU.')
    return json(response, 200, store.updateCart(sku, quantity))
  }
  if (method === 'POST' && path === '/checkout') {
    const { outcome } = await body(request, true)
    const result = store.checkout(outcome)
    return json(response, result.status === 'unconfirmed' ? 202 : 201, result)
  }
  if (checkoutPath) {
    const id = attemptId(checkoutPath[1])
    if (method === 'GET' && !checkoutPath[2]) return json(response, 200, store.attempt(id))
    if (method === 'POST' && checkoutPath[2]) {
      if (beforeRecovery) await beforeRecovery(id)
      return json(response, 200, store.retry(id))
    }
  }
  if (method === 'POST' && path === '/reset') {
    store.reset()
    return json(response, 200, { reset: true })
  }
  throw new store.DemoError('Endpoint not found.', 404)
}

async function storefront(request, response, path) {
  const { method } = request
  const productPath = /^\/products\/([a-z]+)$/.exec(path)
  const checkoutPath = /^\/checkout\/(\d+)(\/retry)?$/.exec(path)
  if (method === 'GET' && path === '/') return send(response, 200, view.catalog(store.products(), store.pendingAttempt()))
  if (method === 'GET' && productPath) {
    const item = store.product(productPath[1])
    const quantity = store.cart().items.find(({ sku }) => sku === item.sku)?.quantity
    return send(response, 200, view.details(item, quantity, store.pendingAttempt()))
  }
  if (method === 'GET' && path === '/cart') return send(response, 200, view.cartPage(store.cart(), store.pendingAttempt()))
  if (method === 'POST' && path === '/cart') {
    try {
      const { sku, quantity } = await body(request, false)
      if (!sku || !/^\d+$/.test(quantity ?? '')) throw new store.DemoError('Enter a valid product and quantity.')
      store.updateCart(sku, Number(quantity))
    } catch (error) {
      if (!(error instanceof store.DemoError)) throw error
      return send(response, error.status, view.cartPage(store.cart(), store.pendingAttempt(), error.message))
    }
    return redirect(response, '/cart')
  }
  if (path === '/checkout' && (method === 'GET' || method === 'POST')) {
    const pending = store.pendingAttempt()
    if (pending) return redirect(response, `/checkout/${pending.id}`)
    const basket = store.cart()
    if (!basket.items.length) return redirect(response, '/cart')
    if (method === 'GET') return send(response, 200, view.checkoutPage(basket))
    const { outcome } = await body(request, false)
    try {
      return redirect(response, `/checkout/${store.checkout(outcome).id}`)
    } catch (error) {
      if (!(error instanceof store.DemoError)) throw error
      return send(response, error.status, view.checkoutPage(store.cart(), error.message))
    }
  }
  if (checkoutPath) {
    const id = attemptId(checkoutPath[1])
    if (method === 'GET' && !checkoutPath[2]) return send(response, 200, view.attemptPage(store.attempt(id)))
    if (method === 'POST' && checkoutPath[2]) {
      store.retry(id)
      return redirect(response, `/checkout/${id}`)
    }
  }
  if (method === 'POST' && path === '/reset') {
    store.reset()
    return redirect(response, '/')
  }
  throw new store.DemoError('Page not found.', 404)
}

export function createStorefrontServer({ beforeRecovery } = {}) {
  return createServer(async (request, response) => {
    const path = request.url.split('?')[0]
    const isApi = path.startsWith('/api/')
    try {
      if (isApi) await api(request, response, path.slice(4), beforeRecovery)
      else await storefront(request, response, path)
    } catch (error) {
      const known = error instanceof store.DemoError
      if (!known) console.error(error)
      const status = known ? error.status : 500
      const message = known ? error.message : 'Unexpected demo error.'
      if (isApi) json(response, status, { error: message })
      else send(response, status, view.page('Request could not be completed', '<p><a href="/cart">Open cart</a></p>', message))
    }
  })
}

if (import.meta.main) {
  const server = createStorefrontServer()
  server.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => {
    console.log(`Storefront running at http://127.0.0.1:${server.address().port}/`)
  })
}
