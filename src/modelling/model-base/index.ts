import { DataContext, ReqArgument, ReqFieldsMap } from "../../communication/data-context/sqlite";
import { Migration } from "../../database/migration";
import { MigrationField } from "../../database/migration/field";
import { Relation } from "../../database/migration/relation";
import { IRelation, RelationData } from "../relation";
import { IModelMetaField } from "./field";

export class ModelBase {
    isNew: boolean;
    isDirty: boolean;
    dataContext: DataContext;
    relations: Array<RelationData>;

    constructor(fields = {}, dataContext: DataContext) {
        this.isNew = true;
        this.isDirty = false;
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
        if (!(relation.navigator in instance)) {
            Object.defineProperty(instance, relation.navigator, {
                get() {
                    return instance.getRelationValue(relation.navigator);
                },
                set(value) {
                    this.setRelationValue(relation.navigator, value);
                }
            });
        }

        return relationData;
    }

    private getRelationValue(navigatorName: string) {
        const relationData = this.getRelationMeta(navigatorName);
        let value = relationData.value;
        if (!relationData.fetched) {
            value = relationData.fetcher({ instance: this, relation: relationData.relation });
        }

        if (value == null && relationData.returnsNew) {
            if(relationData.relation.fkModel == null)
                throw new Error("Not implemented");
            const subVal = new relationData.relation.fkModel({}, this.dataContext);
            value = relationData.setter({ instance: this, relation: relationData.relation, value: subVal });
        }
        if (value != null)
            relationData.fetched = true;
        relationData.value = value;
        return value;
    }

    private setRelationValue(navigatorName: string, value: any) {
        const relationData = this.getRelationMeta(navigatorName);
        relationData.value = relationData.setter({ instance: this, relation: relationData.relation, value });
        relationData.fetched = true;
        return relationData.value;
    }

    getRelationMeta(relationName : string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relationData = this.relations.find(x => x.relation.navigator == relationName);
        if (relationData == null)
            throw new Error("Relation meta for "+relationName+" was not found");
        return relationData;
    }

    getSingleNavigator<T extends ModelBase>(relationName : string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //return (this as any)[relationName] as T | undefined;
        return this.getRelationValue(relationName) as T | undefined;
    }

    setSingleNavigator<T extends ModelBase>(relationName : string, value : T | undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // (this as any)[relationName] = value;
        this.setRelationValue(relationName, value);
    }

    getMultiNavigator<T extends ModelBase>(relationName : string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //return (this as any)[relationName] as T[] | undefined;
        return this.getRelationValue(relationName) as T[] | undefined;
    }

    setMultiNavigator<T extends ModelBase>(relationName : string, value : T[] | undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //(this as any)[relationName] = value;
        this.setRelationValue(relationName, value);
    }

    static createMigration() : Migration {
        const dataModel = this.getDataModel();
        const fields = this.createMigrationFields(dataModel);
        const relations = this.createMigrationRelations(dataModel);
        return new Migration(this.name).createTable(dataModel.tableName, fields, relations);
    }

    static createMigrationFields(dataModel? : ModelMetaData) : MigrationField[] {
        if (dataModel == null)
            dataModel = this.getDataModel();
        return dataModel.fields.map(x => new MigrationField({ type: x.type, name: x.name, autoIncrement: x.autoIncrement, nullable: !x.notNull, primaryKey: x.primaryKey }));
    }

    static createMigrationRelations(dataModel? : ModelMetaData) : Relation[] | undefined {
        if (dataModel == null)
            dataModel = this.getDataModel();
        if (dataModel.relations == null)
            return undefined;
        return dataModel.relations.filter(x => x.pkModel === this).map(x => {
            if (x.pkModel == undefined)
                throw new Error("pkModel was not set");
            return new Relation({ fkField: x.fkField, pkField: x.pkField, pkTable: x.pkModel.getDataModel().tableName });
        });
    }

    static getDataModel() : ModelMetaData {
        throw new Error("not implemented");
    }

    static fetch(dataContext: DataContext, req: ReqArgument) {
        const dataModel = this.getDataModel();
        return dataContext.fetchFromTable(dataModel, req, this);
    }

    static *fetchAll(dataContext: DataContext, req?: ReqFieldsMap) {
        const dataModel = this.getDataModel();
        const items : IterableIterator<ModelBase> = dataContext.fetchAll(dataModel, this, req);
        for (const item of Array.from(items)) {
            yield item;
        }
    }

    static fetchAllRaw(dataContext: DataContext) {
        const dataModel = this.getDataModel();
        return dataContext.fetchAllRaw(dataModel);
    }

    static count(dataContext: DataContext) {
        const dataModel = this.getDataModel();
        return dataContext.countFromTable(dataModel);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getFieldValue(fieldName : string) : any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any)[fieldName];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setFieldValue(fieldName : string, value : any) : void {
        this.isDirty = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any)[fieldName] = value;
    }

    public static fetchRelations(creator : (info : RelationFetchInfo) => void) {
        const info = new RelationFetchInfo(this);
        creator(info);
        return info;
    }
}

export class RelationFetchInfo {
    public modelType : typeof ModelBase;
    public items : RelationFetchItem[] = [];
    constructor(modelType : typeof ModelBase) {
        this.modelType = modelType;
    }
    public add(navName : string) : RelationFetchItem {
        const relation = this.modelType.getDataModel().relations?.find(x => x.navigator == navName);
        if (relation == null) {
            throw new Error(`Relation ${navName} not found`);
        }
        if (relation.fkModel == null) {
            throw new Error(`Relation ${navName} has no fkModel`);
        }
        const item = new RelationFetchItem(relation.fkModel, relation);
        this.items.push(item);
        return item;
    }
}

export class RelationFetchItem extends RelationFetchInfo {
    public relation : IRelation;
    constructor(modelType : typeof ModelBase, relation : IRelation) {
        super(modelType);
        this.relation = relation;
    }

}

export class ModelMetaData {
    fields : Array<IModelMetaField>;
    tableName : string;
    relations : Array<IRelation> | undefined;
    constructor({fields, tableName, relations} : {fields: IModelMetaField[], tableName: string, relations?: Array<IRelation>}) {
        this.fields = fields;
        this.tableName = tableName;
        this.relations = relations;
    }
}