import { ModelBase, ModelMetaData, DataContext, SqliteLanguageEngine, MigrationField } from "obrema";

class TestPhrase extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData ({
            tableName: "TestPhrase",
            fields: [
                {
                    primaryKey: true,
                    autoIncrement: true,
                    notNull: true,
                    name: "id",
                    type: "int",
                },
                {
                    notNull: true,
                    name: "name",
                    type: "text",
                }
            ]
        });
    }
}

let running = true;
let success : undefined | boolean | string;

export function getRunning() {
    return running;
}

export function getSuccess() {
    return success;
}


export async function runTest() {
    try {
        if (ModelBase == null)
            throw new Error("Model base is null");
        const dataContext = new DataContext([TestPhrase.createMigration()], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        
        dataContext.runMigrations();
        var testPhrase = new TestPhrase({}, dataContext);
        (testPhrase as any).name = "foobar";
        dataContext.save(testPhrase);
        success = true;
    }
    catch (e) {
        if (e instanceof Error) {
            success = e.name + ": "+e.message+"\n"+e.stack;
        }else {
            success = JSON.stringify(e);
        }
        
    }
    finally {
        running = false;
    }
}

runTest();