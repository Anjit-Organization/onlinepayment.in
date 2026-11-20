import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/common/config'

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * One image at the app root, inherited by every page. Generated rather than a
 * static file so it tracks the brand tokens, and kept to flat colour and type
 * so it renders fast and stays legible as a thumbnail.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0F172A',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, color: '#94A3B8' }}>
          onlinepayment<span style={{ color: '#38BDF8' }}>.in</span>
        </div>
        <div style={{ display: 'flex', fontSize: 78, color: '#F8FAFC', lineHeight: 1.15 }}>
          {SITE_TAGLINE}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#94A3B8' }}>
          Dated, sourced pricing for 8 Indian payment gateways
        </div>
      </div>
    ),
    size,
  )
}
