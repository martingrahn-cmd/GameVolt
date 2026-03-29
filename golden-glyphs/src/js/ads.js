// src/js/ads.js — Ad abstraction layer
//
// Platform detection: GameVolt > CrazyGames > Poki > none
// Each SDK is loaded via <script> in the platform-specific index.html.
// When no SDK is present, isAvailable() returns false and ad buttons are hidden.

function detectPlatform() {
    if (window.GameVolt && window.GameVolt.ads) return 'gamevolt';
    if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) return 'crazygames';
    if (window.PokiSDK) return 'poki';
    return 'none';
}

const platform = detectPlatform();

function isAvailable() {
    return platform !== 'none';
}

/**
 * Show a rewarded ad via the detected platform SDK.
 * @param {Function} onComplete - Called when ad finishes and reward should be granted.
 * @param {Function} [onError]  - Called when ad fails or is dismissed. Optional.
 */
function showRewarded(onComplete, onError) {
    const handleError = (reason) => {
        console.warn('[ads] showRewarded failed:', reason);
        if (typeof onError === 'function') onError(reason);
    };

    if (platform === 'gamevolt') {
        if (!window.GameVolt || !window.GameVolt.ads) {
            handleError('GameVolt SDK unavailable');
            return;
        }
        window.GameVolt.ads.showRewarded((result) => {
            if (result && result.success) {
                onComplete();
            } else {
                handleError('GameVolt ad not completed');
            }
        });
        return;
    }

    if (platform === 'crazygames') {
        window.CrazyGames.SDK.ad.requestAd('rewarded', {
            adStarted: () => {},
            adFinished: () => onComplete(),
            adError: (err) => handleError(err)
        });
        return;
    }

    if (platform === 'poki') {
        window.PokiSDK.rewardedBreak().then((rewarded) => {
            if (rewarded) {
                onComplete();
            } else {
                handleError('Poki ad not rewarded');
            }
        }).catch((err) => handleError(err));
        return;
    }

    handleError('No ad SDK detected');
}

export const ads = { isAvailable, showRewarded };
