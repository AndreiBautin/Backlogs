import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

/**
 * The router's catch-all. Reachable two ways: a mistyped in-app link, and
 * a deep link into the deployed site, where the static host serves
 * `404.html` (a copy of `index.html`) and the app then resolves the path
 * itself.
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          404
        </p>
        <h1 className="text-foreground mt-1 text-lg font-semibold">Page not found</h1>
      </div>
      <p className="text-muted-foreground max-w-prose text-sm">
        That route does not exist. Everything in Backlogs lives under Dashboard,
        Discovery, Goals, or Settings.
      </p>
      <div>
        <Button asChild size="sm">
          <Link to="/">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
