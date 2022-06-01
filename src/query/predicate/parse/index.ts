import { parseScript, Program } from "esprima";
import { ExpressionStatement, BlockStatement, LogicalExpression, Literal as LiteralExpr, MemberExpression, Expression, BinaryExpression, PrivateIdentifier } from "estree";
import { Comparer, ComparisonPredicate, IPredicate, Literal, Operator, Predicate } from "..";
import { ParameterProvider } from "../../base";
import { QueryField } from "../../field";

// eslint-disable-next-line @typescript-eslint/ban-types
export function parsePredicateFromFunction(arg: Function, parameterProvider? : ParameterProvider): IPredicate {
    if (parameterProvider == null)
        parameterProvider = new ParameterProvider();
    const source = `(${arg.toString()})`;
    const script = parseScript(source);
    if (script.type !== "Program")
        throw new Error("Unexpected script type: " + script.type);
    return parseProgram(script, parameterProvider);
}

function parseProgram(script : Program, parameterProvider: ParameterProvider) {
    const body = script.body;
    if (body.length !== 1)
        throw new Error("Invalid item count in body: " + script.type);
    const statement = body[0];
    if (statement.type !== "ExpressionStatement")
        throw new Error("Unexpected statement type: " + statement.type);
    return parseExpressionStatement(statement, parameterProvider);
}
function parseExpressionStatement(statement: ExpressionStatement, parameterProvider: ParameterProvider) {
    const expression = statement.expression;
    if (expression.type !== "FunctionExpression" && expression.type !== "ArrowFunctionExpression")
        throw new Error("Unexpected expression type: " + expression.type);
    if (expression.async)
        throw new Error("Cannot use async methods");
    if (expression.generator)
        throw new Error("Cannot use generator methods");
    const expressionBody = expression.body;
    if (expressionBody.type === "BlockStatement")
        return parseBlockStatement(expressionBody, parameterProvider);

    if (expressionBody.type === "LogicalExpression")
        return parseLogicExpression(expressionBody, parameterProvider);

    throw new Error("Unsupported expressionBody type: " + expressionBody.type);
}

function parseBlockStatement(expressionBody: BlockStatement, parameterProvider: ParameterProvider) {
    if (expressionBody.body.length !== 1)
        throw new Error("BlockStatement should only have 1 item");

    const returnStatement = expressionBody.body[0];

    if (returnStatement.type != "ReturnStatement")
        throw new Error("Expected ReturnStatement but got " + returnStatement.type);

    const logicExpression = returnStatement.argument;

    if (logicExpression == null)
        throw new Error("missing argument");

    if (logicExpression.type != "LogicalExpression")
        throw new Error("Expected LogicalExpression");

    return parseLogicExpression(logicExpression, parameterProvider);
}


function parseLogicExpression(logicExpression: LogicalExpression, parameterProvider : ParameterProvider): IPredicate {
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


function parseExpression(expression: Expression, parameterProvider : ParameterProvider): IPredicate | QueryField | Literal {
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

function parseBinaryExpression(binaryExpression: BinaryExpression, parameterProvider : ParameterProvider): IPredicate {
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

function parseMemberExpression(memberExpression: MemberExpression, parameterProvider : ParameterProvider): QueryField {
    if (memberExpression.type !== "MemberExpression")
        throw new Error("Expected MemberExpression but got " + memberExpression.type);
    return new QueryField((memberExpression.property as PrivateIdentifier).name, "");
}

function parseLiteral(literal: LiteralExpr, parameterProvider: ParameterProvider): Literal {
    if (literal.type !== "Literal")
        throw new Error("Expected Literal but got " + literal.type);
    return new Literal(parameterProvider.reserveParameterName(), literal.value);
}