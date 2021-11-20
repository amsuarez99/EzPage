import {
  FuncTable,
  FuncTableEntry,
  Instruction,
  Kind,
  NonVoidType,
  Operator,
  semanticCube,
  Type,
  VarTable,
  VarTableEntry,
  LiteralTable,
} from '../semantics'
import { log } from '../logger'
import { Stack } from 'mnemonist'
import { GotoOperation, Operation } from './types'
import { isNumerical } from './utils'
import MemoryMapper, { MemoryBuilder } from './memoryMapper'

class SymbolTable {
  funcTable: FuncTable
  currentFunc: string
  // '(' is for fake floor
  operatorStack: Stack<Operator | '('>
  // to store address
  operandStack: Stack<number>
  jumpStack: Stack<number>
  instructionList: Instruction[]
  literalTable: LiteralTable
  memoryMapper: MemoryMapper
  voidHasReturn = false

  constructor(memoryMapper: MemoryMapper) {
    this.funcTable = {}
    this.memoryMapper = memoryMapper
    this.currentFunc = 'global'
    this.handleFuncRegistry('global', 'void')
    this.operatorStack = new Stack()
    this.operandStack = new Stack()
    this.jumpStack = new Stack()
    this.instructionList = []
    this.literalTable = {}
  }

  getCurrentState() {
    return {
      funcTable: this.funcTable,
      operatorStack: this.operatorStack,
      operandStack: this.operandStack,
    }
  }

  verifyFuncExistance(name: string) {
    if (!this.getFuncEntry(name)) throw new Error("Can't find the function you are trying to call")
  }

  /**
   * @returns the FuncTable structure
   */
  getFuncTable(): FuncTable {
    return this.funcTable
  }

  /**
   * Looks up a funciton by name in the FuncTable
   * @param {string} name The name of the entry you want to look
   * @returns {FuncTableEntry | undefined} a FuncTable entry if found, undefined if not found
   */
  getFuncEntry(name: string): FuncTableEntry | undefined {
    return this.funcTable[name]
  }

  /**
   * Returns the current function entry
   * Will always have a value
   * Set as global from the start
   * Set as the identifier of a function when a func is defined
   * * Note: this entry is automatically set when addFunc is called
   * @returns the current FuncTable entry
   */
  getCurrentFunc(): FuncTableEntry {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.getFuncEntry(this.currentFunc)!
  }

  /**
   * Changes the current func
   * @param {string} funcName the current function name to set
   */
  setCurrentFunc(funcName: string): void {
    this.currentFunc = funcName
    log(`changed current func: ${funcName}`)
  }

  /**
   * Returns the global function entry (will always exist)
   * @returns the global FuncTable entry
   */
  getGlobalFunc(): FuncTableEntry {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.getFuncEntry('global')!
  }

  /**
   * Gets the varsTable of a funcEntry
   * @param {stirng?} funcName  name of the funcEntry to get the varsTable
   * @returns {VarTable | undefined} varTable if found
   * optional because it defaults to the currentFunc
   */
  getVarTable(funcName?: string): VarTable | undefined {
    const funcEntry = funcName ? this.getFuncEntry(funcName) : this.getCurrentFunc()
    return funcEntry?.varsTable
  }

  /**
   * Deletes the varsTable of a funcEntry
   * @param {string?} funcName name of the funcEntry to delete the varsTable
   * optional because it defaults to the currentFunc
   */
  deleteVarsTable(funcName?: string): void {
    const funcEntry = funcName ? this.getFuncEntry(funcName) : this.getCurrentFunc()
    if (funcEntry) {
      funcEntry.varsTable = undefined
      log(`Deleted varsTable for funcEntry: ${funcName || this.currentFunc}`)
    }
  }

  /**
   * Gets the variable entry in the currentFunc's varTable
   * If not found, checks the global scope
   * @param {string} name Name of the variable to search
   * @param {boolean} globalSearch Flag that disables globalSearch
   * @returns {VarTableEntry | undefined} returns the found varTable entry
   * if not found in any scope, returns undefined
   */
  getVarEntry(name: string, globalSearch = true): VarTableEntry | undefined {
    if (!globalSearch) return this.getCurrentFunc().varsTable?.[name]
    return this.getCurrentFunc()?.varsTable?.[name] || this.getGlobalFunc()?.varsTable?.[name]
  }

