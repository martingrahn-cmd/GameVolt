(function (root, factory) {
  'use strict';

  var api = factory(root, root.document);
  root.GameVoltBigPicturePrompt = api;

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', api.init, { once: true });
    } else {
      api.init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root, document) {
  'use strict';

  var DISMISS_KEY = 'gv-bp-prompt-dismissed-until';
  var DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
  var initialized = false;
  var prompt = null;
  var openLink = null;
  var dismissButton = null;
  var hadController = false;
  var previousAccept = false;
  var previousBack = false;
  var rafId = 0;
  var activationLabel = 'homepage_pointer';

  function isStandardGamepad(pad) {
    return !!(
      pad &&
      pad.connected !== false &&
      pad.mapping === 'standard' &&
      pad.buttons && pad.buttons.length >= 8 &&
      pad.axes && pad.axes.length >= 2
    );
  }

  function getController() {
    if (!root.navigator || typeof root.navigator.getGamepads !== 'function') return null;
    var pads;
    try {
      pads = root.navigator.getGamepads();
    } catch (error) {
      return null;
    }
    if (!pads) return null;
    for (var i = 0; i < pads.length; i += 1) {
      if (isStandardGamepad(pads[i])) return pads[i];
    }
    return null;
  }

  function isDismissed() {
    try {
      return Number(root.localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
    } catch (error) {
      return false;
    }
  }

  function track(action, label) {
    if (typeof root.gtag !== 'function') return;
    root.gtag('event', action, {
      event_category: 'big_picture',
      event_label: label || 'homepage_gamepad_prompt'
    });
  }

  function show() {
    if (!prompt || isDismissed() || !prompt.hidden) return;
    prompt.hidden = false;
    track('big_picture_prompt_view');
  }

  function hide() {
    if (prompt) prompt.hidden = true;
  }

  function dismiss() {
    try {
      root.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch (error) {
      // The banner can still be dismissed for this page when storage is blocked.
    }
    hide();
    track('big_picture_prompt_dismiss');
  }

  function modalIsOpen() {
    if (!document || typeof document.querySelector !== 'function') return false;
    return !!document.querySelector('#gv-auth-modal.open, dialog[open], [aria-modal="true"]');
  }

  function openBigPicture() {
    if (!openLink || prompt.hidden || modalIsOpen()) return;
    activationLabel = 'homepage_gamepad_button';
    if (typeof openLink.click === 'function') {
      openLink.click();
    } else {
      track('big_picture_prompt_open', activationLabel);
      root.location.href = openLink.href;
    }
  }

  function buttonPressed(button) {
    return !!(button && (button.pressed || button.value > 0.6));
  }

  function frame() {
    var pad = getController();

    if (pad) {
      var accept = buttonPressed(pad.buttons[0]);
      var back = buttonPressed(pad.buttons[1]);

      if (!hadController) {
        hadController = true;
        previousAccept = accept;
        previousBack = back;
        show();
      } else if (!modalIsOpen()) {
        if (accept && !previousAccept && prompt && !prompt.hidden) openBigPicture();
        if (back && !previousBack && prompt && !prompt.hidden) dismiss();
        previousAccept = accept;
        previousBack = back;
      } else {
        previousAccept = accept;
        previousBack = back;
      }
    } else {
      if (hadController) hide();
      hadController = false;
      previousAccept = false;
      previousBack = false;
    }

    if (typeof root.requestAnimationFrame === 'function') {
      rafId = root.requestAnimationFrame(frame);
    }
  }

  function init() {
    if (initialized || !document || !root.navigator || typeof root.navigator.getGamepads !== 'function') return;

    prompt = document.getElementById('gamepadBpPrompt');
    openLink = document.getElementById('gamepadBpOpen');
    dismissButton = document.getElementById('gamepadBpDismiss');
    if (!prompt || !openLink || !dismissButton) return;

    initialized = true;
    dismissButton.addEventListener('click', dismiss);
    openLink.addEventListener('click', function () {
      track('big_picture_prompt_open', activationLabel);
      activationLabel = 'homepage_pointer';
    });

    if (typeof root.addEventListener === 'function') {
      root.addEventListener('gamepadconnected', function (event) {
        if (isStandardGamepad(event.gamepad)) show();
      });
      root.addEventListener('gamepaddisconnected', function () {
        if (!getController()) {
          hadController = false;
          hide();
        }
      });
    }

    frame();
  }

  return {
    init: init,
    dismiss: dismiss,
    isStandardGamepad: isStandardGamepad,
    getController: getController,
    DISMISS_KEY: DISMISS_KEY,
    DISMISS_MS: DISMISS_MS,
    _getAnimationFrameId: function () { return rafId; }
  };
});
