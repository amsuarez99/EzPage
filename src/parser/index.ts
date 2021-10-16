import { CstParser } from 'chevrotain'
import { FuncTable, FuncTableValue, Kind, NonVoidType, Type, VarTable } from '../semantics/types'
import * as Lexer from '..'

class EzParser extends CstParser {
  funcTable: FuncTable = {}
  pageName!: string
  addressCounter = 0

  constructor() {
    super(Lexer.tokens)
    this.performSelfAnalysis()
  }

  public page = this.RULE('page', () => {
    this.CONSUME(Lexer.Page)
    const { image: pageName } = this.CONSUME(Lexer.Id)

    // get the name of the page and initialize Our global scope
    this.pageName = pageName
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
    // Setup Global Scope
    // Use existing entry or create a new one
    const globalEntry = (this.funcTable['global'] = this.funcTable['global'] || {})
    // Use existing entry or create a new one
    const varTable: VarTable = (globalEntry.varsTable = globalEntry.varsTable || {})

    const type = this.SUBRULE(this.type) as unknown as NonVoidType
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        const { image: varName } = this.CONSUME(Lexer.Id)
        let kind: Kind | undefined
        // Optional indexing
        this.OPTION(() => {
          this.SUBRULE(this.constantArrayIndexation)
          kind = 'array'
        })
        this.OPTION1(() => {
          this.SUBRULE1(this.constantArrayIndexation)
          kind = 'matrix'
        })

        // Optional Initialization
        this.OPTION2(() => {
          this.CONSUME(Lexer.Equals)
          this.OR([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.constantArray) }])
        })

        // Create an entry for a unique identifier
        if (varTable[varName]) throw new Error('Duplicate Identifier')
        varTable[varName] = {
          type,
          kind,
          addr: this.addressCounter++,
        }
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
    this.CONSUME1(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.literal) }])
      },
      SEP: Lexer.Comma,
    })
    this.CONSUME1(Lexer.RBracket)
  })

  public array = this.RULE('array', () => {
    this.CONSUME1(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
    this.CONSUME1(Lexer.RBracket)
  })

  public func = this.RULE('func', () => {
    const funcType = this.OR([
      { ALT: () => this.SUBRULE(this.type) },
      { ALT: () => this.CONSUME(Lexer.Void) },
    ]) as unknown as Type
    const { image: funcName } = this.CONSUME(Lexer.Id)

    // get or create existing func entry
    if (this.funcTable[funcName]) throw new Error('Duplicate Identifier')
    // create an empty entry
    this.funcTable[funcName] = {
      type: funcType,
    }
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.params, { ARGS: [funcName] }))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block, { ARGS: [funcName] })
    console.log(this.funcTable[funcName])
    delete this.funcTable[funcName]
  })

  public block = this.RULE('block', (funcName: string) => {
    this.CONSUME(Lexer.LCurly)
    this.AT_LEAST_ONE(() => this.SUBRULE(this.statement, { ARGS: [funcName] }))
    this.CONSUME(Lexer.RCurly)
  })

  public params = this.RULE('params', () => {
    const tableEntries: VarTable = {}
    const args: Type[] = []
    this.AT_LEAST_ONE_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        const argType = this.SUBRULE(this.type) as unknown as NonVoidType
        const { image: argName } = this.CONSUME(Lexer.Id)
        if (tableEntries[argName]) throw new Error('Duplicate Identifier')
        tableEntries[argName] = {
          type: argType,
          addr: this.addressCounter++,
        }
        args.push(argType)
      },
    })
    return { args, tableEntries }
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
    return image
  })

  public localVariables = this.RULE('localVariables', () => {
    this.SUBRULE(this.type)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.OPTION(() => this.SUBRULE(this.arrayIndexation))
        this.OPTION1(() => this.SUBRULE1(this.arrayIndexation))
        this.OPTION2(() => {
          this.CONSUME(Lexer.Equals)
          this.OR([{ ALT: () => this.SUBRULE(this.literal) }, { ALT: () => this.SUBRULE(this.array) }])
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

  // ? Renombrar a constante
  // TODO: CREO QUE FALTA CONSTANTE CHAR
  public literal = this.RULE('literal', () => {
    this.OR([
      { ALT: () => this.CONSUME(Lexer.IntLiteral) },
      { ALT: () => this.CONSUME(Lexer.FloatLiteral) },
      { ALT: () => this.CONSUME(Lexer.StringLiteral) },
      { ALT: () => this.CONSUME(Lexer.BoolLiteral) },
    ])
  })

  public arrayIndexation = this.RULE('arrayIndexation', () => {
    this.CONSUME(Lexer.LBracket)
    this.SUBRULE(this.expression)
    this.CONSUME(Lexer.RBracket)
  })

  public variable = this.RULE('variable', () => {
    this.CONSUME(Lexer.Id)
    this.OPTION(() => this.SUBRULE(this.arrayIndexation))
    this.OPTION1(() => this.SUBRULE1(this.arrayIndexation))
  })

  public assignment = this.RULE('assignment', () => {
    this.SUBRULE(this.variable)
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.expression)
  })

  public expression = this.RULE('expression', () => {
    this.SUBRULE(this.andExp)
    this.OPTION(() => {
      this.CONSUME(Lexer.OR)
      this.SUBRULE1(this.andExp)
    })
  })

  public andExp = this.RULE('andExp', () => {
    this.SUBRULE(this.equalityExpression)
    this.OPTION(() => {
      this.CONSUME(Lexer.AND)
      this.SUBRULE1(this.equalityExpression)
    })
  })

  public equalityExpression = this.RULE('equalityExpression', () => {
    this.SUBRULE(this.comparisonExp)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.IsEqual) }, { ALT: () => this.CONSUME(Lexer.IsNotEqual) }])
      this.SUBRULE1(this.comparisonExp)
    })
  })

  public comparisonExp = this.RULE('comparisonExp', () => {
    this.SUBRULE(this.additiveExpression)
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Lexer.GT) },
        { ALT: () => this.CONSUME(Lexer.LT) },
        { ALT: () => this.CONSUME(Lexer.GTE) },
        { ALT: () => this.CONSUME(Lexer.LTE) },
      ])
      this.SUBRULE1(this.additiveExpression)
    })
  })

  public additiveExpression = this.RULE('additiveExpression', () => {
    this.SUBRULE(this.multiplicativeExpression)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.Plus) }, { ALT: () => this.CONSUME(Lexer.Minus) }])
      this.SUBRULE(this.additiveExpression)
    })
  })

  public multiplicativeExpression = this.RULE('multiplicativeExpression', () => {
    this.SUBRULE(this.atomicExpression)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.Times) }, { ALT: () => this.CONSUME(Lexer.Divide) }])
      this.SUBRULE(this.multiplicativeExpression)
    })
  })

  public parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.expression)
    this.CONSUME(Lexer.CParentheses)
  })

  public atomicExpression = this.RULE('atomicExpression', () => {
    this.OPTION(() => this.CONSUME(Lexer.Minus))
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
      { ALT: () => this.SUBRULE(this.literal) },
      { ALT: () => this.SUBRULE(this.funcCall) },
      { ALT: () => this.SUBRULE(this.variable) },
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
      DEF: () => this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.literal) }]),
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
