/**
 * Payment signature verification: the documented formulas, and the crypto.
 *
 * WHY THIS IS A TOOL AND NOT AN ARTICLE
 * "my hash doesn't match" is the single most-searched Indian payments
 * integration problem, and every existing answer is a forum post guessing at a
 * field order. The formulas below are transcribed character for character from
 * each provider's own documentation, including the places where that
 * documentation contradicts itself (see PAYU_DELIMITER_NOTE).
 *
 * WHY THE CRYPTO LIVES IN domain/
 * `crypto.subtle` is a web standard global, present in both the browser and
 * Node, so using it here breaks no purity rule: there is no node: import, no
 * framework and no env access. The payoff is that the hashing is unit-testable
 * against the RFC 4231 vectors rather than only reachable by clicking.
 *
 * The verifier page runs all of this IN THE BROWSER. A merchant's webhook
 * secret is a live credential; posting it to our server to be hashed would
 * make us a place where secrets go, which is a liability we decline. See
 * components/webhook-verifier.tsx.
 */

export const SCHEME_IDS = [
  'razorpay-webhook',
  'cashfree-webhook',
  'payu-response',
  'phonepe-callback',
] as const

export type SchemeId = (typeof SCHEME_IDS)[number]

export type HashAlgorithm = 'hmac-sha256' | 'sha512' | 'sha256'
export type HashEncoding = 'hex' | 'base64'

export type SigField = {
  id: string
  label: string
  kind: 'text' | 'textarea' | 'secret'
  placeholder?: string
  hint?: string
  optional?: boolean
}

export type SigScheme = {
  id: SchemeId
  /** Provider display name, matching the pricing seed's displayName. */
  provider: string
  /** Gateway slug, where we also hold pricing for it. Links the tool to the data. */
  gatewaySlug: string | null
  /** What is being verified. Not every provider signs webhooks. */
  verifies: string
  /** The header carrying the signature we compare against. */
  header: string
  algorithm: HashAlgorithm
  encoding: HashEncoding
  /** Keyed algorithms name the field holding the key. Plain digests do not. */
  keyField: string | null
  /** The formula, exactly as the provider's documentation prints it. */
  formula: string
  docUrl: string
  docLabel: string
  /**
   * Things the documentation gets wrong, omits, or contradicts. These are the
   * actual reason an integration fails, so they are content, not footnotes.
   */
  caveats: string[]
  fields: SigField[]
}

/**
 * PayU's hash page states "There are 15 delimiters in total", but its own
 * sample code in five languages appends six pipes after udf5, and its
 * Scenario 2 example shows eight. We follow the sample code, because that is
 * what merchants copy and therefore what PayU's servers are reconciling
 * against in practice.
 */
export const PAYU_DELIMITER_NOTE =
  "PayU's documentation contradicts itself on delimiter count: the prose says 15, the sample code produces 16. This tool follows the sample code, because that is the version merchants actually ship."

const RAW_BODY_HINT =
  'Paste the body exactly as received, byte for byte. Re-serialising parsed JSON is the most common cause of a mismatch: JSON.stringify can reorder keys and will turn 170.00 into 170.'

