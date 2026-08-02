import { Badge, type badgeVariants } from '@/components/ui/badge'
import { STATUS_LABELS, type Status } from '@/domain/status/status'
import { cn } from '@/lib/utils'

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const STATUS_VARIANT: Record<Status, BadgeVariant> = {
  backlog: 'secondary',
  'currently-using': 'default',
  completed: 'outline',
  paused: 'secondary',
  dropped: 'destructive',
  wishlist: 'secondary',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={cn(status === 'completed' && 'border-success/40 text-success')}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
