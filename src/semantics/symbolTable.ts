import {
  FuncTable,
  FuncTableEntry,
  Instruction,
  Kind,
  NonVoidType,
  OperandStackItem,
  Operator,
  semanticCube,
  Type,
  VarTable,
  VarTableEntry,
  LiteralTable,
} from '../semantics'
import { log } from '../logger'
import { Stack } from 'mnemonist'
import { GotoOperation } from './types'
import { isNumerical } from './utils'
import MemoryMapper from './memoryMapper'

class SymbolTable {
  funcTable: FuncTable
  currentFunc: string
  // '(' is for fake floor
  operatorStack: Stack<Operator | '('>
  operandStack: Stack<OperandStackItem>
  jumpStack: Stack<number>
  instructionList: Instruction[]
  literalTable: LiteralTable
  memoryMapper: MemoryMapper

  constructor() {
    this.funcTable = {}
    this.currentFunc = 'global'
    this.handleFuncRegistry('global', 'void')
    this.operatorStack = new Stack()
    this.operandStack = new Stack()
    this.jumpStack = new Stack()
    this.instructionList = []
    this.literalTable = {}
    this.memoryMapper = new MemoryMapper()
  }

  getCurrentState(): {
    funcTable: FuncTable
    operatorStack: Stack<Operator | '('>
    operandStack: Stack<OperandStackItem>
  } {
    return {
      funcTable: this.funcTable,
      operatorStack: this.operatorStack,
      operandStack: this.operandStack,
    }
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
    return this.getCurrentFunc().varsTable?.[name] || this.getGlobalFunc().varsTable?.[name]
  }

  handleProgramStart() {
    const quad: Instruction = {
      operation: 'goto',
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
    const funcStart = name === 'global' ? -1 : this.instructionList.length
    this.setCurrentFunc(name)
    this.funcTable[name] = {
      type: returnType,
      funcStart,
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
  addVars(...args: { name: string; type: NonVoidType; kind?: Kind }[]): void {
    if (!this.getVarTable()) {
      this.getCurrentFunc().varsTable = {}
      log(`Var Table for ${this.currentFunc} not found... creating varsTable`)
    }
    args.forEach((arg) => {
      const { type, name, kind } = arg
      // disable global search, only care about current scope
      if (this.getVarEntry(name, false)) throw new Error('Duplicate Identifier')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const varTable = this.getVarTable()!
      const scope = this.currentFunc === 'global' ? 'global' : 'local'
      const varEntry = {
        type,
        kind,
        addr: this.memoryMapper.getAddrFor(type, scope),
      }
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
    const right = this.safePop(this.operandStack)
    const left = this.safePop(this.operandStack)
    const [rightOperandAddr, rightOperandType] = right
    const [leftOperandAddr, leftOperandType] = left
    const resultType = semanticCube[operator][leftOperandType][rightOperandType]
    if (resultType === 'Type Error') throw new Error('Type Mismatch')

    const temporalAddr = this.memoryMapper.getAddrFor(resultType, 'temporal')
    const quadruple: Instruction = {
      operation: operator,
      lhs: leftOperandAddr,
      rhs: rightOperandAddr,
      result: temporalAddr,
    }

    // push the temporal to the operand stack
    const temp = [temporalAddr, resultType] as OperandStackItem
    this.operandStack.push(temp)
    log(`pushed __temporal__ to operandStack:`, temp)

    this.instructionList.push(quadruple)
    log('***Added instruction***', quadruple)
  }

  doAssignmentOperation(): void {
    const operator = this.safePop(this.operatorStack, '=') as Operator
    const right = this.safePop(this.operandStack)
    const left = this.safePop(this.operandStack)
    const [rightOperandAddr, rightOperandType] = right
    const [leftOperandAddr, leftOperandType] = left
    const resultType = semanticCube[operator][leftOperandType][rightOperandType]
    if (resultType === 'Type Error') throw new Error('Type Mismatch')
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
    this.operandStack.push([addr, type])
    log('Added literal to stack', { value, type })
  }

  pushOperand(identifier: string): void {
    if (!this.getVarEntry(identifier)) throw new Error('Unexisting identifier')
    const { type, addr } = this.getVarEntry(identifier) as VarTableEntry
    this.operandStack.push([addr, type])
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
    return stackItem
  }

  getLiteralAddr(literal: string, type: NonVoidType): number {
    if (this.literalTable[literal] === undefined)
      this.literalTable[literal] = this.memoryMapper.getAddrFor(type, 'constant')
    return this.literalTable[literal]
  }

  // Flow Control
  handleCondition(): void {
    const [conditionName, conditionType] = this.safePop(this.operandStack)
    if (conditionType !== 'bool') throw new Error(`Expecting condition type to be boolean, found: ${conditionType}`)

    const quad: Instruction = {
      operation: 'gotoF',
      lhs: conditionName,
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
    const { type, addr } = varEntry
    if (!isNumerical(type)) throw new Error(`Loop control variable should be of type 'int' or 'double', found: ${type}`)
    this.operandStack.push([addr, type])
  }

  handleControlAssignment(): number {
    const [exprName, exprType] = this.safePop(this.operandStack)
    if (!isNumerical(exprType))
      throw new Error(`Expected expression to be of type 'int' or 'float', found: ${exprType} `)

    const controlVariable = this.safePop(this.operandStack)
    if (!controlVariable) throw new Error(`Weird error: Expected to find control variable but found ${controlVariable}`)
    const [controlAddr, controlType] = controlVariable

    const resType = semanticCube['='][controlType][exprType]
    if (resType === 'Type Error') throw new Error('Type Mismatch')

    const quad: Instruction = {
      operation: '=',
      lhs: -1,
      rhs: -1,
      result: controlAddr,
    }

    this.instructionList.push(quad)
    log('***Added instruction***', quad)
    return controlAddr
  }

  handleControlCompare(controlName: string): void {
    // The limit should be in the operand stack, we get that and add it to the localVariables
    const [exprAddr, exprType] = this.safePop(this.operandStack)
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

    const temp = this.memoryMapper.getAddrFor(exprType, 'temporal')
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
    const [exprAddr, exprType] = this.safePop(this.operandStack)

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

  handleFuncEnd() {
    // OPTIONAL handle funcTable as a class, to remove complexity from the symbolTable class
    // this.funcTable.deleteVarsTable()
    this.deleteVarsTable()
    this.memoryMapper.resetAddrFor('local')
    this.memoryMapper.resetAddrFor('temporal')

    // OPTIONAL handle quadList as a class, to remove complexity from the symbolTable
    // this.quadrupleHandler.addFuncEnd()
    this.instructionList.push({
      operation: 'endfunc',
      lhs: -1,
      rhs: -1,
      result: -1,
    })
  }
}

export { SymbolTable }
