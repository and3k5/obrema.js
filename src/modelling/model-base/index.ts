import { DataContext } from "../../communication/data-context";
import { IRelation, RelationData } from "../relation";
import { IModelMetaField } from "./field";

export class ModelBase {
    isNew: boolean;
    dataContext: DataContext;
    relations: Array<RelationData>;

    constructor(fields = {}, dataContext: DataContext) {
        this.isNew = true;
        if (dataContext == null)
            throw new Error("required: dataContext");

        this.dataContext = dataContext;

        const constructor = this.constructor as typeof ModelBase;

        const dataModel : ModelMetaData = constructor.getDataModel();
        for (const field of dataModel.fields) {
            this.setFieldValue(field.name, undefined);
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

    static setupRelation(instance: ModelBase, relation: IRelation) {
        const relationData = new RelationData(relation);

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

    static fetch(dataContext: DataContext, req: any) {
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

    public getFieldValue(fieldName : string) : any {
        return (this as any)[fieldName];
    }

    public setFieldValue(fieldName : string, value : any) : void {
        return (this as any)[fieldName] = value;
    }
}

export class ModelMetaData {
    fields : Array<IModelMetaField>;
    tableName : string;
    relations : Array<IRelation> | undefined;
    constructor({fields, tableName, relations} : {fields: IModelMetaField[], tableName: string, relations?: Array<any>}) {
        this.fields = fields;
        this.tableName = tableName;
        this.relations = relations;
    }
}