  handleProgramStart() {
    const quad: Instruction = {
      operation: 'gotoRender',
      lhs: -1,
      rhs: -1,
      result: -1,
    }
    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    this.jumpStack.push(this.instructionList.length - 1)
  }

  handleRenderRegistry() {
    this.handleFuncRegistry('render', 'void')
    const destination = this.safePop(this.jumpStack)
    this.fillPendingJump(destination)
  }

  /**
   * Adds a function to the FuncTable
   * @param {string} name the name of the function
   * @param {string} returnType the returnType of the function
   */
  handleFuncRegistry(name: string, returnType: Type): void {
    if (this.getFuncEntry(name)) throw new Error('Duplicate Function Entry')
    if (this.getVarEntry(name)) throw new Error("Duplicate identifier: can't name function as global variables")
    const funcStart = name === 'global' ? -1 : this.instructionList.length
    this.setCurrentFunc(name)
    this.funcTable[name] = {
      type: returnType,
      funcStart,
    }
    // register the function as a global variable if it
    if (returnType !== 'void') {
      this.allocateReturnMemory()
    }
    log(`Added funcEntry: ${name}`, this.getCurrentFunc())
  }

  /**
   * A function that adds one or more arguments to the current entry in the funcTable
   * @param {...[NonVoidType, string]+} args one or more arguments represented as tuples
   * tuple[0] = the type of the argument
   * tuple[1] = the name of the argument
   * Ex: [string, "hello"]
   */
  addArgs(...args: { type: NonVoidType }[]): void {
    // ignore if args is empty
    if (!args?.length) return

    const currentFunc = this.getCurrentFunc()
    if (this.currentFunc === 'global') throw new Error("Can't add args to global Func")

    // add args to current func
    const funcArgs = args.map((arg) => arg.type)
    currentFunc.args = funcArgs
    log(`Added args to func ${this.currentFunc}`, funcArgs)
  }

  /**
   * Adds variables to the current entry in the funcTable
   * @param {...{name: string, type: NonVoidType, kind?: Kind}} args One or more variables to be added
   * name: the name of the variable
   * type: the type of the variable (int, float, string, etc.)
   * kind: the kind of the variable (matrix, array)
   */
  addVars(...args: { name: string; type: NonVoidType; kind?: Kind; dim?: number[] }[]): void {
    if (!this.getVarTable()) {
      this.getCurrentFunc().varsTable = {}
      log(`Var Table for ${this.currentFunc} not found... creating varsTable`)
    }
    args.forEach((arg) => {
      const { type, name, kind, dim } = arg
      // disable global search, only care about current scope
      if (this.getVarEntry(name, false)) throw new Error('Duplicate Identifier')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const varTable = this.getVarTable()!
      const scope = this.currentFunc === 'global' ? 'global' : 'local'
      const varEntry: VarTableEntry = {
        kind,
        dim,
        addr: this.memoryMapper.getAddrFor(type, scope),
      }

      if (kind === 'array') this.memoryMapper.offsetMemory(type, scope, dim![0] - 1)
      if (kind === 'matrix') this.memoryMapper.offsetMemory(type, scope, dim![0] * dim![1] - 1)

      varTable[name] = varEntry
      log(`Added var __${name}__ to varsTable of ${this.currentFunc}`, varEntry)
    })
  }

  maybeDoOperation(...operators: Operator[]): void {
    const hasPendingOperation = operators.some((op) => op === this.operatorStack.peek())
    if (hasPendingOperation) this.doOperation()
  }

