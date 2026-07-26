import { Game } from './game.js';
import {
    AXELUGA_SAVE_KEY,
    legacyToSave,
    mergeSaves,
} from './progression.js';

if (window.GameVolt) {
    GameVolt.save.registerMigration({
        keys: [AXELUGA_SAVE_KEY, 'axeluga_hi', 'axeluga_settings', 'axeluga_trophies'],
        merge(local, cloud) {
            return mergeSaves(legacyToSave(local), cloud);
        },
        getAchievements(local) {
            const trophies = local.axeluga_trophies || {};
            return Object.keys(trophies)
                .filter(id => trophies[id])
                .map(id => ({ id, unlocked_at: trophies[id] }));
        },
        getScores(local) {
            const score = Number(local.axeluga_hi) || 0;
            return score > 0 ? [{ score, mode: 'campaign-medium' }] : [];
        },
    });
    GameVolt.init('axeluga');
}

const game = new Game();
window.__axelugaGame = game;
game.init();

// Cross-device trophy sync: back-fill cloud-earned trophies on sign-in so
// already-earned trophies don't re-toast on a second signed-in device.
if (window.GameVolt && GameVolt.auth) {
    const syncUser = user => {
        game.backfillTrophies(user);
        if (user) game.syncCloudSave();
    };
    GameVolt.auth.onStateChange(syncUser);
    GameVolt.onReady(() => syncUser(GameVolt.auth.getUser ? GameVolt.auth.getUser() : null));
}

// Audio activation on Space
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        game.audio.init();
        game.audio.resume();
    }
});
