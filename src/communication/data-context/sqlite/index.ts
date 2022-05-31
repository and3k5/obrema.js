import { SqliteQueryEngine } from "../../../query/engine"
import { Migration } from '../../../database/migration';
import { MigrationField } from '../../../database/migration/field';
import { ModelBase, ModelMetaData } from '../../../modelling/model-base';
import { LanguageEngineBase } from '../../language-engine';
import { DataContextBase } from '../data-context-base';
import { Relation } from "../../../database/migration/relation";

import { load as loadWasmFunction } from "./loader";

async function getSqlite() {
    return await loadWasmFunction();
}

getSqlite();

class QueryError extends Error {
    constructor(message : string, query : string) {
        super(message+"\n"+query);
    }
}

export class DataContext extends DataContextBase {
    //queryEngine: SqliteQueryEngine;
    db?: import("sql.js").Database;
    constructor(migrations : Array<Migration> | IterableIterator<Migration>, languageEngine : LanguageEngineBase) {
        super(new SqliteQueryEngine(), migrations, languageEngine);
    }

    async loadNew({ disableMigrations = false } = {}) {
        const SQL = await getSqlite();
        this.db = new SQL.Database();
        if (disableMigrations !== true)
            this.runMigrations();
    }

    async loadExisting(data: Uint8Array | ArrayBuffer, { disableMigrations = false } = {}) {
        if (data instanceof ArrayBuffer) {
            data = new Uint8Array(data);
        }
        if (!(data instanceof Uint8Array))
            throw new Error("data is not Uint8Array");
        const SQL = await getSqlite();
        this.db = new SQL.Database(data);
        if (disableMigrations !== true)
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
        migration.run(this);
        const sql = this.queryEngine.composeInsertInto({ tableName: "Migrations", values: [migration.id]});
        this.queryEngine.exec(this.db, sql);
    }

    hasMigration(migration : Migration) {
        const tblCheckQuery = this.queryEngine.composeSelect({ fields: ["name"], tableName: "sqlite_master", where: [{ field: "type", operator: "=", value: "table"}] });
        const tblCheck = this.queryEngine.exec(this.db, tblCheckQuery);
        if (tblCheck.length === 0)
            return false;

        const stmt = this.queryEngine.composeSelect({ fields: "*", tableName: "Migrations", where: [{field:"id",operator: "=", placeholder: ":migrationId" }]});

        const result = this.queryEngine.getAsObject(this.db, stmt, { ':migrationId': migration.id });

        return result != null && result.id != null;
    }

    save(model : ModelBase, deep = false) {
        if (this.db == null)
            throw new Error("DB is not initialized");

        const dataModel = (model.constructor as typeof ModelBase).getDataModel();

        if (!model.isNew) {
            const { sql : queryStr, params : valueObj } = this.languageEngine.WriteUpdateCommand(dataModel, model);
            this.db.exec(queryStr, valueObj);
        }else{
            const { sql : queryStr, params : valueObj } = this.languageEngine.WriteInsertCommand(dataModel, model);
            const result = this.db.exec(queryStr, valueObj);

            const primaryKeyFields = dataModel.fields.filter((f) => f.primaryKey)
            for (const field of primaryKeyFields) {
                const fieldValue = result[0].values[0][primaryKeyFields.indexOf(field)];
                model.setFieldValue(field.name, fieldValue);
            }
            model.isNew = false;
        }

        if (deep) {
            if (model.relations != null) {
                for (const relation of model.relations) {
                    this.save(relation.value, true);
                }
            }
        }
    }

    createTable(tableName : string, fields : Array<MigrationField>, relations : Relation[] | undefined) {
        if (this.db == null)
            throw new Error("DB is not initialized");

        const sql = this.languageEngine.WriteCreateTable(tableName, fields, relations);
        try {
            this.db.run(sql);

        }
        catch (e) {
            let message = "unknown error";
            if (e instanceof Error)
                message = e.message;
            throw new QueryError(message, sql);
        }
    }

    countFromTable(t : ModelMetaData | ModelBase) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        if (t instanceof ModelBase)
            t = (t.constructor as typeof ModelBase).getDataModel();

        const returnValue = this.db.exec(`SELECT COUNT(*) FROM ${t.tableName}`);
        return JSON.stringify(returnValue[0].values[0][0]);
    }

    fetchAllRaw(dataModel : ModelMetaData) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const data = this.db.exec(`SELECT * FROM ${dataModel.tableName}`);

        return data;
    }

    listTables() {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const sql = `SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`;
        const data = this.db.exec(sql);
        return data;
    }

    fetchAllRowsFromTableRaw(tableName : string) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const data = this.db.exec(`SELECT * FROM ${tableName}`);

        return data;
    }

    *fetchAll(dataModel : ModelMetaData, type : typeof ModelBase) {
        if (this.db == null)
            throw new Error("DB is not initialized");
        const sql = `SELECT 1 as _FOUND_,* FROM ${dataModel.tableName}`;

        const stmt = this.db.prepare(sql);

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

    fetchFromTable(dataModel : ModelMetaData, req: any, type : typeof ModelBase) {
        if (this.db == null)
            throw new Error("DB is not initialized");
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

        const parameters : { [index : string ] : any } = {};
        for (const primaryKey of primaryKeys) {
            if (primaryKey.name in req)
                parameters[":" + primaryKey.name] = req[primaryKey.name];
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
        return this.db.export();
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