  doOperation(): void {
    const operator = this.safePop(this.operatorStack) as Operator
    const rightOperandAddr = this.safePop(this.operandStack)
    let { type: rightOperandType } = this.memoryMapper.getTypeOn(rightOperandAddr) as { type: NonVoidType | 'pointer' }
    if (rightOperandType === 'pointer') {
      // get the type of the pointer
      const rightOperandRealAddr = this.safePop(this.operandStack)
      const { type: rightOperandRealType } = this.memoryMapper.getTypeOn(rightOperandRealAddr) as {
        type: NonVoidType | 'pointer'
      }
      rightOperandType = rightOperandRealType
    }

    const leftOperandAddr = this.safePop(this.operandStack)
    let { type: leftOperandType } = this.memoryMapper.getTypeOn(leftOperandAddr) as { type: NonVoidType | 'pointer' }
    if (leftOperandType === 'pointer') {
      // get the type of the pointer
      const leftOperandRealAddr = this.safePop(this.operandStack)
      const { type: leftOperandRealType } = this.memoryMapper.getTypeOn(leftOperandRealAddr) as {
        type: NonVoidType | 'pointer'
      }
      leftOperandType = leftOperandRealType
    }

    const resultType = semanticCube[operator][leftOperandType as NonVoidType][rightOperandType as NonVoidType]
    if (resultType === 'Type Error')
      throw new Error(
        `Type Mismatch, trying to do operation: ${operator} on ${leftOperandType} and ${rightOperandType}`,
      )

    const temporalAddr = this.memoryMapper.getAddrFor(resultType, 'temporal')
    const quadruple: Instruction = {
      operation: operator,
      lhs: leftOperandAddr,
      rhs: rightOperandAddr,
      result: temporalAddr,
    }

    // push the temporal to the operand stack
    this.operandStack.push(temporalAddr)
    log(`pushed __temporal__ to operandStack:`, temporalAddr)

    this.instructionList.push(quadruple)
    log('***Added instruction***', quadruple)
  }

  doAssignmentOperation(): void {
    const operator = this.safePop(this.operatorStack, '=') as Operator
    const rightOperandAddr = this.safePop(this.operandStack)
    let { type: rightOperandType } = this.memoryMapper.getTypeOn(rightOperandAddr) as { type: NonVoidType | 'pointer' }
    if (rightOperandType === 'pointer') {
      // get the type of the pointer
      const rightOperandRealAddr = this.safePop(this.operandStack)
      const { type: rightOperandRealType } = this.memoryMapper.getTypeOn(rightOperandRealAddr) as {
        type: NonVoidType | 'pointer'
      }
      rightOperandType = rightOperandRealType
    }

    const leftOperandAddr = this.safePop(this.operandStack)
    let { type: leftOperandType } = this.memoryMapper.getTypeOn(leftOperandAddr) as { type: NonVoidType | 'pointer' }
    if (leftOperandType === 'pointer') {
      // get the type of the pointer
      const leftOperandRealAddr = this.safePop(this.operandStack)
      const { type: leftOperandRealType } = this.memoryMapper.getTypeOn(leftOperandRealAddr) as {
        type: NonVoidType | 'pointer'
      }
      leftOperandType = leftOperandRealType
    }

    const resultType = semanticCube[operator][leftOperandType as NonVoidType][rightOperandType as NonVoidType]
    if (resultType === 'Type Error')
      throw new Error(
        `Type mismatch, trying to do operation: ${operator} on ${leftOperandType} and ${rightOperandType}`,
      )

    const quadruple: Instruction = {
      operation: operator,
      lhs: rightOperandAddr,
      rhs: -1,
      result: leftOperandAddr,
    }

    this.instructionList.push(quadruple)
    log('***Added instruction***', quadruple)
  }

  pushLiteral(value: string, type: NonVoidType): void {
    const addr = this.getLiteralAddr(value, type)
    this.operandStack.push(addr)
    log('Added literal to stack', { value, type, addr })
  }

  pushOperand(identifier: string): void {
    if (!this.getVarEntry(identifier)) throw new Error('Unexisting identifier')
    const { addr } = this.getVarEntry(identifier) as VarTableEntry
    const { type } = this.memoryMapper.getTypeOn(addr)
    this.operandStack.push(addr)
    log(`pushed to operand stack: [${identifier} with addr ${addr} of type ${type}]`)
  }

  pushOperator(operator: Operator): void {
    this.operatorStack.push(operator)
    log(`pushed to operator stack: ${operator}`)
  }

  pushFakeFloor(): void {
    this.operatorStack.push('(')
    log('pushed fake floor')
  }

  popFakeFloor(): void {
    this.safePop(this.operatorStack, '(')
    log('Popped fake floor')
  }

