import { ModelBase } from "../model-base";

export type RelationType = "one-to-one" | "one-to-many";

export interface IRelation {
    fkField: string;
    fkModel?: typeof ModelBase;
    pkModel?: typeof ModelBase;
    pkField: string;
    type: RelationType;
    navigator: string;
}

type FetcherResultModel = ModelBase | ModelBase[];
type RelationFetcher = (args: { instance: object, relation: IRelation }) => FetcherResultModel | null;
type RelationSetter = ((args: { instance: object, value: ModelBase| ModelBase[], relation: IRelation }) => ModelBase | ModelBase[]);

function createFetcher(relation : IRelation) {
    if (relation.type === "one-to-one") {
        return createFetcherForOneToOne();
    }else if (relation.type === "one-to-many") {
        return createFetcherForOneToMany();
    }else {
        throw new Error("TODO implement fetcher for relation type: "+relation.type);
    }
}

function createFetcherForOneToOne() {
    return function ({ instance, relation } : { instance: any, relation: IRelation }) {
        const req: any = {};
        req[relation.fkField] = instance[relation.pkField];
        if (instance.dataContext == null)
            throw new Error("cannot fetch relation: no dataContext");
        if (relation.fkModel == null)
            throw new Error("cannot fetch relation: no fkModel");
        return relation.fkModel.fetch(instance.dataContext, req);
    };
}

function createFetcherForOneToMany() {
    return function ({ instance, relation } : { instance: any, relation: IRelation }) {
        const req: any = {};
        req[relation.fkField] = instance[relation.pkField];
        if (instance.dataContext == null)
            throw new Error("cannot fetch relation: no dataContext");
        if (relation.fkModel == null)
            throw new Error("cannot fetch relation: no fkModel");

        const result = Array.from(relation.fkModel.fetchAll(instance.dataContext, req));

        return result;
    };
}

function createSetter(relation : IRelation) {
    if (relation.type === "one-to-one") {
        return createSetterForOneToOne();
    }else if (relation.type === "one-to-many") {
        return createSetterForOneToMany();
    }else {
        throw new Error("TODO implement setter for relation type: "+relation.type);
    }
}

function createSetterForOneToOne() : RelationSetter {
    return function ({ instance, value, relation } : {instance: object, value: ModelBase | ModelBase[], relation: IRelation}) {
        if (Array.isArray(value))
            throw new Error("Wrong type in call");
        value.setFieldValue(relation.fkField, (instance as any)[relation.pkField]);
        return value;
    };
}

function createSetterForOneToMany() : RelationSetter {
    return function ({ instance, value, relation } : {instance: object, value: ModelBase | ModelBase[], relation: IRelation}) {
        if (value instanceof ModelBase)
            throw new Error("Wrong type in call");
        for (const item of value) {
            item.setFieldValue(relation.fkField, (instance as any)[relation.pkField]);
        }
        return value;
    };
}

export class RelationData {
    fetched = false;
    relation: IRelation;
    value: any;
    returnsNew = false;
    fetcher: RelationFetcher;
    setter: RelationSetter;

    constructor(relation : IRelation) {
        this.relation = relation;
        this.fetcher = createFetcher(relation);
        this.setter = createSetter(relation);
    }
}