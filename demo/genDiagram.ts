import * as path from 'path'
import * as fs from 'fs'
import * as chevrotain from 'chevrotain'
import * as Lexer from '../src/lexer'
import EzParser from '../src/parser'

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

const p = genDiagram('page something')

// extract the serialized grammar.
const parserInstance = p.parseInstance
const serializedGrammar = parserInstance.getSerializedGastProductions()

// create the HTML Text
const htmlText = chevrotain.createSyntaxDiagramsCode(serializedGrammar)

// Write the HTML file to disk
const outPath = path.resolve(__dirname, '../diagrams/generated_diagram.html')
fs.writeFileSync(outPath, htmlText)
