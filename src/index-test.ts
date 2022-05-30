import { expect } from "chai";
import { ModelBase } from ".";

describe("index.ts", function () {
    it("has ModelBase", function () {
        expect(ModelBase).not.to.be.null;
        expect(ModelBase).not.to.be.undefined;
    });
});