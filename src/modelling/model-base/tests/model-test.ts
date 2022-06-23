import { expect } from "chai";
import { TestPhrase } from "./models-testmodel";
import { DataContext } from "../../../communication/data-context/sqlite";
import { SqliteLanguageEngine } from "../../../communication/language-engine";
import { MigrationField } from "../../../database/migration/field";

context("models", function () {
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

        expect(dataContext.countFromTable(TestPhrase)).to.equal(1);
    })

    it("can save a new model with undefined", async function () {
        var dataContext = new DataContext([], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        dataContext.createTable("TestPhrase", [
            new MigrationField({ primaryKey: true, autoIncrement: true, nullable: false, name: "id", type: "int" }),
            new MigrationField({ nullable: true, name: "name", type: "text" })
        ], undefined);

        var testPhrase = new TestPhrase({}, dataContext)
        testPhrase.setFieldValue("name",undefined);
        dataContext.save(testPhrase);

        expect(dataContext.countFromTable(TestPhrase)).to.equal(1);
    })
})