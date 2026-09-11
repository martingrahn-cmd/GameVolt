// Shared controller selection and mapping for every Snake Neo screen.
let preferredGamepadIndex = null;
let exclusiveGamepadOwner = null;

export function isSnakeGamepad(gamepad) {
    if (!gamepad || gamepad.connected === false) return false;
    const id = String(gamepad.id || "").toLowerCase();
    if (["audio", "headset", "headphone", "speaker", "microphone"].some(word => id.includes(word))) return false;
    return !!(gamepad.buttons && gamepad.buttons.length >= 10 && gamepad.axes && gamepad.axes.length >= 2);
}

export function snakeGamepadHasActivity(gamepad) {
    return Array.from(gamepad?.buttons || []).some(button => button && (button.pressed || button.value > 0.6)) ||
        Array.from(gamepad?.axes || []).some(axis => Math.abs(Number(axis) || 0) > 0.55);
}

export function selectSnakeGamepad(gamepads) {
    const list = Array.from(gamepads || []);
    const capable = list.filter(isSnakeGamepad);
    const active = capable.find(snakeGamepadHasActivity);
    const preferred = preferredGamepadIndex === null ? null : list[preferredGamepadIndex];
    const selected = active || (isSnakeGamepad(preferred) ? preferred : capable.find(gamepad => gamepad.mapping === "standard")) || capable[0] || null;
    if (selected) preferredGamepadIndex = list.indexOf(selected);
    else preferredGamepadIndex = null;
    return selected;
}

export function getSnakeGamepad(navigatorLike = globalThis.navigator) {
    try {
        return selectSnakeGamepad(navigatorLike?.getGamepads ? navigatorLike.getGamepads() : []);
    } catch (error) {
        return null;
    }
}

export function readSnakeGamepadState(gamepad) {
    const button = index => !!gamepad?.buttons?.[index]?.pressed;
    const axisX = Number(gamepad?.axes?.[0]) || 0;
    const axisY = Number(gamepad?.axes?.[1]) || 0;
    return {
        up: button(12) || axisY < -0.55,
        down: button(13) || axisY > 0.55,
        left: button(14) || axisX < -0.55,
        right: button(15) || axisX > 0.55,
        confirm: button(0),
        back: button(1),
        start: button(9)
    };
}

export function snakeGamepadIsNeutral(state) {
    return !state || !Object.values(state).some(Boolean);
}

export function claimSnakeGamepad(owner) {
    exclusiveGamepadOwner = owner;
}

export function snakeGamepadOwnedByOther(owner) {
    return !!exclusiveGamepadOwner && exclusiveGamepadOwner !== owner;
}

export function releaseSnakeGamepadWhenNeutral(owner) {
    const release = () => {
        if (exclusiveGamepadOwner !== owner) return;
        const gamepad = getSnakeGamepad();
        if (snakeGamepadIsNeutral(gamepad ? readSnakeGamepadState(gamepad) : null)) {
            exclusiveGamepadOwner = null;
            return;
        }
        globalThis.requestAnimationFrame(release);
    };
    release();
}
