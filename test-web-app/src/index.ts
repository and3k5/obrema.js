import { ModelBase, ModelMetaData, DataContext, SqliteLanguageEngine, MigrationField } from "obrema";

class Role extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields,dataContext);
    }

    static getDataModel(): ModelMetaData {
        return new ModelMetaData ({
            tableName: "Role",
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
                    navigator: "phrases",
                    fkField: "roleId",
                    pkField: "id",
                    fkModel: CatchPhrase,
                    type: "one-to-many",
                }
            ]
        });
    }

    get phrases() : CatchPhrase[] {
        return this.getMultiNavigator<CatchPhrase>("phrases");
    }

    set phrases(value : CatchPhrase[]) {
        this.setMultiNavigator("phrases", value);
    }
}

class CatchPhrase extends ModelBase {
    constructor(fields: any, dataContext : DataContext) {
        super(fields, dataContext);
    }

    static getDataModel() : ModelMetaData {
        return new ModelMetaData ({
            tableName: "CatchPhrase",
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
                    name: "roleId",
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

    private _name : string;

    get name() {
        return this._name;
    }

    set name(value : string) {
        this._name = value;
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

import { defineComponent, createApp, h } from "vue";

var comp = defineComponent({
    props: {
        dataContext: DataContext,
    },
    data() {
        return {
            model: null as Role | null,
        };
    },
    mounted() {
        this.model = new Role({}, this.dataContext);
    },
    render: function() {
        var model = this.model as Role | null;
        if (model == null) {
            return h("div",["loading"]);
        }
        
        var items = [];

        for (var phrase of model.phrases) {
            items.push(h("div",[ phrase.name ]))
        }

        return h("div", items);
    }
})

import wait from "wait";

export async function executeTest() {
    if (ModelBase == null)
        throw new Error("Model base is null");
    const dataContext = new DataContext([DataContext.CreateBaseMigration(), Role.createMigration(), CatchPhrase.createMigration()], new SqliteLanguageEngine());
    await dataContext.loadNew();
    var role = new Role({}, dataContext);
    role.setFieldValue("name", "Developer");
    role.getRelationMeta("phrases").returnsNew = true;
    
    var testPhrase = new CatchPhrase({}, dataContext);
    (testPhrase as any).name = "foobar";
    
    role.phrases.push(testPhrase);

    dataContext.save(role, true);

    const app = createApp(comp, { dataContext: dataContext, });
    var div = document.createElement("div");
    document.body.appendChild(div);
    await app.mount(div);
    await wait(3000);
    var model = (app._instance.proxy as any).model;
    if (model == null)
        throw new Error("model on vue should have a value");
}

export async function runTest() {
    try {
        await executeTest();

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