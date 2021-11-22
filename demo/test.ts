import EzParser from '../src/parser'
import * as Lexer from '../src/lexer'
import fs from 'fs'
import path from 'path'
import MemoryMapper, { MemoryBuilder } from '../src/semantics/memoryMapper'
import VirtualMachine from '../src/vm/vm'

const memoryBuilder = new MemoryBuilder()
memoryBuilder.addMemorySegment('global', [
  { name: 'int', size: 1000 },
  { name: 'float', size: 1000 },
  { name: 'string', size: 1000 },
  { name: 'bool', size: 1000 },
  { name: 'pointer', size: 1000 },
])
memoryBuilder.addMemorySegment('local', [
  { name: 'int', size: 1000 },
  { name: 'float', size: 1000 },
  { name: 'string', size: 1000 },
  { name: 'bool', size: 1000 },
  { name: 'pointer', size: 1000 },
])
memoryBuilder.addMemorySegment('temporal', [
  { name: 'int', size: 1000 },
  { name: 'float', size: 1000 },
  { name: 'string', size: 1000 },
  { name: 'bool', size: 1000 },
  { name: 'pointer', size: 1000 },
])
memoryBuilder.addMemorySegment('constant', [
  { name: 'int', size: 1000 },
  { name: 'float', size: 1000 },
  { name: 'string', size: 1000 },
  { name: 'bool', size: 1000 },
  { name: 'pointer', size: 1000 },
])
const memoryMapper: MemoryMapper = memoryBuilder.getMemory()
const parser = new EzParser(memoryMapper)

function parseInput(text: string) {
  const lexingResult = Lexer.EzLexer.tokenize(text)
  // "input" is a setter which will reset the parser's state.

  parser.input = lexingResult.tokens
  const compilationOutput = parser.page()
  if (parser.errors.length > 0) throw new Error(parser.errors.toString())
  // memory mapper

  console.dir(compilationOutput, { depth: null })
  const virtualMachine = new VirtualMachine(compilationOutput, memoryMapper)

  virtualMachine.start()
}

try {
  // read contents of the file
  const data = fs.readFileSync(path.resolve(__dirname, '../inputs/arrays.txt'), { encoding: 'utf-8' })
  parseInput(data)
  console.log('Sucess! No errors!')
} catch (err) {
  console.error(err)
}
