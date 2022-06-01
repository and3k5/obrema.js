import { IParameterWriter, IQueryStringBuilder, Parameter } from "../base";

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


