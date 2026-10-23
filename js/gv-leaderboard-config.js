// The current primary board for each game. Keep portal views on the same modes
// as the games; historical scoring versions must never win by popularity.
(function () {
    'use strict';
    var modes = {
        breakout: 'neon-drift-v2', hoverdash: 'vx9', blockstorm: 'marathon',
        ink: 'free', livewire: 'endless', 'short-circuit': 'daily-streak',
        'manny-the-mole': 'score', gridburn: 'solo', spinburn: 'default',
        'vector-hexagon': 'climb-HEXAGON', solitaire: 'klondike',
        sudoku: 'easy', minesweeper: 'easy-v3',
        // Mini Mayhem keeps one board per world (clockwork-run, forest-run,
        // moon-run, halloween-run); the game opens them as tabs in its own
        // GameVolt board, the portal shows the first world.
        'mini-mayhem': 'clockwork-run'
    };
    window.GVLeaderboardConfig = {
        mode: function (gameId) { return modes[gameId] || 'default'; },
        format: function (gameId, score, mode) {
            var value = Number(score);
            if (gameId === 'mini-mayhem') { var s = 1000 - Math.floor(value / 100000), d = 99999 - value % 100000; return s + ' strokes' + (d === 99999 ? '' : ' · ' + Math.floor(d / 600) + ':' + String(Math.floor(d % 600 / 10)).padStart(2, '0') + '.' + d % 10); }
            if (gameId === 'sudoku' || gameId === 'minesweeper') {
                value = gameId === 'minesweeper' && mode.indexOf('-v3') !== -1
                    ? (1000000 - value) / 10 : 100000 - value;
                return value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' s';
            }
            if (gameId === 'gridburn' || gameId === 'vector-hexagon') return (value / 100).toFixed(2) + ' s';
            if (mode === 'daily-streak') return value.toLocaleString() + ' days';
            return value.toLocaleString();
        }
    };
})();
