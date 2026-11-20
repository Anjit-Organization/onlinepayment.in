import { Button, Lane } from '@/common/ui'

export default function NotFound() {
  return (
    <Lane size="prose" className="py-16">
      <h1>Page not found</h1>
      <p className="mt-4 text-body text-fg-muted">
        That page does not exist. If you followed a link from elsewhere on this site, that is our
        bug.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/">Home</Button>
        <Button href="/corrections/" variant="ghost">
          Report a broken link
        </Button>
      </div>
    </Lane>
  )
}
