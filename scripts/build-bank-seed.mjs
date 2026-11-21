#!/usr/bin/env node
/**
 * Regenerates data/seed/banks.json from the razorpay/ifsc release assets.
 *
 * The seed is COMMITTED. This script exists so the provenance of those ~1,400
 * rows is reproducible rather than a blob somebody pasted in once: run it, diff
 * the result, and you can see exactly what changed and from which release.
 * It is never run during a build — builds do not touch the network.
 *
 * Usage: node scripts/build-bank-seed.mjs [release-tag]
 *
 * Two files are joined:
 *   banks.json      bank code -> { iin, type, upi, ... }   (release asset)
 *   src/banknames.json  bank code -> display name          (repo source)
 * and the set of codes that legitimately appear as IFSC prefixes is taken from
 * IFSC.json's keys, because banks.json is keyed by NACH code and many of those
 * are sublet banks whose IFSCs carry a SPONSOR bank's prefix instead.
 */

const TAG = process.argv[2] ?? 'v2.0.62'
const REL = `https://github.com/razorpay/ifsc/releases/download/${TAG}`
const RAW = 'https://raw.githubusercontent.com/razorpay/ifsc/master/src'

const get = async (url) => {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`)
  return r.json()
}

const [banks, names, ifscPrefixes, sublet, release] = await Promise.all([
  get(`${REL}/banks.json`),
  get(`${RAW}/banknames.json`),
  get(`${REL}/IFSC.json`),
  get(`${REL}/sublet.json`),
  get('https://api.github.com/repos/razorpay/ifsc/releases/tags/' + TAG),
])

/** Codes that really are IFSC prefixes, with a name we can show. */
const ifscBanks = Object.keys(ifscPrefixes)
  .filter((code) => names[code])
  .map((code) => ({
    code,
    name: names[code],
    type: banks[code]?.type ?? null,
    upi: banks[code]?.upi ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

/** Card IINs. One row per IIN; the upstream data has no IIN collisions. */
const iins = Object.values(banks)
  .filter((b) => b.iin && names[b.code])
  .map((b) => ({ iin: b.iin, code: b.code, name: names[b.code], type: b.type ?? null }))
  .sort((a, b) => a.iin.localeCompare(b.iin))

/** How many IFSC prefixes are sponsor-issued, for the tool's sublet warning. */
const subletCount = Object.keys(sublet).length

const out = {
  source: {
    dataset: 'razorpay/ifsc',
    release: TAG,
    releasedAt: release.published_at.slice(0, 10),
    license: 'MIT',
    url: 'https://github.com/razorpay/ifsc',
  },
  retrievedAt: new Date().toISOString().slice(0, 10),
  counts: {
    ifscBanks: ifscBanks.length,
    iins: iins.length,
    subletBranches: subletCount,
    namesUnavailable: Object.keys(ifscPrefixes).filter((c) => !names[c]).length,
  },
  ifscBanks,
  iins,
}

const { writeFileSync } = await import('node:fs')
writeFileSync('data/seed/banks.json', JSON.stringify(out, null, 1) + '\n')
console.log(
  `data/seed/banks.json: ${ifscBanks.length} IFSC banks, ${iins.length} IINs, ` +
    `${out.counts.namesUnavailable} prefixes skipped for want of a name (release ${TAG}, ${out.source.releasedAt})`,
)
