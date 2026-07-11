import { Game } from './game.js';

const game = new Game();
window.__axelugaGame = game;
game.init();

// Cross-device trophy sync: back-fill cloud-earned trophies on sign-in so
// already-earned trophies don't re-toast on a second signed-in device.
if (window.GameVolt && GameVolt.auth) {
    GameVolt.auth.onStateChange((user) => game.backfillTrophies(user));
    if (GameVolt.auth.getUser) {
        const u = GameVolt.auth.getUser();
        if (u) game.backfillTrophies(u);
    }
}

// Audio activation on Space
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        game.audio.init();
        game.audio.resume();
    }
});
