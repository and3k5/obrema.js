import { SqliteQueryEngine } from "../../../query/engine"
import { Migration } from '../../../database/migration';
import { MigrationField } from '../../../database/migration/field';
import { ModelBase, ModelMetaData, RelationFetchInfo } from '../../../modelling/model-base';
import { LanguageEngineBase } from '../../language-engine';
import { DataContextBase, InitializationSettings, InputExistingData } from '../data-context-base';
import { Relation } from "../../../database/migration/relation";

import { load as loadWasmFunction } from "./loader";
import { BindParams, QueryExecResult } from "@and3k5/sql.js";
import { DataBaseCommunicator } from "../data-context-base/communicator";

async function getSqlite() : Promise<typeof import("@and3k5/sql.js")> {
    return await loadWasmFunction();
}

getSqlite();

class QueryError extends Error {
    constructor(message : string, query : string) {
        super(message+"\n"+query);
    }
}

export class SqliteInsertOrUpdateCommand {
    sql: string;
    params: BindParams;
    constructor(sql : string, params : BindParams) {
        this.sql = sql;
        this.params = params;
    }
}


export class SqliteSelectCommand {
    sql: string;
    params: BindParams;
    constructor(sql : string, params : BindParams) {
        this.sql = sql;
        this.params = params;
    }
}



export type SqliteCommandQuery = string | SqliteInsertOrUpdateCommand | SqliteSelectCommand;

export class SqliteDbCommunication extends DataBaseCommunicator<SqliteCommandQuery> {
    private db : import("@and3k5/sql.js").Database;
    constructor(db : import("@and3k5/sql.js").Database) {
        super();
        this.db = db;
    }
    public static async Create(data? : Uint8Array) {
        const SQL = await getSqlite();
        const db = data != null ? new SQL.Database(data) : new SQL.Database();
        return new SqliteDbCommunication(db);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private stringifyType(o : any) {
        if (o === null)
            return "null";
        if (o === undefined)
            return "undefined";
        if (typeof(o) != "object")
            return typeof(o);
        if (o.constructor != null)
            return o.constructor.name as string;
        return "?";
    }

    public executeCommand(command: SqliteCommandQuery): QueryExecResult[] {
        if (command instanceof SqliteInsertOrUpdateCommand) {
            return this.db.exec(command.sql, command.params)
        }
        if (command instanceof SqliteSelectCommand) {
            return this.db.exec(command.sql, command.params)
        }
        if (typeof(command) === "string") {
            return this.db.exec(command);
        }
        throw new Error("executeCommand: Method not implemented. command type: "+this.stringifyType(command));
    }

    public prepare(command: SqliteCommandQuery) {
        if (command instanceof SqliteInsertOrUpdateCommand) {
            return this.db.prepare(command.sql, command.params);
        }
        if (command instanceof SqliteSelectCommand) {
            return this.db.prepare(command.sql, command.params)
        }
        if (typeof(command) === "string") {
            return this.db.prepare(command);
        }
        throw new Error("prepare: Method not implemented. command type: "+this.stringifyType(command));
    }

    public getRawData() {
        return this.db.export();
    }
}

type ReqLiteral = string | number;
export type ReqFieldsMap = { [index : string] : ReqLiteral };
export type ReqArgument = ReqLiteral | ReqFieldsMap;

export class DataContext extends DataContextBase<SqliteDbCommunication, SqliteCommandQuery> {
    //queryEngine: SqliteQueryEngine;
    constructor(migrations : Array<Migration> | IterableIterator<Migration>, languageEngine : LanguageEngineBase<SqliteCommandQuery>) {
        super(new SqliteQueryEngine(), migrations, languageEngine);
    }

    async loadNew(options? : InitializationSettings) {
        this.initializeDb(await SqliteDbCommunication.Create());
        if (options == null || options.disableMigrations !== true)
            this.runMigrations();
    }

    async loadExisting(data: InputExistingData, options? : InitializationSettings) {
        if (data instanceof ArrayBuffer) {
            data = new Uint8Array(data);
        }
        if (!(data instanceof Uint8Array))
            throw new Error("data is not Uint8Array");
        this.initializeDb(await SqliteDbCommunication.Create(data));
        if (options == null || options.disableMigrations !== true)
            this.runMigrations();
    }

