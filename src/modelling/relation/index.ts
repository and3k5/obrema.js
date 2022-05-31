import { ModelBase } from "../model-base";

export type RelationType = "one-to-one";

export interface IRelation {
    fkField: string;
    fkModel: typeof ModelBase;
    pkField: string;
    type: RelationType;
    navigator: string;
}

export class RelationData {
    fetched = false;
    relation: IRelation;
    value: any;
    returnsNew = false;
    fetcher: (args: { instance: object, relation: IRelation }) => object | undefined;
    setter: (args: { instance: object, value: object, relation: IRelation }) => object | undefined;

    constructor(relation : IRelation) {
        this.relation = relation;
        this.fetcher = (function (relation) {
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
        this.setter = (function (relation) {
            if (relation.type === "one-to-one") {
                return function ({ instance, value, relation } : {instance: any, value: any, relation: any}) {
                    value[relation.fkField] = instance[relation.pkField];
                    return value;
                }
            }else {
                throw new Error("TODO implement setter for relation type: "+relation.type);
            }
        })(relation);

    }
}