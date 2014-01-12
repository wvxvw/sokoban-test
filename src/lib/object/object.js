/* global define */

define(
    ['lodash', 'lib/utils', 'lib/type'],
function (_, u, t) {

    var slice = Array.prototype.slice, b = t.builtins, classes = { },
        generics = { }, methods = { };

    function computeSlots(type) {
        var slots = classes[type](0) || { },
            result = { };
        _.each(slots, function (value, key) {
            if (value.allocation != 'class')
                result[key] = copySlotDescription(value);
        });
        _.each(result, function (value, key) {
            if (value.allocation != 'class')
                slots[key] = makeSlot(value, type, key);
        });
        return slots;
    }

    function makeSlot(description, type, name) {
        var val, result = function (object, value) {
                switch (arguments.length) {
                case 0:
                    throw new Error(
                        u.format('Not enough arguments for ~s', [name]));
                case 1:
                    if (t.isType(object, type))
                        return description.value;
                    else throw new Error(
                        u.format('Expected object to be of type ~s, but got ~s',
                                [type, t.typeOf(object)]));
                case 2:
                    if (t.isType(object, type) &&
                        ((description.type && description.type(value)) ||
                         !description.type))
                        return description.value = value;
                    else throw new Error(
                        u.format('Expected argument types ~s and ~s, but got ~s and ~s',
                                 // TODO: find out where else `getType' is used
                                 // the code below is wrong, but maybe we could make
                                 // it actually do what it was intended for
                                 [type, t.getType(description.type),
                                  t.typeOf(object), t.typeOf(value)]));
                default:
                    throw new Error(
                        u.format('Expected at most two arguments, but got ~s',
                                 arguments.length));
                }
        };
        if ('initform' in description) {
            if (b.func(description.initform)) val = description.initform();
            else val = description.initform;
            if ((description.type && description.type(val)) ||
                !description.type) description.value = val;
            else throw new Error(
                u.format('Incompatible initform, expected ~s but got ~s',
                         [description.type, t.typeOf(val)]));
        }
        // TODO: this should be an actual generic some day
        // generics[slotName] = result;
        // TODO: class allocation (vs instance allocation)
        // TODO: slots will be bound by default, maybe not such a good idea?
        return result;
    }
    
    function makeInstance(type, initialValues) {
        var slots = computeSlots(type), cons = classes[type],
            result = function (slot, value) {
                if (arguments.length && !(slot in slots))
                    throw new Error('Class ' + type + ' has no slot ' + slot);
                switch (arguments.length) {
                case 0: return cons;
                case 1: return slots[slot](result);
                case 2: return slots[slot](result, value);
                default:
                    throw new Error('Extra arguments ' + slice.call(arguments));
                }
            };
        u.maphash(result, initialValues);
        result.toString = function () { return "[object #" + type + "]"; };
        return result;
    }

    function copySlotDescription(old) {
        var result = { type: old.type || b.object,
                       allocation: old.allocation || 'instance' };
        if ('initform' in old) result.initform = old.initform;
        return result;
    }
    
    function extend(parent, child) {
        // TODO: Look into C3 for exact implementation
        // these have to agree on type
        var result = { }, copier = function(value, key) {
            result[key] = copySlotDescription(value);
        };
        _.each(classes[parent](0), copier);
        _.each(child, copier);
        return result;
    }

    function defClass(type, parents, fields) {
        parents = parents || ['object'];
        fields = fields || { };
        if (!b.string(type))
            throw new Error(u.format('Argument ~s must be a string', [type]));
        if (!(b.vector(parents) && _.every(parents, b.string)))
            throw new Error(u.format('Invalid superclass types of ~s', [type]));
        if (!(b.hashtable(fields) && _.every(fields, b.hashtable)))
            throw new Error(u.format('Invalid superclass fields of ~s', [type]));

        if (!parents.length) parents.push('object');
        t.defType(type, function (value) {
            return b.func(value) && value()() == type;
        }, parents);
        
        return classes[type] = function (rawSlots, type) {
            var slots = { };
            _.each(rawSlots, function (value, key) {
                generics[type + u.capitalize(key)] = function (object, value) {
                    // this is rad...
                    return (arguments.length == 2) ?
                        object()(0)[key](object, value) : object()(0)[key](object);
                };
                slots[key] = copySlotDescription(value);
            });
            return function () { return arguments.length ? slots : type; };
        }(_.reduce(parents.concat(fields), extend), type);
    }

    function chooseBestMethod(methodsGroup, args) {
        // TODO: &keys, &optional or &rest
        var types = _.map(args, t.typeOf),
            result = methodsGroup[types.join('/')];
        if (!result) {
            // TODO: not trying to find best match, whichever fits first wins
            // will do it properly later
            result = _.filter(methodsGroup, function (value, key) {
                var parts = key.split('/');
                return (parts.length == args.length) &&
                    _.every(parts, function (part, i) {
                        return part == types[i] || t.isSubtypeOf(types[i], part);
                    });
            });
            if (result) result = result[0];
        }
        return result;
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
    // this needs cleanup
    classes.func = function (slots) {
        return function () {
            return (arguments.length) ? slots : 'func';
        };
    }({ length: makeSlot({ initform: 0, type: b.number }, 'func', 'length') });
    
    classes.vector = function (slots) {
        return function () {
            return (arguments.length) ? slots : 'func';
        };
    }({ length: makeSlot({ initform: 0, type: b.number }, 'vector', 'length') });

    classes.object = function () {
        return (arguments.length) ? { } : 'func';
    };

    return { defClass: defClass, makeInstance: makeInstance, defGeneric: defGeneric,
             defMethod: defMethod, methods: generics };
});
