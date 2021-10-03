import { createToken, Lexer, TokenType } from 'chevrotain'

// TODO: Comments

// General Tokens
export const Id = createToken({ name: 'Id', pattern: /[a-zA-Z]\w*/ })

// Constants
// ? Is Char necessary for our language
export const cInt = createToken({ name: 'cInt', pattern: /\d+/ })
export const cFloat = createToken({ name: 'cFloat', pattern: /\d+\.\d+/ })
export const cString = createToken({ name: 'cString', pattern: /"(:?[^\\"]|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/ })
export const cBool = createToken({ name: 'cBool', pattern: /true|false/ })

// Misc
export const Colon = createToken({ name: 'Colon', pattern: /:/, label: ':' })
export const LCurly = createToken({ name: 'LCurly', pattern: /{/, label: '{' })
export const RCurly = createToken({ name: 'RCurly', pattern: /}/, label: '}' })
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/, label: '[' })
export const RBracket = createToken({ name: 'RBracket', pattern: /]/, label: ']' })
export const OParentheses = createToken({ name: 'OParentheses', pattern: /\(/, label: '(' })
export const CParentheses = createToken({ name: 'CParentheses', pattern: /\)/, label: ')' })
export const Comma = createToken({ name: 'Comma', pattern: /,/, label: ',' })
export const Return = createToken({ name: 'Return', pattern: /return/ })

// Operations
export const Times = createToken({ name: 'Times', pattern: /\*/, label: '*' })
export const Plus = createToken({ name: 'Plus', pattern: /\+/, label: '+' })
export const Minus = createToken({ name: 'Minus', pattern: /-/, label: '-' })
export const Divide = createToken({ name: 'Divide', pattern: /\//, label: '/' })
export const Equals = createToken({ name: 'Equals', pattern: /=/, label: '=' })

// Binary Operators
export const IsEqual = createToken({ name: 'IsEqual', pattern: /==/, label: '==' })
export const IsNotEqual = createToken({ name: 'IsNotEqual', pattern: /!=/, label: '!=' })
export const GT = createToken({ name: 'GT', pattern: />/, label: '>' })
export const GTE = createToken({ name: 'GTE', pattern: />=/, label: '>=' })
export const LT = createToken({ name: 'LT', pattern: /</, label: '<' })
export const LTE = createToken({ name: 'LTE', pattern: /<=/, label: '<=' })
export const OR = createToken({ name: 'OR', pattern: /\|\|/, label: '||' })
export const AND = createToken({ name: 'AND', pattern: /&&/, label: '&&' })

// Conditionals
export const If = createToken({ name: 'If', pattern: /if/ })
export const Else = createToken({ name: 'Else', pattern: /else/ })

export const Print = createToken({ name: 'Print', pattern: /print/ })
export const Page = createToken({ name: 'Page', pattern: /page/ })

// Repetition
export const For = createToken({ name: 'For', pattern: /for/ })
export const Step = createToken({ name: 'Step', pattern: /step/ })
export const To = createToken({ name: 'To', pattern: /to/ })
export const While = createToken({ name: 'While', pattern: /while/ })

// Types
export const Int = createToken({ name: 'Int', pattern: /int/ })
export const Float = createToken({ name: 'Float', pattern: /float/ })
export const Char = createToken({ name: 'Char', pattern: /char/ })
export const Bool = createToken({ name: 'Bool', pattern: /bool/ })
export const StringType = createToken({ name: 'StringType', pattern: /string/ })
export const Void = createToken({ name: 'Void', pattern: /void/ })

// Render Tokens
export const Render = createToken({ name: 'Render', pattern: /render/ })

// TODO: Define render params
// const RndrTokens = createToken({ name: "RndrTokens", pattern: /render/ })
export const Container = createToken({ name: 'Container', pattern: /container/ })
export const Heading = createToken({ name: 'Heading', pattern: /heading/ })
export const Paragraph = createToken({ name: 'Paragraph', pattern: /paragraph/ })
export const Table = createToken({ name: 'Table', pattern: /table/ })
export const Image = createToken({ name: 'Image', pattern: /image/ })
export const Card = createToken({ name: 'Card', pattern: /card/ })
export const Layout = createToken({ name: 'Layout', pattern: /layout/ })

export const Text = createToken({ name: 'Text', pattern: /text/, group: 'paramTokens' })
export const Size = createToken({ name: 'Size', pattern: /size/, group: 'paramTokens' })
export const Position = createToken({ name: 'Position', pattern: /position/, group: 'paramTokens' })
export const Width = createToken({ name: 'Width', pattern: /width/, group: 'paramTokens' })
export const Background = createToken({ name: 'Background', pattern: /background/, group: 'paramTokens' })
export const Justify = createToken({ name: 'Justify', pattern: /justify/, group: 'paramTokens' })
export const Padding = createToken({ name: 'Padding', pattern: /padding/, group: 'paramTokens' })
export const Grid = createToken({ name: 'Grid', pattern: /grid/, group: 'paramTokens' })
export const Gap = createToken({ name: 'Gap', pattern: /gap/, group: 'paramTokens' })
export const Header = createToken({ name: 'Header', pattern: /header/, group: 'paramTokens' })
export const Footer = createToken({ name: 'Footer', pattern: /footer/, group: 'paramTokens' })
export const Data = createToken({ name: 'Data', pattern: /data/, group: 'paramTokens' })
export const Source = createToken({ name: 'Source', pattern: /source/, group: 'paramTokens' })

const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

export const tokensMap: Record<string, TokenType> = {
  ',': Comma,
  to: To,
  ':': Colon,
  '{': LCurly,
  '}': RCurly,
  '[': LBracket,
  ']': RBracket,
  '(': OParentheses,
  ')': CParentheses,
  '*': Times,
  '+': Plus,
  '-': Minus,
  '/': Divide,
  '==': IsEqual,
  '=': Equals,
  '!=': IsNotEqual,
  '>=': GTE,
  '>': GT,
  '<=': LTE,
  '<': LT,
  '||': OR,
  '&&': AND,
  if: If,
  else: Else,
  print: Print,
  page: Page,
  for: For,
  step: Step,
  return: Return,
  while: While,
  int: Int,
  float: Float,
  char: Char,
  bool: Bool,
  string: StringType,
  void: Void,
  render: Render,
  container: Container,
  paragraph: Paragraph,
  heading: Heading,
  table: Table,
  image: Image,
  card: Card,
  layout: Layout,
  text: Text,
  position: Position,
  width: Width,
  background: Background,
  justify: Justify,
  padding: Padding,
  grid: Grid,
  gap: Gap,
  header: Header,
  footer: Footer,
  size: Size,
  data: Data,
  source: Source,
}

export const tokens = [
  WhiteSpace,
  Comma,
  To,
  cString,
  cFloat,
  cInt,
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
  Heading,
  Paragraph,
  Table,
  Image,
  Card,
  Layout,
  Text,
  Size,
  Position,
  Width,
  Background,
  Justify,
  Padding,
  Grid,
  Gap,
  Header,
  Footer,
  Data,
  Source,
  Id,
]

export const EzLexer = new Lexer(tokens)
