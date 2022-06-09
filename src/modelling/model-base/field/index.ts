export type MetaFieldType = "int" | "text" | "decimal" | "date";

export interface IModelMetaField {
    primaryKey?: boolean;
    autoIncrement?: boolean,
    notNull?: boolean,
    name: string,
    type: MetaFieldType,
}