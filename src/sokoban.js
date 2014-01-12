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
        { listeners: { type: b.hashtable, initform: {} } });

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

    function move(direction, map) {
        var player = m.mapPlayer(map);
        http('post', 'move/' + direction + '.json',
             { uid: m.playerUid(player) })(
            function (data) {
                console.log('new map received');
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
        function (event, listener, map) {
            move('up', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'downListener', 'map'],
        function (event, listener, map) {
            move('down', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'rightListener', 'map'],
        function (event, listener, map) {
            move('right', map);
        });

    o.defMethod(
        'update', ['eventHandler', 'leftListener', 'map'],
        function (event, listener, map) {
            move('left', map);
        });

    // in the future we can validate player's position
    // to avoid extra RPC
    o.defMethod('getPlayerX', ['map'], function (map) {
        return m.playerX(m.mapPlayer(map));
    });

    o.defMethod('getPlayerY', ['map'], function (map) {
        return m.playerY(m.mapPlayer(map));
    });

    o.defMethod(
        'register', ['eventHandler', 'listener', 'string'],
        function (handler, listener, string) {
            m.eventHandlerListeners(handler)[string] = listener;
        });

    function loadTextures(data, map) {
        var loaded = 0, images = [],
            items = ['player', 'floor', 'wall', 'box', 'goal', 'goalbox', 'coin', 'magnet'];
        
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
    
    function initGame(data) {
        var map = parseMap(data.level),
            player = o.makeInstance(
                'player', { x: m.getPlayerX(map), y: m.getPlayerY(map), uid: data.uid });
        m.mapPlayer(map, player);
        return map;
    }

    o.defMethod(
        'start', ['eventHandler'],
        function (handler) {
            var translation = {
                '38': 'up',
                '40': 'down',
                '37': 'left',
                '39': 'right',
                '87': 'up',      // w
                '65': 'left',    // a
                '83': 'down',    // s
                '68': 'right' }, // d
                map;
                                
            u.zipWith(
                _.partial(m.register, handler),
                _.map(['upListener', 'downListener', 'rightListener', 'leftListener'],
                      o.makeInstance),
                ['up', 'down', 'right', 'left']);
            http('post', 'levels/0.json')(
                function (event) {
                    map = initGame(JSON.parse(event.currentTarget.responseText));
                },
                function (event) {
                    console.error('received error: ' + event);
                });
            document.body.addEventListener('keyup', function (event) {
                if (event.keyCode in translation) 
                    m.update(handler,
                             m.eventHandlerListeners(handler)[
                                 translation[event.keyCode]], map);
            });
        });

    return function main() {
        m.start(o.makeInstance('eventHandler'));
    };
});
