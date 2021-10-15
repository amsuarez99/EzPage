import EzParser from "../parser/index";
import { EzLexer } from "../lexer/index";

const lexer = EzLexer;
const parser = new EzParser();

// 
const BaseVisitor = parser.getBaseCstVisitorConstructor()
const BaseVisitorDefault = parser.getBaseCstVisitorConstructorWithDefaults()

let instructionList = [];

class EzVisitor extends BaseVisitor {
    constructor() {
        super()
        this.validateVisitor()
    }

    page(ctx: any) {
        console.log(ctx)
        instructionList.push("page -> " + ctx.Id[0].image)
        this.visit(ctx.globalVariables)
        this.visit(ctx.func)
        this.visit(ctx.rend)
    }

    constantArrayIndexation(ctx: any) {
        console.log("array", ctx)
        return ctx.IntLiteral[0].image
    }

    globalVariables(ctx: any) {
        console.log(ctx)
    }
    constantArray(ctx: any) {
        console.log(ctx)
    }
    array(ctx: any) {
        console.log(ctx)
    }
    func(ctx: any) {
        console.log(ctx)
    }
    block(ctx: any) {
        console.log(ctx)
    }
    params(ctx: any) {
        console.log(ctx)
    }
    type(ctx: any) {
        console.log(ctx)
    }
    localVariables(ctx: any) {
        console.log(ctx)
    }
    statement(ctx: any) {
        console.log(ctx)
    }
    literal(ctx: any) {
        console.log(ctx)
    }
    arrayIndexation(ctx: any) {
        console.log(ctx)
    }
    variable(ctx: any) {
        console.log(ctx)
    }
    assignment(ctx: any) {
        console.log(ctx)
    }
    expression(ctx: any) {
        console.log(ctx)
    }
    andExp(ctx: any) {
        console.log(ctx)
    }
    equalityExpression(ctx: any) {
        console.log(ctx)
    }
    comparisonExp(ctx: any) {
        console.log(ctx)
    }
    additiveExpression(ctx: any) {
        console.log(ctx)
    }
    multiplicativeExpression(ctx: any) {
        console.log(ctx)
    }
    parenthesizedExpression(ctx: any) {
        console.log(ctx)
    }
    atomicExpression(ctx: any) {
        console.log(ctx)
    }
    funcCall(ctx: any) {
        console.log(ctx)
    }
    ifStatement(ctx: any) {
        console.log(ctx)
    }
    whileLoop(ctx: any) {
        console.log(ctx)
    }
    forLoop(ctx: any) {
        console.log(ctx)
    }
    return(ctx: any) {
        console.log(ctx)
    }
    print(ctx: any) {
        console.log(ctx)
    }
    render(ctx: any) {
        console.log(ctx)
    }
    renderBlock(ctx: any) {
        console.log(ctx)
    }
    renderStatement(ctx: any) {
        console.log(ctx)
    }
    container(ctx: any) {
        console.log(ctx)
    }
    containerArgs(ctx: any) {
        console.log(ctx)
    }
    paragraph(ctx: any) {
        console.log(ctx)
    }
    paragraphArgs(ctx: any) {
        console.log(ctx)
    }
    heading(ctx: any) {
        console.log(ctx)
    }
    headingArgs(ctx: any) {
        console.log(ctx)
    }
    table(ctx: any) {
        console.log(ctx)
    }
    tableArgs(ctx: any) {
        console.log(ctx)
    }
    image(ctx: any) {
        console.log(ctx)
    }
    imageArgs(ctx: any) {
        console.log(ctx)
    }
    card(ctx: any) {
        console.log(ctx)
    }
    cardArgs(ctx: any) {
        console.log(ctx)
    }
    layout(ctx: any) {
        console.log(ctx)
    }
    layoutArgs(ctx: any) {
        console.log(ctx)
    }
}

const toAstVisitorInstance = new EzVisitor()

export function toAst(inputText: string) {
    // Lex
    const lexResult = EzLexer.tokenize(inputText)
    parser.input = lexResult.tokens

    // Automatic CST created when parsing
    const cst = parser.page()
    if (parser.errors.length > 0) {
        throw Error(
            "Sad sad panda, parsing errors detected!\n" +
            parser.errors[0].message
        )
    }

    // Visit
    const ast = toAstVisitorInstance.visit(cst)
    return ast
}
