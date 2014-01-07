function optParse(argv) {
    // Do not use `node-commandline' it's too bad :(
    return { program: argv[0], script: argv[1] };
}

var http = require('http'),
    stat = require('node-static'),
    options = optParse(process.argv),
    webroot = options.webroot ||
        options.script.replace(/[^\/]+\/[^\/]+$/g, 'bin'),
    port = options.port || 8000;

var file = new stat.Server(webroot, { 
    cache: 600, 
    headers: { 'X-Powered-By': 'node-static' } 
});

http.createServer(function (req, res) {
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
}).listen(port);

console.log('Server running at http://127.0.0.1:' + port + '/');
console.log('webroot: ' + webroot);
