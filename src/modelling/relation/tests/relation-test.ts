import { expect } from "chai";
import { Birthday, Person, TodoItem, TodoList } from "../../model-base/tests/models-testmodel";
import { DataContext } from "../../../communication/data-context/sqlite";
import { SqliteLanguageEngine } from "../../../communication/language-engine";
import { MigrationField } from "../../../database/migration/field";

context("relations", function () {    
    context("one to one", function () {
        it("can save a new model with relation set to new instance", async function () {
            var dataContext = new DataContext([], new SqliteLanguageEngine());
            await dataContext.loadNew();
            dataContext.createTable("Migrations", [
                new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
            ], undefined);
    
            dataContext.runMigration(Person.createMigration());
            dataContext.runMigration(Birthday.createMigration());
    
            var person = new Person({}, dataContext)
            person.setFieldValue("name", "test");
            var model = new Birthday({}, dataContext);
            model.setFieldValue("birthdate", "1994-01-01");
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
            person.setFieldValue("name", "test");
            var model = person.birthday;
            if (model == null)
                throw new Error("birthday should have value");
            model.setFieldValue("birthdate", "1994-01-01");
            dataContext.save(person, true);
            expect(dataContext.countFromTable(Person)).to.equal(1);
            expect(dataContext.countFromTable(Birthday)).to.equal(1);
    
            expect(person.getFieldValue("id")).to.equal(1);
    
            var fetchedPerson = dataContext.fetchFromTable(Person, 1, Person) as Person;
            expect(fetchedPerson).not.to.be.null;
            expect(fetchedPerson?.getFieldValue("name")).to.equal(person.getFieldValue("name"));
            expect(fetchedPerson?.birthday?.getFieldValue("birthdate")).to.equal(person.birthday?.getFieldValue("birthdate"));
        })
    
        it("saves relations and assign to the right FK value", async function () {
            var dataContext = new DataContext([], new SqliteLanguageEngine());
            await dataContext.loadNew();
            dataContext.createTable("Migrations", [
                new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
            ], undefined);
    
            dataContext.runMigration(Person.createMigration());
            dataContext.runMigration(Birthday.createMigration());
            {
                let personA = new Person({}, dataContext);
                personA.setFieldValue("name", "test");
                dataContext.save(personA);
                expect(dataContext.countFromTable(Person)).to.equal(1);
    
                expect(personA.getFieldValue("id")).to.equal(1);
            }
    
            {
                let personB = new Person({}, dataContext);
                personB.getRelationMeta("birthday").returnsNew = true;
                personB.setFieldValue("name", "test");
                var model = personB.birthday;
                if (model == null)
                    throw new Error("birthday should have value");
                model.setFieldValue("birthdate", "1994-01-01");
                dataContext.save(personB, true);
                expect(dataContext.countFromTable(Person)).to.equal(2);
                expect(dataContext.countFromTable(Birthday)).to.equal(1);
    
                expect(personB.getFieldValue("id")).to.equal(2);
                expect(personB.birthday?.getFieldValue("personId")).to.equal(2);
            }
        });
    });

    context("one to many", function () {
        it("can save a new model with relation set to new instance", async function () {
            var dataContext = new DataContext([], new SqliteLanguageEngine());
            await dataContext.loadNew();
            dataContext.createTable("Migrations", [
                new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
            ], undefined);
    
            dataContext.runMigration(TodoList.createMigration());
            dataContext.runMigration(TodoItem.createMigration());
    
            var todoList = new TodoList({}, dataContext)
            todoList.setFieldValue("name", "My todo list");
            var items = [];
            {
                var item = new TodoItem({}, dataContext);
                item.setFieldValue("value", "make stuff");
                items.push(item);
            }
            {
                var item = new TodoItem({}, dataContext);
                item.setFieldValue("value", "make other stuff");
                items.push(item);
            }
            {
                var item = new TodoItem({}, dataContext);
                item.setFieldValue("value", "final stuff");
                items.push(item);
            }
            todoList.items = items;
            dataContext.save(todoList, true);
            expect(dataContext.countFromTable(TodoList)).to.equal(1);
            expect(dataContext.countFromTable(TodoItem)).to.equal(3);

            expect(todoList.getFieldValue("id")).to.equal(1);
    
            var fetchPath = TodoList.fetchRelations(info => {
                info.add("items");
            });

            var fetchedTodoList = dataContext.fetchFromTable(TodoList, 1, TodoList, fetchPath) as TodoList;
            expect(fetchedTodoList).not.to.be.null;
            expect(fetchedTodoList.getFieldValue("name")).to.equal(todoList.getFieldValue("name"));
            const relationMeta = fetchedTodoList.getRelationMeta("items");
            expect(fetchedTodoList.items).not.to.be.null;
            expect(fetchedTodoList.items).not.to.be.undefined;
            if (fetchedTodoList.items == null)
                throw new Error("?");
            expect(fetchedTodoList.items.length).to.equal(3, "did not fetch items");
            expect(fetchedTodoList.items[0].getFieldValue("value")).to.equal(todoList.items[0].getFieldValue("value"));
            expect(fetchedTodoList.items[1].getFieldValue("value")).to.equal(todoList.items[1].getFieldValue("value"));
            expect(fetchedTodoList.items[2].getFieldValue("value")).to.equal(todoList.items[2].getFieldValue("value"));
        })
    
        // it("can save a new model with relation with returns new", async function () {
        //     var dataContext = new DataContext([], new SqliteLanguageEngine());
        //     await dataContext.loadNew();
        //     dataContext.createTable("Migrations", [
        //         new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
        //     ], undefined);
    
        //     dataContext.runMigration(TodoList.createMigration());
        //     dataContext.runMigration(TodoItem.createMigration());
    
        //     var todoList = new TodoList({}, dataContext)
        //     todoList.getRelationMeta("items").returnsNew = true;
        //     todoList.setFieldValue("name", "test");
        //     var model = todoList.items;
        //     if (model == null)
        //         throw new Error("items should have value");
        //     model.setFieldValue("birthdate", "1994-01-01");
        //     dataContext.save(todoList, true);
        //     expect(dataContext.countFromTable(TodoList)).to.equal(1);
        //     expect(dataContext.countFromTable(TodoItem)).to.equal(1);
    
        //     expect(todoList.getFieldValue("id")).to.equal(1);
    
        //     var fetchedTodoList = dataContext.fetchFromTable(TodoList, 1, TodoList) as TodoList;
        //     expect(fetchedTodoList).not.to.be.null;
        //     expect(fetchedTodoList?.getFieldValue("name")).to.equal(todoList.getFieldValue("name"));
        //     expect(fetchedTodoList?.items?.getFieldValue("birthdate")).to.equal(todoList.items?.getFieldValue("birthdate"));
        // })
    
        it("saves relations and assign to the right FK value", async function () {
            var dataContext = new DataContext([], new SqliteLanguageEngine());
            await dataContext.loadNew();
            dataContext.createTable("Migrations", [
                new MigrationField({ primaryKey: true, nullable: false, name: "id", type: "text" })
            ], undefined);
    
            dataContext.runMigration(TodoList.createMigration());
            dataContext.runMigration(TodoItem.createMigration());
            {
                let todoListA = new TodoList({}, dataContext);
                todoListA.setFieldValue("name", "test");
                dataContext.save(todoListA);
                expect(dataContext.countFromTable(TodoList)).to.equal(1);
    
                expect(todoListA.getFieldValue("id")).to.equal(1);
            }
    
            {
                let todoListB = new TodoList({}, dataContext);
                todoListB.setFieldValue("name", "test");
                var items = [];
                {
                    var item = new TodoItem({}, dataContext);
                    item.setFieldValue("value", "make stuff");
                    items.push(item);
                }
                {
                    var item = new TodoItem({}, dataContext);
                    item.setFieldValue("value", "make other stuff");
                    items.push(item);
                }
                {
                    var item = new TodoItem({}, dataContext);
                    item.setFieldValue("value", "final stuff");
                    items.push(item);
                }
                todoListB.items = items;
                dataContext.save(todoListB, true);
                expect(dataContext.countFromTable(TodoList)).to.equal(2);
                expect(dataContext.countFromTable(TodoItem)).to.equal(3);
    
                expect(todoListB.getFieldValue("id"),"id missing on todo list").to.equal(2);
                expect(todoListB.items[0]?.getFieldValue("listId"),"missing todolist id on item 0").to.equal(2);
                expect(todoListB.items[1]?.getFieldValue("listId"),"missing todolist id on item 1").to.equal(2);
                expect(todoListB.items[2]?.getFieldValue("listId"),"missing todolist id on item 2").to.equal(2);
            }
        });
    });
})