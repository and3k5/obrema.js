export interface IQueryStringBuilder {
    toRawString() : string;
}

export interface IParameterWriter {
    getParameters() : Array<Parameter>;
}

export class ParameterProvider {
    count: number;
    constructor() {
        this.count = 0;
    }
    reserveParameterName(prefix  = "@") : string {
        const n = this.count++;
        return prefix + "p"+ n;
    }
}

export class Parameter {
    placeholderName: string;
    value: any;
    constructor(placeholderName: string, value: any) {
        this.placeholderName = placeholderName;
        this.value = value;
    }
}