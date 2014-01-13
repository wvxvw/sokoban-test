/* global module */

var handlers = { };

function registerHandler(url, handler) {
    var verbs = url.split('/'), tree = handlers, verb;
    while (verbs.length > 1) {
        verb = verbs.shift();
        if (!(verb in tree)) tree[verb] = { };
        tree = tree[verb];
    }
    tree[verbs.shift()] = handler;
}

function findHandler(url) {
    var verbs = url.substr(1).split('/'), verb = verbs.shift(),
        result = handlers, last = verbs[Math.max(verbs.length - 1, 0)],
        ext, query, hash;
    // TODO: This can be written more generically
    if (last && last.indexOf('.') > -1) {
        ext = last.substr(last.indexOf('.') + 1);
        last = last.substr(0, last.indexOf('.'));
        verbs[Math.max(verbs.length - 1, 0)] = last;
    }
    if (ext && ext.indexOf('?') > -1) {
        query = ext.substr(ext.indexOf('?') + 1);
        ext = ext.substr(0, ext.indexOf('?'));
    }
    if (query && query.indexOf('#') > -1) {
        hash = query.substr(ext.indexOf('#') + 1);
        query = query.substr(0, query.indexOf('#'));
    }
    do {
        if (verb in result) result = result[verb];
        else if ('*' in result) result = result['*'];
        else if (!verbs.length && ext && (('*.' + ext) in result))
            result = result['*.' + ext];
        else if (!verbs.length && ext && ('*.*' in result))
            result = result['*.*'];
        else if ('**' in result) result = result['**'];
        else result = null;
        verb = verbs.shift();
    } while (result && typeof result != 'function');
    return result;
}

function hasHandler(url) {
    return typeof findHandler(url) == 'function';
}

function dispatch(req, res) {
    return findHandler(req.url)(req, res);
}

module.exports = { dispatch: dispatch, hasHandler: hasHandler,
                   findHandler: findHandler, registerHandler: registerHandler };
