/* global require, process, module */

function findPlayer(map) {
    // TODO: get player's digit from config
    var row, result = [];
    outer: for (var y = 0; y < map.length; y++) {
        row = map[y];
        for (var x = 0; x < row.length; x++) {
            if (row[x] == 0 || row[x] == 6) {
                result.push(x, y);
                break outer;
            }
        }
    }
    return result;
}

function findNeighbour(map, player, direction) {
    var result;
    switch (direction) {
    case 'up':
        if (player[1] > 0)
            result = [player[0], player[1] - 1];
        break;
    case 'down':
        if (player[1] < map.length)
            result = [player[0], player[1] + 1];
        break;
    case 'right':
        if (player[0] < map[0].length)
            result = [player[0] + 1, player[1]];
        break;
    case 'left':
        if (player[0])
            result = [player[0] - 1, player[1]];
    }
    return result;
}

function calculateMove(map, direction) {
    // TODO: this needs serious rewrite...
    var player = findPlayer(map), neighbourDigit, boxNeighbourDigit,
        playerDigit = map[player[1]][player[0]], boxNeighbour,
        neighbour = findNeighbour(map, player, direction);
    // TODO: take digits from config
    // 2 is wall
    // 1 is floor
    // 3 is box
    // 4 is goal
    // 5 is goal box
    if (neighbour) {
        neighbourDigit = map[neighbour[1]][neighbour[0]];
        switch (neighbourDigit) {
        case 2: break;
        case 1:
        case 4:
            map[neighbour[1]][neighbour[0]] = (neighbourDigit == 1) ? 0 : 6;
            console.log('playerDigit ' + playerDigit);
            map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
            break;
        case 3:
        case 5:
            boxNeighbour = findNeighbour(map, neighbour, direction);
            if (boxNeighbour) {
                // TODO: can we move two boxes at a time?
                // at the moment we can't
                boxNeighbourDigit = map[boxNeighbour[1]][boxNeighbour[0]];
                switch (boxNeighbourDigit) {
                case 2:
                case 3:
                case 5: break;
                case 1:
                    map[boxNeighbour[1]][boxNeighbour[0]] = 3;
                    map[neighbour[1]][neighbour[0]] = (neighbourDigit == 3) ? 0 : 6;
                    map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
                    break;
                case 4:
                    map[boxNeighbour[1]][boxNeighbour[0]] = 5;
                    map[neighbour[1]][neighbour[0]] = (neighbourDigit == 3) ? 0 : 6;
                    map[player[1]][player[0]] = (playerDigit == 0) ? 1 : 4;
                    break;
                }
            }
        }
    }
    return map;
}

function isWinner(map) {
    var row;
    for (var y = 0; y < map.length; y++) {
        row = map[y];
        for (var x = 0; x < row.length; x++) {
            if (row[x] == 4) {
                return false;
            }
        }
    }
    return true;
}

module.exports = { calculateMove: calculateMove, isWinner: isWinner };









