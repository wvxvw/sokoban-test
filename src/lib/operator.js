/* global define */

define([], function () {

    var slice = Array.prototype.slice;
    
    function equal(a, b) {
        if (a == b) return true;
        if (a instanceof Array && b instanceof Array)
            return a.length == b.length && a.every(
                function (element, index) { return equal(element, b[index]); });
        var p;
        for (p in a) if (!(p in b)) return false;
        for (p in b) if (!(p in a)) return false;
        for (p in a) if (!equal(a[p], b[p])) return false;
        return false;
    }

    function isScalar(x) {
        return ['number', 'undefined', 'boolean', 'function'].indexOf(typeof x) > -1;
    }

    function plusString(a, b) {
        var as = stringToChars(a), bs = stringToChars(b), result = [];
        for (var i = 0, len = Math.max(as.length, bs.length); i < len; i++)
            result[i] = (as | 0) + (bs | 0);
        return String.fromCharCode.apply(String, result);
    }

    function shallowCopy(o) {
        var result = { };
        for (var p in o) result[p] = o[p];
        return result;
    }
    
    function stringToChars(s) {
        return s.split('').map(function (c) { return c.charCodeAt(); });
    }
    
    function plus(a, b) {
        var ta = typeof a, tb = typeof b, result, i, len;
        if (ta == tb) {
            switch (ta) {
            case 'number': return a + b;
            case 'string': return plusString(a, b);
            case 'undefined': return undefined;
            case 'boolean': return a == b;
            case 'function': return function (x) { return a(b(x)); };
            default:
                switch (true) {
                case a instanceof Array:
                    result = [];
                    for (i = 0, len = Math.max(a.length, b.length); i < len; i++) {
                        result[i] = plus(a[i], b[i]);
                    }
                    return result;
                case a instanceof Date:
                    return new Date(a + b);
                case !a: return b;
                case !b: return a;
                case 'plus' in a: return a.plus(b);
                case 'plus' in b: return b.plus(b);
                default:
                    var ca = shallowCopy(a), cb = shallowCopy(b), p;
                    result = { };
                    for (p in ca) {
                        if (p in cb) {
                            result[p] = plus(ca[p], cb[p]);
                            delete ca[p];
                            delete cb[p];
                        } else result[p] = ca[p];
                    }
                    for (p in cb) result[p] = cb[p];
                    return result;
                }
            }
        } else {
            switch (true) {
            case a instanceof Array:
                result = [];
                for (i = 0; i < a.length; i++)
                    result[i] = plus(a[i], b);
                return result;
            case b instanceof Array:
                result = [];
                for (i = 0; i < b.length; i++)
                    result[i] = plus(a, b[i]);
                return result;
                // asymmetric addition, me no likey :(
            case ta == 'string':
                return String.fromCharCode.apply(String, plus(stringToChars(a), b));
            case tb == 'string':
                return plus(b, stringToChars(a));
            case 'plus' in a: return a.plus(b);
            case 'plus' in b: return b.plus(a);
            case !a: return b;
            case !b: return a;
                // Have some ideas about adding functions to other scalars
                // but not certain yet
            default: throw 'Incompatible types';
            }
        }
    }
    
    return { equal: equal, plus: plus };
});
