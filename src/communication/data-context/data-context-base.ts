import { QueryEngineBase } from "../../query/engine";
import { Migration } from "../../database/migration";
import { LanguageEngineBase } from "../language-engine";

export abstract class DataContextBase {
    protected queryEngine: QueryEngineBase
    protected migrations : Array<Migration>;
    protected languageEngine: LanguageEngineBase;
    constructor(queryEngine : QueryEngineBase, migrations : Array<Migration> | IterableIterator<Migration>, languageEngine : LanguageEngineBase) {
        this.queryEngine = queryEngine;
        this.migrations = Array.from(migrations);
        this.languageEngine = languageEngine;
    }
}