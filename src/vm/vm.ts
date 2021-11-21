import * as quadOperations from './quadOperations'
import { ScopeSizeEntry, CompilationOutput, Instruction, NonVoidType } from '../semantics/types'
import Memory from './memory'
import MemoryMapper from '../semantics/memoryMapper'
import { Stack } from 'mnemonist'

type ContextMemory = {
  temporalMemory?: Memory
  localMemory?: Memory
}

type ExecutionStatus = {
  funcName: string
  contextMemory: ContextMemory
  instructionPointer: number
}

class VirtualMachine {
  compilationOutput: CompilationOutput
  globalMemory!: Memory
  literalMemory!: Memory
  executionStatus!: ExecutionStatus
  executionStack: Stack<ExecutionStatus>
  tempExecutionStatus!: ExecutionStatus
  memoryMapper: MemoryMapper
  currentQuad!: Instruction

  constructor(compilationOutput: CompilationOutput, memoryMapper: MemoryMapper) {
    this.executionStack = new Stack<ExecutionStatus>()
    this.memoryMapper = memoryMapper
    this.compilationOutput = compilationOutput
    this.initExecutionStatus()
    // this.initDummyMemories()
  }

  initExecutionStatus() {
    this.executionStatus = {
      funcName: 'global',
      instructionPointer: 0,
      contextMemory: {},
    }
    this.initGlobalMemory()
    this.initLiteralMemory()
  }

  initGlobalMemory() {
    const globalMemSizes = this.getGlobalFunction().size as ScopeSizeEntry
    this.globalMemory = new Memory(globalMemSizes)
  }

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

  // initDummyMemories() {
  //   const renderEntryTemporalSize = (
  //     this.compilationOutput.funcTable['render'].size as Record<'temporal' | 'local', ScopeSizeEntry>
  //   )?.local
  //   if (!renderEntryTemporalSize) throw new Error('blablalca')
  //   this.executionStatus.contextMemory.localMemory = new Memory(renderEntryTemporalSize)
  //   const renderEntryLocalSize = (
  //     this.compilationOutput.funcTable['render'].size as Record<'temporal' | 'local', ScopeSizeEntry>
  //   )?.temporal
  //   if (!renderEntryLocalSize) throw new Error('blablalca')
  //   this.executionStatus.contextMemory.temporalMemory = new Memory(renderEntryTemporalSize)
  // }

  incrementInstructionPointer() {
    this.executionStatus.instructionPointer++
  }

  setInstructionPointer(instructionNo: number) {
    this.executionStatus.instructionPointer = instructionNo
  }

  loadTempExecutionStatus() {
    this.executionStatus = this.tempExecutionStatus
  }

  getCurrentContext() {
    if (!this.executionStatus.contextMemory) throw new Error('Tried to get a current Context but no context was found')
    return this.executionStatus.contextMemory
  }

