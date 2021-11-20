import { ScopeSizeEntry, CompilationOutput, Instruction } from '../semantics/types'
import * as quadOperations from './quadOperations'
import Memory from './memory'
import MemoryMapper from '../semantics/memoryMapper'
import { log } from '../logger'

type ContextMemory = {
  temporalMemory?: Memory
  localMemory?: Memory
}

type ExecutionStackItem = {
  context: ContextMemory
  instructionPointer: number
}

class VirtualMachine {
  compilationOutput: CompilationOutput
  globalMemory!: Memory
  literalMemory!: Memory
  executionStatus!: {
    funcName: string
    contextMemory: ContextMemory
    instructionPointer: number
  }
  executionStack: E 
 tionStackItem[]u tempContextMemory!: ontextMemory
  c
  memoryMapper: MemoryMapper
  currentQuad!: Instruction

  constructor(compilationOutput: CompilationOutput, memoryMapper: MemoryMapper) {
    this.executionStack = []
    this.memoryMapper = memoryMapper
    this.compilationOutput = compilationOutput
    this.initGlobalMemory()
    this.initLiteralMemory()
    this.initDummyMemories()
    this.executionStatus.instructionPointer = 0
  }

  initDummyMemories() {
    const renderEntryTemporalSize = (
      this.compilationOutput.funcTable['render'].size as Record<'temporal' | 'local', ScopeSizeEntry>
    )?.local
    if (!renderEntryTemporalSize) throw new Error('blablalca')
    this.executionStatus.contextMemory.localMemory = new Memory(renderEntryTemporalSize)
    const renderEntryLocalSize = (
      this.compilationOutput.funcTable['render'].size as Record<'temporal' | 'local', ScopeSizeEntry>
    )?.temporal
    if (!renderEntryLocalSize) throw new Error('blablalca')
    this.executionStatus.contextMemory.temporalMemory = new Memory(renderEntryTemporalSize)
  }

  incrementInstructionPointer() {
    this.executionStatus.instructionPointer++
  }

  setInstructionPointer(instructionNo: number) {
    this.executionStatus.instructionPointer = instructionNo
  }

  changeContext(context: ContextMemory) {
    this.executionStatus.contextMemory = context
  }

  saveCurrentContext() {
    this.executionStack.push({

      instructionPointer: 
    })
    this.executionStatus.contextMemory
  }

  getInstructionPointer() {
    return this.executionStatus.instructionPointer
  }

  getGlobalFunction() {
    const globalFuncEntry = this.compilationOutput.funcTable['global']
    if (!globalFuncEntry) throw new Error(`Weird Error, there was no global output defined`)
    return globalFuncEntry
  }

  getFunctionFromFuncTable(funcName: string) {
    const funcEntry = this.compilationOutput.funcTable[funcName]
    if (!funcEntry) throw new Error(`Weird Error, there was no ${funcName} function defined`)
    return funcEntry
  }

  initGlobalMemory() {
    const globalMemSizes = this.getGlobalFunction().size as ScopeSizeEntry
    this.globalMemory = new Memory(globalMemSizes)
  }

  // float testFloat = 1.1 * 3 / 4 + (1.2 / 0.98)

  initLiteralMemory() {
    const literalMemorySizes = this.memoryMapper.getMemorySizeFor('constant')
    this.literalMemory = new Memory(literalMemorySizes)
    Object.entries(this.compilationOutput.literalTable).forEach(([value, addr]) => {
      const { type } = this.memoryMapper.getTypeOn(addr)
      if (type === 'int') this.addToMemory(parseInt(value), addr)
      if (type === 'float') this.addToMemory(parseFloat(value), addr)
      if (type === 'string') this.addToMemory(value, addr)
      if (type === 'bool') this.addToMemory(JSON.parse(value), addr)
    })
  }

  getNextQuad() {
    return this.compilationOutput.quadruples[this.executionStatus.instructionPointer]
  }

