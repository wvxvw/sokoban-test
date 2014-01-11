/* global define */

// Because there isn't a single simple HTTP library in JavaScript :(
define([], function () {
    function load(url, method, data) {
        var request = new XMLHttpRequest();
        return function(success, failure) {
            request.addEventListener('load', success);
            request.addEventListener('error', failure);
            request.open(method, url);
            request.send(data);
        };
    }
    var methods = {
        POST: function (url, data) {
            return load(url, 'POST', JSON.stringify(data || ''));
        },
        GET: function (url) { return load(url, 'GET', ''); }
    };
    return function (method, url, data) {
        return methods[method.toUpperCase()](url, data);
    };
});






