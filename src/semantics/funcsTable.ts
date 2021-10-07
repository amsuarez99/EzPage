import { Type } from './types'
import { VarTable } from './varsTable'

interface FuncTableValue {
    tipo: Type
    args: Type[]
    varsTable: VarTable
}

type FuncTable = Record<string, FuncTableValue>

export { FuncTable }