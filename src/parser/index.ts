import { EmbeddedActionsParser } from 'chevrotain'
import { Kind, NonVoidType, Type, SymbolTable } from '../semantics'
import * as Lexer from '..'

class EzParser extends EmbeddedActionsParser {
  pageName!: string
  symbolTable: SymbolTable

  constructor() {
    super(Lexer.tokens)
    this.symbolTable = new SymbolTable()
    this.performSelfAnalysis()
  }

  public page = this.RULE('page', () => {
    this.CONSUME(Lexer.Page)
    // get the name of the page and initialize
    const pageName = this.CONSUME(Lexer.Id).image
    this.ACTION(() => (this.pageName = pageName))

    this.MANY({
      // Look ahead one token to see if render (our main method) is ahead
      GATE: () => this.LA(1).tokenType !== Lexer.Render,
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.func) }, { ALT: () => this.SUBRULE(this.globalVariables) }])
      },
    })
    this.SUBRULE(this.render)
  })

  // global variables should be different because they have to be declared constantly
  public globalVariables = this.RULE('globalVariables', () => {
    const currentType = this.SUBRULE(this.type)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const varName = this.CONSUME(Lexer.Id).image
        let currentKind: Kind | undefined
        // Optional indexing
        this.OPTION(() => {
          this.SUBRULE(this.constantArrayIndexation)
          currentKind = 'array'
        })

        this.OPTION1(() => {
          this.SUBRULE1(this.constantArrayIndexation)
          currentKind = 'matrix'
        })

        this.ACTION(() => this.symbolTable.addVars({ name: varName, type: currentType, kind: currentKind }))

        // Optional Initialization
        this.OPTION2(() => {
          this.CONSUME(Lexer.Equals)
          this.OR([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.constantArray) }])
        })
      },
      SEP: Lexer.Comma,
    })
  })

  public constantArrayIndexation = this.RULE('constantArrayIndexation', () => {
    this.CONSUME(Lexer.LBracket)
    this.CONSUME(Lexer.IntLiteral)
    this.CONSUME(Lexer.RBracket)
  })

  public constantArray = this.RULE('constantArray', () => {
    this.CONSUME(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.literal) }])
      },
      SEP: Lexer.Comma,
    })
    this.CONSUME(Lexer.RBracket)
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
    // there can't be two functions that are the same
    this.ACTION(() => this.symbolTable.addFunc(funcName, returnType))
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.params))

    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
    this.ACTION(() => this.symbolTable.deleteVarsTable())
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
        this.OPTION(() => {
          this.SUBRULE(this.arrayIndexation)
          currentKind = 'array'
        })
        this.OPTION1(() => {
          this.SUBRULE1(this.arrayIndexation)
          currentKind = 'matrix'
        })

        this.ACTION(() => this.symbolTable.addVars({ name: varName, kind: currentKind, type: currentType }))
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
    this.OPTION(() => this.SUBRULE(this.arrayIndexation))
    this.OPTION1(() => this.SUBRULE1(this.arrayIndexation))
    return id
  })

  public assignment = this.RULE('assignment', () => {
    const id = this.SUBRULE(this.variable)
    this.ACTION(() => this.symbolTable.pushOperand(id))
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
    this.OPTION(() => this.CONSUME(Lexer.Minus))
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
      {
        ALT: () => {
          const { value, type } = this.SUBRULE(this.literal)
          this.ACTION(() => this.symbolTable.pushLiteral(value, type))
        },
      },
      { ALT: () => this.SUBRULE(this.funcCall) },
      {
        ALT: () => {
          const id = this.SUBRULE(this.variable)
          this.ACTION(() => this.symbolTable.pushOperand(id))
        },
      },
    ])
  })

  public funcCall = this.RULE('funcCall', () => {
    this.CONSUME(Lexer.Id)
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => this.SUBRULE(this.expression),
    })
    this.CONSUME(Lexer.CParentheses)
  })

  public ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(Lexer.If)
    this.SUBRULE(this.parenthesizedExpression)
    this.ACTION(() => this.symbolTable.addPendingJump())
    this.SUBRULE(this.block)
    this.OPTION(() => {
      this.CONSUME(Lexer.Else)
      this.SUBRULE1(this.block)
    })
  })

  public whileLoop = this.RULE('whileLoop', () => {
    this.CONSUME(Lexer.While)
    this.SUBRULE(this.parenthesizedExpression)
    this.SUBRULE(this.block)
  })

  public forLoop = this.RULE('forLoop', () => {
    this.CONSUME(Lexer.For)
    this.CONSUME(Lexer.OParentheses)
    this.CONSUME(Lexer.Id)
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.expression)
    this.CONSUME(Lexer.To)
    this.SUBRULE1(this.expression)
    this.OPTION(() => {
      this.CONSUME(Lexer.Step)
      this.SUBRULE2(this.expression)
    })
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
  })

  public return = this.RULE('return', () => {
    this.CONSUME(Lexer.Return)
    this.OPTION(() => this.SUBRULE(this.expression))
  })

  public print = this.RULE('print', () => {
    this.CONSUME(Lexer.Print)
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => this.SUBRULE(this.expression),
    })
    this.CONSUME(Lexer.CParentheses)
  })

  public render = this.RULE('render', () => {
    this.CONSUME(Lexer.Void)
    this.CONSUME(Lexer.Render)
    this.CONSUME(Lexer.OParentheses)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
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

  public container = this.RULE('container', () => {
    this.CONSUME(Lexer.Container)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.containerArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public containerArgs = this.RULE('containerArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([
          { ALT: () => this.CONSUME(Lexer.Justify) },
          { ALT: () => this.CONSUME(Lexer.Background) },
          { ALT: () => this.CONSUME(Lexer.Width) },
          { ALT: () => this.CONSUME(Lexer.Position) },
        ])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public paragraph = this.RULE('paragraph', () => {
    this.CONSUME(Lexer.Paragraph)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.paragraphArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  public paragraphArgs = this.RULE('paragraphArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.CONSUME(Lexer.Text) }])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public heading = this.RULE('heading', () => {
    this.CONSUME(Lexer.Heading)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.headingArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  public headingArgs = this.RULE('headingArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.CONSUME(Lexer.Size) }, { ALT: () => this.CONSUME(Lexer.Text) }])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public table = this.RULE('table', () => {
    this.CONSUME(Lexer.Table)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.tableArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  public tableArgs = this.RULE('tableArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.CONSUME(Lexer.Header) }, { ALT: () => this.CONSUME(Lexer.Data) }])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public image = this.RULE('image', () => {
    this.CONSUME(Lexer.Image)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.imageArgs))
    this.CONSUME(Lexer.CParentheses)
  })

  public imageArgs = this.RULE('imageArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.CONSUME(Lexer.Source) }, { ALT: () => this.CONSUME(Lexer.Data) }])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public card = this.RULE('card', () => {
    this.CONSUME(Lexer.Card)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.cardArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public cardArgs = this.RULE('cardArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.CONSUME(Lexer.Header) }, { ALT: () => this.CONSUME(Lexer.Footer) }])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })

  public layout = this.RULE('layout', () => {
    this.CONSUME(Lexer.Layout)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.layoutArgs))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public layoutArgs = this.RULE('layoutArgs', () => {
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([
          { ALT: () => this.CONSUME(Lexer.Padding) },
          { ALT: () => this.CONSUME(Lexer.Grid) },
          { ALT: () => this.CONSUME(Lexer.Gap) },
        ])
        this.CONSUME(Lexer.Colon)
        this.OR1([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })
}

export default EzParser
