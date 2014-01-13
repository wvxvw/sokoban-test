/* global require */

var config = require('./server/config.js'),
    http   = require('http'),
    _      = require('lodash'),
    stat   = require('node-static'),
    mysql  = require('mysql'),
    crypto = require('crypto'),
    rest   = require('./server/rest.js'),
    game   = require('./server/game.js'),
    utils  = require('./server/utils.js');

var withConnection, withLevels;

function withPost(req, res, handler) {
    var result = [];
    if (req.method == 'POST') {
        req.on('data', function (data) {
            result.push(data);
            if (_.reduce(_.map(_.partial(_.pluck, 'length'), result), utils.sum)  > 1000) { 
                req.connection.destroy();
            }
        });
        req.on('end', function () { handler(result.join('')); });
    }
}

function moveHandler(req, res) {
    withPost(req, res, function (post) {
        var postData = JSON.parse(post);
        fetchUser(postData.uid, function (rows) {
            withLevels(function (levels) {
                var copy = JSON.parse(JSON.stringify(levels[0]));
                copy.map = game.calculateMove(
                    utils.fold(_.map(rows[0].state.split(''),
                               _.compose(parseInt, _.identity)), 8),
                    req.url.replace(/\/(?:[^\/]+\/)+(\w+)\.json/, '$1'));
                withConnection(function (connection) {
                    connection.query(
                        'update players set active = now(), state =\'' +
                            _.flatten(copy.map).join('') + '\' where uid = \'' +
                            postData.uid + '\'',
                        function (err) {
                            if (err) throw err;
                            console.log('Updated user: ' + postData.uid);
                        });
                    res.end(JSON.stringify({ uid: postData.uid, level: copy,
                                             isWinner: game.isWinner(copy.map) }));
                });
            });
        });
    });
}

function storeUser(uid, level, state) {
    withConnection(function (connection) {
        connection.query(
            'insert into players (uid, level, state, active) values ' +
                ['(\'' + uid + '\', ' + level + ', \'' + state + '\', now())'],
            function (err, rows, fields) {
                if (err) throw err;
                console.log('Recorded user: ' + uid);
            });
    });
}

function fetchUser(uid, continuation) {
    uid = uid.replace(/[^\dabcdef]/gi, '');
    if (uid.length == 32) {
        withConnection(function (connection) {
            connection.query(
                'select level, state from players where players.uid = \'' +
                    uid + '\' limit 1', function (err, rows) {
                        if (err) throw err;
                        continuation(rows);
                    });
        });
    }
}

function levelHandler(req, res) {
    withPost(req, res, function (post) {
        var level = parseInt(
            req.url.replace(/\/(?:[^\/]+\/)+(\d)\.\w+/, '$1'), 10) | 0,
             md5sum = crypto.createHash('md5'), uid, result;
        withLevels(function (levels) {
            level = Math.min(levels.length - 1, Math.max(0, level));
            md5sum.update(Math.random().toString());
            uid = md5sum.digest('hex');
            storeUser(uid, level, _.flatten(levels[level].map).join(''));
            result = { level: levels[level], uid: uid };
            res.end(JSON.stringify(result));
        });
    });
}

function start(settings) {
    var connection = mysql.createConnection(
        { host: 'localhost',
          user : settings.db.dbuser,
          password: settings.db.dbpassword,
          database: settings.db.dbname }),
        levels = settings.levels, webroot = settings.webroot,
        file = new stat.Server(webroot, { 
            cache: 600, 
            headers: { 'X-Powered-By': 'node-static' } });
    connection.connect();

    withConnection = function (continuation) {
        continuation(connection);
    };

    withLevels = function (continuation) {
        continuation(settings.levels);
    };
    
    http.createServer(function (req, res) {
        if (rest.hasHandler(req.url)) {
            res.writeHead(200, { 'Content-Type': 'application/json'});
            rest.dispatch(req, res);
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
    }).listen(settings.port);

    rest.registerHandler('levels/*.json', levelHandler);
    rest.registerHandler('move/*.json', moveHandler);

    console.log('Server running at http://127.0.0.1:' + settings.port + '/');
    console.log('webroot: ' + webroot);
}

config.readConfig(start);
