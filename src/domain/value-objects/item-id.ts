export type ItemId = string & { readonly __brand: 'ItemId' }

export function createItemId(): ItemId {
  return crypto.randomUUID() as ItemId
}

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && value.length > 0
}
