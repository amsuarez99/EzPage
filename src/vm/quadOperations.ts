export const sum = (lhs: number, rhs: number) => {
  return lhs + rhs
}

export const subtraction = (lhs: number, rhs: number) => {
  return lhs - rhs
}

export const multiply = (lhs: number, rhs: number) => {
  return lhs * rhs
}

export const divide = (lhs: number, rhs: number) => {
  return lhs / rhs
}

export const greaterThan = (lhs: number, rhs: number) => {
  return lhs > rhs
}

export const lessThan = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs < rhs
}

// ==
export const isEqual = (lhs: any, rhs: any) => {
  return lhs == rhs
}

// =
export const equals = (lhs: any, res: any) => {}

export const notEqual = (lhs: any, rhs: any) => {
  return lhs != rhs
}

export const greaterOrEqual = (lhs: number, rhs: number) => {
  return lhs >= rhs
}

export const lessOrEqual = (lhs: number, rhs: number) => {
  return lhs <= rhs
}

export const andExp = (lhs: boolean, rhs: boolean) => {
  return lhs && rhs
}

export const orExp = (lhs: boolean, rhs: boolean) => {
  return lhs || rhs
}
