import { useState } from 'react'

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getCategoryDefinition } from '@/domain/categories/category-registry'
import { MAX_GOAL_AMOUNT } from '@/domain/entities/daily-goal'
import type { Item } from '@/domain/entities/item'
import { PRIORITIES, PRIORITY_LABELS } from '@/domain/priority/priority'
import { STATUSES, STATUS_LABELS } from '@/domain/status/status'

import { useItemsQuery, useUpdateItemMutation } from '../hooks/use-items'
import { useItemUiStore } from '../store/use-item-ui-store'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface ItemEditFormProps {
  item: Item
  onSaved: () => void
}

/**
 * Keyed by item.id from the parent so switching items remounts this form
 * with fresh initial state — no effect needed to "sync" state to a new item.
 */
function ItemEditForm({ item, onSaved }: ItemEditFormProps) {
  const updateItem = useUpdateItemMutation()
  const category = getCategoryDefinition(item.category)

  const [title, setTitle] = useState(item.title)
  const [status, setStatus] = useState<string>(item.status)
  const [priority, setPriority] = useState<string>(item.priority)
  const [platform, setPlatform] = useState(item.platform ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  const [hasGoal, setHasGoal] = useState(item.dailyGoal !== undefined)
  const [goalAmount, setGoalAmount] = useState((item.dailyGoal?.amount ?? 1).toString())
  // Seeded from the category's suggested unit — "chapter" for books, "episode"
  // for shows — so the common case needs no typing.
  const [goalUnit, setGoalUnit] = useState(
    item.dailyGoal?.unit ?? category.suggestedGoalUnit,
  )

  const parsedAmount = Number.parseInt(goalAmount, 10)
  const goalError = !hasGoal
    ? null
    : goalUnit.trim().length === 0
      ? 'Add a unit, like "chapter".'
      : !Number.isInteger(parsedAmount) ||
          parsedAmount < 1 ||
          parsedAmount > MAX_GOAL_AMOUNT
        ? `Amount must be a whole number from 1 to ${MAX_GOAL_AMOUNT.toString()}.`
        : null

  function handleSave() {
    updateItem.mutate(
      {
        id: item.id,
        changes: {
          title,
          status,
          priority,
          platform,
          notes,
          dailyGoal: hasGoal ? { amount: parsedAmount, unit: goalUnit } : null,
        },
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit item</SheetTitle>
        <SheetDescription>{category.label}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 overflow-y-auto px-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="drawer-title">Title</Label>
          <Input
            id="drawer-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="drawer-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="drawer-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="drawer-priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="drawer-priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="drawer-platform">Platform</Label>
          <Input
            id="drawer-platform"
            value={platform}
            onChange={(event) => {
              setPlatform(event.target.value)
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          {hasGoal ? (
            <>
              <Label htmlFor="drawer-goal-amount">Daily goal</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="drawer-goal-amount"
                  type="number"
                  min={1}
                  max={MAX_GOAL_AMOUNT}
                  className="w-20"
                  value={goalAmount}
                  onChange={(event) => {
                    setGoalAmount(event.target.value)
                  }}
                />
                <Input
                  aria-label="Daily goal unit"
                  placeholder={category.suggestedGoalUnit}
                  value={goalUnit}
                  onChange={(event) => {
                    setGoalUnit(event.target.value)
                  }}
                />
                <span className="text-muted-foreground shrink-0 text-sm">/ day</span>
              </div>
              {goalError ? (
                <p className="text-destructive text-xs">{goalError}</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Appears under Today while this item is{' '}
                  {STATUS_LABELS['currently-using']}.
                </p>
              )}
              <Button
                variant="ghost"
                size="xs"
                className="self-start"
                onClick={() => {
                  setHasGoal(false)
                }}
              >
                Remove daily goal
              </Button>
            </>
          ) : (
            <>
              <Label>Daily goal</Label>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  setHasGoal(true)
                }}
              >
                Set a daily goal
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="drawer-notes">Notes</Label>
          <Textarea
            id="drawer-notes"
            rows={4}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
            }}
          />
        </div>

        <dl className="text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <dt>Added</dt>
          <dd>{formatDate(item.dateAdded)}</dd>
          {item.dateStarted && (
            <>
              <dt>Started</dt>
              <dd>{formatDate(item.dateStarted)}</dd>
            </>
          )}
          {item.dateCompleted && (
            <>
              <dt>Completed</dt>
              <dd>{formatDate(item.dateCompleted)}</dd>
            </>
          )}
        </dl>
      </div>

      <SheetFooter>
        <Button
          onClick={handleSave}
          disabled={updateItem.isPending || goalError !== null}
        >
          Save changes
        </Button>
      </SheetFooter>
    </>
  )
}

export function ItemDetailDrawer() {
  const selectedItemId = useItemUiStore((state) => state.selectedItemId)
  const selectItem = useItemUiStore((state) => state.selectItem)
  const itemsQuery = useItemsQuery()

  const item =
    itemsQuery.data?.find((candidate) => candidate.id === selectedItemId) ?? null

  function handleOpenChange(open: boolean) {
    if (!open) {
      selectItem(null)
    }
  }

  return (
    <Sheet open={item !== null} onOpenChange={handleOpenChange}>
      <SheetContent>
        {item && (
          <ItemEditForm
            key={item.id}
            item={item}
            onSaved={() => {
              selectItem(null)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
