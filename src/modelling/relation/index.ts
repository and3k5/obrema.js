import { Relation } from "../../database/migration/relation";

export class RelationData {
    fetched = false;
    relation: any;
    value: any;
    returnsNew = false;
    fetcher: (args: { instance: object, relation: Relation }) => object | undefined;
    setter: (args: { instance: object, value: object, relation: Relation }) => object | undefined;

    constructor(relation : any) {
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