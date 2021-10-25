// General Types
export type NonVoidType = 'string' | 'float' | 'int' | 'bool'
export type Type = 'void' | NonVoidType
export type TypeError = 'Type Error'
export type Kind = 'array' | 'matrix'

// ! Variable Directory Types
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
  type: NonVoidType
  kind?: Kind
  addr: number
}
export type VarTable = Record<string, VarTableEntry>

// ! Semantic Cube
export type Operator = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '&&' | '||' | '='
// * To store operator / operands relationship
// General structure:
// <type> <operator> <type> = <type>
export type OperatorRecord = Record<NonVoidType, Record<NonVoidType, NonVoidType | TypeError>>
export type SemanticCube = Record<Operator, OperatorRecord>

// Stores a tuple of (address, type)
export type OperandStackItem = [string, NonVoidType]
export type JumpOperation = 'goto' | 'gotoF' | 'gotoT'
export type Operation = Operator | JumpOperation | 'print'
export interface Instruction {
  operation: Operation
  lhs?: string
  rhs?: string
  result: string
}

export type LiteralTable = Record<string, number>
