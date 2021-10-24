import EzParser from './index'
import { EzLexer } from '../lexer/index'

it('Parser test', () => {
  const input = `page MyFirstMFPage 
    int something
    string something() {
      return "hello"
    }
    void render() {
      container() {
          heading(text: "hello")
      }
    }
`
  const parser = new EzParser()
  const lexingResult = EzLexer.tokenize(input)
  // "input" is a setter which will reset the parser's state.
  parser.input = lexingResult.tokens
  parser.page()

  if (parser.errors.length > 0) {
    throw new Error(parser.errors.toString())
  } else {
    console.log('SUCESS! No errors!')
  }
})

it.todo('Tests that varTable is deleted when end of function is reached')