  safePop<T>(stack: Stack<T>, expectedItem?: T): T {
    if (expectedItem && stack.peek() !== expectedItem)
      throw new Error(`Error in operator stack: Expected ${expectedItem}, but found ${stack.peek()}`)
    if (stack.peek() === undefined) throw new Error('Tried to pop an item in a stack, but found no items')
    const stackItem = stack.pop() as T
    log('Popping from stack', stackItem)
    return stackItem
  }

  getLiteralAddr(literal: string, type: NonVoidType): number {
    if (this.literalTable[literal] === undefined) {
      log(`adding new literal for ${literal}`)
      this.literalTable[literal] = this.memoryMapper.getAddrFor(type, 'constant')
    }
    return this.literalTable[literal]
  }

  // Flow Control
  handleCondition(): void {
    const conditionAddress = this.safePop(this.operandStack)
    const { type: conditionType } = this.memoryMapper.getTypeOn(conditionAddress)
    if (conditionType !== 'bool') throw new Error(`Expecting condition type to be boolean, found: ${conditionType}`)

    const quad: Instruction = {
      operation: 'gotoF',
      lhs: conditionAddress,
      rhs: -1,
      result: -1,
    }

    this.instructionList.push(quad)
    this.jumpStack.push(this.instructionList.length - 1)
    log('***Added instruction***', quad)
  }

  handleElseCondition(): void {
    const falseCondition = this.safePop(this.jumpStack)
    const quad: Instruction = {
      operation: 'goto',
      lhs: -1,
      rhs: -1,
      result: -1,
    }
    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    this.jumpStack.push(this.instructionList.length - 1)
    this.fillPendingJump(falseCondition)
  }

  handleConditionEnd(): void {
    const destination = this.safePop(this.jumpStack)
    this.fillPendingJump(destination)
  }

  fillPendingJump(instructionNo: number): void {
    if (this.instructionList[instructionNo].result !== -1)
      throw new Error('Weird Error: expected to fill a pending jump but it was not labeled as such')
    this.instructionList[instructionNo].result = this.instructionList.length
  }

  // Loops
  handleWhileStart(): void {
    const begin = this.instructionList.length
    this.jumpStack.push(begin)
  }

  handleWhileEnd(): void {
    const falseJump = this.safePop(this.jumpStack)
    const conditionBegin = this.safePop(this.jumpStack)
    const quad: Instruction = {
      operation: 'goto',
      lhs: -1,
      rhs: -1,
      result: conditionBegin,
    }
    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    this.fillPendingJump(falseJump)
  }

  storeControlVar(identifier: string): void {
    const varEntry = this.getVarEntry(identifier)
    if (!varEntry) throw new Error('Unexisting identifier in for loop')
    const { addr } = varEntry
    const { type } = this.memoryMapper.getTypeOn(addr) as { type: NonVoidType }
    if (!isNumerical(type)) throw new Error(`Loop control variable should be of type 'int' or 'double', found: ${type}`)
    this.operandStack.push(addr)
  }

  handleControlAssignment(): number {
    const exprAddr = this.safePop(this.operandStack)
    const { type: exprType } = this.memoryMapper.getTypeOn(exprAddr) as { type: NonVoidType }
    if (!isNumerical(exprType))
      throw new Error(`Expected expression to be of type 'int' or 'float', found: ${exprType} `)

    const controlAddr = this.safePop(this.operandStack)
    if (!controlAddr) throw new Error(`Weird error: Expected to find control variable but found ${controlAddr}`)
    const { type: controlType } = this.memoryMapper.getTypeOn(controlAddr) as { type: NonVoidType }

    const resType = semanticCube['='][controlType][exprType]
    if (resType === 'Type Error') throw new Error('Type Mismatch')

    const quad: Instruction = {
      operation: '=',
      lhs: exprAddr,
      rhs: -1,
      result: controlAddr,
    }

    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    return controlAddr
  }

