import { EzLexer, Id, StringLiteral, IntLiteral, FloatLiteral, BoolLiteral, tokensMap } from '.'

it('recognizes ids', () => {
  // Series of ids
  const input = 'Hello world these input will be recognized as inputs'
  const lexingRes = EzLexer.tokenize(input)
  lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(Id))
})

describe('recognizes constants', () => {
  it('recognizes strings', () => {
    const input = `"I am a string" "I'm a string too" "We are strings!" "Funky characters: ''''''$$$/"`
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(StringLiteral))
  })

  it('recognizes integers', () => {
    const input = `0 1 2 3 4 5 6 7 8 9 10 11 12 13 100000000000000000000`
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(IntLiteral))
  })

  it('recognizes floats', () => {
    const input = `1.1 2.2 3.3 4.4 5.5 6.6 7.7 8.989387 9.9 10.1000000000000000`
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(FloatLiteral))
  })

  it('recognizes booleans', () => {
    const input = `true false`
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(BoolLiteral))
  })
})

it('recognizes miscellaneous tokens', () => {
  const input = ':{}[](),'
  const lexingRes = EzLexer.tokenize(input)
  lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
})

it('recognizes operators', () => {
  const input = '*+-/= == != > >= < <= || &&'
  const lexingRes = EzLexer.tokenize(input)
  lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
})

describe('keywords', () => {
  it('structural keywords', () => {
    const input = 'if else print page for step to while'
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
  })

  it('recognizes type keywords', () => {
    const input = 'int float char bool string void'
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
  })
})

describe('special functions', () => {
  it('recognizes special function names', () => {
    const input = 'render container heading paragraph table image card layout'
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
  })

  it('recognizes paramTokens', () => {
    const input = 'text size position width background justify padding grid gap headerfooter data source'
    const lexingRes = EzLexer.tokenize(input)
    lexingRes.tokens.forEach((token) => expect(token.tokenType).toBe(tokensMap[token.image]))
  })
})
