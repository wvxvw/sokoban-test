/* global define */

define(
    ['lodash', 'lib/utils', 'lib/type', 'lib/object'],
function (_, u, t, o) {
    var b = t.builtins, m = o.methods;

    o.defClass(
        'gameObject', [],
        [{ name: 'x', type: t.number },
         { name: 'y', type: t.number },
         { name: 'texture', type: t.string, allocation: 'class' }]);
    
    o.defClass(
        'player', ['gameObject'],
        [{ name: 'turns', type: t.vector, initform: 0 }]);

    o.defClass(
        'map', [],
        [{ name: 'width', type: t.number },
         { name: 'height', type: t.number }]);

    o.defClass(
        'eventHandler', [],
        [{ name: 'listeners', type: b.hashtable, iniform: {} }]);

    o.defClass('listener', [], []);

    o.defClass('upListener', ['listener'], []);
    o.defClass('downListener', ['listener'], []);
    o.defClass('rightListener', ['listener'], []);
    o.defClass('leftListener', ['listener'], []);

    o.defGeneric('draw', [t, t]);
    o.defGeneric('start', [t]);
    o.defGeneric('update', [t, t]);
    o.defGeneric('register', [t, t, t]);
    o.defGeneric('getPlayerX', [t]);
    o.defGeneric('getPlayerY', [t]);

    o.defMethod(
        'draw', ['gameObject', 'map'],
        function (obj, map) {

        });

    o.defMethod(
        'update', ['eventHandler', 'upListener'],
        function (event, listener) {
            // moving up
        });

    o.defMethod(
        'update', ['eventHandler', 'downListener'],
        function (event, listener) {
            // moving down
        });

    o.defMethod(
        'update', ['eventHandler', 'rightListener'],
        function (event, listener) {
            // moving right
        });

    o.defMethod(
        'update', ['eventHandler', 'leftListener'],
        function (event, listener) {
            // moving left
        });

    o.defMethod(
        'getPlayerX', ['map'],
        function (map) {
            // moving left
            return 0;
        });

    o.defMethod(
        'getPlayerY', ['map'],
        function (map) {
            // moving left
            return 0;
        });

    o.defMethod(
        'register', ['eventHandler', 'listener', 'string'],
        function (handler, listener, string) {
            m.eventHandlerListeners(handler)[string] = listener;
        });

    o.defMethod(
        'start', ['eventHandler'],
        function (handler) {
            u.zipWith(
                _.compose(_.partial(m.register, handler), o.makeInstance),
                ['upListener', 'downListener',
                 'rightListener', 'leftListener'],
                ['up', 'down', 'right', 'left']);
        });

    return function main(width, height) {
        var map = o.makeInstance('map', { width: width, height: height }),
            queue = o.makeInstance('vector'),
            palyer = o.makeInstance(
                'player', { x: m.getPlayerX(map), y: m.getPlayerY(map) });
        
        m.start(o.makeInstance('eventHandler'));
    };
});
