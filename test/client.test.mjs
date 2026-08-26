import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { EmailVerifier, EmailVerifierError } from '../dist/esm/index.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('EmailVerifier', () => {
  it('calls the three documented endpoints with the API key header', async () => {
    const calls = []
    globalThis.fetch = async (url, init) => {
      calls.push([url, init])
      return new Response(JSON.stringify({ ok: true }))
    }
    const client = new EmailVerifier({ apiKey: 'ev_test', baseUrl: 'http://localhost:3000/' })

    await client.verify('hello@example.com')
    await client.checkDomain('example.com')
    await client.getUsage()

    assert.deepEqual(calls.map(([url]) => url), [
      'http://localhost:3000/api/v1/verify',
      'http://localhost:3000/api/v1/domains/example.com',
      'http://localhost:3000/api/v1/usage'
    ])
    for (const [, init] of calls) assert.equal(init.headers['x-api-key'], 'ev_test')
  })

  it('does not retry failed paid requests', async () => {
    let calls = 0
    globalThis.fetch = async () => {
      calls += 1
      return new Response(JSON.stringify({ statusMessage: 'Rate limit exceeded.' }), { status: 429 })
    }
    const client = new EmailVerifier({ apiKey: 'ev_test' })

    await assert.rejects(client.verify('hello@example.com'), (error) => {
      assert.equal(error instanceof EmailVerifierError, true)
      assert.equal(error.message, 'Rate limit exceeded.')
      assert.equal(error.status, 429)
      return true
    })
    assert.equal(calls, 1)
  })

  it('rejects insecure remote API URLs', () => {
    assert.throws(() => new EmailVerifier({
      apiKey: 'ev_test',
      baseUrl: 'http://example.com'
    }), /must use HTTPS/)
  })
})
