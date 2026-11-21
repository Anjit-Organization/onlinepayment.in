import { IFSC_PATTERN, normaliseIfsc } from '@/modules/tools'
import { logger } from '@/common/logger'

/**
 * Branch detail for one IFSC.
 *
 * WHY THIS PROXIES RATHER THAN SHIPS THE DATA
 * The full branch list is ~170,000 rows and 36 MB. Committing it to serve a
 * lookup tool would bloat the repo and the function bundle for data we do not
 * maintain and cannot verify ourselves. So the branch half of the tool is
 * explicitly someone else's dataset, named on the page, and the bank half —
 * which we do commit — keeps working if this is down.
 *
 * WHY IT IS A PROXY AND NOT A CLIENT-SIDE FETCH
 * Going direct from the browser would put every visitor's IP in front of a
 * third party and give us no cache. Here one lookup is cached for everybody.
 *
 * The code is validated against IFSC_PATTERN before it is interpolated into a
 * URL. That pattern is anchored and allows only A-Z and 0-9, so there is no
 * path-traversal or SSRF surface; nothing from the request is forwarded.
 */

const UPSTREAM = 'https://ifsc.razorpay.com'
const TIMEOUT_MS = 4_000

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const code = normaliseIfsc((await params).code)

  if (!IFSC_PATTERN.test(code)) {
    return Response.json({ error: 'Not a well-formed IFSC.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${UPSTREAM}/${code}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
      // A branch's address does not change often. Cache the upstream answer
      // for a day; Next dedupes concurrent requests for the same code too.
      next: { revalidate: 86_400 },
    })

    if (res.status === 404) {
      return Response.json({ error: 'No such branch.' }, { status: 404 })
    }
    if (!res.ok) {
      logger.warn('ifsc upstream failed', { status: res.status })
      return Response.json({ error: 'Lookup unavailable.' }, { status: 502 })
    }

    const d = (await res.json()) as Record<string, unknown>
    const str = (k: string): string => (typeof d[k] === 'string' ? (d[k] as string) : '')
    const strOrNull = (k: string): string | null => (typeof d[k] === 'string' ? (d[k] as string) : null)
    const boolOrNull = (k: string): boolean | null =>
      typeof d[k] === 'boolean' ? (d[k] as boolean) : null

    // Mapped explicitly rather than passed through. The upstream shape is not
    // ours to depend on, and passing an arbitrary third-party object straight
    // to the browser is how an unexpected field ends up rendered.
    return Response.json(
      {
        ifsc: code,
        bank: str('BANK'),
        branch: str('BRANCH'),
        address: str('ADDRESS'),
        city: str('CITY'),
        district: str('DISTRICT'),
        state: str('STATE'),
        micr: strOrNull('MICR'),
        swift: strOrNull('SWIFT'),
        upi: boolOrNull('UPI'),
        neft: boolOrNull('NEFT'),
        rtgs: boolOrNull('RTGS'),
        imps: boolOrNull('IMPS'),
      },
      { headers: { 'Cache-Control': 'public, max-age=600, s-maxage=86400' } },
    )
  } catch (e) {
    logger.warn('ifsc lookup error', { message: e instanceof Error ? e.message : 'unknown' })
    return Response.json({ error: 'Lookup unavailable.' }, { status: 502 })
  }
}
