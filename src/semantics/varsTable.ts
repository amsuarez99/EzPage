import { Type, Kind } from './types'
interface VarTableValue { type: Type, kind?: Kind, addr: string }
type VarTable = Record<string, VarTableValue>

// Example
const myVarTable: VarTable = {
    x: {
        type: 'void',
        kind: 'array',
        addr: '0'
    },
    y: {
        type: 'int',
        addr: '1'
    }
}

export { VarTable }