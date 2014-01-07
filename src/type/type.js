/* global define */

requirejs(
    ['underscore', 'utils'],
function (_, utils) {
    var types = { }, tree = { }, constructors = { }, fields = { },
        builtins = ['object', 'bool', 'string', 'number', 'func',
                    'regexp', 'date', 'sequence', 'hashmap',
                    'vector', 'error'],
        slice = Array.prototype.slice;
    
    function typeOf(value) {
        _.filter(types, function (key, predicate) {
            return predicate(value);
        });
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
        return new Error(utils.format(message, slice.call(arguments, 1)));
    }

    function nul(value) { return !object(value); }
    
    function isType(value, type) { return type(value); }

    function makeInstance(type) {
        return constructors[type].apply(null, slice.call(arguments, 1));
    }
    
    function defType(type, constructor, predicate, parents) {
        var pars = utils.ensureArray(parents || object);
        if (_.every(pars, isType)) tree[type] = pars;
        else throw makeInstance('error', 'Incorrect parent types');
        if (!(func(predicate) || string(type) || func(constructor)))
             throw makeInstance('error', 'Wrong argument types');
        constructors[type] = constructor;
        return types[type] = predicate;
    }

    function fieldsOf(type) { return fields[type] || []; }
    
    function extend(child, parent) {
        // Look into C3 for exact implementation
        // these have to agree on type
        return _.union(fieldsOf(parent), child);
    }

    function defClass(type, constructor, fields, parents) {
        var slots = fields[type] = _.reduce(parents, extend);

        function cons () {
            var result = new constructor();
            utils.zipWith(_.partial(utils.aset, result),
                          slots, slice.call(arguments));
            return result;
        };
        defType(type, cons, function (value) { return types[type]; }, parents);
        return cons;
    }

    function getType(type) { return types[type]; }

    utils.zipWith(
        _.partial(utils.aset, types), builtins,
        [object, bool, string, number, func, regexp, date,
         sequence, hashmap, vector, error]);
    utils.zipWith(
        _.partial(utils.aset, constructors), builtins,
        [cobject, cbool, cstring, cnumber, cfunc, cregexp, cdate,
         csequence, chashmap, cvector, cerror]);
    _.each(builtins, function (x) { tree[x] = ['object']; });
    fields.func = ['length'];
    fields.vector = ['length'];

    return { typeOf: typeOf, isType: isType, defType: defType, getType: getType };
});