  start() {
    this.currentQuad = this.getNextQuad()
    while (this.currentQuad.operation != 'endprog') {
      this.processQuadruple()
      this.currentQuad = this.getNextQuad()
    }
    console.log('global memory')
    console.dir(this.globalMemory, { depth: null })
    console.log('literal memory')
    console.dir(this.literalMemory, { depth: null })
    console.log('temporal memory')
    console.dir(this.currContextMemory.temporalMemory, { depth: null })
    console.log('local memory')
    console.dir(this.currContextMemory.localMemory, { depth: null })
  }

  processQuadruple() {
    // let {leftAddr, rightValue, resultAddr} = this.currentQuad
    const leftAddr = this.currentQuad.lhs
    const rightAddr = this.currentQuad.rhs
    const resultAddr = this.currentQuad.result

    let result

    // getFromMemory()
    switch (this.currentQuad?.operation) {
      // Comparison Operations
      case '||': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.orExp(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '&&': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.andExp(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '==': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.isEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '!=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.notEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '>': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.orExp(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '<': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.lessThan(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '>=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.greaterOrEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '<=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.lessOrEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      // Arithmetic Operations
      case '*': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.multiply(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '/': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.divide(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '+': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.sum(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '-': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.subtraction(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case '=': {
        result = this.getValueFromMemory(leftAddr)
        this.addToMemory(result, resultAddr)
        this.instructionPointer++
        break
      }
      case 'goto': {
        this.instructionPointer = resultAddr
        break
      }
      case 'gotoF': {
        result = this.getValueFromMemory(leftAddr)
        if (!result) {
          this.instructionPointer = resultAddr
          break
        }
        this.instructionPointer++
        break
      }
      case 'gotoT': {
        result = this.getValueFromMemory(leftAddr)
        if (result) {
          this.instructionPointer = resultAddr
          break
        }
        this.instructionPointer++
        break
      }
      case 'endfunc': {
        this.instructionPointer++
        break
      }
      case 'endprog': {
        this.instructionPointer++
        break
      }
      case 'print': {
        result = this.getValueFromMemory(leftAddr)
        console.log('Hello from VM!', result)
        this.instructionPointer++
        break
      }
      case 'era': {
        const newFuncName = this.getValueFromMemory(leftAddr)

        const funcEntry = this.getFunctionFromFuncTable(newFuncName)
        const temporalMemorySizes = (funcEntry.size! as Record<'local' | 'temporal', ScopeSizeEntry>).temporal
        const localMemorySizes = (funcEntry.size! as Record<'local' | 'temporal', ScopeSizeEntry>).local

        this.executionStack.push({
          ...this.currContextMemory,
          instructionPointer: this.instructionPointer++
        })

        this.tempContextMemory = {
          temporalMemory: new Memory(temporalMemorySizes),
          localMemory: new Memory(localMemorySizes),
        }
        // console.log('this is the memory needed to switch contexts')
        // console.dir(tempContextMemory, { depth: null })
        break
      }
      case 'param': {
        const paramValue = this.getValueFromMemory(leftAddr)
        this.tempContextMemory.localMemory
        console.log('Hello from VM!', result)
        this.instructionPointer++
        break
      }
      default: {
        this.instructionPointer++
      }
    }
  }

  addToMemory(result: any, resultAddr: number) {
    const { type, scope } = this.memoryMapper.getTypeOn(resultAddr)
    const offset = this.memoryMapper.getContext(resultAddr)
    if (scope === 'global') return this.globalMemory.setToMemory(result, type, offset)
    if (scope === 'constant') return this.literalMemory.setToMemory(result, type, offset)
    if (scope === 'temporal') return this.currContextMemory.temporalMemory?.setToMemory(result, type, offset)
    if (scope === 'local') return this.currContextMemory.localMemory?.setToMemory(result, type, offset)
  }

  getValueFromMemory(addr: number) {
    const { type, scope } = this.memoryMapper.getTypeOn(addr)
    const offset = this.memoryMapper.getContext(addr)
    if (scope === 'global') return this.globalMemory.getMemoryFrom(type, offset)
    if (scope === 'constant') return this.literalMemory.getMemoryFrom(type, offset)
    if (scope === 'temporal') return this.currContextMemory.temporalMemory?.getMemoryFrom(type, offset)
    if (scope === 'local') return this.currContextMemory.localMemory?.getMemoryFrom(type, offset)
  }
}

export default VirtualMachine
