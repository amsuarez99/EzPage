import { ScopeSizeEntry } from 'semantics'
import { NonVoidType, Scope } from './types'


type MemoryRange = Record<string, Record<'min' | 'max' | 'curr', number>>

export default class MemoryMapper {
  memoryRanges!: Record<string, MemoryRange>

  constructor() {
    this.memoryRanges = {}
  }

  getAddrFor(type: NonVoidType, scope: Scope) {
    const { max, curr } = this.memoryRanges[scope][type]
    if (curr >= max) throw new Error(`Out of memory for: scope ${scope}, type ${type}`)
    return this.memoryRanges[scope][type].curr++
  }

  getMemorySizeFor(scope: Scope) {
    // default behaviour, every type of the received scope is reset
    const AddrTypes = Object.entries(this.memoryRanges[scope]) as [
      NonVoidType,
      Record<'min' | 'max' | 'curr', number>,
    ][]
    const memorySizes = AddrTypes.reduce((memorySizes, [type, addressMap]) => {
      memorySizes[type] = addressMap.curr - addressMap.min
      return memorySizes
    }, {} as ScopeSizeEntry)
    return memorySizes
  }

  resetAddrFor(scope: Scope, type?: NonVoidType) {
    if (type) {
      this.memoryRanges[scope][type].curr = this.memoryRanges[scope][type].min
      return
    }

    // default behaviour, every type of the received scope is reset
    const AddrTypes = Object.entries(this.memoryRanges[scope]) as [
      NonVoidType,
      Record<'min' | 'max' | 'curr', number>,
    ][]
    AddrTypes.forEach(([type, addressMap]) => {
      this.memoryRanges[scope][type].curr = addressMap.min
    })
  }

  getTypeOn(address: number) {
    for (const scope in this.memoryRanges) {
      for (const type in this.memoryRanges[scope]) {
        const { min, max } = this.memoryRanges[scope][type]
        if (address >= min && address <= max) return { type, scope }
      }
    }

    throw new Error(`Out of memory range for address: ${address}`)
  }
}

export class MemoryBuilder {
  memoryMapper!: MemoryMapper
  addressCount!: number

  constructor() {
    this.reset()
  }

  addMemorySegment(name: string, types: { name: string, size: number }[]) {
    const memoryRanges = types.reduce((accum, type) => {
      if (accum[type.name]) throw new Error('Repeated type found in arguments')
      accum[type.name] = {
        min: this.addressCount,
        max: this.addressCount + type.size - 1,
        curr: this.addressCount,
      }
      this.addressCount += type.size
      return accum
    }, {} as any) as MemoryRange
    this.memoryMapper.memoryRanges[name] = memoryRanges
  }

  reset() {
    this.addressCount = 0
    this.memoryMapper = new MemoryMapper()
  }

  getMemory() {
    const memoryMapper = this.memoryMapper
    this.reset()
    return memoryMapper
  }
}
