import { expect } from "chai";
import { ModelBase, ModelMetaData } from ".";
import { DataContext } from "../../communication/data-context/sqlite";
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
                    notNull: false,
                    name: "name",
                    type: "text",
                }
            ]
        });
    }
}

class CarBrand extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData ({
            tableName: "CarBrand",
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
            ],
            relations: [
                {
                    fkField: "brandId",
                    fkModel: CarModel,
                    pkField: "id",
                    type: "one-to-one",
                    navigator: "model"
                }
            ]
        });
    }
}

class CarModel extends ModelBase {
    constructor(fields : any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData({
            tableName: "CarModel",
            fields: [
                {
                    primaryKey: true,
                    notNull: true,
                    name: "brandId",
                    type: "int",
                },
                {
                    notNull: true,
                    name: "name",
                    type: "text",
                }
            ],
            relations: [
                {
                    fkField: "brandId",
                    pkModel: CarBrand,
                    pkField: "id",
                    type: "one-to-one",
                    navigator: "brand"
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

    it("can save a new model with relation", async function () {
        var dataContext = new DataContext([], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        
        dataContext.runMigration(CarModel.createMigration());
        dataContext.runMigration(CarBrand.createMigration());
        
        var brand = new CarBrand({}, dataContext)
        brand.setFieldValue("name","test");
        var model = new CarModel({}, dataContext);
        model.setFieldValue("name","wroomwroom");
        (brand as any).model = model;
        dataContext.save(brand, true);
        expect(dataContext.countFromTable(CarBrand)).to.equal(1);
        expect(dataContext.countFromTable(CarModel)).to.equal(1);
    })
})