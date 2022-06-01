import { DataBaseCommunicator } from "../../communication/data-context/data-context-base/communicator";
import { SqliteCommandQuery, SqliteDbCommunication, SqliteInsertOrUpdateCommand, SqliteSelectCommand } from "../../communication/data-context/sqlite";

export abstract class QueryEngineBase<TCommand> {
    public abstract composeInsertInto({ tableName, values } : { tableName : string, values: any[] }) : TCommand;
    public abstract composeSelect({ fields, tableName, where } : any) : TCommand;
    public abstract exec(db : DataBaseCommunicator<TCommand>, queryData : TCommand) : any;

    public abstract getAsObject(db : any, queryData : any, fieldValues : any) : any;
}

export class SqliteQueryEngine extends QueryEngineBase<SqliteCommandQuery> {
    composeInsertInto({ tableName, values } : { tableName : string, values: any[] }) : SqliteCommandQuery {
        return new SqliteInsertOrUpdateCommand(`INSERT INTO ${tableName} VALUES (${values.map(() => "?").join(",")})`,values);
    }

    composeUpdate({ fields, tableName, where } : any) : SqliteCommandQuery {
        if (Array.isArray(fields))
            fields = fields.join(",");

        const whereClause = where.map((x : any) => {
            let placeholder = "?";
            if ("placeholder" in x)
                placeholder = x.placeholder;
            return x.field + " " + x.operator +" " + placeholder;
        }).join("AND");

        return new SqliteInsertOrUpdateCommand(
            `UPDATE ${tableName} SET ${fields.map((f : any) => f.name + " = " + f.placeholder).join(",")} WHERE (${whereClause})`,
            // `SELECT ${fields} FROM ${tableName} WHERE ${whereClause}`,
            where.filter((f : any) => "value" in f).map((f: any) => f.value)
        );
    }

    composeSelect({ fields, tableName, where } : any) : SqliteCommandQuery {
        if (Array.isArray(fields))
            fields = fields.join(",");

        const whereClause = where.map((x: any) => {
            let placeholder = "?";
            if ("placeholder" in x)
                placeholder = x.placeholder;
            return x.field + " " + x.operator +" " + placeholder;
        }).join("AND");

        return new SqliteSelectCommand(
            `SELECT ${fields} FROM ${tableName} WHERE ${whereClause}`,
            where.filter((f: any) => "value" in f).map((f: any) => f.value)
        );
    }

    exec(db : SqliteDbCommunication, queryData : SqliteCommandQuery) {
        return db.executeCommand(queryData);
    }

    getAsObject(db : any, queryData : any, fieldValues : any) {
        const stmt = db.prepare(queryData.commandText)
        const result = stmt.getAsObject(fieldValues);
        return result;
    }
}