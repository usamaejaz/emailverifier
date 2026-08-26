export type VerificationSignal =
  | 'invalid_syntax'
  | 'invalid_domain'
  | 'no_mail_server'
  | 'disposable_address'
  | 'free_provider'
  | 'role_address'
  | 'mailbox_accepts_mail'
  | 'mailbox_rejected'
  | 'catch_all_domain'
  | 'possible_typo'
  | 'verification_inconclusive'

export type VerificationResult = {
  email: string
  status: 'deliverable' | 'risky' | 'undeliverable' | 'unknown'
  action: 'block' | 'allow' | 'review'
  flagged: boolean
  signals: VerificationSignal[]
  suggestion: string | null
}

export type DomainResult = {
  domain: string
  classification: 'disposable' | 'free_provider' | 'unknown'
  risk: 'high' | 'medium' | 'unknown'
  mail_routing: 'available' | 'unavailable' | 'unknown'
}

export type UsageResult = {
  project: string
  credits_used: number
  credits_remaining: number
  last_used_at: string | null
}

export type EmailVerifierOptions = {
  apiKey: string
  baseUrl?: string
}

export type RequestOptions = {
  signal?: AbortSignal
}

export class EmailVerifierError extends Error {
  readonly status: number
  readonly response: unknown

  constructor(message: string, status: number, response: unknown) {
    super(message)
    this.name = 'EmailVerifierError'
    this.status = status
    this.response = response
  }
}

export class EmailVerifier {
  readonly #apiKey: string
  readonly #baseUrl: string

  constructor(options: EmailVerifierOptions) {
    if (!options?.apiKey?.trim()) throw new TypeError('EmailVerifier requires an API key.')

    this.#apiKey = options.apiKey.trim()
    this.#baseUrl = (options.baseUrl ?? 'https://emailverifier.dev').replace(/\/+$/, '')

    const url = new URL(this.#baseUrl)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new TypeError('EmailVerifier baseUrl must use HTTPS unless it points to localhost.')
    }
  }

  verify(email: string, options?: RequestOptions): Promise<VerificationResult> {
    return this.#request('/api/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
      signal: options?.signal
    })
  }

  checkDomain(domain: string, options?: RequestOptions): Promise<DomainResult> {
    return this.#request(`/api/v1/domains/${encodeURIComponent(domain)}`, {
      method: 'GET',
      signal: options?.signal
    })
  }

  getUsage(options?: RequestOptions): Promise<UsageResult> {
    return this.#request('/api/v1/usage', {
      method: 'GET',
      signal: options?.signal
    })
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': this.#apiKey
      }
    })
    const text = await response.text()
    let body: unknown = null

    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    if (!response.ok) {
      const message = body && typeof body === 'object' && 'statusMessage' in body
        && typeof body.statusMessage === 'string'
        ? body.statusMessage
        : `emailverifier.dev returned HTTP ${response.status}.`
      throw new EmailVerifierError(message, response.status, body)
    }

    return body as T
  }
}
