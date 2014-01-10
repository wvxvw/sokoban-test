/* global define */

define(
    ['lodash', 'lib/utils'],
function (_, u) {
    var types = { }, tree = { }, constructors = { },
        builtins = ['object', 'bool', 'string', 'number', 'func',
                    'regexp', 'date', 'sequence', 'hashmap',
                    'vector', 'error'],
        slice = Array.prototype.slice;
    
    function typeOf(value) {
        return _.filter(types, function (key, predicate) {
            return predicate(value);
        })[0] || nul;
    }

    function object(value) {
        return !(typeof value == 'undefined' || value === null);
    }

    function cobject() { return true; }

    function bool(value) { return typeof value == 'boolean'; }

    function cbool(value) { return !!value; }

    function string(value) { return typeof value == 'string'; }

    function cstring(value) { return String(value); }

    function number(value) { return typeof value == 'number'; }

    function cnumber(value) { return Number(value); }

    function func(value) { return value instanceof Function; }

    function cfunc(value) { return new Function(value); }

    function regexp(value) { return value instanceof RegExp; }

    function cregexp(value, flags) { return new RegExp(value, flags); }

    function date(value) { return value instanceof Date; }

    function cdate(value) { return new Date(value); }

    function sequence(value) { return typeof value == 'object'; }

    function csequence() { return { }; }

    function hashmap(value) { return sequence(value); }

    function chashmap() { return csequence(); }

    function vector(value) { return value instanceof Array; }

    function cvector() { return slice.call(arguments); }

    function error(value) { return value instanceof Error; }

    function cerror(message) {
        return new Error(u.format(message, slice.call(arguments, 1)));
    }

    function nul(value) { return !object(value); }

    function isSubtypeOf(type, maybeSuper) {
        var supertypes = tree[type], result;
        if (!(maybeSuper != 'object' && u.equal(supertypes, ['object'])))
            result = maybeSuper == 'object' || supertypes.indexOf(maybeSuper) > -1 ||
            _.some(supertypes, u.flip(maybeSuper));
        return result;
    }
    
    function subtypesOf(type) {
        return _.filter(types, _.partial(isSubtypeOf, type));
    }
    
    function isType(value, type) {
        return types[type](value) || u.somecall(subtypesOf(type));
    }
    
    function defType(type, predicate, parents) {
        // We don't have object yet, and circular dependencies aren't allowed
        var pars = u.ensureArray(parents || object);
        if (_.every(pars, function (parent) { return parent in types; }))
            tree[type] = pars;
        else throw cerror('Incorrect parent types: ~s', parents);
        if (!(func(predicate) || string(type)))
             throw cerror('Wrong argument types: ~s', [predicate, type]);
        return types[type] = predicate;
    }

    function getType(type) { return types[type]; }

    u.zipWith(
        function (x, y) {
            _.partial(u.aset, types)(x, y);
        }, builtins,
        [object, bool, string, number, func, regexp, date,
         sequence, hashmap, vector, error]);
    u.zipWith(
        _.partial(u.aset, constructors), builtins,
        [cobject, cbool, cstring, cnumber, cfunc, cregexp, cdate,
         csequence, chashmap, cvector, cerror]);
    _.each(builtins, function (x) { tree[x] = ['object']; });

    return { typeOf: typeOf, isType: isType, defType: defType, getType: getType,
             builtins: {
                 object: object, bool: bool, string: string, number: number,
                 func: func, regexp: regexp, date: date, sequence: sequence,
                 hashmap: hashmap, vector: vector, error: error } };
});
