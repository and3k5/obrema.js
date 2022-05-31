import { default as initSqlJs } from "sql.js";
import { lazy } from "lazy-var";

const sqlWasm = require("sql.js/dist/sql-wasm.wasm");
const lazyInit = lazy(async () => await initSqlJs({
    locateFile: () => {
        return sqlWasm;
    }
}));

export async function load() {
    return await lazyInit.get();
}