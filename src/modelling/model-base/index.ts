import { DataContext } from "../../communication/data-context";
import { RelationData } from "../relation";

export class ModelBase {
    isNew: boolean;
    dataContext: any;
    relations: Array<any>;

    constructor(fields = {}, dataContext: any) {
        this.isNew = true;
        if (dataContext == null)
            throw new Error("required: dataContext");

        this.dataContext = dataContext;

        const constructor : any = this.constructor;

        const dataModel : ModelMetaData = constructor["getDataModel"]();
        for (const field of dataModel.fields) {
            (this as any)[field.name] = undefined;
        }

        const relations = [];

        if ("relations" in dataModel && dataModel.relations != null) {
            for (const relation of dataModel.relations) {
                const relData = ModelBase.setupRelation(this, relation);
                relations.push(relData);
            }
        }

        this.relations = relations;

        if (fields != null)
            Object.assign(this,fields);
    }

    static setupRelation(instance: any, relation: any) {
        const relationData = new RelationData();
        relationData.fetched = false;
        relationData.relation = relation;
        relationData.value = undefined;
        relationData.returnsNew = false;
        relationData.fetcher = (function (relation) {
            if (relation.type === "one-to-one") {
                return function ({ instance, relation } : { instance: any, relation: any}) {
                    const req: any = {};
                    req[relation.fkField] = instance[relation.pkField];
                    if (instance.dataContext == null)
                        throw new Error("cannot fetch relation: no dataContext");
                    return relation.fkModel.fetch(instance.dataContext, req);
                }

            }else {
                throw new Error("TODO implement fetcher for relation type: "+relation.type);
            }
        })(relation);
        relationData.setter = (function (relation) {
            if (relation.type === "one-to-one") {
                return function ({ instance, value, relation } : {instance: any, value: any, relation: any}) {
                    value[relation.fkField] = instance[relation.pkField];
                    return value;
                }
            }else {
                throw new Error("TODO implement setter for relation type: "+relation.type);
            }
        })(relation);

        Object.defineProperty(instance, relation.navigator, {
            get() {
                let value = relationData.value;
                if (!relationData.fetched) {
                    value = relationData.fetcher({ instance, relation: relationData.relation });
                }
                if (value == null && relationData.returnsNew) {
                    value = relationData.setter({ instance, relation: relationData.relation, value: new relationData.relation.fkModel({}, instance.dataContext) });
                }
                if (value != null)
                    relationData.fetched = true;
                relationData.value = value;
                return value;
            },
            set(value) {
                relationData.value = relationData.setter({ instance, relation: relationData.relation, value });
                relationData.fetched = true;
                return relationData.value;
            }
        });

        Object.defineProperty(instance, relation.navigator+"_meta", {
            value: relationData,
            writable: false,
        });

        return relationData;
    }

    static getDataModel() : ModelMetaData {
        throw new Error("not implemented");
    }

    /**
     *
     * @param {import("../../context").DataContext} dataContext
     * @param {any} req
     * @returns
     */
    static fetch(dataContext: any, req: any) {
        const dataModel = this.getDataModel();
        return dataContext.fetchFromTable(dataModel, req, this);
    }

    static *fetchAll(dataContext: DataContext) {
        const dataModel = this.getDataModel();
        const items : IterableIterator<any> = dataContext.fetchAll(dataModel, this);
        for (const item of Array.from(items)) {
            yield item;
        }
    }

    static fetchAllRaw(dataContext: any) {
        const dataModel = this.getDataModel();
        return dataContext.fetchAllRaw(dataModel);
    }

    static count(dataContext: DataContext) {
        const dataModel = this.getDataModel();
        return dataContext.countFromTable(dataModel);
    }
}

export class ModelMetaData {
    fields : Array<any>;
    tableName : string;
    relations : Array<any>;
    constructor({fields, tableName, relations} : {fields: Array<any>, tableName: string, relations?: Array<any>}) {
        this.fields = fields;
        this.tableName = tableName;
        this.relations = relations;
    }
}