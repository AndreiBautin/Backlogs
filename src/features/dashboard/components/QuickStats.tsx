import type { CompletionStats } from '@/domain/services/completion-stats'

interface QuickStatsProps {
  stats: CompletionStats
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-border rounded-lg border px-4 py-3">
      <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
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
