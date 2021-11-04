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