export abstract class QueryEngineBase {
    public abstract composeInsertInto({ tableName, values } : { tableName : string, values: any[] }) : any;
    public abstract composeSelect({ fields, tableName, where } : any) : any;
    public abstract exec(db : any, queryData : any) : any;

    public abstract getAsObject(db : any, queryData : any, fieldValues : any) : any;
}

export class SqliteQueryEngine extends QueryEngineBase {
    composeInsertInto({ tableName, values } : { tableName : string, values: any[] }) {
        return {
            commandText: `INSERT INTO ${tableName} VALUES (${values.map(x => "?").join(",")})`,
            args: values,
        }
    }

    composeUpdate({ fields, tableName, where } : any) {
        if (Array.isArray(fields))
            fields = fields.join(",");

        const whereClause = where.map((x : any) => {
            let placeholder = "?";
            if ("placeholder" in x)
                placeholder = x.placeholder;
            return x.field + " " + x.operator +" " + placeholder;
        }).join("AND");

        return {
            commandText: `UPDATE ${tableName} SET ${fields.map((f : any) => f.name + " = " + f.placeholder).join(",")} WHERE (${whereClause})`,
            // `SELECT ${fields} FROM ${tableName} WHERE ${whereClause}`,
            args: where.filter((f : any) => "value" in f).map((f: any) => f.value),
        };
    }

    composeSelect({ fields, tableName, where } : any) {
        if (Array.isArray(fields))
            fields = fields.join(",");

        const whereClause = where.map((x: any) => {
            let placeholder = "?";
            if ("placeholder" in x)
                placeholder = x.placeholder;
            return x.field + " " + x.operator +" " + placeholder;
        }).join("AND");

        return {
            commandText: `SELECT ${fields} FROM ${tableName} WHERE ${whereClause}`,
            args: where.filter((f: any) => "value" in f).map((f: any) => f.value),
        };
    }

    exec(db : any, queryData : any) {
        return db.exec(queryData.commandText, queryData.args);
    }

    getAsObject(db : any, queryData : any, fieldValues : any) {
        const stmt = db.prepare(queryData.commandText)
        const result = stmt.getAsObject(fieldValues);
        return result;
    }
}