import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONSENT_REQUIRED_REGIONS,
  CONSENT_SIGNALS,
  CONSENT_WAIT_FOR_UPDATE_MS,
  buildConsentModeScript,
  consentProvider,
  isSlotEnabled,
} from '@/modules/ads'

/**
 * The region list and the Consent Mode payload are the kind of thing that is
 * read once, approved, and never looked at again — and a missing country or a
 * signal spelled wrong fails silently by serving personalized ads to someone
 * who never consented. So they get asserted rather than reviewed.
 */

describe('regions where consent is required', () => {
  it('covers the EU 27', () => {
    const eu27 = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
      'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
      'SE', 'SI', 'SK',
    ]
    expect(eu27).toHaveLength(27)
    for (const code of eu27) {
      expect(CONSENT_REQUIRED_REGIONS, `missing ${code}`).toContain(code)
    }
  })

  it('covers the non-EU EEA states, the UK and Switzerland', () => {
    // Switzerland is in scope for Google's CMP requirement alongside the EEA
    // and the UK, which is easy to leave out because it is not in the EEA.
    for (const code of ['IS', 'LI', 'NO', 'GB', 'CH']) {
      expect(CONSENT_REQUIRED_REGIONS, `missing ${code}`).toContain(code)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(CONSENT_REQUIRED_REGIONS).size).toBe(CONSENT_REQUIRED_REGIONS.length)
  })

  it('is all two-letter uppercase ISO codes', () => {
    for (const code of CONSENT_REQUIRED_REGIONS) {
      expect(code, `${code} is not an ISO 3166-1 alpha-2 code`).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('does not include India, where these defaults would be wrong', () => {
    // Our traffic is overwhelmingly Indian. Denying storage there by default
    // would suppress personalization for the audience that actually pays, and
    // DPDP is a separate mechanism anyway.
    expect(CONSENT_REQUIRED_REGIONS).not.toContain('IN')
  })
})

describe('Consent Mode v2 payload', () => {
  const script = buildConsentModeScript()

  it('declares all four v2 signals', () => {
    // ad_user_data and ad_personalization are the two v2 added; omitting them
    // is the most common way a Consent Mode setup is quietly still v1.
    expect(CONSENT_SIGNALS).toHaveLength(4)
    for (const signal of CONSENT_SIGNALS) {
      expect(script).toContain(signal)
    }
  })

  it('denies every signal for the in-scope regions', () => {
    const regional = script.slice(script.lastIndexOf("gtag('consent','default'"))
    for (const signal of CONSENT_SIGNALS) {
      expect(regional).toContain(`"${signal}":"denied"`)
    }
    expect(regional).toContain('"region":')
  })

  it('grants by default outside those regions', () => {
    const global = script.slice(0, script.lastIndexOf("gtag('consent','default'"))
    for (const signal of CONSENT_SIGNALS) {
      expect(global).toContain(`"${signal}":"granted"`)
    }
  })

  it('scopes the denied defaults to the region list and nothing else', () => {
    for (const code of CONSENT_REQUIRED_REGIONS) {
      expect(script).toContain(`"${code}"`)
    }
  })

  it('waits for the CMP before acting on the defaults', () => {
    expect(script).toContain(`"wait_for_update":${CONSENT_WAIT_FOR_UPDATE_MS}`)
    expect(CONSENT_WAIT_FOR_UPDATE_MS).toBeGreaterThanOrEqual(500)
  })

  it('defines gtag before calling it', () => {
    expect(script.indexOf('function gtag')).toBeLessThan(script.indexOf("gtag('consent'"))
    expect(script.indexOf('window.dataLayer')).toBeLessThan(script.indexOf('function gtag'))
  })
})

describe('the shipped default', () => {
  it('has no consent provider', () => {
    expect(consentProvider.id).toBe('none')
  })

  it('is not certified, which is what blocks ads', () => {
    expect(consentProvider.certified).toBe(false)
  })

  it('loads no script and declares no defaults', () => {
    expect(consentProvider.script()).toBeNull()
    expect(consentProvider.needsConsentModeDefaults).toBe(false)
  })

  it('refuses to enable a slot that policy would otherwise allow', () => {
    // guide/in-content-1 is the most permissive combination in AD_POLICY. With
    // no certified CMP it must still be off, independently of ADS_ENABLED.
    expect(isSlotEnabled('guide', 'in-content-1')).toBe(false)
  })
})

/**
 * The env gate, exercised for real.
 *
 * `common/config` parses and validates at module load, so these tests reset the
 * module registry and re-import it under a different environment. That is the
 * only way to reach the refinement without spawning a process — config is the
 * one place allowed to read process.env, and lint forbids it importing from
 * modules/, so the predicate cannot be lifted somewhere unit-testable.
 */
describe('env gate: ads cannot ship without a consent layer', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    vi.resetModules()
  })

  function setEnv(overrides: Record<string, string | undefined>) {
    vi.resetModules()
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }

  const adsOn = {
    ADS_ENABLED: 'true',
    ADS_PROVIDER: 'adsense',
    ADSENSE_CLIENT_ID: 'ca-pub-0000000000000000',
    AD_UNIT_IDS: 'in-content-1:1111111111',
  }

  it('refuses to boot with ads on and CONSENT_PROVIDER=none', async () => {
    setEnv({ ...adsOn, CONSENT_PROVIDER: 'none' })
    await expect(import('@/common/config')).rejects.toThrow(/CONSENT_PROVIDER/)
  })

  it('refuses to boot with CONSENT_PROVIDER=custom and no CMP url', async () => {
    setEnv({ ...adsOn, CONSENT_PROVIDER: 'custom', CONSENT_CMP_SRC: undefined })
    await expect(import('@/common/config')).rejects.toThrow(/CONSENT_CMP_SRC/)
  })

  it('boots with ads off and no consent layer, which is how it ships', async () => {
    setEnv({
      ADS_ENABLED: 'false',
      ADS_PROVIDER: 'noop',
      CONSENT_PROVIDER: 'none',
      ADSENSE_CLIENT_ID: undefined,
    })
    const config = await import('@/common/config')
    expect(config.adsEnabled).toBe(false)
  })

  it('serves a slot once a certified CMP is declared', async () => {
    setEnv({ ...adsOn, CONSENT_PROVIDER: 'google' })
    const ads = await import('@/modules/ads')
    expect(ads.consentProvider.id).toBe('google')
    expect(ads.consentProvider.certified).toBe(true)
    // Nothing to load: Privacy & messaging rides the AdSense tag.
    expect(ads.consentProvider.script()).toBeNull()
    expect(ads.isSlotEnabled('guide', 'in-content-1')).toBe(true)
    // ...and the policy still holds on the pages that must stay ad-free.
    expect(ads.isSlotEnabled('charges', 'in-content-1')).toBe(false)
    expect(ads.isSlotEnabled('methodology', 'in-content-1')).toBe(false)
  })

  it('loads a third-party CMP script and declares Consent Mode defaults', async () => {
    setEnv({
      ...adsOn,
      CONSENT_PROVIDER: 'custom',
      CONSENT_CMP_SRC: 'https://consent.example.com/cmp.js',
    })
    const ads = await import('@/modules/ads')
    expect(ads.consentProvider.id).toBe('custom')
    expect(ads.consentProvider.script()).toEqual({
      id: 'cmp-js',
      src: 'https://consent.example.com/cmp.js',
    })
    expect(ads.consentProvider.needsConsentModeDefaults).toBe(true)
    expect(ads.isSlotEnabled('guide', 'in-content-1')).toBe(true)
  })
})
