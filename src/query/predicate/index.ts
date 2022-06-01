import { IParameterWriter, IQueryStringBuilder, Parameter, ParameterProvider } from "../base";
import { QueryField } from "../field";
const esprima = require("esprima");

export interface IPredicate extends IQueryStringBuilder, IParameterWriter {

}

export abstract class PredicateBase implements IPredicate {
    abstract toRawString(): string;
    abstract getParameters(): Parameter[];
}

export class Operator implements IQueryStringBuilder {
    type: string;
    constructor(type: string) {
        this.type = type;
    }
    toRawString(): string {
        switch (this.type) {
        case "and":
            return "AND";
        case "or":
            return "OR";
        default:
            throw new Error("Unknown type: " + this.type);
        }
    }

}

export class Literal implements IQueryStringBuilder, IParameterWriter {
    parameterName: string;
    value: any;

    constructor(parameterName : string, value: any) {
        this.parameterName = parameterName;
        this.value = value;
    }
    toRawString(): string {
        return this.parameterName;
    }
    getParameters(): Parameter[] {
        return [new Parameter(this.parameterName, this.value)];
    }

}

export class Comparer implements IQueryStringBuilder {
    type: string;
    constructor(type: string) {
        this.type = type;
    }
    toRawString(): string {
        switch (this.type) {
        case "eq":
            return "=";
        case "neq":
            return "!=";
        case "gt":
            return ">";
        case "gte":
            return ">=";
        case "lt":
            return "<";
        case "lte":
            return "<=";
        default:
            throw new Error("Unknown type: " + this.type);
        }
    }

}

export class Predicate extends PredicateBase {
    content: Array<IQueryStringBuilder>;
    constructor(content: Array<IQueryStringBuilder>) {
        super();
        this.content = content;
    }
    toRawString(): string {
        let result = "";
        let first = true;
        for (const item of this.content) {
            if (!first)
                result += " ";
            result += item.toRawString();
            first = false;
        }
        return result;
    }
    getParameters(): Parameter[] {
        const result: Parameter[] = [];
        for (const item of this.content) {
            appendToArray(result, item as unknown as IParameterWriter);
        }
        return result;
    }

}


export class ComparisonPredicate extends PredicateBase {
    left: IQueryStringBuilder;
    comparer: Comparer;
    right: IQueryStringBuilder;
    constructor(left: IQueryStringBuilder, comparer: Comparer, right: IQueryStringBuilder) {
        super();
        this.left = left;
        this.comparer = comparer;
        this.right = right;
    }

    toRawString(): string {
        return this.left.toRawString() + " " + this.comparer.toRawString() + " " + this.right.toRawString();
    }

    getParameters(): Parameter[] {
        const result: Parameter[] = [];
        appendToArray(result, this.left as any as IParameterWriter);
        appendToArray(result, this.comparer as any as IParameterWriter);
        appendToArray(result, this.right as any as IParameterWriter);
        return result;
    }
}

function appendToArray(array: Parameter[], writer: IParameterWriter) {
    if (writer == null)
        return;

    if (writer.getParameters == null)
        return;

    for (const parameter of writer.getParameters()) {
        array.push(parameter);
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function parsePredicateFromFunction(arg: Function, parameterProvider? : ParameterProvider): IPredicate {
    if (parameterProvider == null)
        parameterProvider = new ParameterProvider();
    const source = `(${arg.toString()})`;
    const script = esprima.parseScript(source);
    if (script.type !== "Program")
        throw new Error("Unexpected script type: " + script.type);
    const body = script.body;
    if (body.length !== 1)
        throw new Error("Invalid item count in body: " + script.type);
    const statement = body[0];
    if (statement.type !== "ExpressionStatement")
        throw new Error("Unexpected statement type: " + statement.type);
    const expression = statement.expression;
    if (expression.type !== "FunctionExpression")
        throw new Error("Unexpected expression type: " + expression.type);
    if (expression.async)
        throw new Error("Cannot use async methods");
    if (expression.generator)
        throw new Error("Cannot use generator methods");
    const expressionBody = expression.body;
    if (expressionBody.type !== "BlockStatement")
        throw new Error("Unsupported expressionBody type: " + expressionBody.type);

    if (expressionBody.body.length !== 1)
        throw new Error("BlockStatement should only have 1 item");

    const returnStatement = expressionBody.body[0];

    if (returnStatement.type != "ReturnStatement")
        throw new Error("Expected ReturnStatement but got " + returnStatement.type);

    const logicExpression = returnStatement.argument;

    return parseLogicExpression(logicExpression, parameterProvider);
}

function parseExpression(expression: any, parameterProvider : ParameterProvider): IPredicate | QueryField | Literal {
    if (expression.type === "LogicalExpression")
        return parseLogicExpression(expression, parameterProvider);
    if (expression.type === "BinaryExpression")
        return parseBinaryExpression(expression, parameterProvider);
    if (expression.type === "MemberExpression")
        return parseMemberExpression(expression, parameterProvider);
    if (expression.type === "Literal")
        return parseLiteral(expression, parameterProvider);
    throw new Error("Unknown Expression to handle: " + expression.type)
}

function parseLogicExpression(logicExpression: any, parameterProvider : ParameterProvider): IPredicate {
    if (logicExpression.type !== "LogicalExpression")
        throw new Error("Expected LogicalExpression but got " + logicExpression.type);
    let operator: Operator;
    switch (logicExpression.operator) {
    case "&&":
        operator = new Operator("and");
        break;
    case "||":
        operator = new Operator("or");
        break;
    default:
        throw new Error("Unhandled case operator: " + logicExpression.operator);

    }
    return new Predicate([
        parseExpression(logicExpression.left, parameterProvider),
        operator,
        parseExpression(logicExpression.right, parameterProvider)
    ]);
}

function parseBinaryExpression(binaryExpression: any, parameterProvider : ParameterProvider): IPredicate {
    if (binaryExpression.type !== "BinaryExpression")
        throw new Error("Expected BinaryExpression but got " + binaryExpression.type);
    let comparer: Comparer;
    switch (binaryExpression.operator) {
    case "==":
    case "===":
        comparer = new Comparer("eq");
        break;
    case "!=":
    case "!==":
        comparer = new Comparer("neq");
        break;
    case ">":
        comparer = new Comparer("gt");
        break;
    case ">=":
        comparer = new Comparer("gte");
        break;
    case "<":
        comparer = new Comparer("lt");
        break;
    case "<=":
        comparer = new Comparer("lte");
        break;
    default:
        throw new Error("Unhandled case operator: " + binaryExpression.operator);
    }

    return new ComparisonPredicate(parseExpression(binaryExpression.left, parameterProvider), comparer, parseExpression(binaryExpression.right, parameterProvider));
}

function parseMemberExpression(memberExpression: any, parameterProvider : ParameterProvider): QueryField {
    if (memberExpression.type !== "MemberExpression")
        throw new Error("Expected MemberExpression but got " + memberExpression.type);
    return new QueryField(memberExpression.property.name, "");
}

function parseLiteral(literal: any, parameterProvider: ParameterProvider): Literal {
    if (literal.type !== "Literal")
        throw new Error("Expected Literal but got " + literal.type);
    return new Literal(parameterProvider.reserveParameterName(), literal.value);
}

