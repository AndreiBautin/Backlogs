export class ItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item not found: ${id}`)
    this.name = 'ItemNotFoundError'
  }
}
