import { MigrationField as MigrationField } from "../../database/migration/field";
import { Relation } from "../../database/migration/relation";
import { ModelBase, ModelMetaData } from "../../modelling/model-base";
import { MetaFieldType } from "../../modelling/model-base/field";
import { SqliteCommandQuery, SqliteInsertOrUpdateCommand } from "../data-context/sqlite";

export abstract class LanguageEngineBase<TQueryType> {
    abstract WriteCreateTable(tableName: string, fields: MigrationField[], relations: Relation[] | undefined) : string;
    abstract WriteUpdateCommand(dataModel : ModelMetaData, model : ModelBase) : TQueryType;
    abstract WriteInsertCommand(dataModel : ModelMetaData, model : ModelBase) : TQueryType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract FormatValue(value : any) : any;
}

export class SqliteLanguageEngine extends LanguageEngineBase<SqliteCommandQuery> {
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
        case "decimal":
            return "NUMERIC";
        case "date":
            return "DATE";
        default:
            throw new Error("Unsupported type: "+type);
        }
    }

    WriteUpdateCommand(dataModel: ModelMetaData, model: ModelBase): SqliteCommandQuery {
        const fields = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valueObj : { [index : string ] : any } = {};

        for (const field of dataModel.fields) {
            if (field.autoIncrement)
                continue;
            fields.push({name: field.name, placeholder: "@" + field.name});
            valueObj["@" + field.name] = this.FormatValue(model.getFieldValue(field.name));
        }

        const primaryKeys = dataModel.fields.filter((f) => f.primaryKey === true);

        for (const primaryKey of primaryKeys) {
            valueObj["@" + primaryKey.name] = this.FormatValue(model.getFieldValue(primaryKey.name));
        }

        const fieldSpecsTxt = primaryKeys.map((x) => x.name + "=@" + x.name).join(" AND ");

        const queryStr = `UPDATE ${dataModel.tableName} SET ${fields.map(f => f.name + " = " + f.placeholder).join(",")} WHERE (${fieldSpecsTxt})`;

        return new SqliteInsertOrUpdateCommand(queryStr, valueObj);
    }

    WriteInsertCommand(dataModel : ModelMetaData, model : ModelBase) : SqliteCommandQuery {
        const fieldPlaceholders = [];
        const fieldNames = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valueObj : { [index : string ] : any } = {};

        for (const field of dataModel.fields) {
            if (field.autoIncrement)
                continue;
            fieldPlaceholders.push("@" + field.name);
            fieldNames.push(field.name);
            valueObj["@" + field.name] = this.FormatValue(model.getFieldValue(field.name));
        }

        const queryStr = `INSERT INTO ${dataModel.tableName} (${fieldNames.join(",")}) VALUES (${fieldPlaceholders.join(",")}); SELECT last_insert_rowid();`;

        return new SqliteInsertOrUpdateCommand(queryStr, valueObj);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FormatValue(value : any) {
        if (value === undefined)
            return null;
        return value;
    }
}