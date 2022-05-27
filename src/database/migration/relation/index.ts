export class Relation {
    fkField: string;
    pkTable: string;
    pkField: string;
    constructor({ fkField, pkTable, pkField } : { fkField : string, pkTable : string, pkField : string}) {
        this.fkField = fkField;
        this.pkTable = pkTable;
        this.pkField = pkField;
    }
}