    runMigrations() {
        for (const migration of this.migrations) {
            if (this.hasMigration(migration))
                continue;
            this.runMigration(migration);
        }
    }

    runMigration(migration : Migration) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        migration.run(this);
        const sql = this.queryEngine.composeInsertInto({ tableName: "Migrations", values: [migration.id]});
        this.queryEngine.exec(this.db, sql);
    }

    hasMigration(migration : Migration) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const tblCheckQuery = this.queryEngine.composeSelect({ fields: ["name"], tableName: "sqlite_master", where: [{ field: "type", operator: "=", value: "table"}] });
        const tblCheck = this.queryEngine.exec(this.db, tblCheckQuery);
        if (tblCheck.length === 0)
            return false;

        const cmd = this.queryEngine.composeSelect({ fields: "*", tableName: "Migrations", where: [{field:"id",operator: "=", placeholder: ":migrationId" }]});

        const stmt = this.db.prepare(cmd);

        const result = stmt.getAsObject({ ':migrationId': migration.id })

        return result != null && result.id != null;
    }

    save(model : ModelBase, deep = false) {
        if (this.db == null)
            throw new Error("DB is not initialized");

        if (!model.isDirty) {
            return;
        }

        const dataModel = (model.constructor as typeof ModelBase).getDataModel();

        const wasNew = model.isNew;

        if (!model.isNew) {
            const command = this.languageEngine.WriteUpdateCommand(dataModel, model);
            this.db.executeCommand(command);
            model.isDirty = false;
        }else{
            const command = this.languageEngine.WriteInsertCommand(dataModel, model);
            const result = this.db.executeCommand(command);

            const primaryKeyFields = dataModel.fields.filter((f) => f.primaryKey)
            for (const field of primaryKeyFields) {
                const fieldValue = result[0].values[0][primaryKeyFields.indexOf(field)];
                model.setFieldValue(field.name, fieldValue);
            }
            model.isNew = false;
            model.isDirty = false;
        }

        if (deep) {
            if (model.relations != null) {
                for (const relation of model.relations) {
                    switch (relation.relation.type) {
                    case "one-to-one": {
                        if (relation.value == null)
                            continue;
                        if (wasNew) {
                            relation.value.setFieldValue(relation.relation.fkField, model.getFieldValue(relation.relation.pkField));
                        }
                        this.save(relation.value, true);
                        break;
                    }
                    case "one-to-many": {
                        if (relation.value == null)
                            continue;
                        if (!Array.isArray(relation.value))
                            throw new Error("relation value is not array");
                        if (wasNew) {
                            for (const item of relation.value) {
                                item.setFieldValue(relation.relation.fkField, model.getFieldValue(relation.relation.pkField));
                            }
                        }
                        for (const item of relation.value) {
                            this.save(item, true);
                        }
                    }
                    }
                }
            }
        }
    }

    createTable(tableName : string, fields : Array<MigrationField>, relations : Relation[] | undefined) {
        if (this.db == null)
            throw new Error("DB is not initialized");

        const sql = this.languageEngine.WriteCreateTable(tableName, fields, relations);
        try {
            this.db.executeCommand(sql);
        }
        catch (e) {
            let message = "unknown error";
            if (e instanceof Error)
                message = e.message;
            throw new QueryError(message, sql);
        }
    }

    countFromTable(t : ModelMetaData | ModelBase | typeof ModelBase) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        if (t instanceof ModelBase)
            t = (t.constructor as typeof ModelBase).getDataModel();
        if (!(t instanceof ModelMetaData)) {
            t = t.getDataModel();
        }

        const returnValue = this.db.executeCommand(`SELECT COUNT(*) FROM ${t.tableName}`);
        let value = returnValue[0].values[0][0];
        if (typeof(value) === "string")
            value = parseInt(value);
        if (typeof(value) != "number")
            throw new Error("Expected a number");
        return value;
    }

    fetchAllRaw(dataModel : ModelMetaData) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const data = this.db.executeCommand(`SELECT * FROM ${dataModel.tableName}`);

        return data;
    }

    listTables() {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const sql = `SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`;
        const data = this.db.executeCommand(sql);
        return data;
    }

    fetchAllRowsFromTableRaw(tableName : string) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const data = this.db.executeCommand(`SELECT * FROM ${tableName}`);

        return data;
    }

    *fetchAll(dataModel : ModelMetaData, type : typeof ModelBase, req?: ReqFieldsMap) {
        if (this.db == null)
            throw new Error("DB is not initialized");

        let sql;

        let params : BindParams | undefined = undefined;

        if (req != null) {
            const fields = dataModel.fields.filter((f) => (f.name in req));

            const fieldSpecsTxt = req != null ? fields.map((x) => x.name + "=:" + x.name).join(" AND ") : null;

            sql = `SELECT 1 as _FOUND_,* FROM ${dataModel.tableName} WHERE ${fieldSpecsTxt}`;

            params = {};
            for (const primaryKey of fields) {
                if (primaryKey.name in req)
                    params[":" + primaryKey.name] = this.languageEngine.FormatValue(req[primaryKey.name]);
            }
        }else{
            sql = `SELECT 1 as _FOUND_,* FROM ${dataModel.tableName}`;
        }

        const stmt = this.db.prepare(sql);
        stmt.bind(params);

        while (stmt.step()) {
            const result = stmt.getAsObject();
            if (result._FOUND_ != 1)
                return;

            delete result._FOUND_;

            const model = new type(result, this);
            model.isNew = false;
            yield model;
        }
    }

    fetchFromTable(dataModel : ModelMetaData | typeof ModelBase, req: ReqArgument, type : typeof ModelBase, fetchPath? : RelationFetchInfo) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        if (!(dataModel instanceof ModelMetaData))
            dataModel = dataModel.getDataModel();
        const primaryKeys = dataModel.fields.filter((f) => f.primaryKey === true);

        const fieldSpecsTxt = primaryKeys.map((x) => x.name + "=:" + x.name).join(" AND ");

        const sql = `SELECT 1 as _FOUND_,* FROM ${dataModel.tableName} WHERE ${fieldSpecsTxt}`;

        const stmt = this.db.prepare(sql);

        if (typeof (req) === "string" || typeof (req) === "number") {
            if (primaryKeys.length > 1) {
                throw new Error("Req cannot be one value, since table has multiple primary keys");
            }
            if (primaryKeys.length < 1) {
                throw new Error("Req cannot be one value, since table has no primary key");
            }
            const v = req;
            req = {};
            req[primaryKeys[0].name] = v;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parameters : { [index : string ] : any } = {};
        for (const primaryKey of primaryKeys) {
            if (primaryKey.name in req)
                parameters[":" + primaryKey.name] = this.languageEngine.FormatValue(req[primaryKey.name]);
        }

        const result = stmt.getAsObject(parameters);

        if (result._FOUND_ != 1)
            return null;

        delete result._FOUND_;
        const model = new type(result, this);
        model.isNew = false;
        return model;
    }

    // insert(tableName, data) {
    //     var dataModel = dataItem.getDataModel();

    //     db.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);

    //     var fieldPlaceholders = dataModel.fields.map(x => "?").join(",");

    //     var sql = `INSERT INTO ${dataModel.tableName} VALUES (${fieldPlaceholders})`
    // }

    getRawData() {
        if (this.db == null)
            throw new Error("DB is not initialized");
        return this.db.getRawData();
    }

    async toDataURL() : Promise<string> {
        const data = this.getRawData();
        const blob = new Blob([data]);
        return new Promise((res,rej) => {
            const fileReader = new FileReader();

            fileReader.addEventListener("load",function () {
                res(this.result as string);
            });
            fileReader.addEventListener("error",function () {
                rej(this.error);
            });
            fileReader.readAsDataURL(blob);
        });
    }

    async downloadURL(fileName: string) {
        const a = document.createElement('a');
        const url : string = await this.toDataURL();
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.style.display = 'none';
        a.click();
        a.remove();
    }
}