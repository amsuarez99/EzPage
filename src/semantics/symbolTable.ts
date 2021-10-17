import {
  FuncTable,
  FuncTableEntry,
  Instruction,
  Kind,
  NonVoidType,
  OperandStackItem,
  Operation,
  Operator,
  semanticCube,
  Type,
  VarTable,
  VarTableEntry,
} from '../semantics'
import { Queue, Stack } from 'mnemonist'

class SymbolTable {
  funcTable: FuncTable
  currentFunc: string
  addressCounter: number
  temporalCounter: number
  operatorStack: Stack<Operator | '('>
  operandStack: Stack<OperandStackItem>
  instructionList: Queue<Instruction>

  constructor() {
    this.funcTable = {}
    this.currentFunc = 'global'
    this.addFunc('global', 'void')
    this.addressCounter = 0
    this.temporalCounter = 999
    this.operatorStack = new Stack()
    this.operandStack = new Stack()
    this.instructionList = new Queue()
  }

  getCurrentState(): {
    funcTable: FuncTable
    addressCounter: number
    operatorStack: Stack<Operator | '('>
    operandStack: Stack<OperandStackItem>
  } {
    return {
      funcTable: this.funcTable,
      addressCounter: this.addressCounter,
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
    if (funcEntry) funcEntry.varsTable = undefined
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

  /**
   * Adds a function to the FuncTable
   * @param {string} name the name of the function
   * @param {string} returnType the returnType of the function
   */
  addFunc(name: string, returnType: Type): void {
    if (this.getFuncEntry(name)) throw new Error('Duplicate Function Entry')
    this.setCurrentFunc(name)
    this.funcTable[name] = {
      type: returnType,
    }
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
    currentFunc.args = args.map((arg) => arg.type)
  }

  /**
   * Adds variables to the current entry in the funcTable
   * @param {...{name: string, type: NonVoidType, kind?: Kind}} args One or more variables to be added
   * name: the name of the variable
   * type: the type of the variable (int, float, string, etc.)
   * kind: the kind of the variable (matrix, array)
   */
  addVars(...args: { name: string; type: NonVoidType; kind?: Kind }[]): void {
    if (!this.getVarTable()) this.getCurrentFunc().varsTable = {}
    args.forEach((arg) => {
      const { type, name, kind } = arg
      // disable global search, only care about current scope
      if (this.getVarEntry(name, false)) throw new Error('Duplicate Identifier')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const varTable = this.getVarTable()!
      varTable[name] = {
        type,
        kind,
        addr: this.addressCounter++,
      }
    })
  }

  doOperation(): void {
    if (!this.operatorStack.peek()) throw new Error('Error in expression, operand stack empty')
    const operator = this.operatorStack.pop() as Operator
    if (!this.operandStack.peek()) throw new Error('Error in expression, operand stack empty')
    const [rightOperandName, rightOperandType] = this.operandStack.pop() as OperandStackItem
    if (!this.operandStack.peek()) throw new Error('Error in expression, operand stack empty')
    const [leftOperandName, leftOperandType] = this.operandStack.pop() as OperandStackItem

    const resultType = semanticCube[operator][leftOperandType][rightOperandType]
    if (resultType === 'Type Error') throw new Error('Type mismatch')
    this.generateQuadruple(operator, leftOperandName, rightOperandName)

    // push the temporal to the operand stack
    this.operandStack.push([`${this.temporalCounter - 1}`, resultType])
    console.log('pushed to operandStack', `${this.temporalCounter - 1} ${resultType}`)
  }

  private generateQuadruple(operation: Operation, leftIdentifier: string, rightIdentifier: string) {
    const quadruple: Instruction = {
      operation,
      lhs: leftIdentifier,
      rhs: rightIdentifier,
      result: `t${this.temporalCounter++}`,
    }
    this.instructionList.enqueue(quadruple)
    console.log('Added instruction: ', quadruple)
  }

  maybeDoOperation(...operators: Operator[]): void {
    const hasPendingOperation = operators.some((op) => op === this.operatorStack.peek())
    if (hasPendingOperation) this.doOperation()
  }

  pushOperand(identifier: string): void {
    if (!this.getVarEntry(identifier)) throw new Error('Unexisting identifier')
    const { type } = this.getVarEntry(identifier) as VarTableEntry
    this.operandStack.push([identifier, type])
    console.log('pushed to operandStack', `${identifier} ${type}`)
  }

  pushOperator(operator: Operator): void {
    this.operatorStack.push(operator)
    console.log('pushed to operatorStack', operator)
  }

  pushFakeFloor(): void {
    this.operatorStack.push('(')
    console.log('pushed to fake floor')
  }

  popFakeFloor(): void {
    const operator = this.operatorStack.peek()
    if (!operator) throw new Error(`Error in operator stack: Expected '(', but stack is empty`)
    if (operator !== '(') throw new Error(`Error in operator stack: Expected '(', found ${operator}`)
    this.operatorStack.pop()
    console.log('Popped fake floor')
  }
}

export { SymbolTable }