  saveCurrentContext() {
    this.executionStack.push(this.executionStatus)
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

  getNextQuad() {
    return this.compilationOutput.quadruples[this.executionStatus.instructionPointer]
  }

  start() {
    this.currentQuad = this.getNextQuad()
    while (this.currentQuad.operation != 'endprog') {
      this.processQuadruple()
      this.currentQuad = this.getNextQuad()
    }

    console.log('ending...')
    console.log('global memory')
    console.dir(this.globalMemory, { depth: null })
    console.log('literal memory')
    console.dir(this.literalMemory, { depth: null })
    console.log('temporal memory')
    console.dir(this.getCurrentContext().temporalMemory, { depth: null })
    console.log('local memory')
    console.dir(this.getCurrentContext().localMemory, { depth: null })
  }

  processQuadruple() {
    console.log('reading quad...', this.currentQuad)
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
        this.incrementInstructionPointer()
        break
      }
      case '&&': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.andExp(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '==': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.isEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '!=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.notEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '>': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.orExp(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '<': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.lessThan(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '>=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.greaterOrEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '<=': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.lessOrEqual(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      // Arithmetic Operations
      case '*': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.multiply(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '/': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.divide(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '+': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.sum(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '-': {
        const leftValue = this.getValueFromMemory(leftAddr)
        const rightValue = this.getValueFromMemory(rightAddr)
        result = quadOperations.subtraction(leftValue, rightValue)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case '=': {
        result = this.getValueFromMemory(leftAddr)
        this.addToMemory(result, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case 'goto': {
        this.setInstructionPointer(resultAddr)
        break
      }
      case 'gotoRender': {
        const { size, funcStart } = this.getFunctionFromFuncTable('render')
        if (!size || !funcStart)
          throw new Error('Internal Error: Expected to find function size and start but found nothing')
        const temporalMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).temporal
        const localMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).local
        this.executionStatus = {
          funcName: 'render',
          contextMemory: {
            temporalMemory: new Memory(temporalMemorySizes),
            localMemory: new Memory(localMemorySizes),
          },
          instructionPointer: funcStart,
        }
        break
      }
      case 'gotoF': {
        result = this.getValueFromMemory(leftAddr)
        if (!result) {
          this.setInstructionPointer(resultAddr)
          break
        }
        this.incrementInstructionPointer()
        break
      }
      case 'gotoT': {
        result = this.getValueFromMemory(leftAddr)
        if (result) {
          this.setInstructionPointer(resultAddr)
          break
        }
        this.incrementInstructionPointer()
        break
      }
      case 'endprog': {
        this.incrementInstructionPointer()
        break
      }
      case 'print': {
        result = this.getValueFromMemory(leftAddr)
        console.log('Hello from VM!', result)
        this.incrementInstructionPointer()
        break
      }
      case 'return': {
        // store in global variables the result
        // get the global variable offset
        const funcEntry = this.getFunctionFromFuncTable(this.executionStatus.funcName)
        if (funcEntry.type === 'void') {
          this.incrementInstructionPointer()
          break
        }

        result = this.getValueFromMemory(resultAddr)

        const { type: funcType, addr: funcAddr } = funcEntry!
        const offset = this.memoryMapper.getContext(funcAddr!)
        console.log('setting to global memory', result, funcType, offset)
        this.globalMemory.setToMemory(result, funcType as NonVoidType, offset)
        this.incrementInstructionPointer()
      }
      case 'endfunc': {
        if (this.executionStack.peek() === undefined)
          throw new Error('Tried to change context but found nothing in the context stack')
        this.tempExecutionStatus = this.executionStack.pop()!
        this.loadTempExecutionStatus()
        this.incrementInstructionPointer()
        break
      }
      case 'era': {
        const funcName = this.getValueFromMemory(leftAddr)
        const { size, funcStart } = this.getFunctionFromFuncTable(funcName)
        console.log(size)
        if (!size || !funcStart)
          throw new Error('Internal Error: Expected to find function size and start but found nothing')
        const temporalMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).temporal
        const localMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).local
        this.tempExecutionStatus = {
          funcName,
          contextMemory: {
            temporalMemory: new Memory(temporalMemorySizes),
            localMemory: new Memory(localMemorySizes),
          },
          instructionPointer: funcStart,
        }
        this.incrementInstructionPointer()
        break
      }
      case 'param': {
        const targetFunc = this.tempExecutionStatus.funcName

        const paramValue = this.getValueFromMemory(leftAddr)
        const { args } = this.getFunctionFromFuncTable(targetFunc)
        const paramType = args![resultAddr]

        // copy paramValue from currentContext to tempContext
        this.tempExecutionStatus.contextMemory.localMemory?.setToMemory(paramValue, paramType, resultAddr)
        this.incrementInstructionPointer()
        break
      }
      case 'gosub': {
        this.saveCurrentContext()
        this.loadTempExecutionStatus()
        break
      }
      default: {
        console.log('catched...', this.currentQuad.operation)
        this.incrementInstructionPointer()
      }
    }
  }

  addToMemory(result: any, resultAddr: number) {
    const { type, scope } = this.memoryMapper.getTypeOn(resultAddr)
    const offset = this.memoryMapper.getContext(resultAddr)

    if (scope === 'global') return this.globalMemory.setToMemory(result, type, offset)
    if (scope === 'constant') return this.literalMemory.setToMemory(result, type, offset)
    if (scope === 'temporal') return this.getCurrentContext().temporalMemory?.setToMemory(result, type, offset)
    if (scope === 'local') return this.getCurrentContext().localMemory?.setToMemory(result, type, offset)
  }

  getValueFromMemory(addr: number) {
    const { type, scope } = this.memoryMapper.getTypeOn(addr)
    const offset = this.memoryMapper.getContext(addr)

    if (scope === 'global') return this.globalMemory.getMemoryFrom(type, offset)
    if (scope === 'constant') return this.literalMemory.getMemoryFrom(type, offset)
    if (scope === 'temporal') return this.getCurrentContext().temporalMemory?.getMemoryFrom(type, offset)
    if (scope === 'local') return this.getCurrentContext().localMemory?.getMemoryFrom(type, offset)
  }
}

export default VirtualMachine
