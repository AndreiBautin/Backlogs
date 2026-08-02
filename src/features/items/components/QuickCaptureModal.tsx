import { useState, type SyntheticEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_REGISTRY } from '@/domain/categories/category-registry'
import { useKeyboardShortcut } from '@/shared/hooks/use-keyboard-shortcut'

import { useCreateItemMutation } from '../hooks/use-items'
import { useItemUiStore } from '../store/use-item-ui-store'

export function QuickCaptureModal() {
  const isOpen = useItemUiStore((state) => state.isQuickCaptureOpen)
  const openQuickCapture = useItemUiStore((state) => state.openQuickCapture)
  const closeQuickCapture = useItemUiStore((state) => state.closeQuickCapture)
  const createItem = useCreateItemMutation()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')

  useKeyboardShortcut('n', openQuickCapture)

  function resetForm() {
    setTitle('')
    setCategory('')
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeQuickCapture()
      resetForm()
    }
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (title.trim().length === 0 || category.length === 0) {
      return
    }
    createItem.mutate(
      { title, category },
      {
        onSuccess: () => {
          closeQuickCapture()
          resetForm()
        },
      },
    )
  }

  const canSubmit = title.trim().length > 0 && category.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add to backlog</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-capture-title">Title</Label>
            <Input
              id="quick-capture-title"
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
              }}
              placeholder="What do you want to consume?"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-capture-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="quick-capture-category" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_REGISTRY.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || createItem.isPending}>
              Add item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
