import { MethodChargesPage, getMethodPage } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

const SLUG = 'credit-card'

export function generateMetadata() {
  const m = getMethodPage(SLUG)!
  return buildMetadata({ title: m.title, description: m.description, path: `/charges/${SLUG}/` })
}

export default function Page() {
  return <MethodChargesPage slug={SLUG} />
}
