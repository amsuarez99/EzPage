// General Types
export type NonVoidType = 'string' | 'float' | 'int' | 'bool'
export type Type = 'void' | 'pointer' | NonVoidType
export type TypeError = 'Type Error'
export type Kind = 'array' | 'matrix' | 'funcReturn'
export type ScopeSizeEntry = Record<NonVoidType | 'pointer', number>

// ! Function Directory Types
// * This is an object so we can index by identifier name
// Example:
// | name       | type    | args            | varsTable                 |
// ----------------------------------------------------------------------
// | myFunc     | double  | none            | *Ref to varTable*         |
// | myFunc2    | int     | [int, int, int] | 2                         |

export interface FuncTableEntry {
  type?: Type
  args?: NonVoidType[]
  varsTable?: VarTable
  funcStart?: number
  size?: Record<'local' | 'temporal', ScopeSizeEntry> | ScopeSizeEntry
  addr?: number
}
export type FuncTable = Record<string, FuncTableEntry>

// ! Variable Directory Types
// * This is an object so we can index by identifier name
// Example:
// | name       | type    | kind  | address (virtual address) |
// -----------------------------------------------------------
// | something  | double  | none  | 1                         |
// | otherThing | int     | array | 2                         |
export interface VarTableEntry {
  kind?: Kind
  dim?: number[]
  addr: number
}
export type VarTable = Record<string, VarTableEntry>

// ! Semantic Cube
export type Operator = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '&&' | '||' | '='
// * To store operator / operands relationship
// General structure:
// <type> <operator> <type> = <type>
export type OperatorRecord = Record<NonVoidType, Record<NonVoidType, NonVoidType | TypeError>>
export type SemanticCube = Record<Partial<Operator>, OperatorRecord>

export type FuncOperation = 'gosub' | 'endfunc' | 'param' | 'era' | 'return'
export type GotoOperation = 'goto' | 'gotoF' | 'gotoT' | 'gotoRender'
export type ArrayOperation = 'verify'
export type ExtraOperation = 'print' | 'endprog'
export type Operation = Operator | GotoOperation | FuncOperation | ArrayOperation | ExtraOperation
export interface Instruction {
  operation: Operation
  lhs: number
  rhs: number
  result: number
}

export type Scope = 'global' | 'local' | 'temporal' | 'constant'
export interface CompilationOutput {
  funcTable: FuncTable
  literalTable: LiteralTable
  quadruples: Instruction[]
}

export type LiteralTable = Record<string, number>
