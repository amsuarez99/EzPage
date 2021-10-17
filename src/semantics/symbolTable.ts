import { FuncTable, FuncTableEntry, Kind, NonVoidType, Type, VarTable } from 'semantics'

class SymbolTable {
  funcTable: FuncTable
  currentFunc: string
  addressCounter: number

  constructor() {
    this.funcTable = {}
    this.currentFunc = 'global'
    this.addFunc('global', 'void')
    this.addressCounter = 0
  }

  getFuncTable(): FuncTable {
    return this.funcTable
  }

  getFuncEntry(name: string): FuncTableEntry {
    return this.funcTable[name]
  }

  getCurrentFunc(): FuncTableEntry {
    return this.getFuncEntry(this.currentFunc)
  }

  hasFunctionEntry(name: string): boolean {
    return !!this.funcTable[name]
  }

  hasVarEntry(name: string): boolean {
    return !!this.getCurrentFunc().varsTable?.[name]
  }

  doesVarExist(name: string): boolean {
    const currentFunc = this.getCurrentFunc()
    // check only global scope
    if (currentFunc === 'global') return this.hasVarEntry(name)
    // check both global and local scope
    return this.hasVarEntry(name) || !!this.funcTable['global'].varsTable?.[name]
  }

  addFunc(name: string, returnType: Type): void {
    if (this.hasFunctionEntry(name)) throw new Error('Duplicate Function Entry')
    this.currentFunc = name
    this.funcTable[name] = {
      type: returnType,
    }
  }

  addArgsToFunc(...args: [NonVoidType, string][]): void {
    // ignore if args is empty
    if (!args?.length) return
    if (this.currentFunc === 'global') throw new Error("Can't add args to global Func")

    // add args to current func
    const currentFunc = this.getCurrentFunc()
    currentFunc.args = args.map((arg) => arg[0])

    // add args to varTable
    const varEntries = args.map((arg) => {
      const [type, name] = arg
      return {
        name,
        type,
      }
    })
    this.addVars(...varEntries)
  }

  addVars(...args: { name: string; type: NonVoidType; kind?: Kind }[]): void {
    const varTable = args.reduce((accum, arg) => {
      const { type, name, kind } = arg
      // exists in current varTable?
      if (accum[name] || this.hasVarEntry(name)) throw new Error('Duplicate Identifier')
      accum[name] = {
        type,
        kind,
        addr: this.addressCounter++,
      }
      return accum
    }, {} as VarTable)

    // Append to existing table
    const currentFunc = this.getCurrentFunc()
    currentFunc.varsTable = {
      ...currentFunc.varsTable,
      ...varTable,
    }
  }

  deleteFunc(name: string): void {
    delete this.funcTable[name]
    this.currentFunc = 'global'
  }
}

export { SymbolTable }
