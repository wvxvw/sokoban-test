/* global define */

define(
    ['lodash', 'lib/utils', 'lib/type', 'lib/object', 'lib/http'],
function (_, u, t, o, http) {
    var b = t.builtins, m = o.methods;

    o.defClass(
        'gameObject', [],
        { x: { type: b.number },
          y: { type: b.number },
          texture: { type: b.string, allocation: 'class' } });
    
    o.defClass(
        'player', ['gameObject'],
        { turns: { type: b.vector, initform: [] },
          uid: { type: b.string } });

    o.defClass('coin', ['gameObject'] );
    o.defClass('magnet', ['gameObject'] );

    o.defClass(
        'map', [],
        { width: { type: b.number },
          height: { type: b.number },
          cellWidth: { type: b.number },
          cellHeight: { type: b.number },
          board: { type: b.vector },
          background: { type: b.object },
          canvas: { type: b.object },
          player: { type: t.getType('player') } });

    o.defClass(
        'eventHandler', [],
        { listeners: { type: b.hashtable, initform: {} },
          keyhandler: { type: b.func } });

    o.defClass('listener');

    o.defClass('upListener', ['listener']);
    o.defClass('downListener', ['listener']);
    o.defClass('rightListener', ['listener']);
    o.defClass('leftListener', ['listener']);

    o.defGeneric('draw', [t, t]);
    o.defGeneric('start', [t]);
    o.defGeneric('update', [t, t, t]);
    o.defGeneric('register', [t, t, t]);
    o.defGeneric('getPlayerX', [t]);
    o.defGeneric('getPlayerY', [t]);
    o.defGeneric('render', [t, t]);

    function move(handler, direction, map) {
        var player = m.mapPlayer(map);
        http('post', 'move/' + direction + '.json',
             { uid: m.playerUid(player) })(
            function (event) {
                console.log('new map received');
                initGame(JSON.parse(event.currentTarget.responseText), handler);
            },
            function (error) { console.error('Couldn\'t move'); });
    }
    
    o.defMethod(
        'render', ['map', 'vector'], function (map, images) {
            drawBoard(m.mapCanvas(map), m.mapBoard(map),
                      images, m.mapCellWidth(map), m.mapCellHeight(map),
                      m.mapBackground(map));
        });

    o.defMethod(
        'draw', ['gameObject', 'map'], function (obj, map) {
            // this will not happen in this version
            // (designed for coin and magnet).
        });

    o.defMethod(
        'update', ['eventHandler', 'upListener', 'map'],
        function (handler, listener, map) {
            move(handler, 'up', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'downListener', 'map'],
        function (handler, listener, map) {
            move(handler, 'down', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'rightListener', 'map'],
        function (handler, listener, map) {
            move(handler, 'right', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'leftListener', 'map'],
        function (handler, listener, map) {
            move(handler, 'left', map);
        });

    // in the future we can validate player's position
    // to avoid extra RPC
    o.defMethod('getPlayerX', ['map'], function (map) {
        var player = m.mapPlayer(map);
        return player ? m.playerX(player) : 0;
    });

    o.defMethod('getPlayerY', ['map'], function (map) {
        var player = m.mapPlayer(map);
        return player ? m.playerY(player) : 0;
    });

    o.defMethod(
        'register', ['eventHandler', 'listener', 'string'],
        function (handler, listener, string) {
            m.eventHandlerListeners(handler)[string] = listener;
        });

    function loadTextures(data, map) {
        var loaded = 0, images = [],
            items = ['player', 'floor', 'wall', 'box', 'goal',
                     'goalbox', 'coin', 'magnet', 'playergoal'];
        
        _.each(items, function (gameObject, i) {
            var image = document.createElement('img');
            image.src = data[gameObject].skin;
            images[data[gameObject].chip] = image;
            if (gameObject == 'floor') m.mapBackground(map, image);
            image.addEventListener('load', function () {
                loaded++;
                if (loaded == items.length) m.render(map, images);
            });
        });
    }

    function initStage(width, height) {
        var canvas = document.body.getElementsByTagName('canvas')[0], context;
        if (!canvas) {
            canvas = document.createElement('canvas');
            document.body.appendChild(canvas);
        }
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext('2d');
        context.fillStyle = '#000';
        context.fillRect(0, 0, width, height);
        return canvas;
    }

    function drawBoard(canvas, board, images, cellWidth, cellHeight, background) {
        var context = canvas.getContext('2d');
        context.fillStyle = context.createPattern(background, 'repeat');
        context.fillRect(0, 0, canvas.width, canvas.height);
        _.each(board, function (row, y) {
            _.each(row, function (cell, x) {
                context.drawImage(images[cell], x * cellWidth, y * cellHeight);
            });
        });
    }
    
    function parseMap(data) {
        var grid = data.grid, board = data.map,
            width = grid[0] * board[0].length,
            height = grid[1] * board.length,
            map = o.makeInstance(
                'map',
                { width: width, height: height,
                  canvas: initStage(width, height),
                  cellWidth: data.grid[0],
                  cellHeight: data.grid[1],
                  board: data.map });
        loadTextures(data, map);
        return map;
    }
    
    function initGame(data, handler) {
        var translation = {
            '38': 'up',
            '40': 'down',
            '37': 'left',
            '39': 'right',
            '87': 'up',      // w
            '65': 'left',    // a
            '83': 'down',    // s
            '68': 'right' }, // d
            map = parseMap(data.level),
            keyhandler = m.eventHandlerKeyhandler(handler),
            player = o.makeInstance(
                'player', { x: m.getPlayerX(map), y: m.getPlayerY(map), uid: data.uid });
        m.mapPlayer(map, player);
        if (keyhandler)
            document.body.removeEventListener('keyup', keyhandler);
        document.body.addEventListener(
            'keyup', m.eventHandlerKeyhandler(handler, function (event) {
                if (event.keyCode in translation) 
                    m.update(handler,
                             m.eventHandlerListeners(handler)[
                                 translation[event.keyCode]], map);
            }));
        return map;
    }

    o.defMethod(
        'start', ['eventHandler'],
        function (handler) {
            u.zipWith(
                _.partial(m.register, handler),
                _.map(['upListener', 'downListener', 'rightListener', 'leftListener'],
                      o.makeInstance),
                ['up', 'down', 'right', 'left']);
            http('post', 'levels/0.json')(
                function (event) {
                    initGame(JSON.parse(event.currentTarget.responseText), handler);
                },
                function (event) {
                    console.error('received error: ' + event);
                });
        });

    return function main() {
        m.start(o.makeInstance('eventHandler'));
    };
});
