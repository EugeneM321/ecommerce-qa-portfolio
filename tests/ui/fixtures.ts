import { test as base } from '@playwright/test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

export const test = base.extend<object, { storefrontUrl: string }>({
  storefrontUrl: [async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'ecommerce-ui-'))
    const server = spawn(process.execPath, [fileURLToPath(new URL('../../demo/server.mjs', import.meta.url))], {
      env: { ...process.env, PORT: '0', DEMO_DB: join(directory, 'store.sqlite') },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const closed = new Promise<void>((resolve) => server.once('close', () => resolve()))
    const lines = createInterface({ input: server.stdout })
    try {
      const [line] = await Promise.race([
        once(lines, 'line', { signal: AbortSignal.timeout(5000) }),
        once(server, 'exit').then(([code, signal]) => {
          throw new Error(`Demo exited before readiness: ${code ?? signal}`)
        }),
      ])
      const url = /^Storefront running at (http:\/\/127\.0\.0\.1:\d+)\/$/.exec(line)?.[1]
      if (!url) throw new Error(`Expected a loopback demo URL, received: ${line}`)
      await use(url)
    } finally {
      lines.close()
      server.kill()
      await closed
      await rm(directory, { recursive: true, force: true })
    }
  }, { scope: 'worker' }],

  baseURL: async ({ storefrontUrl }, use) => {
    await use(storefrontUrl)
  },
})
