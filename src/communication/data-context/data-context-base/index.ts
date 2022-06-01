import { QueryEngineBase } from "../../../query/engine";
import { Migration } from "../../../database/migration";
import { LanguageEngineBase } from "../../language-engine";
import { DataBaseCommunicator } from "./communicator";

export type InitializationSettings = { disableMigrations?: boolean };
export type InputExistingData = Uint8Array | ArrayBuffer;
export abstract class DataContextBase<TCommunicator extends DataBaseCommunicator<TQueryInput>, TQueryInput> {
    protected queryEngine: QueryEngineBase<TQueryInput>
    protected migrations : Array<Migration>;
    protected languageEngine: LanguageEngineBase<TQueryInput>;
    protected db? : TCommunicator;
    constructor(queryEngine : QueryEngineBase<TQueryInput>, migrations : Array<Migration> | IterableIterator<Migration>, languageEngine : LanguageEngineBase<TQueryInput>) {
        this.queryEngine = queryEngine;
        this.migrations = Array.from(migrations);
        this.languageEngine = languageEngine;
    }

    public abstract loadNew(options? : InitializationSettings) : Promise<void>;
    public abstract loadExisting(data: InputExistingData, options? : InitializationSettings) : Promise<void>;

    protected initializeDb(db : TCommunicator) {
        this.db = db;
    }
}