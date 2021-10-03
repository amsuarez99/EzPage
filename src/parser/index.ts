import { CstParser } from 'chevrotain'
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
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME1(Lexer.Id)
        this.OPTION(() => {
          this.OR([
            {
              ALT: () => {
                this.SUBRULE(this.simpleVars)
              },
            },
            {
              ALT: () => {
                this.SUBRULE(this.arrayVars)
              },
            },
          ])
        })
      },
    })
  })

  public simpleVars = this.RULE('simpleVars', () => {
    this.CONSUME(Lexer.Equals)
    this.SUBRULE(this.baseExp)
  })

  // TODO: Agregar soporte para matrices
  public arrayVars = this.RULE('arrayVars', () => {
    this.CONSUME(Lexer.LBracket)
    this.CONSUME(Lexer.cInt)
    this.CONSUME(Lexer.RBracket)
    this.OPTION(() => {
      this.CONSUME(Lexer.Equals)
      this.CONSUME1(Lexer.LBracket)
      this.AT_LEAST_ONE_SEP({
        SEP: Lexer.Comma,
        DEF: () => {
          this.SUBRULE(this.constantVars)
        },
      })
      this.CONSUME1(Lexer.RBracket)
    })
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
  public constantVars = this.RULE('constantVars', () => {
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

  // Lowest Prio
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

  // TODO: Checar negativos
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
      { ALT: () => this.SUBRULE(this.constantVars) },
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
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
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
          this.SUBRULE(this.header)
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
    this.SUBRULE(this.containerParams)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public containerParams = this.RULE('containerParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([
          {
            ALT: () => {
              this.SUBRULE(this.variable)
            },
          },
          {
            ALT: () => {
              this.SUBRULE(this.constantVars)
            },
          },
        ])
      },
    })
  })

  public paragraph = this.RULE('paragraph', () => {
    this.CONSUME(Lexer.Paragraph)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.paragraphParams)
    this.CONSUME(Lexer.CParentheses)
  })

  public paragraphParams = this.RULE('paragraphParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
      },
    })
  })

  public header = this.RULE('header', () => {
    this.CONSUME(Lexer.Header)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.headerParams)
    this.CONSUME(Lexer.CParentheses)
  })

  public headerParams = this.RULE('headerParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
      },
    })
  })

  public table = this.RULE('table', () => {
    this.CONSUME(Lexer.Table)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.tableParams)
    this.CONSUME(Lexer.CParentheses)
  })

  public tableParams = this.RULE('tableParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.SUBRULE(this.variable)
      },
    })
  })

  public image = this.RULE('image', () => {
    this.CONSUME(Lexer.Image)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.imageParams)
    this.CONSUME(Lexer.CParentheses)
  })

  public imageParams = this.RULE('imageParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
      },
    })
  })

  public card = this.RULE('card', () => {
    this.CONSUME(Lexer.Card)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.cardParams)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public cardParams = this.RULE('cardParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
      },
    })
  })

  public layout = this.RULE('layout', () => {
    this.CONSUME(Lexer.Layout)
    this.CONSUME(Lexer.OParentheses)
    this.SUBRULE(this.layoutParams)
    this.CONSUME(Lexer.CParentheses)
    this.SUBRULE(this.renderBlock)
  })

  public layoutParams = this.RULE('layoutParams', () => {
    this.MANY_SEP({
      SEP: Lexer.Comma,
      DEF: () => {
        this.CONSUME(Lexer.Id)
        this.CONSUME(Lexer.Colon)
        this.OR([{ ALT: () => this.SUBRULE(this.variable) }, { ALT: () => this.SUBRULE(this.constantVars) }])
      },
    })
  })
}

export default EzParser
