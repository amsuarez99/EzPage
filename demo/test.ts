import EzParser from '../src/parser'
import * as Lexer from '../src/lexer'
import fs from 'fs'

const parser = new EzParser()

function genDiagram(text: string) {
  const lexResult = Lexer.EzLexer.tokenize(text)
  // setting a new input will RESET the parser instance's state.
  parser.input = lexResult.tokens
  // any top level rule may be used as an entry point
  const cst = parser.page()

  // this would be a TypeScript compilation error because our parser now has a clear API.
  // let value = parser.json_OopsTypo()

  return {
    // This is a pure grammar, the value will be undefined until we add embedded actions
    // or enable automatic CST creation.
    cst: cst,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors,
    parseInstance: parser,
  }
}

function parseInput(text: string) {
  const lexingResult = Lexer.EzLexer.tokenize(text)
  // "input" is a setter which will reset the parser's state.
  parser.input = lexingResult.tokens
  parser.page()

  if (parser.errors.length > 0) {
    throw new Error(parser.errors.toString())
  } else {
    console.log('Sucess! No errors!')
  }
}

try {
  // read contents of the file
  const data = fs.readFileSync('demo/inputs/normal.txt', { encoding: 'utf-8' })
  parseInput(data)
} catch (err) {
  console.error(err)
}

const p = genDiagram('test')
export default p
