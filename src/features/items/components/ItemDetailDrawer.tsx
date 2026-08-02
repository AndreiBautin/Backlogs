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

  const [title, setTitle] = useState(item.title)
  const [status, setStatus] = useState<string>(item.status)
  const [priority, setPriority] = useState<string>(item.priority)
  const [platform, setPlatform] = useState(item.platform ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  function handleSave() {
    updateItem.mutate(
      { id: item.id, changes: { title, status, priority, platform, notes } },
      { onSuccess: onSaved },
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit item</SheetTitle>
        <SheetDescription>{getCategoryDefinition(item.category).label}</SheetDescription>
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
        <Button onClick={handleSave} disabled={updateItem.isPending}>
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
