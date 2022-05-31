import { MigrationField as MigrationField } from "../../database/migration/field";
import { Relation } from "../../database/migration/relation";
import { MetaFieldType } from "../../modelling/model-base/field";

export abstract class LanguageEngineBase {
    abstract WriteCreateTable(tableName: string, fields: MigrationField[], relations: Relation[] | undefined) : string;
}

export class SqliteLanguageEngine extends LanguageEngineBase {
    WriteCreateTable(tableName: string, fields: MigrationField[], relations: Relation[] | undefined): string {
        const fieldLines = fields.map(x => this.WriteMigrationField(x));

        if (relations != null) {
            for (const relation of relations) {
                fieldLines.push(`FOREIGN KEY(${relation.fkField}) REFERENCES ${relation.pkTable}(${relation.pkField})`);
            }
        }

        const sql = `CREATE TABLE ${tableName} (${fieldLines.join(",")})`;
        return sql;
    }
    WriteMigrationField(field: MigrationField): string {
        let line = field.name + " " + this.WriteType(field.type);
        if (field.primaryKey)
            line += " PRIMARY KEY";
        if (field.autoIncrement)
            line += " AUTOINCREMENT";
        if (!field.nullable)
            line += " NOT NULL";
        return line;
    }
    WriteType(type : MetaFieldType) {
        switch (type) {
        case "int":
            return "INTEGER";
        case "text":
            return "TEXT";
        }
    }
}