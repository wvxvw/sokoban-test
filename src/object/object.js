/* global define */

requirejs(
    ['underscore', 'utils', 'type'],
function (_, u, t) {

    var slice = Array.prototype.slice, b = t.builtins, fields = { };
    
    function makeInstance(type) {
        return t.getType(type).apply(null, slice.call(arguments, 1));
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
            u.zipWith(_.partial(u.aset, result),
                          slots, slice.call(arguments));
            return result;
        };
        t.defType(type, cons, function (value) {
            // or subtypes
            return t.getType(type);
        }, parents);
        return cons;
    }

    function defGeneric(name, args) {

    }

    function defMethod(name, signature, body) {

    }

    function oset(slot, object, value) {

    }

    function oget(slot, object) {

    }

    // some built-in classes have fields
    fields.func = ['length'];
    fields.vector = ['length'];

    return { defClass: defClass, makeInstance: makeInstance, defGeneric: defGeneric,
             defMethod: defMethod, oset: oset, oget: oget };
});






