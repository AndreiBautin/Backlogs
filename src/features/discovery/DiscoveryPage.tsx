import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_REGISTRY, type CategoryId } from '@/domain/categories/category-registry'
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '@/domain/priority/priority'
import type { ItemFilters } from '@/domain/services/filter-items'
import { SORT_KEY_LABELS, SORT_KEYS, type SortKey } from '@/domain/sorting/sort-key'
import { STATUS_LABELS, STATUSES, type Status } from '@/domain/status/status'
import { ItemCard } from '@/features/items/components/ItemCard'
import { useItemsQuery } from '@/features/items/hooks/use-items'
import { useItemUiStore } from '@/features/items/store/use-item-ui-store'
import { useSettingsQuery } from '@/features/settings/hooks/use-settings'

/** Sentinel for "no filter selected" — shadcn's Select doesn't allow an empty-string item value. */
const ALL = '__all__'

interface SelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  includeAllOption?: boolean
  disabled?: boolean
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAllOption = true,
  disabled = false,
}: FilterSelectProps) {
  const id = `discovery-${label.toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && <SelectItem value={ALL}>All</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function DiscoveryPage() {
  const { data: settings } = useSettingsQuery()

  if (!settings) {
    return <div className="text-muted-foreground p-8 text-sm">Loading…</div>
  }

  return <DiscoveryContent defaultSort={settings.defaultSort} />
}

interface DiscoveryContentProps {
  defaultSort: SortKey
}

/** Mounted only once settings has loaded, so sortKey's initial value is never stale. */
function DiscoveryContent({ defaultSort }: DiscoveryContentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [priority, setPriority] = useState(ALL)
  const [platform, setPlatform] = useState(ALL)
  const [tag, setTag] = useState(ALL)
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort)

  const selectItem = useItemUiStore((state) => state.selectItem)

  const allItemsQuery = useItemsQuery()
  const allItems = useMemo(() => allItemsQuery.data ?? [], [allItemsQuery.data])

  const availablePlatforms = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((item) => item.platform)
            .filter((value): value is string => value !== undefined),
        ),
      ).sort(),
    [allItems],
  )
  const availableTags = useMemo(
    () => Array.from(new Set(allItems.flatMap((item) => item.tags))).sort(),
    [allItems],
  )

  const trimmedSearch = searchQuery.trim()
  const filters: ItemFilters = {
    ...(trimmedSearch.length > 0 && { searchQuery: trimmedSearch }),
    ...(category !== ALL && { category: category as CategoryId }),
    ...(status !== ALL && { status: status as Status }),
    ...(priority !== ALL && { priority: priority as Priority }),
    ...(platform !== ALL && { platform }),
    ...(tag !== ALL && { tags: [tag] }),
  }

  const resultsQuery = useItemsQuery({ filters, sortKey })
  const results = resultsQuery.data ?? []

  const hasActiveFilters =
    trimmedSearch.length > 0 ||
    category !== ALL ||
    status !== ALL ||
    priority !== ALL ||
    platform !== ALL ||
    tag !== ALL

  function clearFilters() {
    setSearchQuery('')
    setCategory(ALL)
    setStatus(ALL)
    setPriority(ALL)
    setPlatform(ALL)
    setTag(ALL)
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-4">
        <Input
          aria-label="Search"
          placeholder="Search title, notes, tags…"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
          }}
        />

        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORY_REGISTRY.map((c) => ({ value: c.id, label: c.label }))}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
          <FilterSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          />
          <FilterSelect
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={availablePlatforms.map((p) => ({ value: p, label: p }))}
            disabled={availablePlatforms.length === 0}
          />
          <FilterSelect
            label="Tag"
            value={tag}
            onChange={setTag}
            options={availableTags.map((t) => ({ value: t, label: t }))}
            disabled={availableTags.length === 0}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(value) => {
              setSortKey(value as SortKey)
            }}
            options={SORT_KEYS.map((key) => ({
              value: key,
              label: SORT_KEY_LABELS[key],
            }))}
            includeAllOption={false}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState message="No items match your filters." />
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => {
                selectItem(item.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
