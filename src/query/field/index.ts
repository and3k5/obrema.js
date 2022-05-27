import { IQueryStringBuilder } from "../base";

export class Field implements IQueryStringBuilder {
    name: string;
    objectAlias: string;
    constructor(name : string, objectAlias : string) {
        this.name = name;
        this.objectAlias = objectAlias;
    }

    toRawString(): string {
        let output = "";
        if (this.objectAlias != null && this.objectAlias != "")
            output += `[${this.objectAlias}].`;
        output += `[${this.name}]`;
        return output;
    }
}