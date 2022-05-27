export class MigrationField {
    type: string;
    name: string;
    primaryKey: boolean;
    autoIncrement: boolean;
    nullable: boolean;
    constructor({ type, name, primaryKey = false, autoIncrement = false, nullable = false } : {type: string, name: string, primaryKey?: boolean, autoIncrement?: boolean, nullable?: boolean}) {
        this.type = type;
        this.name = name;
        this.primaryKey = primaryKey;
        this.autoIncrement = autoIncrement;
        this.nullable = nullable;
    }
}