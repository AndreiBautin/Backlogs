import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createExportItemsUseCase } from './export-items'

describe('exportItems use-case', () => {
  it('serializes every item in the repository into a parseable envelope', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildItem({ title: 'Hades 2' })
    await repository.save(item)
    const exportItems = createExportItemsUseCase(repository)

    const raw = await exportItems()
    const parsed: unknown = JSON.parse(raw)

    expect(parsed).toMatchObject({ items: [item] })
  })

  it('exports an empty envelope when the backlog is empty', async () => {
    const repository = new InMemoryItemRepository()
    const exportItems = createExportItemsUseCase(repository)

    const raw = await exportItems()
    const parsed: unknown = JSON.parse(raw)

    expect(parsed).toMatchObject({ items: [] })
  })
})
