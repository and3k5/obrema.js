import { default as initSqlJs } from "sql.js";
import { lazy } from "lazy-var";

const sqlWasm = require("sql.js/dist/sql-wasm.wasm");
console.log(sqlWasm);

const lazyInit = lazy(async () => await initSqlJs({
    locateFile: () => {
        return sqlWasm;
    }
}));

import { SqliteQueryEngine } from "../../../query/engine"
import { Migration } from '../../../database/migration';
import { MigrationField } from '../../../database/migration/field';
import { ModelBase, ModelMetaData } from '../../../modelling/model-base';
import { LanguageEngineBase } from '../../language-engine';
import { DataContextBase } from '../data-context-base';
import { Relation } from "../../../database/migration/relation";

lazyInit.get();

export class DataContext extends DataContextBase {
    //queryEngine: SqliteQueryEngine;
    db: any;
    constructor(migrations : Array<Migration> | IterableIterator<Migration>, languageEngine : LanguageEngineBase) {
        super(new SqliteQueryEngine(), migrations, languageEngine);
    }

    async loadNew({ disableMigrations = false } = {}) {
        const SQL = await lazyInit.get();
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
        const SQL = await lazyInit.get();
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

    runMigration(migration : any) {
        migration.run(this);
        const sql = this.queryEngine.composeInsertInto({ tableName: "Migrations", values: [migration.id]});
        this.queryEngine.exec(this.db, sql);
    }

    hasMigration(migration : any) {
        const tblCheckQuery = this.queryEngine.composeSelect({ fields: ["name"], tableName: "sqlite_master", where: [{ field: "type", operator: "=", value: "table"}] });
        const tblCheck = this.queryEngine.exec(this.db, tblCheckQuery);
        if (tblCheck.length === 0)
            return false;

        const stmt = this.queryEngine.composeSelect({ fields: "*", tableName: "Migrations", where: [{field:"id",operator: "=", placeholder: ":migrationId" }]});

        const result = this.queryEngine.getAsObject(this.db, stmt, { ':migrationId': migration.id });

        return result != null && result.id != null;
    }

    save(model : ModelBase, deep = false) {
        const dataModel : ModelMetaData = (model.constructor as any)["getDataModel"]();

        if (!model.isNew) {
            const fields = [];

            const valueObj : any = {};

            for (const field of dataModel.fields) {
                if (field.autoIncrement)
                    continue;
                fields.push({name: field.name, placeholder: "@" + field.name});
                valueObj["@" + field.name] = (model as any)[field.name];
            }

            const primaryKeys = dataModel.fields.filter((f: any) => f.primaryKey === true);

            for (const primaryKey of primaryKeys) {
                valueObj["@" + primaryKey.name] = (model as any)[primaryKey.name];
            }

            const fieldSpecsTxt = primaryKeys.map((x: any) => x.name + "=@" + x.name).join(" AND ");

            const queryStr = `UPDATE ${dataModel.tableName} SET ${fields.map(f => f.name + " = " + f.placeholder).join(",")} WHERE (${fieldSpecsTxt})`;

            this.db.exec(queryStr, valueObj);
        }else{
            const fieldPlaceholders = [];
            const fieldNames = [];

            const valueObj : any = {};

            for (const field of dataModel.fields) {
                if (field.autoIncrement)
                    continue;
                fieldPlaceholders.push("@" + field.name);
                fieldNames.push(field.name);
                valueObj["@" + field.name] = (model as any)[field.name];
            }

            const queryStr = `INSERT INTO ${dataModel.tableName} (${fieldNames.join(",")}) VALUES (${fieldPlaceholders.join(",")}); SELECT last_insert_rowid();`;

            const result = this.db.exec(queryStr, valueObj);

            const primaryKeyFields = dataModel.fields.filter((f : any) => f.primaryKey)
            for (const field of primaryKeyFields) {
                const fieldValue = result[0].values[0][primaryKeyFields.indexOf(field)];
                (model as any)[field.name] = fieldValue;
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
        const sql = this.languageEngine.WriteCreateTable(tableName, fields, relations);
        this.db.run(sql);
    }

    countFromTable(t : ModelMetaData | ModelBase) {
        if (t instanceof ModelBase)
            t = (t.constructor as any)["getDataModel"]() as ModelMetaData;

        const returnValue = this.db.exec(`SELECT COUNT(*) FROM ${t.tableName}`);
        return JSON.stringify(returnValue[0].values[0][0]);
    }

    fetchAllRaw(dataModel : ModelMetaData) {
        const data = this.db.exec(`SELECT * FROM ${dataModel.tableName}`);

        return data;
    }

    listTables() {
        const sql = `SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`;
        const data = this.db.exec(sql);
        return data;
    }

    fetchAllRowsFromTableRaw(tableName : string) {
        const data = this.db.exec(`SELECT * FROM ${tableName}`);

        return data;
    }

    *fetchAll(dataModel : ModelMetaData, type : any) {
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

    fetchFromTable(dataModel : ModelMetaData, req: any, type : any) {
        const primaryKeys = dataModel.fields.filter((f: any) => f.primaryKey === true);

        const fieldSpecsTxt = primaryKeys.map((x: any) => x.name + "=:" + x.name).join(" AND ");

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

        const parameters : any = {};
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
        return this.db.export();
    }

    async toDataURL() : Promise<string> {
        const data = this.getRawData();
        const blob = new Blob([data]);
        return new Promise((res,rej) => {
            const fileReader = new FileReader();

            fileReader.addEventListener("load",function (ev) {
                res(this.result as string);
            });
            fileReader.addEventListener("error",function (ev) {
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