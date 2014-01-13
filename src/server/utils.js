/* global require, process, module */

module.exports.sum = function (a, b) { return a + b; };

module.exports.fold = function (array, chop) {
    var result = [], i = 0;
    while (i < array.length) {
        result.push(array.slice(i, i + chop));
        i += chop;
    }
    return result;
};
