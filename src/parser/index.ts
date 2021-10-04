import { CstParser, TokenType } from 'chevrotain'
import * as Lexer from '..'

class EzParser extends CstParser {
  constructor() {
    super(Lexer.tokens)
    this.performSelfAnalysis()
  }

  public page = this.RULE('page', () => {
    this.CONSUME(Lexer.Page)
    this.CONSUME(Lexer.Id)
    this.MANY({
      // Look ahead one token to see if render (our main method) is ahead
      GATE: () => this.LA(1).tokenType !== Lexer.Render,
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.func) },
          {
            ALT: () => this.SUBRULE(this.vars),
          },
        ])
      },
    })
    this.SUBRULE(this.render)
  })

  public vars = this.RULE('vars', () => {
    this.SUBRULE(this.type)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.OPTION(() => {
          this.CONSUME(Lexer.LBracket)
          this.CONSUME(Lexer.cInt)
          this.CONSUME(Lexer.RBracket)
        })
        this.OPTION1(() => {
          this.CONSUME1(Lexer.LBracket)
          this.CONSUME1(Lexer.cInt)
          this.CONSUME1(Lexer.RBracket)
        })
        this.OPTION2(() => {
          this.CONSUME(Lexer.Equals)
          this.OR([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.array) }])
        })
      },
      SEP: Lexer.Comma,
    })
  })

  public array = this.RULE('array', () => {
    this.CONSUME1(Lexer.LBracket)
    this.AT_LEAST_ONE_SEP({
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
    this.CONSUME1(Lexer.RBracket)
  })

  public func = this.RULE('func', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.type) }, { ALT: () => this.CONSUME(Lexer.Void) }])
    this.CONSUME(Lexer.Id)
    this.CONSUME(Lexer.OParentheses)
    this.OPTION(() => this.SUBRULE(this.params))
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
  })

  public block = this.RULE('block', () => {
    this.CONSUME(Lexer.LCurly)
    this.AT_LEAST_ONE(() => this.SUBRULE(this.statement))
    this.CONSUME(Lexer.RCurly)
  })

  public params = this.RULE('params', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.SUBRULE(this.type)
        this.CONSUME(Lexer.Id)
      },
    })
  })

  public type = this.RULE('type', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Lexer.Int)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.Float)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.Char)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.Bool)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.StringType)
        },
      },
    ])
  })

  public statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.vars) },
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
  public constantVar = this.RULE('constantVar', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Lexer.cInt)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.cFloat)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.cString)
        },
      },
      {
        ALT: () => {
          this.CONSUME(Lexer.cBool)
        },
      },
    ])
  })

  // table(someId: someId)
  //
  public variable = this.RULE('variable', () => {
    this.CONSUME(Lexer.Id)
    this.OPTION(() => {
      this.CONSUME(Lexer.LBracket)
      this.SUBRULE(this.baseExp)
      this.CONSUME(Lexer.RBracket)
    })
    this.OPTION1(() => {
      this.CONSUME1(Lexer.LBracket)
      this.SUBRULE1(this.baseExp)
      this.CONSUME1(Lexer.RBracket)
    })
  })

  public assignment = this.RULE('assignment', () => {
    this.SUBRULE(this.variable)
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.baseExp)
  })

  public baseExp = this.RULE('baseExp', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Lexer.OR,
      DEF: () => {
        this.SUBRULE(this.andExp)
      },
    })
  })

  public andExp = this.RULE('andExp', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Lexer.AND,
      DEF: () => {
        this.SUBRULE(this.equalityExp)
      },
    })
  })

  public equalityExp = this.RULE('equalityExp', () => {
    this.SUBRULE(this.comparisonExp)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.IsEqual) }, { ALT: () => this.CONSUME(Lexer.IsNotEqual) }])
      this.SUBRULE1(this.comparisonExp)
    })
  })

  public comparisonExp = this.RULE('comparisonExp', () => {
    this.SUBRULE(this.plusminusExp)
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Lexer.GT) },
        { ALT: () => this.CONSUME(Lexer.LT) },
        { ALT: () => this.CONSUME(Lexer.GTE) },
        { ALT: () => this.CONSUME(Lexer.LTE) },
      ])
      this.SUBRULE1(this.plusminusExp)
    })
  })

  public plusminusExp = this.RULE('plusminusExp', () => {
    this.SUBRULE(this.termExp)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.Plus) }, { ALT: () => this.CONSUME(Lexer.Minus) }])
      this.SUBRULE(this.plusminusExp)
    })
  })

  public termExp = this.RULE('termExp', () => {
    this.SUBRULE(this.factorExp)
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(Lexer.Times) }, { ALT: () => this.CONSUME(Lexer.Divide) }])
      this.SUBRULE(this.termExp)
    })
  })

  public factorExp = this.RULE('factorExp', () => {
    this.OPTION(() => this.CONSUME(Lexer.Minus))
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Lexer.OParentheses)
          this.SUBRULE(this.baseExp)
          this.CONSUME(Lexer.CParentheses)
        },
      },
      { ALT: () => this.SUBRULE(this.constantVar) },
      { ALT: () => this.SUBRULE(this.funcCall) },
      { ALT: () => this.SUBRULE(this.variable) },
    ])
  })

  public funcCall = this.RULE('funcCall', () => {
    this.CONSUME(Lexer.Id)
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.SUBRULE(this.baseExp)
      },
    })
    this.CONSUME(Lexer.CParentheses)
  })

  public ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(Lexer.If)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.baseExp)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
    this.OPTION(() => {
      this.CONSUME(Lexer.Else)
      this.SUBRULE1(this.block)
    })
  })

  public whileLoop = this.RULE('whileLoop', () => {
    this.CONSUME(Lexer.While)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.baseExp)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
  })

  public forLoop = this.RULE('forLoop', () => {
    this.CONSUME(Lexer.For)
    this.CONSUME(Lexer.OParentheses)
    this.CONSUME(Lexer.Id)
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.baseExp)
    this.CONSUME(Lexer.To)
    this.SUBRULE1(this.baseExp)
    this.OPTION(() => {
      this.CONSUME(Lexer.Step)
      this.SUBRULE2(this.baseExp)
    })
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.block)
  })

  public return = this.RULE('return', () => {
    this.CONSUME(Lexer.Return)
    this.OPTION(() => this.SUBRULE(this.baseExp))
  })

  public print = this.RULE('print', () => {
    this.CONSUME(Lexer.Print)
    this.CONSUME(Lexer.OParentheses)
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVar) }])
      },
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
      {
        ALT: () => {
          this.SUBRULE(this.container)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.heading)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.paragraph)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.table)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.image)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.card)
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.layout)
        },
      },
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
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
        this.OR1([{ ALT: () => this.SUBRULE(this.constantVar) }, { ALT: () => this.SUBRULE(this.variable) }])
      },
      SEP: Lexer.Comma,
    })
  })
}

export default EzParser
