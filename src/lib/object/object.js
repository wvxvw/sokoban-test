/* global define */

define(
    ['lodash', 'lib/utils', 'lib/type'],
function (_, u, t) {

    var slice = Array.prototype.slice, b = t.builtins, classes = { },
        generics = { }, methods = { };

    function computeSlots(type) {
        var result = classes[type].slots || { };
        u.mapc(classes[type].slots = result, u.flip(makeSlot, result, type));
        return result;
    }

    function makeSlot(description, slots, type) {
        var val, result = classes[type][description.name] = function (value) {
            if (arguments.length) {
                if (t.getType(description.type)(value))
                    return description.value = value;
                else throw new Error(
                    'Expected type: ' + description.type +
                        ' but got ' + t.typeOf(value));
            } else return description.value;
        };
        if ('iniform' in description) {
            if (b.func(description.iniform))
                val = description.iniform();
            else val = description.iniform;
            if (t.getType(description.type)(description.iniform))
                description.value = val;
            else throw new Error(
                'Incompatible initform, expected ' +
                    description.type + ' but got ' + t.typeOf(val));
        }
        methods[type + u.capitalize(description.name)] = result;
        // TODO: class allocation (vs instance allocation)
        // TODO: slots will be bound by default, maybe not such a good idea?
        return result;
    }
    
    function makeInstance(type, initialValues) {
        var slots = computeSlots(type), cons = classes[type],
            result = function (slot, value) {
                switch (arguments.length) {
                case 0: return cons;
                case 1:
                case 2:
                    if (!(slot in slots))
                        throw new Error('Class ' + type + ' has no slot ' + slot);
                    return slots[slot](value);
                default:
                    throw new Error('Extra arguments ' + slice.call(arguments));
                }
            };
        u.maphash(result, initialValues);
        result.t = t.typeOf;
        return result;
    }

    function extend(child, parent) {
        // TODO: Look into C3 for exact implementation
        // these have to agree on type
        return _.union(classes[parent].slots, child);
    }

    function defClass(type, parents, fields) {
        if (!b.string(type))
            throw new Error(u.format('Argument ~s must be a string', [type]));
        if (!(b.vector(parents) && _.every(parents, b.string)))
            throw new Error(u.format('Invalid superclass types of ~s', [type]));
        if (!(b.vector(fields) && _.every(fields, b.hashtable)))
            throw new Error(u.format('Invalid superclass fields of ~s', [type]));

        if (!parents.length) parents.push('object');
        t.defType(type, function (value) {
            return b.func(value) && value()() == type;
        }, parents);
        return classes[type] = function (slots, type) {
            return function () { return arguments.length ? slots : type; };
        }(_.reduce(parents, extend, fields), type);
    }

    function chooseBestMethod(methodsGroup, args) {
        // not implementing keys, optional or rest for now
        return methodsGroup[_.map(args, t.typeOf).join('/')];
    }
    
    function defGeneric(name, args) {
        if (!b.string(name)) throw new Error('Generic name must be a string');
        if (!b.vector(args)) throw new Error('Arguments must be a vector');
        
        var seenOpt, seenKeys, seenRest;
        _.each(args, function (arg) {
            switch (arg) {
            case '&optional':
                if (seenRest || seenKeys)
                    throw new Error('Optional arguments are not allowed after keys or rest');
                seenOpt = true;
                break;
            case '&rest':
            case '&aux':
                seenRest = true;
                break;
            case '&key':
                if (seenRest)
                    throw new Error('Optional arguments are not allowed after rest');
                seenKeys = true;
                break;
            case '&allow-other-keys':
                // not implemented
                break;
            }
        });
        generics[name] = function (args) {
            return function () {
                var a = slice.call(arguments);
                var result = chooseBestMethod(methods[name], a, args);
                if (!result)
                    throw new Error('No method matches these arguments ' + a);
                return result.apply(null, a);
            };
        }(args);
        methods[name] = { };
        return generics[name];
    }

    function isSignatureCompatible(signature, name) {
        // not implemented yet
        return true;
    }

    function hashMethodName(signature) {
        // too simplistic
        return signature.join('/');
    }

    function defMethod(name, signature, body) {
        if (!isSignatureCompatible(signature, name))
            throw new Error('Defining method ' + name +
                            'with incompatible signature ' + signature);
        if (!name in methods) methods[name] = { };
        return methods[name][hashMethodName(signature)] = body;
    }

    function oset(slot, object, value) {
        // not implemented for this version
    }

    function oget(slot, object) {
        // not implemented for this version
    }

    // some built-in classes have fields
    classes.func = { type: 'func' };
    classes.func.slots =
        [makeSlot({ name: 'length', initform: 0, type: b.number },
                  classes.func, 'func')];
    classes.vector = { type: 'vector' };
    classes.vector.slots =
        [makeSlot({ name: 'length', initform: 0, type: b.number },
                  classes.vector, 'vector')];
    classes.object = { type: 'object', slots: [] };

    return { defClass: defClass, makeInstance: makeInstance, defGeneric: defGeneric,
             defMethod: defMethod, methods: generics };
});
