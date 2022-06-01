import { expect } from "chai";
import { parsePredicateFromFunction } from "./parse";

describe.only("parsePredicateFromFunction", function () {
    [
        { caseName: "eq + and", func: (x: any) => x.mySpecialField == 2 && x.myOtherField == null, expectedQuery: "[mySpecialField] = @p0 AND [myOtherField] = @p1" },
        { caseName: "eq + or", func: (x: any) => x.mySpecialField == 2 || x.myOtherField == null, expectedQuery: "[mySpecialField] = @p0 OR [myOtherField] = @p1" },
        { caseName: "gt + neq + and", func: (x: any) => x.mySpecialField > 2 && x.myOtherField != null, expectedQuery: "[mySpecialField] > @p0 AND [myOtherField] != @p1" },
        { caseName: "gt + neq + or", func: (x: any) => x.mySpecialField > 2 || x.myOtherField != null, expectedQuery: "[mySpecialField] > @p0 OR [myOtherField] != @p1" },
    ].forEach(({ caseName, func, expectedQuery }) => {
        it(`can parse a simple predicate to sql (${caseName})`, function () {
            var whereClause = parsePredicateFromFunction(func);
            const querySql = whereClause.toRawString();
            const queryParameters = whereClause.getParameters();
            expect(querySql).equal(expectedQuery);
            expect(querySql).equal(expectedQuery);
            expect(queryParameters.length).equal(2);
            expect(queryParameters[0].placeholderName).equal("@p0");
            expect(queryParameters[0].value).equal(2);
            expect(queryParameters[1].placeholderName).equal("@p1");
            expect(queryParameters[1].value).equal(null);
        });
    });
    [
        { caseName: "case 1", func: (x: any) => x.myFirstField == 1 || (x.mySpecialField == 2 && x.myOtherField == null), expectedQuery: "[myFirstField] = @p0 OR [mySpecialField] = @p1 AND [myOtherField] = @p2" },
    ].forEach(({ caseName, func, expectedQuery }) => {
        it(`can parse a predicate with OR to sql (${caseName})`, function () {
            var whereClause = parsePredicateFromFunction(func);
            const querySql = whereClause.toRawString();
            const queryParameters = whereClause.getParameters();
            expect(querySql).equal(expectedQuery);
            expect(queryParameters.length).equal(3);
            expect(queryParameters[0].placeholderName).equal("@p0");
            expect(queryParameters[0].value).equal(1);
            expect(queryParameters[1].placeholderName).equal("@p1");
            expect(queryParameters[1].value).equal(2);
            expect(queryParameters[2].placeholderName).equal("@p2");
            expect(queryParameters[2].value).equal(null);
        });
    });

    // [
    //     { caseName: "case 1", func: (x: any) => (x.mySpecialField == 4) || (x.mySpecialField == 2 && (x.myOtherField == null || x.myOtherField != null)), expectedQuery: "[mySpecialField] = @p0 AND [myOtherField] = @p1 OR [mySpecialField] = @p2 AND [myOtherField] = @p3" },
    // ].forEach(({ caseName, func, expectedQuery }) => {
    //     it(`can parse a predicate with multiple OR to sql (${caseName})`, function () {
    //         var whereClause = parsePredicateFromFunction(func);
    //         const querySql = whereClause.toRawString();
    //         const queryParameters = whereClause.getParameters();
    //         expect(querySql).equal(expectedQuery);
    //         expect(queryParameters.length).equal(2);
    //         expect(queryParameters[0].placeholderName).equal("@p0");
    //         expect(queryParameters[0].value).equal(1);
    //         expect(queryParameters[1].placeholderName).equal("@p1");
    //         expect(queryParameters[1].value).equal(2);
    //         expect(queryParameters[2].placeholderName).equal("@p2");
    //         expect(queryParameters[2].value).equal(null);
    //     });
    // });
})