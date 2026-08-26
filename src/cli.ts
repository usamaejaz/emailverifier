#!/usr/bin/env node
import { EmailVerifier } from './client.js'
import { analyzeEmail } from './offline.js'

const help = `emailverifier

Usage:
  emailverifier check <email> [--json]
  emailverifier verify <email> [--json]
  emailverifier domain <domain> [--json]
  emailverifier usage [--json]

check runs locally without network access. verify, domain, and usage require
EMAILVERIFIER_API_KEY. They never read an API key from a command-line argument.`

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function print(value: unknown, compact: boolean): void {
  console.log(JSON.stringify(value, null, compact ? 0 : 2))
}

async function run(): Promise<void> {
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  const positional = args.filter(arg => arg !== '--json')
  const [command, value, ...extra] = positional

  if (!command || command === '--help' || command === '-h') {
    console.log(help)
    return
  }

  if (extra.length) fail('Too many arguments. Run emailverifier --help for usage.')

  if (command === 'check') {
    if (!value) fail('An email address is required.')
    print(analyzeEmail(value), json)
    return
  }

  const apiKey = process.env.EMAILVERIFIER_API_KEY
  if (!apiKey) fail('EMAILVERIFIER_API_KEY is required for remote commands.')

  const client = new EmailVerifier({
    apiKey,
    baseUrl: process.env.EMAILVERIFIER_BASE_URL
  })

  if (command === 'verify') {
    if (!value) fail('An email address is required.')
    print(await client.verify(value), json)
    return
  }

  if (command === 'domain') {
    if (!value) fail('A domain is required.')
    print(await client.checkDomain(value), json)
    return
  }

  if (command === 'usage') {
    if (value) fail('The usage command does not accept an argument.')
    print(await client.getUsage(), json)
    return
  }

  fail(`Unknown command: ${command}`)
}

run().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : 'The command failed.')
})
