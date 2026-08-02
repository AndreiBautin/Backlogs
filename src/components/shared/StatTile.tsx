interface StatTileProps {
  label: string
  value: string | number
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="border-border rounded-lg border px-4 py-3">
      <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  )
}
