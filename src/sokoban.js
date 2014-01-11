/* global define */

define(
    ['lodash', 'lib/utils', 'lib/type', 'lib/object'],
function (_, u, t, o) {
    var b = t.builtins, m = o.methods;

    o.defClass(
        'gameObject', [],
        { x: { type: t.number },
          y: { type: t.number },
          texture: { type: t.string, allocation: 'class' } });
    
    o.defClass(
        'player', ['gameObject'],
        { turns: { type: t.vector, initform: 0 } });

    o.defClass(
        'map', [],
        { width: { type: t.number },
          height: { type: t.number } });

    o.defClass(
        'eventHandler', [],
        { listeners: { type: b.hashtable, initform: {} } });

    o.defClass('listener');

    o.defClass('upListener', ['listener']);
    o.defClass('downListener', ['listener']);
    o.defClass('rightListener', ['listener']);
    o.defClass('leftListener', ['listener']);

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
            // this should look for player chip on the map
            return 0;
        });

    o.defMethod(
        'getPlayerY', ['map'],
        function (map) {
            // this should look for player chip on the map
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
                _.partial(m.register, handler),
                _.map(['upListener', 'downListener', 'rightListener', 'leftListener'],
                      o.makeInstance),
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
