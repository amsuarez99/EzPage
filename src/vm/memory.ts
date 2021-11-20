import { ScopeSizeEntry, NonVoidType } from '../semantics/types'

type IndexType = NonVoidType | 'pointer'

type MemoryIndex = Record<IndexType, any[]>

class Memory {
  memoryIndex: Partial<MemoryIndex>

  constructor(memorySize: ScopeSizeEntry) {
    this.memoryIndex = {}
    this.allocateMemory(memorySize)
  }

  getMemoryFrom(type: IndexType, offset: number) {
    const value = this.memoryIndex[type]?.[offset]
    return value
  }

  setToMemory(value: any, type: IndexType, offset: number) {
    if (!this.memoryIndex[type]?.length) {
      console.log(this.memoryIndex)
      throw new Error(`Can't access specified memory space ${value}, ${type}, ${offset}`)
    }
    this.memoryIndex[type]![offset] = value
  }

  allocateMemory(memorySize: ScopeSizeEntry) {
    Object.entries(memorySize).forEach(([type, size]) => {
      this.memoryIndex[type as IndexType] = Array.apply(null, Array(size))
    })
  }
}

export default Memory
