import { parsePredicateFromFunction } from ".";

describe("parsePredicateFromFunction", function () {
    [
        { caseName: "eq + and", func: x => x.mySpecialField == 2 && x.myOtherField == null, expectedQuery: "[mySpecialField] = @p0 AND [myOtherField] = @p1" },
        { caseName: "eq + or", func: x => x.mySpecialField == 2 || x.myOtherField == null, expectedQuery: "[mySpecialField] = @p0 OR [myOtherField] = @p1" },
        { caseName: "gt + neq + and", func: x => x.mySpecialField > 2 && x.myOtherField != null, expectedQuery: "[mySpecialField] > @p0 AND [myOtherField] != @p1" },
        { caseName: "gt + neq + or", func: x => x.mySpecialField > 2 || x.myOtherField != null, expectedQuery: "[mySpecialField] > @p0 OR [myOtherField] != @p1" },
    ].forEach(({ caseName, func, expectedQuery }) => {
        it(`can parse a simple predicate to sql (${caseName})`, function () {
            var whereClause = parsePredicateFromFunction(func);
            const querySql = whereClause.toRawString();
            const queryParameters = whereClause.getParameters();
            assert.equal(querySql, expectedQuery);
            assert.equal(queryParameters.length, 2);
            assert.equal(queryParameters[0].placeholderName, "@p0");
            assert.equal(queryParameters[0].value, 2);
            assert.equal(queryParameters[1].placeholderName, "@p1");
            assert.equal(queryParameters[1].value, null);
        });
    });
    [
        { caseName: "case 1", func: x => x.myFirstField == 1 || (x.mySpecialField == 2 && x.myOtherField == null), expectedQuery: "[myFirstField] = @p0 OR [mySpecialField] = @p1 AND [myOtherField] = @p2" },
    ].forEach(({ caseName, func, expectedQuery }) => {
        it(`can parse a predicate with OR to sql (${caseName})`, function () {
            var whereClause = parsePredicateFromFunction(func);
            const querySql = whereClause.toRawString();
            const queryParameters = whereClause.getParameters();
            assert.equal(querySql, expectedQuery);
            assert.equal(queryParameters.length, 3);
            assert.equal(queryParameters[0].placeholderName, "@p0");
            assert.equal(queryParameters[0].value, 1);
            assert.equal(queryParameters[1].placeholderName, "@p1");
            assert.equal(queryParameters[1].value, 2);
            assert.equal(queryParameters[2].placeholderName, "@p2");
            assert.equal(queryParameters[2].value, null);
        });
    });

    // [
    //     { caseName: "case 1", func: x => (x.mySpecialField == 4) || (x.mySpecialField == 2 && (x.myOtherField == null || x.myOtherField != null)), expectedQuery: "[mySpecialField] = @p0 AND [myOtherField] = @p1 OR [mySpecialField] = @p2 AND [myOtherField] = @p3" },
    // ].forEach(({ caseName, func, expectedQuery }) => {
    //     it(`can parse a predicate with multiple OR to sql (${caseName})`, function () {
    //         var whereClause = parsePredicateFromFunction(func);
    //         const querySql = whereClause.toRawString();
    //         const queryParameters = whereClause.getParameters();
    //         assert.equal(querySql, expectedQuery);
    //         assert.equal(queryParameters.length, 2);
    //         assert.equal(queryParameters[0].placeholderName, "@p0");
    //         assert.equal(queryParameters[0].value, 1);
    //         assert.equal(queryParameters[1].placeholderName, "@p1");
    //         assert.equal(queryParameters[1].value, 2);
    //         assert.equal(queryParameters[2].placeholderName, "@p2");
    //         assert.equal(queryParameters[2].value, null);
    //     });
    // });
})