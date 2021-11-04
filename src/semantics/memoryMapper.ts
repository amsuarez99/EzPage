import { NonVoidType, Scope } from './types'


export default class MemoryMapper {
    memoryRanges: Record<Scope, Record<NonVoidType, Record<'min' | 'max' | 'curr', number>>>

    constructor() {
        this.memoryRanges = {
            global: {
                int: {
                    min: 0,
                    curr: 0,
                    max: 999,
                },
                float: {
                    min: 1000,
                    curr: 1000,
                    max: 1999
                },
                string: {
                    min: 2000,
                    curr: 2000,
                    max: 2999
                },
                bool: {
                    min: 3000,
                    curr: 3000,
                    max: 3999
                }
            },
            local: {
                int: {
                    min: 4000,
                    curr: 4000,
                    max: 4999,
                },
                float: {
                    min: 5000,
                    curr: 5000,
                    max: 5999
                },
                string: {
                    min: 6000,
                    curr: 6000,
                    max: 6999
                },
                bool: {
                    min: 7000,
                    curr: 7000,
                    max: 7999
                }
            },
            temporal: {
                int: {
                    min: 8000,
                    curr: 8000,
                    max: 8999
                },
                float: {
                    min: 9000,
                    curr: 9000,
                    max: 9999
                },
                string: {
                    min: 10000,
                    curr: 10000,
                    max: 10999
                },
                bool: {
                    min: 11000,
                    curr: 11000,
                    max: 11999
                }
            },
            constant: {
                int: {
                    min: 12000,
                    curr: 12000,
                    max: 12999
                },
                float: {
                    min: 13000,
                    curr: 13000,
                    max: 13999
                },
                string: {
                    min: 14000,
                    curr: 14000,
                    max: 14999
                },
                bool: {
                    min: 15000,
                    curr: 15000,
                    max: 15999
                }
            },
        }
    }

    getAddrFor(type: NonVoidType, scope: Scope) {
        const { max, curr } = this.memoryRanges[scope][type]
        if (curr >= max) throw new Error(`Out of memory for: scope ${scope}, type ${type}`)
        return this.memoryRanges[scope][type].curr++
    }

    getTypeOn(address: number) {
        if (address < 0 || address > 15999) {
            throw new Error(`Out of memory range for address: ${address}`)
        }
        if (address >= 12000) {
            //constant
            if (address >= 12000 && address <= 12999) {
                return { type: "int", scope: "constant" }
            } else if (address >= 13000 && address <= 1399) {
                return { type: "float", scope: "constant" }
            } else if (address >= 14000 && address <= 14999) {
                return { type: "string", scope: "constant" }
            } else {
                return { type: "bool", scope: "constant" }
            }
        } else if (address >= 8000 && address <= 11999) {
            //temporal
            if (address >= 8000 && address <= 8999) {
                return "temporal int"
                return { type: "int", scope: "temporal" }
            } else if (address >= 9000 && address <= 9999) {
                return { type: "float", scope: "temporal" }
            } else if (address >= 10000 && address <= 10999) {
                return { type: "string", scope: "temporal" }
            } else {
                return { type: "bool", scope: "temporal" }
            }
        } else if (address >= 4000 && address <= 7999) {
            //local
            if (address >= 4000 && address <= 4999) {
                return { type: "int", scope: "local" }
            } else if (address >= 5000 && address <= 5999) {
                return { type: "float", scope: "local" }
            } else if (address >= 6000 && address <= 6999) {
                return { type: "string", scope: "local" }
            } else {
                return { type: "bool", scope: "local" }
            }
        } else {
            // global
            if (address >= 0 && address <= 999) {
                return { type: "int", scope: "global" }
            } else if (address >= 1000 && address <= 1999) {
                return { type: "float", scope: "global" }
            } else if (address >= 2000 && address <= 2999) {
                return { type: "string", scope: "global" }
            } else {
                return { type: "bool", scope: "global" }
            }
        }
    }
}

// Memory Map
/*
------------------------------------
|        Global Variables          |
|----------------------------------|
| int                      |0      |
|                          |999    |
|----------------------------------|
| float                    |1000   |
|                          |1999   |
|----------------------------------|
| string                   |2000   |
|                          |2999   |
|----------------------------------|
| boolean                  |3000   |
|                          |3999   |
|----------------------------------|
|        Local Variables           |
|----------------------------------|
| int                      |4000   |
|                          |4999   |
|----------------------------------|
| float                    |5000   |
|                          |5999   |
|----------------------------------|
| string                   |6000   |
|                          |6999   |
|----------------------------------|
| boolean                  |7000   |
|                          |7999   |
|----------------------------------|
|        Temporal Variables        |
|----------------------------------|
| int                      |8000   |
|                          |8999   |
|----------------------------------|
| float                    |9000   |
|                          |9999   |
|----------------------------------|
| string                   |10000  |
|                          |10999  |
|----------------------------------|
| boolean                  |11000  |
|                          |11999  |
|----------------------------------|
|        Constant Variables        |
|----------------------------------|
| int                      |12000  |
|                          |12999  |
|----------------------------------|
| float                    |13000  |
|                          |13999  |
|----------------------------------|
| string                   |14000  |
|                          |14999  |
|----------------------------------|
| boolean                  |15000  |
|                          |15999  |
------------------------------------
*/