export const SIG_SCHEMES: readonly SigScheme[] = [
  {
    id: 'razorpay-webhook',
    provider: 'Razorpay',
    gatewaySlug: 'razorpay',
    verifies: 'Webhook payload',
    header: 'X-Razorpay-Signature',
    algorithm: 'hmac-sha256',
    encoding: 'hex',
    keyField: 'secret',
    formula: 'hex( HMAC-SHA256( raw_request_body, webhook_secret ) )',
    docUrl: 'https://razorpay.com/docs/webhooks/validate-test/',
    docLabel: 'Validate and Test Webhooks',
    caveats: [
      'The key is the webhook secret you set when creating the webhook, not your API key secret. These are different values and swapping them is the second most common cause of a mismatch.',
      "Razorpay's own Node example calls the helper with JSON.stringify(body), which re-serialises the payload and contradicts their raw-body rule on the same page. Pass the original bytes.",
      'Compare in constant time. A plain === leaks timing information about the expected signature.',
      'After rotating a webhook secret, retries of older events are still signed with the old secret. Accept both for the retry window.',
    ],
    fields: [
      { id: 'body', label: 'Raw request body', kind: 'textarea', hint: RAW_BODY_HINT },
      {
        id: 'secret',
        label: 'Webhook secret',
        kind: 'secret',
        hint: 'Set when you created the webhook in the dashboard. Not your API key secret.',
      },
    ],
  },
  {
    id: 'cashfree-webhook',
    provider: 'Cashfree',
    gatewaySlug: 'cashfree',
    verifies: 'Webhook payload',
    header: 'x-webhook-signature',
    algorithm: 'hmac-sha256',
    encoding: 'base64',
    keyField: 'secret',
    formula: 'base64( HMAC-SHA256( x-webhook-timestamp + raw_request_body, secret_key ) )',
    docUrl: 'https://www.cashfree.com/docs/payments/online/webhooks/signature-verification',
    docLabel: 'Webhook Signature Verification',
    caveats: [
      'The timestamp is concatenated in front of the body with no separator and no space. It comes from the x-webhook-timestamp header on the same request.',
      'The result is base64, not hex. Razorpay is hex. Mixing the two up produces a value of the wrong length, which is the quickest way to spot it.',
      'Standard gateway webhooks are signed with your PG secret key; partner-level webhooks use the partner API key instead.',
      "Cashfree recommends rejecting anything whose timestamp is more than 5 minutes old, but does not enforce it. That replay check is yours to write — a valid signature on a replayed request is still a valid signature.",
      "Cashfree's merchant-onboarding webhook page documents a different header (x-cashfree-signature) and a sorted-keys scheme. If you are verifying onboarding events rather than payment events, confirm which applies.",
    ],
    fields: [
      {
        id: 'timestamp',
        label: 'x-webhook-timestamp',
        kind: 'text',
        placeholder: '1740000000',
        hint: 'Copy the header value verbatim. Do not reformat it or convert the units.',
      },
      { id: 'body', label: 'Raw request body', kind: 'textarea', hint: RAW_BODY_HINT },
      { id: 'secret', label: 'Secret key', kind: 'secret', hint: 'Your PG secret key.' },
    ],
  },
  {
    id: 'payu-response',
    provider: 'PayU',
    gatewaySlug: 'payu',
    verifies: 'Payment response (reverse hash)',
    header: 'hash (POST field, not a header)',
    algorithm: 'sha512',
    encoding: 'hex',
    keyField: null,
    formula:
      'sha512( SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key )',
    docUrl: 'https://docs.payu.in/docs/generate-hash-payu-hosted',
    docLabel: 'Generate Hash',
    caveats: [
      PAYU_DELIMITER_NOTE,
      'This is a plain SHA-512 of a salted string, not an HMAC. The salt sits at the front of the string rather than being used as a key.',
      'The response hash reverses the request field order and adds status at the front. Reusing the request formula is the usual mistake.',
      'If PayU sends additional_charges, that value is prepended to the whole string followed by a pipe. Omit it and the hash will not match on exactly those transactions that carry a charge.',
      'Verify txnid and amount against your own record as well as the hash. A valid hash on the wrong amount is still the wrong amount.',
      'PayU documents this for the browser redirect response. Their webhooks page is published but empty, and nothing in their documentation states that server-to-server webhooks are signed the same way, so do not assume it.',
    ],
    fields: [
      { id: 'salt', label: 'Salt', kind: 'secret', hint: 'Never send this in the payment request.' },
      { id: 'status', label: 'status', kind: 'text', placeholder: 'success' },
      { id: 'email', label: 'email', kind: 'text', placeholder: 'buyer@example.com' },
      { id: 'firstname', label: 'firstname', kind: 'text', placeholder: 'Asha' },
      { id: 'productinfo', label: 'productinfo', kind: 'text', placeholder: 'Order 4471' },
      {
        id: 'amount',
        label: 'amount',
        kind: 'text',
        placeholder: '1499.00',
        hint: 'Exactly as PayU returned it. 1499 and 1499.00 hash differently.',
      },
      { id: 'txnid', label: 'txnid', kind: 'text', placeholder: 'TXN20261120001' },
      { id: 'key', label: 'key', kind: 'text', placeholder: 'gtKFFx', hint: 'Your merchant key.' },
      { id: 'udf1', label: 'udf1', kind: 'text', optional: true },
      { id: 'udf2', label: 'udf2', kind: 'text', optional: true },
      { id: 'udf3', label: 'udf3', kind: 'text', optional: true },
      { id: 'udf4', label: 'udf4', kind: 'text', optional: true },
      { id: 'udf5', label: 'udf5', kind: 'text', optional: true },
      {
        id: 'additional_charges',
        label: 'additional_charges',
        kind: 'text',
        optional: true,
        hint: 'Only if PayU sent it. Prepended to the string when present.',
      },
    ],
  },
  {
    id: 'phonepe-callback',
    provider: 'PhonePe',
    gatewaySlug: 'phonepe',
    verifies: 'Callback Authorization header',
    header: 'Authorization',
    algorithm: 'sha256',
    encoding: 'hex',
    keyField: null,
    formula: 'sha256( username:password )',
    docUrl:
      'https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook',
    docLabel: 'Webhook Handling',
    caveats: [
      'The username and password are the pair you configured for the callback URL in the PhonePe Business dashboard, not your API credentials.',
      'This hashes only the credentials. It does not cover the request body, so it authenticates the caller but proves nothing about the payload. Validate the payment with a status call before acting on it.',
      "PhonePe's docs call this Basic Authentication on some pages, which it is not — the header carries a bare SHA-256 digest, with no Basic prefix and no base64.",
      'Other PhonePe products sign with x-phonepe-checksum-signature instead. Check the page for the product you integrated.',
    ],
    fields: [
      { id: 'username', label: 'Callback username', kind: 'text' },
      { id: 'password', label: 'Callback password', kind: 'secret' },
    ],
  },
]