  handleControlCompare(controlName: string): void {
    // The limit should be in the operand stack, we get that and add it to the localVariables
    const exprAddr = this.safePop(this.operandStack)
    const { type: exprType } = this.memoryMapper.getTypeOn(exprAddr) as { type: NonVoidType }
    if (!isNumerical(exprType))
      throw new Error(`Expected expression to be of type 'int' or 'float', found: ${exprType} `)

    // Take a snapshot of the upper limit, so that we don't modify it accidentally
    const upperLim = this.memoryMapper.getAddrFor(exprType, 'temporal')
    const quadruple: Instruction = {
      operation: '=',
      lhs: exprAddr,
      rhs: -1,
      result: upperLim,
    }

    this.instructionList.push(quadruple)
    log('***Added instruction***', quadruple)

    const { addr: controlAddr } = this.getVarEntry(controlName)!
    const { type: controlType } = this.memoryMapper.getTypeOn(controlAddr)

    const tempType = semanticCube['<'][controlType as NonVoidType][exprType as NonVoidType]
    const temp = this.memoryMapper.getAddrFor(tempType, 'temporal')
    const comparisonQuad: Instruction = {
      operation: '<',
      lhs: controlAddr,
      rhs: upperLim,
      result: temp,
    }

    this.instructionList.push(comparisonQuad)
    log('***Added instruction***', comparisonQuad)

    this.jumpStack.push(this.instructionList.length - 1)

    const falseJump: Instruction = {
      operation: 'gotoF',
      lhs: temp,
      rhs: -1,
      result: -1,
    }

    this.instructionList.push(falseJump)
    log('***Added instruction***', falseJump)

    this.jumpStack.push(this.instructionList.length - 1)
  }

  storeStep(): number {
    const exprAddr = this.safePop(this.operandStack)
    const { type: exprType } = this.memoryMapper.getTypeOn(exprAddr) as { type: NonVoidType }

    if (!isNumerical(exprType))
      throw new Error(`Loop control variable should be of type 'int' or 'double', found: ${exprType}`)

    // Take a snapshot of the step
    const temp = this.memoryMapper.getAddrFor(exprType, 'temporal')
    const quad: Instruction = {
      operation: '=',
      lhs: exprAddr,
      rhs: -1,
      result: temp,
    }

    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    return temp
  }

  handleForEnd(controlName: string, stepDir = this.getLiteralAddr('1', 'int')): void {
    // increment the control variable
    const incrementTemp = this.memoryMapper.getAddrFor('int', 'temporal')
    const { addr: controlAddr } = this.getVarEntry(controlName)!

    const temporalIncrement: Instruction = {
      operation: '+',
      lhs: controlAddr,
      rhs: stepDir,
      result: incrementTemp,
    }

    this.instructionList.push(temporalIncrement)
    log('***Added instruction***', temporalIncrement)

    // increment the control variable
    const incrementCommit: Instruction = {
      operation: '=',
      lhs: incrementTemp,
      rhs: -1,
      result: controlAddr,
    }

    this.instructionList.push(incrementCommit)
    log('***Added instruction***', incrementCommit)

    const falseJump = this.safePop(this.jumpStack)
    const destination = this.safePop(this.jumpStack)

    const jumpQuad: Instruction = {
      operation: 'goto',
      lhs: -1,
      rhs: -1,
      result: destination,
    }

    this.instructionList.push(jumpQuad)
    log('***Added instruction***', jumpQuad)

    this.fillPendingJump(falseJump)
  }

  handleProgramEnd() {
    this.currentFunc = 'global'
    this.instructionList.push({
      operation: 'endprog',
      lhs: -1,
      rhs: -1,
      result: -1,
    })

    this.deleteVarsTable()
    const globalMemSize = this.memoryMapper.getMemorySizeFor('global')

    this.memoryMapper.resetAddrFor('global')

    this.getCurrentFunc().size = globalMemSize
  }

  handleFuncEnd() {
    // OPTIONAL handle funcTable as a class, to remove complexity from the symbolTable class
    // this.funcTable.deleteVarsTable()
    if (this.currentFunc !== 'render') {
      this.instructionList.push({
        operation: 'endfunc',
        lhs: -1,
        rhs: -1,
        result: -1,
      })
    }

    this.deleteVarsTable()
    // this.funcTable.calcMemorySize()
    const localMem = this.memoryMapper.getMemorySizeFor('local')
    const temporalMem = this.memoryMapper.getMemorySizeFor('temporal')

    this.memoryMapper.resetAddrFor('local')
    this.memoryMapper.resetAddrFor('temporal')

    this.getCurrentFunc().size = {
      local: localMem,
      temporal: temporalMem,
    }
  }

