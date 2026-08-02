import { Badge, type badgeVariants } from '@/components/ui/badge'
import { PRIORITY_LABELS, type Priority } from '@/domain/priority/priority'

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
  someday: 'ghost',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABELS[priority]}</Badge>
}
