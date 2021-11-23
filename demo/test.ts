import EzParser from '../src/parser'
import * as Lexer from '../src/lexer'
import fs from 'fs'
import path from 'path'
import MemoryMapper, { MemoryBuilder } from '../src/semantics/memoryMapper'
import VirtualMachine from '../src/vm/vm'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (prompt: string) => {
  return new Promise((resolve, reject) => {
    rl.question(prompt, resolve)
  })
}

const getSizes = async (scope: string) => {
  console.log(`Introduce los tamanos de memoria para la memoria ${scope}`)
  const intSize = (await question('Tamanos de memoria (int): ')) as string
  const floatSize = (await question('Tamanos de memoria (float) ')) as string
  const stringSize = (await question('Tamanos de memoria (string) ')) as string
  const boolSize = (await question('Tamanos de memoria (bool) ')) as string
  const pointerSize = (await question('Tamanos de memoria (pointer) ')) as string
  return [
    {
      name: 'int',
      size: parseInt(intSize),
    },
    {
      name: 'float',
      size: parseInt(floatSize),
    },
    {
      name: 'string',
      size: parseInt(stringSize),
    },
    {
      name: 'bool',
      size: parseInt(boolSize),
    },
    {
      name: 'pointer',
      size: parseInt(pointerSize),
    },
  ]
}

const memoryBuilder = new MemoryBuilder()
const buildMemory = async () => {
  let userInput
  do {
    userInput = await question('Quieres generar nuevos rangos de memoria (y/n)? ')
  } while (userInput !== 'y' && userInput !== 'n')

  const hasCustomMemory = userInput === 'y'
  const globalMemorySizes = hasCustomMemory
    ? await getSizes('global')
    : [
        { name: 'int', size: 1000 },
        { name: 'float', size: 1000 },
        { name: 'string', size: 1000 },
        { name: 'bool', size: 1000 },
        { name: 'pointer', size: 1000 },
      ]
  const localMemorySizes = hasCustomMemory
    ? await getSizes('local')
    : [
        { name: 'int', size: 1000 },
        { name: 'float', size: 1000 },
        { name: 'string', size: 1000 },
        { name: 'bool', size: 1000 },
        { name: 'pointer', size: 1000 },
      ]

  const temporalMemorySizes = hasCustomMemory
    ? await getSizes('temporal')
    : [
        { name: 'int', size: 1000 },
        { name: 'float', size: 1000 },
        { name: 'string', size: 1000 },
        { name: 'bool', size: 1000 },
        { name: 'pointer', size: 1000 },
      ]

  const constantMemorySizes = hasCustomMemory
    ? await getSizes('constant')
    : [
        { name: 'int', size: 1000 },
        { name: 'float', size: 1000 },
        { name: 'string', size: 1000 },
        { name: 'bool', size: 1000 },
        { name: 'pointer', size: 1000 },
      ]
  memoryBuilder.addMemorySegment('global', globalMemorySizes)
  memoryBuilder.addMemorySegment('local', localMemorySizes)
  memoryBuilder.addMemorySegment('temporal', temporalMemorySizes)
  memoryBuilder.addMemorySegment('constant', constantMemorySizes)
  return memoryBuilder.getMemory()
}

let memoryMapper: MemoryMapper

function parseInput(text: string) {
  const parser = new EzParser(memoryMapper)

  const lexingResult = Lexer.EzLexer.tokenize(text)
  parser.input = lexingResult.tokens
  const compilationOutput = parser.page()
  if (parser.errors.length > 0) throw new Error(parser.errors.toString())
  return compilationOutput
}

;(async () => {
  let fileName, data
  try {
    // read contents of the file
    memoryMapper = await buildMemory()
    fileName = await question('Introduce el nombre del archivo que quieres ejecutar\n')
    data = fs.readFileSync(path.resolve(__dirname, `../inputs/${fileName}.ez`), { encoding: 'utf-8' })
    const compilationOutput = parseInput(data)
    console.dir(compilationOutput, { depth: null })
    const virtualMachine = new VirtualMachine(compilationOutput, memoryMapper)
    virtualMachine.start()
  } catch (err) {
    console.error(err)
  }
  rl.close()
})()
