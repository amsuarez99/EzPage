import { EmbeddedActionsParser } from 'chevrotain'
import { Kind, NonVoidType, Type, SymbolTable, Operation } from '../semantics'
import * as Lexer from '..'
import { log } from '../logger'
import MemoryMapper from 'semantics/memoryMapper'

class EzParser extends EmbeddedActionsParser {
  pageName!: string
  symbolTable: SymbolTable

  constructor(memoryMapper: MemoryMapper) {
    super(Lexer.tokens)
    this.symbolTable = new SymbolTable(memoryMapper)
    this.performSelfAnalysis()
  }

  public page = this.RULE('page', () => {
    this.CONSUME(Lexer.Page)
    // get the name of the page and initialize
    const pageName = this.CONSUME(Lexer.Id).image
    this.ACTION(() => (this.pageName = pageName))
    this.ACTION(() => this.symbolTable.handleProgramStart())

    this.MANY({
      // Look ahead one token to see if render (our main method) is ahead
      GATE: () => this.LA(1).tokenType !== Lexer.Render,
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.func) }, { ALT: () => this.SUBRULE(this.globalVariables) }])
      },
    })

    this.SUBRULE(this.render)
    this.ACTION(() => this.symbolTable.handleProgramEnd())
    this.symbolTable.instructionList.forEach((instruction, idx) => log(idx, instruction))
    log(this.symbolTable.funcTable)
    log(this.symbolTable.literalTable)
    log(this.symbolTable.memoryMapper.memoryRanges)
    return {
      funcTable: this.symbolTable.funcTable,
      literalTable: this.symbolTable.literalTable,
      quadruples: this.symbolTable.instructionList,
    }
  })

  // global variables should be different because they have to be declared constantly
  public globalVariables = this.RULE('globalVariables', () => {
    const currentType = this.SUBRULE(this.type)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const varName = this.CONSUME(Lexer.Id).image
        let currentKind: Kind | undefined
        let dimensions: number[] = []
        // Optional indexing
        this.OPTION(() => {
          const d1 = this.SUBRULE(this.constantArrayIndexation)
          currentKind = 'array'
          this.ACTION(() => dimensions.push(d1))
        })

        this.OPTION1(() => {
          const d2 = this.SUBRULE1(this.constantArrayIndexation)
          currentKind = 'matrix'
          this.ACTION(() => dimensions.push(d2))
        })

        this.ACTION(() =>
          this.symbolTable.addVars({ name: varName, type: currentType, kind: currentKind, dim: dimensions }),
        )

        // Optional Initialization
        this.OPTION2(() => {
          this.ACTION(() => this.symbolTable.pushOperand(varName))
          const operator = this.CONSUME(Lexer.Equals).image as '='
          this.ACTION(() => this.symbolTable.pushOperator(operator))
          this.OR([
            {
              ALT: () => {
                const { value, type } = this.SUBRULE(this.literal)
                this.ACTION(() => this.symbolTable.pushLiteral(value, type))
              },
            },
            { ALT: () => this.SUBRULE(this.constantArray) },
          ])
          this.ACTION(() => this.symbolTable.doAssignmentOperation())
        })
      },
      SEP: Lexer.Comma,
    })
  })

  public constantArrayIndexation = this.RULE('constantArrayIndexation', () => {
    this.CONSUME(Lexer.LBracket)
    const index = this.CONSUME(Lexer.IntLiteral).image
    this.CONSUME(Lexer.RBracket)
    return parseInt(index)
  })

  public constantArray = this.RULE('constantArray', () => {
    // check that the id has dimensions
    this.CONSUME(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.literal) }])
      },
      SEP: Lexer.Comma,
    })
    this.CONSUME(Lexer.RBracket)
    // verify the amount of items in the array
    // array assignation (we should be given a temporal)
  })

  public array = this.RULE('array', () => {
    this.CONSUME(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => this.SUBRULE(this.expression),
      SEP: Lexer.Comma,
    })
    this.CONSUME(Lexer.RBracket)
  })

  public func = this.RULE('func', () => {
    const returnType = this.OR([
      { ALT: () => this.SUBRULE(this.type) },
      { ALT: () => this.CONSUME(Lexer.Void).image as Type },
    ])
    const funcName = this.CONSUME(Lexer.Id).image
    // registers the function
    this.ACTION(() => this.symbolTable.handleFuncRegistry(funcName, returnType))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.params))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
    this.ACTION(() => this.symbolTable.handleFuncEnd())
  })

  public block = this.RULE('block', (funcName: string) => {
    this.CONSUME(Lexer.LCurly)
    this.AT_LEAST_ONE(() => this.SUBRULE(this.statement, { ARGS: [funcName] }))
    this.CONSUME(Lexer.RCurly)
  })

  public params = this.RULE('params', () => {
    const params: { type: NonVoidType; name: string }[] = []
    this.AT_LEAST_ONE_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        const type = this.SUBRULE(this.type)
        const name = this.CONSUME(Lexer.Id).image
        params.push({ type, name })
      },
    })
    this.ACTION(() => this.symbolTable.addArgs(...params))
    this.ACTION(() => this.symbolTable.addVars(...params))
  })

  public type = this.RULE('type', () => {
    // We get the chosen type and return it
    const { image } = this.OR([
      { ALT: () => this.CONSUME(Lexer.Int) },
      { ALT: () => this.CONSUME(Lexer.Float) },
      { ALT: () => this.CONSUME(Lexer.Char) },
      { ALT: () => this.CONSUME(Lexer.Bool) },
      { ALT: () => this.CONSUME(Lexer.StringType) },
    ])
    return image as NonVoidType
  })

  public localVariables = this.RULE('localVariables', () => {
    const currentType = this.SUBRULE(this.type)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const varName = this.CONSUME(Lexer.Id).image
        let currentKind: Kind | undefined
        const dimensions: number[] = []
        this.OPTION(() => {
          const d1 = this.SUBRULE(this.constantArrayIndexation)
          currentKind = 'array'
          dimensions.push(d1)
        })
        this.OPTION1(() => {
          const d2 = this.SUBRULE1(this.constantArrayIndexation)
          currentKind = 'matrix'
          dimensions.push(d2)
        })

        this.ACTION(() =>
          this.symbolTable.addVars({ name: varName, kind: currentKind, type: currentType, dim: dimensions }),
        )

        this.OPTION2(() => {
          this.ACTION(() => this.symbolTable.pushOperand(varName))
          const operator = this.CONSUME(Lexer.Equals).image as '='
          this.ACTION(() => this.symbolTable.pushOperator(operator))
          this.OR([{ ALT: () => this.SUBRULE(this.expression) }, { ALT: () => this.SUBRULE(this.array) }])
          this.ACTION(() => this.symbolTable.doAssignmentOperation())
        })
      },
      SEP: Lexer.Comma,
    })
  })

  public statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.localVariables) },
      { ALT: () => this.SUBRULE(this.assignment) },
      { ALT: () => this.SUBRULE(this.funcCall) },
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.whileLoop) },
      { ALT: () => this.SUBRULE(this.forLoop) },
      { ALT: () => this.SUBRULE(this.return) },
      { ALT: () => this.SUBRULE(this.print) },
    ])
  })

  public literal = this.RULE('literal', () => {
    return this.OR([
      {
        ALT: () => {
          const value = this.CONSUME(Lexer.IntLiteral).image
          const type = 'int' as NonVoidType
          return { value, type }
        },
      },
      {
        ALT: () => {
          const value = this.CONSUME(Lexer.FloatLiteral).image
          const type = 'float' as NonVoidType
          return { value, type }
        },
      },
      {
        ALT: () => {
          const value = this.CONSUME(Lexer.StringLiteral).image
          const type = 'string' as NonVoidType
          return { value, type }
        },
      },
      {
        ALT: () => {
          const value = this.CONSUME(Lexer.BoolLiteral).image
          const type = 'bool' as NonVoidType
          return { value, type }
        },
      },
    ])
  })

  public arrayIndexation = this.RULE('arrayIndexation', () => {
    this.CONSUME(Lexer.LBracket)
    this.SUBRULE(this.expression)
    this.CONSUME(Lexer.RBracket)
  })

  public variable = this.RULE('variable', () => {
    const id = this.CONSUME(Lexer.Id).image
    let dimensions = 0
    this.ACTION(() => this.symbolTable.pushOperand(id))
    this.OPTION(() => {
      this.ACTION(() => this.symbolTable.prepareArrayAccess(id))
      this.SUBRULE(this.arrayIndexation)
      this.ACTION(() => this.symbolTable.verifyDimensionMatch(id, dimensions))
      this.ACTION(() => this.symbolTable.maybeCalcOffset(id, dimensions++))
    })
    this.OPTION1(() => {
      this.SUBRULE1(this.arrayIndexation)
      this.ACTION(() => this.symbolTable.verifyDimensionMatch(id, dimensions))
      this.ACTION(() => this.symbolTable.maybeCalcOffset(id, dimensions++))
    })

    this.ACTION(() => this.symbolTable.checkIfShouldBeIndexed(id, dimensions))
    this.ACTION(() => {
      if (dimensions) this.symbolTable.saveOffsetFnResult(id)
    })
    return id
  })

  public assignment = this.RULE('assignment', () => {
    this.SUBRULE(this.variable)
    const operator = this.CONSUME(Lexer.Equals).image as '='
    this.ACTION(() => this.symbolTable.pushOperator(operator))
    this.OR([{ ALT: () => this.SUBRULE(this.expression) }, { ALT: () => this.SUBRULE(this.array) }])
    this.ACTION(() => this.symbolTable.doAssignmentOperation())
  })

  public expression = this.RULE('expression', () => {
    this.SUBRULE(this.andExp)
    this.OPTION(() => {
      const operator = this.CONSUME(Lexer.OR).image as '||'
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE1(this.andExp)
      this.ACTION(() => this.symbolTable.doOperation())
    })
  })

  public andExp = this.RULE('andExp', () => {
    this.SUBRULE(this.equalityExpression)
    this.OPTION(() => {
      const operator = this.CONSUME(Lexer.AND).image as '&&'
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE1(this.equalityExpression)
      this.ACTION(() => this.symbolTable.doOperation())
    })
  })

  public equalityExpression = this.RULE('equalityExpression', () => {
    this.SUBRULE(this.comparisonExp)
    this.OPTION(() => {
      const operator = this.OR([
        { ALT: () => this.CONSUME(Lexer.IsEqual).image as '==' },
        { ALT: () => this.CONSUME(Lexer.IsNotEqual).image as '!=' },
      ])
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE1(this.comparisonExp)
      this.ACTION(() => this.symbolTable.doOperation())
    })
  })

  public comparisonExp = this.RULE('comparisonExp', () => {
    this.SUBRULE(this.additiveExpression)
    this.OPTION(() => {
      const operator = this.OR([
        { ALT: () => this.CONSUME(Lexer.GT).image as '>' },
        { ALT: () => this.CONSUME(Lexer.LT).image as '<' },
        { ALT: () => this.CONSUME(Lexer.GTE).image as '>=' },
        { ALT: () => this.CONSUME(Lexer.LTE).image as '<=' },
      ])
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE1(this.additiveExpression)
      this.ACTION(() => this.symbolTable.doOperation())
    })
  })

  public additiveExpression = this.RULE('additiveExpression', () => {
    this.SUBRULE(this.multiplicativeExpression)
    this.ACTION(() => this.symbolTable.maybeDoOperation('+', '-'))
    this.OPTION(() => {
      const operator = this.OR([
        { ALT: () => this.CONSUME(Lexer.Plus).image as '+' },
        { ALT: () => this.CONSUME(Lexer.Minus).image as '-' },
      ])
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE(this.additiveExpression)
    })
  })

  public multiplicativeExpression = this.RULE('multiplicativeExpression', () => {
    this.SUBRULE(this.atomicExpression)
    this.ACTION(() => this.symbolTable.maybeDoOperation('*', '/'))
    this.OPTION(() => {
      const operator = this.OR([
        { ALT: () => this.CONSUME(Lexer.Times).image as '*' },
        { ALT: () => this.CONSUME(Lexer.Divide).image as '/' },
      ])
      this.ACTION(() => this.symbolTable.pushOperator(operator))
      this.SUBRULE(this.multiplicativeExpression)
    })
  })

  public parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
    this.CONSUME(Lexer.OParentheses)
    this.ACTION(() => this.symbolTable.pushFakeFloor())
    this.SUBRULE(this.expression)
    this.ACTION(() => this.symbolTable.popFakeFloor())
    this.CONSUME(Lexer.CParentheses)
  })

  public atomicExpression = this.RULE('atomicExpression', () => {
    // const foundNegative = this.OPTION(() => !!this.CONSUME(Lexer.Minus).image) ?? false
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
      {
        ALT: () => {
          const { value, type } = this.SUBRULE(this.literal)
          this.ACTION(() => this.symbolTable.pushLiteral(value, type))
        },
      },
      {
        ALT: () => {
          this.ACTION(() => this.symbolTable.pushFakeFloor())
          this.SUBRULE(this.funcCall)
          this.ACTION(() => this.symbolTable.popFakeFloor())
        },
      },
      {
        ALT: () => this.SUBRULE(this.variable),
      },
    ])
  })

  public funcCall = this.RULE('funcCall', () => {
    const funcName = this.CONSUME(Lexer.Id).image
    this.ACTION(() => this.symbolTable.verifyFuncExistance(funcName))
    this.ACTION(() => this.symbolTable.handleEra(funcName))
    let k = 0
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.SUBRULE(this.expression)
        this.ACTION(() => this.symbolTable.processParam(funcName, k))
        this.ACTION(() => k++)
      },
    })
    this.CONSUME(Lexer.CParentheses)
    this.ACTION(() => this.symbolTable.verifySignatureCompletion(funcName, k))
    this.ACTION(() => this.symbolTable.genGosub(funcName))
  })

  public ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(Lexer.If)
    this.SUBRULE(this.parenthesizedExpression)
    this.ACTION(() => this.symbolTable.handleCondition())
    this.SUBRULE(this.renderBlock)
    this.OPTION(() => {
      this.CONSUME(Lexer.Else)
      this.ACTION(() => this.symbolTable.handleElseCondition())
      this.SUBRULE1(this.renderBlock)
    })
    this.ACTION(() => this.symbolTable.handleConditionEnd())
  })

  public whileLoop = this.RULE('whileLoop', () => {
    this.CONSUME(Lexer.While)
    this.ACTION(() => this.symbolTable.handleWhileStart())
    this.SUBRULE(this.parenthesizedExpression)
    this.ACTION(() => this.symbolTable.handleCondition())
    this.SUBRULE(this.renderBlock)
    this.ACTION(() => this.symbolTable.handleWhileEnd())
  })

  public forLoop = this.RULE('forLoop', () => {
    this.CONSUME(Lexer.For)
    this.CONSUME(Lexer.OParentheses)
    const id = this.CONSUME(Lexer.Id).image
    this.ACTION(() => this.symbolTable.storeControlVar(id))
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.expression)
    this.ACTION(() => this.symbolTable.handleControlAssignment())
    this.CONSUME(Lexer.To)
    this.SUBRULE1(this.expression)
    const stepDir = this.OPTION(() => {
      this.CONSUME(Lexer.Step)
      this.SUBRULE2(this.expression)
      return this.ACTION(() => this.symbolTable.storeStep())
    }) as number | undefined
    this.ACTION(() => this.symbolTable.handleControlCompare(id))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
    this.ACTION(() => this.symbolTable.handleForEnd(id, stepDir))
  })

  public return = this.RULE('return', () => {
    this.CONSUME(Lexer.Return)
    this.OPTION(() => this.SUBRULE(this.expression))
    this.ACTION(() => this.symbolTable.handleReturn())
  })

  public print = this.RULE('print', () => {
    this.CONSUME(Lexer.Print)
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.SUBRULE(this.expression)
        this.ACTION(() => this.symbolTable.handlePrint())
      },
    })
    this.CONSUME(Lexer.CParentheses)
  })

  public render = this.RULE('render', () => {
    this.CONSUME(Lexer.Void)
    this.CONSUME(Lexer.Render)
    this.CONSUME(Lexer.OParentheses)
    this.CONSUME(Lexer.CParentheses)
    this.ACTION(() => this.symbolTable.handleRenderRegistry())
    this.SUBRULE(this.renderBlock)
    this.ACTION(() => this.symbolTable.handleFuncEnd())
  })

  public renderBlock = this.RULE('renderBlock', () => {
    this.CONSUME(Lexer.LCurly)
    this.AT_LEAST_ONE(() => {
      this.OR([{ ALT: () => this.SUBRULE(this.statement) }, { ALT: () => this.SUBRULE(this.renderStatement) }])
    })
    this.CONSUME(Lexer.RCurly)
  })

  public renderStatement = this.RULE('renderStatement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.container) },
      { ALT: () => this.SUBRULE(this.heading) },
      { ALT: () => this.SUBRULE(this.paragraph) },
      { ALT: () => this.SUBRULE(this.table) },
      { ALT: () => this.SUBRULE(this.image) },
      { ALT: () => this.SUBRULE(this.card) },
      { ALT: () => this.SUBRULE(this.layout) },
    ])
  })
  // ! ID : 1
  public container = this.RULE('container', () => {
    this.CONSUME(Lexer.Container).image as Operation
    this.ACTION(() => this.symbolTable.handleRenderStatementStart(1))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.containerArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
    this.ACTION(() => {this.symbolTable.handleRenderStatementEnd(1)})
  })

  // ! ID : 1
  // ! width fluid, max, default
  // ! background : color
  public containerArgs = this.RULE('containerArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([
          { ALT: () => this.CONSUME(Lexer.Background) },
          { ALT: () => this.CONSUME(Lexer.Width) },
        ]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(1, ...args))
  })

  // ! ID : 2
  public paragraph = this.RULE('paragraph', () => {
    this.CONSUME(Lexer.Paragraph)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.paragraphArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  // ! ID : 2
  public paragraphArgs = this.RULE('paragraphArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([{ ALT: () => this.CONSUME(Lexer.Text) }]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(2, ...args))
  })

  // ! ID : 3
  public heading = this.RULE('heading', () => {
    this.CONSUME(Lexer.Heading)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.headingArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  // ! ID : 3
  public headingArgs = this.RULE('headingArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([{ ALT: () => this.CONSUME(Lexer.Size) }, { ALT: () => this.CONSUME(Lexer.Text) }]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(3, ...args))
  })

  // ! ID : 4
  public table = this.RULE('table', () => {
    this.CONSUME(Lexer.Table)
    this.ACTION(() => this.symbolTable.handleRenderStatementStart(4))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.tableArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  // ! ID : 4
  public tableArgs = this.RULE('tableArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([{ ALT: () => this.CONSUME(Lexer.Header) }, { ALT: () => this.CONSUME(Lexer.Data) }]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(4, ...args))
  })

  // ! ID : 5
  public image = this.RULE('image', () => {
    this.CONSUME(Lexer.Image)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.imageArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  // ! ID : 5
  public imageArgs = this.RULE('imageArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([{ ALT: () => this.CONSUME(Lexer.Source) }, { ALT: () => this.CONSUME(Lexer.Data) }]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(5, ...args))
  })

  // ! ID : 6
  public card = this.RULE('card', () => {
    this.CONSUME(Lexer.Card)
    this.ACTION(() => this.symbolTable.handleRenderStatementStart(6))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.cardArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  // ! ID : 6
  public cardArgs = this.RULE('cardArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([{ ALT: () => this.CONSUME(Lexer.Header) }, { ALT: () => this.CONSUME(Lexer.Footer) }]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(6, ...args))
  })

  // ! ID : 7
  public layout = this.RULE('layout', () => {
    this.CONSUME(Lexer.Layout)
    this.ACTION(() => this.symbolTable.handleRenderStatementStart(7))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.layoutArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  // ! ID : 7
  public layoutArgs = this.RULE('layoutArgs', () => {
    const args: { name: any, v: any }[] = []
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const name = this.OR([
          { ALT: () => this.CONSUME(Lexer.Padding) },
          { ALT: () => this.CONSUME(Lexer.Grid) },
          { ALT: () => this.CONSUME(Lexer.Gap) },
        ]).image
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.expression)
        const exprAddr = this.ACTION(() => this.symbolTable.handleRenderArg())
        args.push({ name, v:exprAddr })
      },
      SEP: Lexer.Comma,
    })
    this.ACTION(() => this.symbolTable.handleRenderArgs(7, ...args))
  })
}

export default EzParser
