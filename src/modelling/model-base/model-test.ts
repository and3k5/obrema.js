import { ModelBase, ModelMetaData } from ".";
import { DataContext } from "../../communication/data-context";
import { SqliteLanguageEngine } from "../../communication/language-engine";

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
})