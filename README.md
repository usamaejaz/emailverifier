# emailverifier

Offline email analysis, a typed client for [emailverifier.dev](https://emailverifier.dev), and a CLI in one package.

The offline functions use bundled data and make no network requests. They can identify syntax problems, disposable providers, free mailbox providers, role addresses, and common provider typos. They cannot confirm whether a mailbox exists or will accept mail.

## Install

```bash
npm install emailverifier
```

Node.js 20 or newer is required. The package has no runtime dependencies and sends no telemetry.

## Free offline analysis

```ts
import { analyzeEmail } from 'emailverifier/offline'

const result = analyzeEmail('Support+Trial@Gmail.com')

console.log(result.checks.syntax)
console.log(result.checks.disposable)
console.log(result.checks.freeProvider)
console.log(result.checks.roleBased)
console.log(result.suggestion)
```

The result intentionally has no `deliverable` field. DNS, SMTP recipient acceptance, and catch-all detection require the hosted API.

You can also import focused helpers:

```ts
import {
  isDisposableDomain,
  isFreeEmailProvider,
  isRoleAddress
} from 'emailverifier/offline'
```

## Hosted verification

Create a project at [emailverifier.dev](https://emailverifier.dev), then use its API key:

```ts
import { EmailVerifier } from 'emailverifier'

const client = new EmailVerifier({
  apiKey: process.env.EMAILVERIFIER_API_KEY!
})

const verification = await client.verify('hello@example.com')
const domain = await client.checkDomain('example.com')
const usage = await client.getUsage()
```

`verify` and `checkDomain` each use one project credit. `getUsage` does not use a credit. The client does not retry failed requests automatically.

## CLI

Run local analysis without an account or API key:

```bash
npx emailverifier check hello@example.com
npx emailverifier check hello@example.com --json
```

Remote commands read the key from the environment. API keys are deliberately not accepted as command-line arguments because command histories and process lists can expose them.

```bash
export EMAILVERIFIER_API_KEY=ev_your_project_key

npx emailverifier verify hello@example.com
npx emailverifier domain example.com
npx emailverifier usage
```

Use `EMAILVERIFIER_BASE_URL` only when testing against a local or self-selected API origin.

## Data updates

The disposable-domain snapshot comes from [disposable/disposable-email-domains](https://github.com/disposable/disposable-email-domains) and includes additional maintained aliases. Its license is recorded in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

The scheduled GitHub workflow validates upstream data, runs the package checks, publishes a patch release, and commits the updated snapshot when the list changes. npm Trusted Publishing must be connected to this repository before that workflow can publish.

## License

MIT
