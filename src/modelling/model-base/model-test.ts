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
export class Person extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData ({
            tableName: "Person",
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
                    fkField: "personId",
                    fkModel: Birthday,
                    pkField: "id",
                    type: "one-to-one",
                    navigator: "birthday"
                }
            ]
        });
    }

    get birthday() : Birthday | undefined {
        return this.getSingleNavigator<Birthday>("birthday");
    }

    set birthday(value : Birthday | undefined) {
        this.setSingleNavigator("birthday",value);
    }
}

export class Birthday extends ModelBase {
    constructor(fields : any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData({
            tableName: "Person_Birthday",
            fields: [
                {
                    primaryKey: true,
                    notNull: true,
                    name: "personId",
                    type: "int",
                },
                {
                    notNull: true,
                    name: "birthdate",
                    type: "date",
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

    it("can save a new model with relation set to new instance", async function () {
        var dataContext = new DataContext([], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        
        dataContext.runMigration(Person.createMigration());
        dataContext.runMigration(Birthday.createMigration());
        
        var person = new Person({}, dataContext)
        person.setFieldValue("name","test");
        var model = new Birthday({}, dataContext);
        model.setFieldValue("birthdate","1994-01-01");
        person.birthday = model;
        dataContext.save(person, true);
        expect(dataContext.countFromTable(Person)).to.equal(1);
        expect(dataContext.countFromTable(Birthday)).to.equal(1);

        expect(person.getFieldValue("id")).to.equal(1);

        var fetchedPerson = dataContext.fetchFromTable(Person, 1, Person) as Person;
        expect(fetchedPerson).not.to.be.null;
        expect(fetchedPerson?.getFieldValue("name")).to.equal(person.getFieldValue("name"));
        expect(fetchedPerson?.birthday?.getFieldValue("birthdate")).to.equal(person.birthday?.getFieldValue("birthdate"));
    })

    it("can save a new model with relation with returns new", async function () {
        var dataContext = new DataContext([], new SqliteLanguageEngine());
        await dataContext.loadNew();
        dataContext.createTable("Migrations", [
            new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        ], undefined);
        
        dataContext.runMigration(Person.createMigration());
        dataContext.runMigration(Birthday.createMigration());
        
        var person = new Person({}, dataContext)
        person.getRelationMeta("birthday").returnsNew = true;
        person.setFieldValue("name","test");
        var model = person.birthday;
        if (model == null)
            throw new Error("birthday should have value");
        model.setFieldValue("birthdate","1994-01-01");
        dataContext.save(person, true);
        expect(dataContext.countFromTable(Person)).to.equal(1);
        expect(dataContext.countFromTable(Birthday)).to.equal(1);

        expect(person.getFieldValue("id")).to.equal(1);

        var fetchedPerson = dataContext.fetchFromTable(Person, 1, Person) as Person;
        expect(fetchedPerson).not.to.be.null;
        expect(fetchedPerson?.getFieldValue("name")).to.equal(person.getFieldValue("name"));
        expect(fetchedPerson?.birthday?.getFieldValue("birthdate")).to.equal(person.birthday?.getFieldValue("birthdate"));
    })
})