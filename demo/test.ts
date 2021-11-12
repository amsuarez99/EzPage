import EzParser from '../src/parser'
import * as Lexer from '../src/lexer'
import fs from 'fs'
import path from 'path'

const parser = new EzParser()

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
  const data = fs.readFileSync(path.resolve(__dirname, '../inputs/modules.txt'), { encoding: 'utf-8' })
  parseInput(data)
} catch (err) {
  console.error(err)
}