  allocateReturnMemory() {
    const currentType = this.getCurrentFunc().type as NonVoidType
    const funcName = this.currentFunc
    const varTable = this.getVarTable('global')
    if (!varTable) {
      this.getGlobalFunc().varsTable = {}
      log(`Var Table for ${this.currentFunc} not found... creating varsTable`)
    }

    const funcAddr = this.memoryMapper.getAddrFor(currentType, 'global')
    const varEntry: VarTableEntry = {
      kind: 'funcReturn',
      addr: funcAddr,
    }
    if (!this.getFuncEntry(funcName)) throw new Error("Internal error: cound't find the function")
    this.getVarTable('global')![funcName] = varEntry
    this.getFuncEntry(funcName)!.addr = funcAddr
  }

  handleReturn() {
    const currentFuncType = this.getCurrentFunc().type
    if (currentFuncType === 'void') {
      // Get the temporal from the expression
      this.instructionList.push({
        operation: 'return',
        lhs: -1,
        rhs: -1,
        result: -1,
      })
      return
    }

    const returnExpressionAddr = this.safePop(this.operandStack)
    const { type: returnType } = this.memoryMapper.getTypeOn(returnExpressionAddr) as { type: NonVoidType }
    // Assert type
    if (currentFuncType !== returnType)
      throw new Error(`Type mismatch between return expression and func return type ${currentFuncType}, ${returnType}`)

    if (!this.getVarTable('global'))
      throw new Error('Weird error, there is no memory allocated for the current function')
    // push quad
    const quad: Instruction = {
      operation: 'return',
      lhs: -1,
      rhs: -1,
      result: returnExpressionAddr,
    }
    this.instructionList.push(quad)
  }

  handleEra(funcName: string) {
    const mappedFuncName = this.getLiteralAddr(funcName, 'string')
    const quad: Instruction = {
      operation: 'era',
      lhs: mappedFuncName,
      rhs: -1,
      result: -1,
    }
    this.instructionList.push(quad)
  }

  processParam(funcName: string, argIdx: number) {
    // already checked if func exists in verifyFuncExistance
    const funcArgs = this.getFuncEntry(funcName)!.args
    if (!funcArgs) throw new Error('Func signature mismatch: No args were defined in the func signature')
    if (argIdx >= funcArgs.length) throw new Error('Func signature mismatch: Too many arguments')
    const paramAddr = this.safePop(this.operandStack)
    const { type: paramType } = this.memoryMapper.getTypeOn(paramAddr) as { type: NonVoidType }
    if (paramType !== funcArgs[argIdx]) throw new Error(`Func signature mismatch: Type mismatch for paramNo: ${argIdx}`)

    const quad: Instruction = {
      operation: 'param',
      lhs: paramAddr,
      rhs: -1,
      result: argIdx,
    }

    this.instructionList.push(quad)
  }

  verifySignatureCompletion(funcName: string, argIdx: number) {
    // already checked if func exists in verifyFuncExistance
    const funcArgs = this.getFuncEntry(funcName)!.args
    if (funcArgs && argIdx !== funcArgs.length) throw new Error('Func signature mismatch: missing params in funcCall')
  }

  genGosub(funcName: string) {
    const funcEntry = this.getFuncEntry(funcName)!
    const type = funcEntry.type!
    const mappedFuncName = this.getLiteralAddr(funcName, 'string')
    if (!funcEntry.funcStart) throw new Error('Weird error: the function start was still not defined')

    const initAddr = funcEntry.funcStart
    const quad: Instruction = {
      operation: 'gosub',
      lhs: mappedFuncName,
      rhs: -1,
      result: initAddr,
    }
    this.instructionList.push(quad)

    if (type !== 'void') {
      // gen another quad to store the function value
      const temporalResult = this.memoryMapper.getAddrFor(type, 'local')
      const funcReturn: Instruction = {
        operation: '=',
        lhs: this.getVarTable('global')![funcName].addr,
        rhs: -1,
        result: temporalResult,
      }

      this.operandStack.push(temporalResult)
      log(`adding to operand stack, [${temporalResult}, temporal, local`)
      this.instructionList.push(funcReturn)
    }
  }

  // misc

  handlePrint() {
    const operatorAddr = this.safePop(this.operandStack)
    this.instructionList.push({
      operation: 'print',
      lhs: operatorAddr,
      rhs: -1,
      result: -1,
    })
  }

