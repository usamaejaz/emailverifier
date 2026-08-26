import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  analyzeEmail,
  getDisposableDomainMatch,
  isDisposableDomain,
  isFreeEmailProvider,
  isRoleAddress
} from '../dist/esm/offline.js'

describe('offline email analysis', () => {
  it('returns local signals without claiming deliverability', () => {
    assert.deepEqual(analyzeEmail('Support+Trial@Gmail.com'), {
      email: 'Support+Trial@Gmail.com',
      normalizedEmail: 'Support+Trial@gmail.com',
      domain: 'gmail.com',
      suggestion: null,
      checks: {
        syntax: true,
        emailLength: true,
        localPartLength: true,
        domainFormat: true,
        disposable: false,
        freeProvider: true,
        roleBased: true
      },
      reasons: [
        'Domain is a mainstream free mailbox provider.',
        'Address is role-based and may not identify one person.'
      ]
    })
  })

  it('matches disposable provider subdomains', () => {
    assert.equal(getDisposableDomainMatch('customer.33mail.com'), '33mail.com')
    assert.equal(isDisposableDomain('inbox.mailinator.com'), true)
  })

  it('keeps provider, role, and typo signals explicit', () => {
    assert.equal(isFreeEmailProvider('GMAIL.COM'), true)
    assert.equal(isRoleAddress('no.reply+launch@example.com'), true)
    assert.equal(analyzeEmail('Person@gmial.com').suggestion, 'Person@gmail.com')
  })

  it('does not claim deliverability', () => {
    const result = analyzeEmail('person@example.com')

    assert.equal('status' in result, false)
    assert.equal('deliverable' in result, false)
    assert.equal('mx' in result.checks, false)
  })
})
