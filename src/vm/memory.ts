import { ScopeSizeEntry, NonVoidType } from '../semantics/types'

//   (temporal)    (local) (global)
// + 15000,        15001 resultDir

// vm
// +
// sum(dir1, dir2, resultDir)

// vmState
/*
{
  global: {
    int: [undefined, 3, undefined]
    string: [undefined, "hola", undefined]
  }
  constant: {
    int: [0, 2, 3]
    string: ["hola", "hola2"]
  }
  MEMORIA DE FUNCION
  local: {
    "int": [2, 3, 3]
  }
  temporal: {
    "int": [undefined]
  }
}
*/

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
