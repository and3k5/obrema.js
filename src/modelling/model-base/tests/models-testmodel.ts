import { ModelBase, ModelMetaData } from "..";
import { DataContext } from "../../../communication/data-context/sqlite";

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

export class TodoList extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData ({
            tableName: "TodoLists",
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
                    fkField: "listId",
                    fkModel: TodoItem,
                    pkField: "id",
                    type: "one-to-many",
                    navigator: "items"
                }
            ]
        });
    }

    get items() : TodoItem[] | undefined {
        return this.getMultiNavigator<TodoItem>("items");
    }

    set items(value : TodoItem[] | undefined) {
        this.setMultiNavigator("items",value);
    }
}

export class TodoItem extends ModelBase {
    constructor(fields : any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData({
            tableName: "TodoItems",
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
                    name: "listId",
                    type: "int",
                },
                {
                    notNull: true,
                    name: "value",
                    type: "text",
                }
            ]
        });
    }
}