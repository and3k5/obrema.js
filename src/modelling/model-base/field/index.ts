type MetaFieldType = "int" | "text";

export interface IModelMetaField {
    primaryKey?: boolean;
    autoIncrement?: boolean,
    notNull?: boolean,
    name: string,
    type: MetaFieldType,
}