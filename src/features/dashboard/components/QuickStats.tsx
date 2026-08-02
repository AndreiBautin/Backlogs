import { StatTile } from '@/components/shared/StatTile'
import type { CompletionStats } from '@/domain/services/completion-stats'

interface QuickStatsProps {
  stats: CompletionStats
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Total backlog" value={stats.totalBacklog} />
      <StatTile label="Completed this month" value={stats.completedThisMonth} />
      <StatTile label="Completed this year" value={stats.completedThisYear} />
      <StatTile
        label="Completion %"
        value={`${stats.completionPercentage.toString()}%`}
      />
    </div>
  )
}
