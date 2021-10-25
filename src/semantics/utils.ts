import { GotoOperation, NonVoidType, Operation, Operator } from '.'

const isSimpleOperation = (operation: Operation): operation is Operator => {
  return !['gotoT', 'gotoF', 'goto', 'print'].includes(operation)
}

const isGotoOperation = (operation: Operation): operation is GotoOperation => {
  return ['gotoT', 'gotoF', 'goto'].includes(operation)
}

const isNumerical = (type: NonVoidType): type is 'int' | 'float' => {
  return ['int', 'float'].includes(type)
}

export { isSimpleOperation, isGotoOperation, isNumerical }

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
