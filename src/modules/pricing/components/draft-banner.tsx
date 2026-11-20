import { Callout } from '@/common/ui'

/**
 * TECHNICAL §9.3: drafted data never publishes directly — a human promotes it.
 * A draft page renders so it can be reviewed in situ, but it is noindex and
 * excluded from the sitemap, and it says so plainly to anyone who reaches it.
 */
export function DraftBanner({ reason }: { reason: string }) {
  return (
    <Callout tone="danger" title="Unverified draft — not published">
      <p>
        These figures have not been verified by a person and must not be relied on. This page is
        excluded from search indexing and from our sitemap until it is checked against a primary
        source.
      </p>
      <p className="mt-2 text-fg-muted">{reason}</p>
    </Callout>
  )
}
