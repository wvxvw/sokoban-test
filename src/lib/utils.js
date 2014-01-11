/* global requirejs */

define(
    ['lodash'],
function (_) {

    var slice = Array.prototype.slice;
    
    function treeSize(tree) {
        return Math.max(
            1 + (tree.left ? treeSize(tree.left) : 0),
            1 + (tree.right ? treeSize(tree.right) : 0));
    }

    function binaryInsert(array, element) {
        if (!array.length) array.push(element);
        else if (array.length == 1) {
            if (array[0] < element) array.push(element);
            else array.unshift(element);
        } else {
            var step = Math.ceil(array.length / 2),
                pos = array.length - step, prev;
            do {
                if (step == prev) {
                    pos = Math.min(array.length, Math.max(pos, 0));
                    if (array[pos] < element) array.splice(pos + 1, 0, element);
                    else array.splice(pos, 0, element);
                    break;
                }
                prev = step;
                step = Math.ceil(step / 2);
                if (array[pos] > element) pos -= Math.max(step, 1);
                else if (array[pos] == element) {
                    array.splice(pos, 0, element);
                    break;
                } else pos += Math.max(step, 1);
            } while (1);
        }
    }

    function equal(a, b) {
        if (a == b) return true;
        if (a instanceof Array && b instanceof Array)
            return a.length == b.length && a.every(
                function (element, index) { return equal(element, b[index]); });
        return false;
    }

    function positionIf(array, predicate) {
        for (var i = 0; i < array.length; i++)
            if (predicate(array[i])) break;
        return i;
    }

    function indexOf(array, element) {
        return positionIf(
            array, function (searched) { return equal(searched, element); });
    }

    function mvcompose() {
        var funcs = slice.call(arguments).reverse();
        function composer(a, b) { return b.apply(null, a); }
        return function () {
            return funcs.reduce(composer, slice.call(arguments));
        };
    }

    function triduce(func, array, accumulator) {
        for (var i = 0, len = array.length; i < len; i++)
            accumulator = func.apply(accumulator, array[i]);
        return accumulator;
    }

    function mapply(func, array) {
        for (var result = [], i = 0, len = array.length; i < len; i++)
            result[i] = func.call(array[i]);
        return result;
    }

    function mapcall(array /* rest */) {
        for (var result = [], i = 0, len = array.length,
                 rest = slice.call(arguments, 1); i < len; i++)
            result[i] = array[i].apply(null, rest);
        return result;
    }

    function aref(array, n) { return array[n]; }
    
    function fera(n, array) { return array[n]; }

    function aset(array, n, v) { return array[n] = v; }

    function raref(array /* rest */) {
        return _.reduce(slice.call(arguments, 1), aref, array);
    }

    function ensureArray(maybeArray) {
        return maybeArray instanceof Array ? maybeArray : [maybeArray];
    }

    function constantly(value) { return function () { return value; }; }

    function times(func, i, result) {
        if (result) while (--i >= 0) result.unshift(func(i));
        else while (--i >= 0) func(i);
        return result;
    }
    
    function zipWith(func /* rest */) {
        var rest = slice.call(arguments, 1);
        return times(function (i) {
            return func.apply(null, _.map(rest, _.partial(fera, i)));
        }, _.min(_.pluck(rest, 'length')), []);
    }

    function flip(func /* rest */) {
        var rest = slice.call(arguments, 1).reverse();
        return function () {
            return func.apply(null, slice.call(arguments).concat(rest));
        };
    }

    function repeat(element, n) { return times(constantly(element), n, []); }

    function somecall(/* rest */) {
        var result, rest = slice.call(arguments), i = 0;
        // TODO: need to find out how to disable this warning
        while (result = rest[i++]) if (result()) return true;
        return false;
    }

    function capitalize(string) {
        return string.charAt().toUpperCase() + string.substr(1);
    }

    function format(string, args) {
        // this will be extended in the future
        var result = string;
        _.each(args, function (arg) {
            result = result.replace('~s', arg);
        });
        return result;
    }

    function mapc(func /* rest */) {
        // _.each has wrong arguments order and passes useless extra arguments
        // to the function it calls
        for (var i = 0, rest = slice.call(arguments, 1),
                 len = _.min(_.pluck(rest, 'length')); i < len; i++)
            func.apply(null, _.map(rest, _.partial(fera, i)));
    }

    function maphash(func /* rest */) {
        // same as _.each, its unusable when functions need to rely on proper
        // arity.
        if (arguments.length == 2) {
            for (var p in arguments[0]) func(p, arguments[0][p]);
        } else {
            var tables = slice.call(arguments, 1);
            zipWith(func, _.map(tables, _.keys), _.map(tables, _.values));
        }
    }

    function find(func /* rest */) {
        var result;
        if (arguments.length == 2) {
            var object = arguments[1];
            if (object instanceof Array) {
               for (var i = 0; i < object.length; i++) {
                   if (func(object[i])) {
                       result = object[i];
                       break;
                   }
               }
            } else {
                for (var p in object) {
                    if (func(p, object[p])) {
                        result = [p, object[p]];
                        break;
                    }
                }
            }
        } else {
            // TODO: for multiple sequences
        }
        return result;
    }
    
    return { treeSize: treeSize, binaryInsert: binaryInsert, equal: equal,
             positionIf: positionIf, indexOf: indexOf, mvcompose: mvcompose,
             triduce: triduce, mapply: mapply, mapcall: mapcall, aref: aref,
             raref: raref, constantly: constantly, zipWith: zipWith, find: find,
             ensureArray: ensureArray, times: times, flip: flip, aset: aset,
             capitalize: capitalize, format: format, mapc: mapc, maphash: maphash };
});
