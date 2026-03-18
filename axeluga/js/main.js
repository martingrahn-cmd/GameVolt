import { Game } from './game.js';

const game = new Game();
window.__axelugaGame = game;
game.init();

// Audio activation on Space
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        game.audio.init();
        game.audio.resume();
    }
});
