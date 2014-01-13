/* global require, process, module */

var fs = require('fs');

function optParse(argv) {
    // Do not use `node-commandline' it's too bad :(
    return { program: argv[0], script: argv[1] };
}

module.exports.readConfig = function (continuation) {
    var options = optParse(process.argv),
        webroot = options.webroot ||
            options.script.replace(/[^\/]+\/[^\/]+$/g, 'bin'),
        port = options.port || 8000;
    
    fs.readFile(webroot + '/' + 'config.json', function (err, data) {
        var result;
        if (err) {
            console.error(
                'Could not load level data from: ' +
                    webroot + '/' + 'config.json, because ' + err);
            result = { levels: [], db: { } };
        } else {
            result = JSON.parse(data);
        }
        result.webroot = webroot;
        result.port = port;
        continuation(result);
    });
};
