import { DataContext } from "../../communication/data-context/sqlite";
import { MigrationField } from "./field";
import { Relation } from "./relation";

export class Migration {
    id: string;
    operations : Array<MigrationOperation>;
    constructor(id : string) {
        this.id = id;
        this.operations = [];
    }

    createTable(tableName: string, fields: Array<MigrationField>, relations?: Array<Relation>) : Migration {
        this.operations.push(new TableCreation(tableName, fields, relations));
        return this;
    }

    run(dataContext : DataContext) {
        for (const operation of this.operations) {
            operation.doAction(dataContext);
        }
    }
}

export abstract class MigrationOperation {
    abstract doAction(dataContext : DataContext) : void;
}

export class TableCreation extends MigrationOperation {
    tableName: string;
    fields: MigrationField[];
    relations: Relation[] | undefined;
    constructor(tableName : string, fields : Array<MigrationField>, relations: Array<Relation> | undefined) {
        super();
        this.tableName = tableName;
        this.fields = fields;
        this.relations = relations;
    }
    doAction(dataContext: DataContext): void {
        dataContext.createTable(this.tableName, this.fields, this.relations);
    }
}