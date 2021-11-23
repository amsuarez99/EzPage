export const sum = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  if (typeof lhs === 'string' || typeof rhs === 'string') {
    let escapedLhs = lhs
    let escapedRhs = rhs
    if (typeof lhs === 'string') {
      escapedLhs = JSON.parse(lhs)
    }
    if (typeof rhs === 'string') {
      escapedRhs = JSON.parse(rhs)
    }

    return `"${escapedLhs}${escapedRhs}"`
  }
  return lhs + rhs
}

export const subtraction = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs - rhs
}

export const multiply = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs * rhs
}

export const divide = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs / rhs
}

export const greaterThan = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs > rhs
}

export const lessThan = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs < rhs
}

// ==
export const isEqual = (lhs: any, rhs: any) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs == rhs
}

// =

export const notEqual = (lhs: any, rhs: any) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs != rhs
}

export const greaterOrEqual = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs >= rhs
}

export const lessOrEqual = (lhs: number, rhs: number) => {
  if (lhs === undefined || rhs === undefined) throw new Error("Can't compare undefined values")
  return lhs <= rhs
}

export const andExp = (lhs: boolean, rhs: boolean) => {
  return lhs && rhs
}

export const orExp = (lhs: boolean, rhs: boolean) => {
  return lhs || rhs
}
