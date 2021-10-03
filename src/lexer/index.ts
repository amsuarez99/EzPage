import { createToken, Lexer } from 'chevrotain'

// TODO: Comments

// General Tokens
export const Id = createToken({ name: 'Id', pattern: /[a-zA-Z]\w*/ })
export const Comma = createToken({ name: 'Comma', pattern: /,/, label: ',' })

// ? Is Char necessary for our language
export const cInt = createToken({ name: 'cInt', pattern: /0|[1|9]\d*/ })
export const cFloat = createToken({
  name: 'cFloat',
  pattern: /(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
  longer_alt: cInt,
})
export const cString = createToken({
  name: 'cString',
  pattern: /"(:?[^\\"]|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
})
export const cBool = createToken({
  name: 'cBool',
  pattern: /true|false/,
  longer_alt: Id,
})

// Blocks
export const Colon = createToken({ name: 'Colon', pattern: /:/, label: ':' })
export const LCurly = createToken({ name: 'LCurly', pattern: /{/, label: '{' })
export const RCurly = createToken({ name: 'RCurly', pattern: /}/, label: '}' })
export const LBracket = createToken({
  name: 'LBracket',
  pattern: /\[/,
  label: '[',
})
export const RBracket = createToken({
  name: 'RBracket',
  pattern: /]/,
  label: ']',
})
export const OParentheses = createToken({
  name: 'OParentheses',
  pattern: /\(/,
  label: '(',
})
export const CParentheses = createToken({
  name: 'CParentheses',
  pattern: /\)/,
  label: ')',
})

// Operations
export const Times = createToken({ name: 'Times', pattern: /\*/, label: '*' })
export const Plus = createToken({ name: 'Plus', pattern: /\+/, label: '+' })
export const Minus = createToken({ name: 'Minus', pattern: /-/, label: '-' })
export const Divide = createToken({
  name: 'Divide',
  pattern: /\//,
  label: '/',
})
export const Equals = createToken({ name: 'Equals', pattern: /=/, label: '=' })

// Binary Operators
export const IsEqual = createToken({ name: 'IsEqual', pattern: /==/ })
export const IsNotEqual = createToken({ name: 'IsNotEqual', pattern: /!=/ })
export const GT = createToken({ name: 'GT', pattern: />/ })
export const GTE = createToken({ name: 'GTE', pattern: />=/, longer_alt: GT })
export const LT = createToken({ name: 'LT', pattern: /</ })
export const LTE = createToken({ name: 'LTE', pattern: /<=/, longer_alt: LT })
export const OR = createToken({ name: 'OR', pattern: /\|\|/ })
export const AND = createToken({ name: 'AND', pattern: /&&/ })

// Conditionals
export const If = createToken({ name: 'If', pattern: /if/, longer_alt: Id })
export const Else = createToken({
  name: 'Else',
  pattern: /else/,
  longer_alt: Id,
})

export const Print = createToken({
  name: 'Print',
  pattern: /print/,
  longer_alt: Id,
})
export const Page = createToken({
  name: 'Page',
  pattern: /page/,
  longer_alt: Id,
})

// Repetition
export const For = createToken({ name: 'For', pattern: /for/, longer_alt: Id })
export const Step = createToken({
  name: 'Step',
  pattern: /step/,
  longer_alt: Id,
})
export const To = createToken({ name: 'To', pattern: /to/, longer_alt: Id })

export const Return = createToken({
  name: 'Return',
  pattern: /return/,
  longer_alt: Id,
})
export const While = createToken({
  name: 'While',
  pattern: /while/,
  longer_alt: Id,
})

// Types
export const Int = createToken({ name: 'Int', pattern: /int/ })
export const Float = createToken({
  name: 'Float',
  pattern: /float/,
  longer_alt: Id,
})
export const Char = createToken({
  name: 'Char',
  pattern: /char/,
  longer_alt: Id,
})
export const Bool = createToken({
  name: 'Bool',
  pattern: /bool/,
  longer_alt: Id,
})
export const StringType = createToken({
  name: 'StringType',
  pattern: /string/,
  longer_alt: Id,
})
export const Void = createToken({
  name: 'Void',
  pattern: /void/,
  longer_alt: Id,
})

// Render Tokens
export const Render = createToken({
  name: 'Render',
  pattern: /render/,
  longer_alt: Id,
})

// TODO: Define render params
// const RndrTokens = createToken({ name: "RndrTokens", pattern: /render/ })
export const Container = createToken({
  name: 'Container',
  pattern: /container/,
  longer_alt: Id,
})
export const CntrTokens = createToken({
  name: 'CntrTokens',
  pattern: /justify|background|width|position/,
  longer_alt: Id,
})
export const Header = createToken({ name: 'Header', pattern: /header/ })
export const HdrTokens = createToken({
  name: 'HdrTokens',
  pattern: /size|text/,
  longer_alt: Id,
})
export const Paragraph = createToken({
  name: 'Paragraph',
  pattern: /paragraph/,
  longer_alt: Id,
})
export const PgrphTokens = createToken({
  name: 'PgrphTokens',
  pattern: /text/,
  longer_alt: Id,
})
export const Table = createToken({ name: 'Table', pattern: /table/ })
export const TblTokens = createToken({
  name: 'TblTokens',
  pattern: /header|data/,
  longer_alt: Id,
})
export const Image = createToken({
  name: 'Image',
  pattern: /image/,
  longer_alt: Id,
})
export const ImgTokens = createToken({
  name: 'ImgTokens',
  pattern: /source/,
  longer_alt: Id,
})
export const Card = createToken({
  name: 'Card',
  pattern: /card/,
  longer_alt: Id,
})
export const CrdTokens = createToken({
  name: 'CrdTokens',
  pattern: /header|footer/,
  longer_alt: Id,
})
export const Layout = createToken({
  name: 'Layout',
  pattern: /layout/,
  longer_alt: Id,
})
export const LytTokens = createToken({
  name: 'LytTokens',
  pattern: /padding|grid|gap/,
  longer_alt: Id,
})

export const Func = createToken({
  name: 'Func',
  pattern: /func/,
  longer_alt: Id,
})

const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

export const tokens = [
  WhiteSpace,
  Func,
  Comma,
  cInt,
  cFloat,
  cString,
  cBool,
  Colon,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  OParentheses,
  CParentheses,
  Times,
  Plus,
  Minus,
  Divide,
  IsEqual,
  Equals,
  IsNotEqual,
  GTE,
  GT,
  LTE,
  LT,
  OR,
  AND,
  If,
  Else,
  Print,
  Page,
  For,
  Step,
  To,
  Return,
  While,
  Int,
  Float,
  Char,
  Bool,
  StringType,
  Void,
  Render,
  Container,
  CntrTokens,
  Header,
  PgrphTokens,
  HdrTokens,
  Paragraph,
  Table,
  TblTokens,
  Image,
  ImgTokens,
  Card,
  CrdTokens,
  Layout,
  LytTokens,
  Id,
]

export const LangLexer = new Lexer(tokens)
