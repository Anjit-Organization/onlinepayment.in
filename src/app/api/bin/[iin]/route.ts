import { findBankByIin, getBankDataset } from '@/modules/tools'

/**
 * IIN -> owning bank. Served from our own committed seed, no outbound call.
 *
 * This exists as an endpoint rather than client-side data because the IIN list
 * is 1,138 rows. Shipping it to every visitor of the BIN page would add more
 * to the bundle than the whole rest of the page, for an answer most visitors
 * need once.
 *
 * Only six digits are ever accepted. That is a deliberate ceiling, not a
 * convenience: a full card number must never be able to reach our logs, so
 * the route will not take one even if a caller sends it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ iin: string }> },
): Promise<Response> {
  const { iin } = await params

  if (!/^\d{6}$/.test(iin)) {
    return Response.json(
      { error: 'An IIN is exactly six digits. Longer values are rejected on purpose.' },
      { status: 400 },
    )
  }

  const data = getBankDataset()
  const bank = findBankByIin(data.iins, iin)

  return Response.json(
    { iin, bank, source: data.source },
    {
      // Static data from a committed seed: cache it hard, at the edge and in
      // the browser. It only changes when the seed is regenerated and
      // redeployed.
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable' },
    },
  )
}