export const getScheme = (id: string): SigScheme | undefined =>
  SIG_SCHEMES.find((s) => s.id === id)

/**
 * Assemble the exact byte string that gets hashed.
 *
 * Kept separate from the hashing so the page can SHOW it. Half the value of
 * this tool is seeing the assembled string, because that is where the bug
 * almost always is — a missing pipe, a reformatted amount, a trailing newline.
 */
export function buildSigningString(scheme: SigScheme, v: Record<string, string>): string {
  const g = (k: string) => v[k] ?? ''

  switch (scheme.id) {
    case 'razorpay-webhook':
      return g('body')

    case 'cashfree-webhook':
      return g('timestamp') + g('body')

    case 'payu-response': {
      // Five empty slots between status and udf5 render as the documented six
      // pipes once joined. Spelling them out as array members rather than a
      // '||||||' literal is what makes that count reviewable.
      const parts = [
        g('salt'),
        g('status'),
        '',
        '',
        '',
        '',
        '',
        g('udf5'),
        g('udf4'),
        g('udf3'),
        g('udf2'),
        g('udf1'),
        g('email'),
        g('firstname'),
        g('productinfo'),
        g('amount'),
        g('txnid'),
        g('key'),
      ]
      const base = parts.join('|')
      const extra = g('additional_charges')
      return extra ? `${extra}|${base}` : base
    }

    case 'phonepe-callback':
      return `${g('username')}:${g('password')}`
  }
}

const SUBTLE_HASH: Record<HashAlgorithm, string> = {
  'hmac-sha256': 'SHA-256',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** Compute the signature a provider would have sent for these inputs. */
export async function computeSignature(
  scheme: SigScheme,
  values: Record<string, string>,
): Promise<string> {
  const enc = new TextEncoder()
  const message = enc.encode(buildSigningString(scheme, values))
  const hash = SUBTLE_HASH[scheme.algorithm]

  let digest: ArrayBuffer
  if (scheme.algorithm === 'hmac-sha256') {
    const secret = scheme.keyField ? (values[scheme.keyField] ?? '') : ''
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash },
      false,
      ['sign'],
    )
    digest = await crypto.subtle.sign('HMAC', key, message)
  } else {
    digest = await crypto.subtle.digest(hash, message)
  }

  return scheme.encoding === 'hex' ? toHex(digest) : toBase64(digest)
}

/**
 * Length-independent comparison.
 *
 * Hex signatures are compared case-insensitively because providers are not
 * consistent about case and a case difference is not a forgery. Base64 is
 * compared exactly, since its alphabet is case-significant.
 *
 * This runs in the browser on data the user already holds, so it is not
 * defending against a timing attack. It is written this way because people
 * copy code out of tools like this one, and the version worth copying is the
 * one that does not early-return.
 */
export function signaturesMatch(expected: string, received: string, encoding: HashEncoding): boolean {
  const a = encoding === 'hex' ? expected.trim().toLowerCase() : expected.trim()
  const b = encoding === 'hex' ? received.trim().toLowerCase() : received.trim()
  if (a.length === 0 || b.length === 0) return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
