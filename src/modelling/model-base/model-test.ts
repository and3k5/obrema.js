import { ModelBase, ModelMetaData } from ".";
import { DataContext } from "../../communication/data-context";
import { SqliteLanguageEngine } from "../../communication/language-engine";
import { MigrationField } from "../../database/migration/field";

export class TestPhrase extends ModelBase {
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

describe("TestPhrase (model test)", function () {
    it("can create a new model", function () {
        
        var testPhrase = new TestPhrase({}, new DataContext([], new SqliteLanguageEngine()))
    })

    it("can save a new model", async function () {
        var dataContext = new DataContext([], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        
        dataContext.createTable("TestPhrase", [
            new MigrationField({ primaryKey: true, autoIncrement: true, nullable: false, name: "id", type: "int" }),
            new MigrationField({ nullable: false, name: "name", type: "text" })
        ], undefined);

        var testPhrase = new TestPhrase({}, dataContext)
        testPhrase.setFieldValue("name","test hallo");
        dataContext.save(testPhrase);
    })
})