  // arrays
  prepareArrayAccess(id: string) {
    // this.safePop(this.operandStack)
    const varHasDimensions = this.getVarEntry(id)!.dim?.length
    if (!varHasDimensions) throw new Error(`Tried to index an atomic variable, ${id}`)
    this.pushFakeFloor()
  }

  verifyDimensionMatch(id: string, dimNo: number) {
    const dimensions = this.getVarEntry(id)!.dim!
    const indexExprAddr = this.operandStack.peek()!
    const { type } = this.memoryMapper.getTypeOn(indexExprAddr)

    if (dimNo > dimensions.length - 1) throw new Error('Tried to index more dimensions than declared')
    if (type !== 'pointer' && type !== 'int') throw new Error('Tried to index an array with a non integer type')

    const dimensionSize = dimensions[dimNo].toString()
    const quad: Instruction = {
      operation: 'verify',
      lhs: indexExprAddr,
      rhs: -1,
      result: this.getLiteralAddr(dimensionSize, 'int'),
    }

    this.instructionList.push(quad)
    log(quad)
  }

  checkIfShouldBeIndexed(id: string, dimNo: number) {
    const dimensions = this.getVarEntry(id)!.dim?.length
    if (dimensions && dimensions !== dimNo)
      throw new Error(
        `Incorrect indexation: variable (${id}) was indexed ${dimNo} times and requires indexing ${dimensions} times  `,
      )
  }

  saveOffsetFnResult(id: string) {
    const { addr: arrayAddr } = this.getVarEntry(id)!

    const accumulatedOffset = this.safePop(this.operandStack)
    const { type } = this.memoryMapper.getTypeOn(accumulatedOffset)
    if (type !== 'pointer' && type !== 'int') throw new Error('Tried to index an array with a non integer type')

    const literalizedAddr = this.getLiteralAddr(arrayAddr.toString(), 'int')
    const offsetResult = this.memoryMapper.getAddrFor('pointer', 'temporal')
    this.instructionList.push({
      operation: '+',
      lhs: accumulatedOffset,
      rhs: literalizedAddr,
      result: offsetResult,
    })

    this.operandStack.push(offsetResult)
    this.popFakeFloor()
  }

  maybeCalcOffset(id: string, dimNo: number) {
    const { dim, kind, addr: arrayAddr } = this.getVarEntry(id)!
    if (!kind) throw new Error("YOU REAAAAAAAAAALLY should't be getting this error")
    if (kind === 'array') return

    // s1d2
    if (dimNo === 0) {
      const s1 = this.safePop(this.operandStack)
      const { type } = this.memoryMapper.getTypeOn(s1)
      if (type !== 'pointer' && type !== 'int') throw new Error('Tried to index an array with a non integer type')

      const s1d2 = this.memoryMapper.getAddrFor('int', 'temporal')
      const d2 = dim![dimNo + 1]
      const literalizedDimension = this.getLiteralAddr(d2.toString(), 'int')
      this.instructionList.push({
        operation: '*',
        lhs: s1,
        rhs: literalizedDimension,
        result: s1d2,
      })
      this.operandStack.push(s1d2)
      return
    }

    // the last dimension, just add the previous and the current expression results
    const s2 = this.safePop(this.operandStack)
    // verify the last type
    const { type } = this.memoryMapper.getTypeOn(s2)
    if (type !== 'int') throw new Error('Tried to index an array with a non integer type')

    const s1d2 = this.safePop(this.operandStack)
    const indexationAddress = this.memoryMapper.getAddrFor('int', 'temporal')
    this.instructionList.push({
      operation: '+',
      lhs: s1d2,
      rhs: s2,
      result: indexationAddress,
    })
    this.operandStack.push(indexationAddress)
  }

  handleRenderStatementStart(id: number) {
    this.instructionList.push({
      operation: 'renderOp',
      lhs: id,
      rhs: -1,
      result: -1
    })
  }
  handleRenderArgs(id: number, ...args: { name: any, v: any }[]) {
    args.forEach((arg) => {
      this.instructionList.push({
        operation: 'renderOp',
        lhs: id,
        rhs: arg.v,
        result: this.getLiteralAddr(arg.name, 'string')
      })
    })
  }
}

export { SymbolTable }
