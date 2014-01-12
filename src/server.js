// TODO: This script is begging for better organization,
// but I didn't have time to make it better

function optParse(argv) {
    // Do not use `node-commandline' it's too bad :(
    return { program: argv[0], script: argv[1] };
}

var http = require('http'),
    _ = require('lodash'),
    stat = require('node-static'),
    fs = require('fs'),
    mysql = require('mysql'),
    crypto = require('crypto'),
    options = optParse(process.argv),
    webroot = options.webroot ||
        options.script.replace(/[^\/]+\/[^\/]+$/g, 'bin'),
    port = options.port || 8000,
    file = new stat.Server(webroot, { 
        cache: 600, 
        headers: { 'X-Powered-By': 'node-static' } }),
    handlers = { };

var levels, connection;

fs.readFile(webroot + '/' + 'config.json', function (err, data) {
    var result;
    if (err) {
        console.error(
            'Could not load level data from: ' +
                webroot + '/' + 'config.json, because ' + err);
        levels = [];
    } else {
        result = JSON.parse(data);
        levels = result.levels;
        connection = mysql.createConnection(
            { host: 'localhost',
              user : result.dbuser,
              password: result.dbpassword,
              database: result.dbname });
        connection.connect();
    }
});

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

// TODO: this should go to utils, `lodash' doesn't have one :/
function sum(a, b) { return a + b; }

function withPost(req, res, handler) {
    var result = [];
    if (req.method == 'POST') {
        req.on('data', function (data) {
            result.push(data);
            if (_.reduce(_.map(_.partial(_.pluck, 'length'), result), sum)  > 1000) { 
                req.connection.destroy();
            }
        });
        req.on('end', function () { handler(result.join('')); });
    }
}

function storeUser(uid, level, state) {
    connection.query(
        'insert into players (uid, level, state, active) values ' +
            ['(\'' + uid + '\', ' + level + ', \'' + state + '\', now())'],
        function (err, rows, fields) {
            if (err) throw err;
            console.log('Recorded user: ' + uid);
        });
}

function fetchUser(uid, continuation) {
    uid = uid.replace(/[^\dabcdef]/gi, '');
    if (uid.length == 32) {
        connection.query(
            'select level, state from players where players.uid = \'' +
                uid + '\' limit 1', function (err, rows) {
                    if (err) throw err;
                    continuation(rows);
                });
    }
}

function levelHandler(req, res) {
    withPost(req, res, function (post) {
        var level = parseInt(
            req.url.replace(/\/(?:[^\/]+\/)+(\d)\.\w+/, '$1'), 10) | 0,
             md5sum = crypto.createHash('md5'), uid, result;
        level = Math.min(levels.length - 1, Math.max(0, level));
        md5sum.update(Math.random().toString());
        uid = md5sum.digest('hex');
        storeUser(uid, level, _.flatten(levels[level].map).join(''));
        result = { level: levels[level], uid: uid };
        res.end(JSON.stringify(result));
    });
}

function findPlayer(map) {
    // TODO: get player's digit from config
    var row, result = [];
    outer: for (var y = 0; y < map.length; y++) {
        row = map[y];
        for (var x = 0; x < row.length; x++) {
            if (row[x] == 0 || row[x] == 6) {
                result.push(x, y);
                break outer;
            }
        }
    }
    return result;
}

function findNeighbour(map, player, direction) {
    var result;
    switch (direction) {
    case 'up':
        if (player[1] > 0)
            result = [player[0], player[1] - 1];
        break;
    case 'down':
        if (player[1] < map.length)
            result = [player[0], player[1] + 1];
        break;
    case 'right':
        if (player[0] < map[0].length)
            result = [player[0] + 1, player[1]];
        break;
    case 'left':
        if (player[0])
            result = [player[0] - 1, player[1]];
    }
    return result;
}

function calculateMove(map, direction) {
    // TODO: this needs serious rewrite...
    var player = findPlayer(map), neighbourDigit, boxNeighbourDigit,
        playerDigit = map[player[0]][player[1]], boxNeighbour,
        neighbour = findNeighbour(map, player, direction);
    // TODO: take digits from config
    // 2 is wall
    // 1 is floor
    // 3 is box
    // 4 is goal
    // 5 is goal box
    if (neighbour) {
        neighbourDigit = map[neighbour[1]][neighbour[0]];
        switch (neighbourDigit) {
        case 2: break;
        case 1:
        case 4:
            map[neighbour[1]][neighbour[0]] = (neighbourDigit == 1) ? 0 : 6;
            map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
            break;
        case 3:
        case 5:
            boxNeighbour = findNeighbour(map, neighbour, direction);
            if (boxNeighbour) {
                // TODO: can we move two boxes at a time?
                // at the moment we can't
                boxNeighbourDigit = map[boxNeighbour[1]][boxNeighbour[0]];
                switch (boxNeighbourDigit) {
                case 2:
                case 3:
                case 5: break;
                case 1:
                    map[boxNeighbour[1]][boxNeighbour[0]] = 3;
                    map[neighbour[1]][neighbour[0]] = (neighbourDigit == 3) ? 0 : 6;
                    map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
                case 4:
                    map[boxNeighbour[1]][boxNeighbour[0]] = 5;
                    map[neighbour[1]][neighbour[0]] = (neighbourDigit == 3) ? 0 : 6;
                    map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
                    break;
                }
            }
        }
    }
    return map;
}

// TODO: move this to utilis
function fold(array, chop) {
    var result = [], i = 0;
    while (i < array.length) {
        result.push(array.slice(i, i + chop));
        i += chop;
    }
    return result;
}

function moveHandler(req, res) {
    withPost(req, res, function (post) {
        var postData = JSON.parse(post);
        fetchUser(postData.uid, function (rows) {
            var copy = JSON.parse(JSON.stringify(levels[0]));
            copy.map = calculateMove(
                fold(_.map(rows[0].state.split(''),
                           _.compose(parseInt, _.identity)), 8),
                req.url.replace(/\/(?:[^\/]+\/)+(\w+)\.json/, '$1'));
            res.end(JSON.stringify({ uid: postData.uid, levels: copy }));
        });
    });
}

registerHandler('levels/*.json', levelHandler);
registerHandler('move/*.json', moveHandler);

http.createServer(function (req, res) {
    if (hasHandler(req.url)) {
        res.writeHead(200, { 'Content-Type': 'application/json'});
        dispatch(req, res);
    } else {
        req.addListener('end', function () {
            file.serve(req, res, function (err, result) {
                if (err) {
                    if (req.url == '/') {
                        file.serveFile('/game.html', 200, {}, req, res);
                    }
                    else if (err.status === 404 || err.status === 500) {
                        console.error('Error serving: ' + req.url);
                        file.serveFile('/' + err.status + '.html', err.status, {}, req, res);
                    } else {
                        res.writeHead(err.status, err.headers);
                        res.end();
                    }
                } else {
                    console.log('serving: ' + req.url); 
                }
            });
        }).resume();
    }
}).listen(port);

console.log('Server running at http://127.0.0.1:' + port + '/');
console.log('webroot: ' + webroot);
