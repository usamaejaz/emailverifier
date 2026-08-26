import {
  customDisposableDomainList,
  disposableDomainList,
  disposableDomains,
  freeEmailDomainList,
  freeEmailDomains
} from './data/domains.js'
import { roleLocalParts } from './role-addresses.js'

export type OfflineEmailAnalysis = {
  email: string
  normalizedEmail: string | null
  domain: string | null
  suggestion: string | null
  checks: {
    syntax: boolean
    emailLength: boolean
    localPartLength: boolean
    domainFormat: boolean
    disposable: boolean
    freeProvider: boolean
    roleBased: boolean
  }
  reasons: string[]
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const localPartPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i
export const maxEmailLength = 254
const maxLocalPartLength = 64

function getRoleLocalPartAliases(localPart: string): string[] {
  const canonicalLocalPart = localPart.split('+')[0] ?? ''
  const compactLocalPart = canonicalLocalPart.replace(/[._-]+/g, '')

  return canonicalLocalPart === compactLocalPart
    ? [canonicalLocalPart]
    : [canonicalLocalPart, compactLocalPart]
}

function hasValidLocalPartDots(localPart: string): boolean {
  return Boolean(localPart) && !localPart.startsWith('.') && !localPart.endsWith('.') && !localPart.includes('..')
}

function normalizeEmailDomain(domain: string): string {
  if (!domain || /[/?:#[\]@]/.test(domain)) return ''

  try {
    const url = new URL(`http://${domain}`)
    return url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash
      ? ''
      : url.hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isSingleEditAway(value: string, target: string): boolean {
  if (value === target || Math.abs(value.length - target.length) > 1) return false

  if (value.length === target.length) {
    const differences: number[] = []
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== target[index]) differences.push(index)
      if (differences.length > 2) return false
    }

    return differences.length === 1 || (
      differences.length === 2
      && differences[1] === differences[0]! + 1
      && value[differences[0]!] === target[differences[1]!]
      && value[differences[1]!] === target[differences[0]!]
    )
  }

  const [shorter, longer] = value.length < target.length ? [value, target] : [target, value]
  let shorterIndex = 0
  let longerIndex = 0
  let skipped = false

  while (shorterIndex < shorter.length && longerIndex < longer.length) {
    if (shorter[shorterIndex] === longer[longerIndex]) {
      shorterIndex += 1
      longerIndex += 1
    } else {
      if (skipped) return false
      skipped = true
      longerIndex += 1
    }
  }

  return true
}

function getSuggestedDomain(domain: string): string | null {
  let suggestion: string | null = null

  for (const providerDomain of freeEmailDomainList) {
    if (!isSingleEditAway(domain, providerDomain)) continue
    // Multiple possible corrections are more confusing than no suggestion.
    if (suggestion) return null
    suggestion = providerDomain
  }

  return suggestion
}

export function getDisposableDomainMatch(domain: string): string | null {
  const normalizedDomain = domain.trim().toLowerCase()
  if (disposableDomains.has(normalizedDomain)) return normalizedDomain

  const labels = normalizedDomain.split('.')
  for (let index = 1; index < labels.length - 1; index += 1) {
    const parentDomain = labels.slice(index).join('.')
    if (disposableDomains.has(parentDomain)) return parentDomain
  }

  return null
}

export function getFreeEmailDomainMatch(domain: string): string | null {
  const normalizedDomain = domain.trim().toLowerCase()
  return freeEmailDomains.has(normalizedDomain) ? normalizedDomain : null
}

export function isDisposableDomain(domain: string): boolean {
  return getDisposableDomainMatch(domain) !== null
}

export function isFreeEmailProvider(domain: string): boolean {
  return getFreeEmailDomainMatch(domain) !== null
}

export function isRoleAddress(email: string): boolean {
  const atIndex = email.lastIndexOf('@')
  if (atIndex <= 0 || email.indexOf('@') !== atIndex) return false

  const localPart = email.slice(0, atIndex).toLowerCase()
  return getRoleLocalPartAliases(localPart).some(alias => roleLocalParts.has(alias))
}

export function analyzeEmail(input: unknown): OfflineEmailAnalysis {
  const email = typeof input === 'string' ? input.trim() : ''
  const atIndex = email.lastIndexOf('@')
  const localPart = atIndex > 0 ? email.slice(0, atIndex) : ''
  const rawDomain = atIndex > 0 && email.indexOf('@') === atIndex ? email.slice(atIndex + 1) : ''
  const domain = normalizeEmailDomain(rawDomain)
  const normalizedEmail = email ? `${localPart}@${domain || rawDomain.toLowerCase()}` : null

  const localPartLength = Boolean(localPart && localPart.length <= maxLocalPartLength)
  const syntax = emailPattern.test(email)
    && hasValidLocalPartDots(localPart)
    && localPartLength
    && localPartPattern.test(localPart)
  const emailLength = Boolean(
    email
    && normalizedEmail
    && email.length <= maxEmailLength
    && normalizedEmail.length <= maxEmailLength
  )
  const domainFormat = Boolean(domain && domainPattern.test(domain))
  const disposable = domain ? isDisposableDomain(domain) : false
  const freeProvider = domain ? isFreeEmailProvider(domain) : false
  const roleBased = syntax && isRoleAddress(email)
  const suggestedDomain = freeProvider ? null : getSuggestedDomain(domain)
  const suggestion = syntax && suggestedDomain ? `${localPart}@${suggestedDomain}` : null
  const reasons: string[] = []

  if (!syntax) reasons.push('Email syntax is invalid.')
  if (emailPattern.test(email) && !localPartLength) reasons.push('Email local part exceeds the maximum length of 64 characters.')
  if (email && !emailLength) reasons.push('Email exceeds the maximum length of 254 characters.')
  if (syntax && emailLength && !domainFormat) reasons.push('Email domain format is invalid.')
  if (disposable) reasons.push('Domain is a known disposable email provider.')
  if (freeProvider) reasons.push('Domain is a mainstream free mailbox provider.')
  if (roleBased) reasons.push('Address is role-based and may not identify one person.')
  if (suggestion) reasons.push(`Did you mean ${suggestion}?`)

  return {
    email,
    normalizedEmail: syntax && emailLength ? normalizedEmail : null,
    domain: emailLength && domainFormat ? domain : null,
    suggestion,
    checks: {
      syntax,
      emailLength,
      localPartLength,
      domainFormat,
      disposable,
      freeProvider,
      roleBased
    },
    reasons
  }
}

export {
  customDisposableDomainList,
  disposableDataUpdatedAt,
  disposableDomainList,
  freeEmailDomainList
} from './data/domains.js'
