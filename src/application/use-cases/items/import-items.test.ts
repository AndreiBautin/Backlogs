import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createExportItemsUseCase } from './export-items'
import { createImportItemsUseCase } from './import-items'

describe('importItems use-case', () => {
  it('replaces the backlog with the imported items', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ title: 'Old item' }))
    const importItems = createImportItemsUseCase(repository)
    const incoming = buildItem({ title: 'Imported item' })
    const raw = JSON.stringify({ version: 1, items: [incoming] })

    const result = await importItems(raw)

    expect(result).toEqual({ itemCount: 1, warning: null })
    await expect(repository.getAll()).resolves.toEqual([incoming])
  })

  it('replaces the backlog with an empty one when the imported file legitimately has no items', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ title: 'Old item' }))
    const importItems = createImportItemsUseCase(repository)
    const raw = JSON.stringify({ version: 1, items: [] })

    const result = await importItems(raw)

    expect(result).toEqual({ itemCount: 0, warning: null })
    await expect(repository.getAll()).resolves.toEqual([])
  })

  it('round-trips what exportItems produced', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ title: 'A' }))
    await repository.save(buildItem({ title: 'B' }))
    const exportItems = createExportItemsUseCase(repository)
    const importItems = createImportItemsUseCase(repository)

    const raw = await exportItems()
    const result = await importItems(raw)

    expect(result.itemCount).toBe(2)
    expect(result.warning).toBeNull()
  })

  it('leaves the existing backlog untouched when the input is not a valid envelope at all', async () => {
    const repository = new InMemoryItemRepository()
    const existing = buildItem({ title: 'Existing' })
    await repository.save(existing)
    const importItems = createImportItemsUseCase(repository)

    const result = await importItems('not valid json')

    expect(result.itemCount).toBe(0)
    expect(result.warning).not.toBeNull()
    await expect(repository.getAll()).resolves.toEqual([existing])
  })
})
