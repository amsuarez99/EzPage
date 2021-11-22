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
  executionStack: Stack<ExecutionStatus>
  pendingContextStack!: Stack<ExecutionStatus>
  memoryMapper: MemoryMapper
  currentQuad!: Instruction

  constructor(compilationOutput: CompilationOutput, memoryMapper: MemoryMapper) {
    this.executionStack = new Stack<ExecutionStatus>()
    this.pendingContextStack = new Stack<ExecutionStatus>()
    this.memoryMapper = memoryMapper
    this.compilationOutput = compilationOutput
    this.initExecutionStatus()
    // this.initDummyMemories()
  }

  initExecutionStatus() {
    // TODO: define what to do with this context
    this.executionStack.push({
      funcName: 'global',
      instructionPointer: 0,
      contextMemory: {},
    })
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

  getCurrentContext() {
    if (!this.executionStack.peek()) throw new Error('Internal Error: Trying to access a context but found nothing')
    return this.executionStack.peek()!
  }

  incrementInstructionPointer() {
    this.getCurrentContext().instructionPointer++
  }

  setInstructionPointer(instructionNo: number) {
    this.getCurrentContext().instructionPointer = instructionNo
  }

  getInstructionPointer() {
    return this.getCurrentContext().instructionPointer
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
    const instructionNo = this.getCurrentContext().instructionPointer
    return this.compilationOutput.quadruples[instructionNo]
  }

  start() {
    this.currentQuad = this.getNextQuad()
    while (this.currentQuad.operation != 'endprog') {
      this.processQuadruple()
      this.currentQuad = this.getNextQuad()
    }
    quadOperations.doRenderLog()
    console.log('ending...')
    console.log('global memory')
    console.dir(this.globalMemory, { depth: null })
    console.log('literal memory')
    console.dir(this.literalMemory, { depth: null })
    console.log('temporal memory')
    console.dir(this.getCurrentContext().contextMemory.temporalMemory, { depth: null })
    console.log('local memory')
    console.dir(this.getCurrentContext().contextMemory.localMemory, { depth: null })
  }

  processQuadruple() {
    // console.log('reading quad...', this.currentQuad)
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
        this.addToMemory(result, resultAddr, true)
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
        this.executionStack.push({
          funcName: 'render',
          contextMemory: {
            temporalMemory: new Memory(temporalMemorySizes),
            localMemory: new Memory(localMemorySizes),
          },
          instructionPointer: funcStart,
        })
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
        quadOperations.doRenderLog()
        this.incrementInstructionPointer()
        break
      }
      case 'print': {
        result = this.getValueFromMemory(leftAddr)
        console.log('>', JSON.parse(result))
        this.incrementInstructionPointer()
        break
      }
      // ! REALLY IMPORTANT
      // ! RETURN AND ENFUC SHOULD BE SIDE BY SIDE
      case 'return': {
        // store in global variables the result
        // get the global variable offset
        const funcEntry = this.getFunctionFromFuncTable(this.executionStack.peek()?.funcName!)
        if (funcEntry.type !== 'void') {
          result = this.getValueFromMemory(resultAddr)
          const { type: funcType, addr: funcAddr } = funcEntry!
          const offset = this.memoryMapper.getContext(funcAddr!)
          this.globalMemory.setToMemory(result, funcType as NonVoidType, offset)
        }
      }
      case 'endfunc': {
        if (this.executionStack.peek() === undefined)
          throw new Error('Tried to change context but found nothing in the context stack')
        this.executionStack.pop()!
        this.incrementInstructionPointer()
        break
      }
      case 'era': {
        const funcName = this.getValueFromMemory(leftAddr)
        const { size, funcStart } = this.getFunctionFromFuncTable(funcName)
        if (!size || !funcStart)
          throw new Error('Internal Error: Expected to find function size and start but found nothing')
        const temporalMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).temporal
        const localMemorySizes = (size! as Record<'local' | 'temporal', ScopeSizeEntry>).local
        this.pendingContextStack.push({
          funcName,
          contextMemory: {
            temporalMemory: new Memory(temporalMemorySizes),
            localMemory: new Memory(localMemorySizes),
          },
          instructionPointer: funcStart,
        })
        this.incrementInstructionPointer()
        break
      }
      case 'param': {
        const targetFunc = this.pendingContextStack.peek()!.funcName

        const paramValue = this.getValueFromMemory(leftAddr)
        const { args } = this.getFunctionFromFuncTable(targetFunc)
        const paramType = args![resultAddr]

        // copy paramValue from currentContext to tempContext
        const temp = this.pendingContextStack.pop()!
        temp.contextMemory.localMemory?.setToMemory(paramValue, paramType, resultAddr)
        this.pendingContextStack.push(temp)
        this.incrementInstructionPointer()
        break
      }
      case 'gosub': {
        if (!this.pendingContextStack.peek())
          throw new Error('Internal Error: Trying to change contexts, but found nothing in the pending context stack')
        this.executionStack.push(this.pendingContextStack.pop()!)
        break
      }
      // arrays
      case 'verify': {
        // index you are trying to access
        const idx = this.getValueFromMemory(leftAddr)
        const limit = this.getValueFromMemory(resultAddr)
        if (idx < 0 || idx >= limit)
          throw new Error(`Execution Error: Index out of bounds: (idx:${idx}, bound:${limit})`)
        this.incrementInstructionPointer()
        break
      }
      case 'renderOp': {
        // -- TAG id
        const leftValue = this.checkRenderAddr(leftAddr)
        // VALUE
        const rightValue = this.checkRenderAddr(rightAddr)
        // parameter
        const result = this.checkRenderAddr(resultAddr)
        console.log(leftValue, rightValue, result, resultAddr)
        quadOperations.buildRenderStruct(leftAddr, rightValue, result)
        this.incrementInstructionPointer()
        break
      }
      default: {
        console.log('catched...', this.currentQuad.operation)
        this.incrementInstructionPointer()
      }
    }
  }

  // addrAccess indicates if it should access the address inside the cell (*14000(5000) in assignment only) or just (overwrite 14000 default)
  checkRenderAddr(addr: any){
    if(addr > 0){
      return this.getValueFromMemory(addr)
    }else{
      return -1
    }
  }

  addToMemory(result: any, resultAddr: number, addrAccess = false) {
    const { type, scope } = this.memoryMapper.getTypeOn(resultAddr)
    const offset = this.memoryMapper.getContext(resultAddr)

    if (scope === 'global') {
      if (addrAccess && type === 'pointer') {
        const realAddr = this.globalMemory.getMemoryFrom(type, offset)
        this.addToMemory(result, realAddr)
        return
      }
      this.globalMemory.setToMemory(result, type, offset)
      return
    }
    if (scope === 'constant') {
      if (addrAccess && type === 'pointer') {
        const realAddr = this.literalMemory.getMemoryFrom(type, offset)
        this.addToMemory(result, realAddr)
        return
      }
      this.literalMemory.setToMemory(result, type, offset)
      return
    }
    if (scope === 'temporal') {
      if (addrAccess && type === 'pointer') {
        const realAddr = this.getCurrentContext().contextMemory?.temporalMemory?.getMemoryFrom(type, offset)
        this.addToMemory(result, realAddr)
        return
      }
      this.getCurrentContext().contextMemory.temporalMemory?.setToMemory(result, type, offset)
      return
    }
    if (scope === 'local') {
      if (addrAccess && type === 'pointer') {
        const realAddr = this.getCurrentContext().contextMemory?.localMemory?.getMemoryFrom(type, offset)
        this.addToMemory(result, realAddr)
        return
      }
      this.getCurrentContext().contextMemory.localMemory?.setToMemory(result, type, offset)
      return
    }
  }

  getValueFromMemory(addr: number): any {
    const { type, scope } = this.memoryMapper.getTypeOn(addr)
    const offset = this.memoryMapper.getContext(addr)

    if (scope === 'global') {
      const value = this.globalMemory.getMemoryFrom(type, offset)
      return type === 'pointer' ? this.getValueFromMemory(value) : value
    }
    if (scope === 'constant') {
      const value = this.literalMemory.getMemoryFrom(type, offset)
      return type === 'pointer' ? this.getValueFromMemory(value) : value
    }
    if (scope === 'temporal') {
      const value = this.getCurrentContext().contextMemory.temporalMemory?.getMemoryFrom(type, offset)
      return type === 'pointer' ? this.getValueFromMemory(value) : value
    }
    if (scope === 'local') {
      const value = this.getCurrentContext().contextMemory.localMemory?.getMemoryFrom(type, offset)
      return type === 'pointer' ? this.getValueFromMemory(value) : value
    }
  }
}

export default VirtualMachine
