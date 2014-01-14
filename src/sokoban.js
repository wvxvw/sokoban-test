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

    o.defClass('gameState', []);
    o.defClass('playState', ['gameState']);
    o.defClass('winState', ['gameState']);

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
          data: { type: b.hashtable },
          background: { type: b.object },
          canvas: { type: b.object },
          player: { type: t.getType('player') } });

    
    o.defClass(
        'eventHandler', [],
        { listeners: { type: b.hashtable, initform: {} },
          keyhandler: { type: b.func },
          // don't know how to do forward references yet
          game: { type: b.object } });
    
    o.defClass(
        'game', [],
        { states: { type: b.hashtable },
          state: { type: t.getType('gameState') },
          map: { type: t.getType('map') },
          handler: { type: t.getType('eventHandler') } });

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
                initGame(JSON.parse(event.currentTarget.responseText),
                         m.eventHandlerGame(handler));
            },
            function (error) { console.error('Couldn\'t move'); });
    }
    
    o.defMethod(
        'render', ['map', 'playState'], function (map, state) {
            var canvas = m.mapCanvas(map), board = m.mapBoard(map),
                cellWidth = m.mapCellWidth(map), cellHeight = m.mapCellHeight(map),
                context = canvas.getContext('2d'), data = m.mapData(map);

            loadTextures(data, map, function (images) {
                // background may not be available before the images are all loaded
                var background = m.mapBackground(map);
                context.fillStyle = context.createPattern(background, 'repeat');
                context.fillRect(0, 0, canvas.width, canvas.height);
                _.each(board, function (row, y) {
                    _.each(row, function (cell, x) {
                        context.drawImage(images[cell], x * cellWidth, y * cellHeight);
                    });
                });
            });
        });

    o.defMethod(
        'render', ['map', 'winState'], function (map, state) {
            var canvas = m.mapCanvas(map), board = m.mapBoard(map),
                context = canvas.getContext('2d'),
                message = 'You win!', metrix = context.measureText(message);
            
            context.font = '32pt sans';
            context.fillStyle = 'pink';
            // it only measures the width of the text :/
            // also, this measurment doesn't make any sense, not sure what
            // it measures... ideally, this would have been:
            // (canvas.width - metrix.width) / 2, but I'll just put a value
            // that visually makes more sense
            context.fillText(message, 40, 140);
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

    function loadTextures(data, map, continuation) {
        var loaded = 0, images = [], cache = { }, 
            items = ['player', 'floor', 'wall', 'box', 'goal',
                     'goalbox', 'coin', 'magnet', 'playergoal'];
        
        _.each(items, function (gameObject, i) {
            var image = document.createElement('img');
            // some images may appear twice, for these there is a
            // problem triggering `load' event
            if (data[gameObject].skin in cache) {
                images[data[gameObject].chip] = cache[data[gameObject].skin];
            } else {
                cache[data[gameObject].skin] = image;
                image.src = data[gameObject].skin;
                loaded++;
                images[data[gameObject].chip] = image;
                if (gameObject == 'floor') m.mapBackground(map, image);
                image.addEventListener('load', function () {
                    loaded--;
                    if (!loaded) continuation(images);
                });
            }
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

    function parseMap(data) {
        var grid = data.grid, board = data.map,
            width = grid[0] * board[0].length,
            height = grid[1] * board.length;
        
        return o.makeInstance(
                'map',
                { width: width, height: height,
                  canvas: initStage(width, height),
                  cellWidth: data.grid[0],
                  data: data,
                  cellHeight: data.grid[1],
                  board: data.map });
    }

    function initGame(data, game) {
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
            handler = m.gameHandler(game),
            keyhandler = m.eventHandlerKeyhandler(handler),
            states = m.gameStates(game),
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
        m.gameState(game, data.isWinner ? states.win : states.play);
        m.render(map, m.gameState(game));
        return map;
    }

    o.defMethod(
        'start', ['eventHandler'],
        function (handler) {
            var game = o.makeInstance('game'),
                playState = o.makeInstance('playState'),
                winState = o.makeInstance('winState');
            
            m.gameStates(game, { play: playState, win: winState });
            m.gameState(game, playState);
            m.gameHandler(game, handler);
            m.eventHandlerGame(handler, game);
            u.zipWith(
                _.partial(m.register, handler),
                _.map(['upListener', 'downListener', 'rightListener', 'leftListener'],
                      o.makeInstance),
                ['up', 'down', 'right', 'left']);
            http('post', 'levels/0.json')(
                function (event) {
                    initGame(JSON.parse(event.currentTarget.responseText), game);
                },
                function (event) {
                    console.error('received error: ' + event);
                });
        });

    return function main() {
        m.start(o.makeInstance('eventHandler'));
    };
});
