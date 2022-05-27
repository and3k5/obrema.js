import { Relation } from "../../database/migration/relation";

export class RelationData {
    fetched: boolean;
    relation: any;
    value: any;
    returnsNew: boolean;
    fetcher: (args: { instance: object, relation: Relation }) => object | undefined;
    setter: (args: { instance: object, value: object, relation: Relation }) => object | undefined;
}