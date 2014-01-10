/* global requirejs, requirejs */
requirejs.config({
    baseUrl: 'js',
    paths: { lib: 'lib', game: 'game/sokoban', lodash: 'lib/lodash' }
});

require(['game'], function (game) { game(600, 600); });
