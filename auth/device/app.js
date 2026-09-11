(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var params = new URLSearchParams(window.location.search);
    var requestId = params.get('request') || '';
    var approvalToken = params.get('approve') || '';
    var requestReady = false;
    var approving = false;

    function validRequest() {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) &&
            /^[A-Za-z0-9_-]{40,60}$/.test(approvalToken);
    }
    function show(id) {
        ['deviceLoading', 'deviceInvalid', 'deviceApproval', 'deviceSuccess'].forEach(function (name) { $(name).hidden = name !== id; });
    }
    function invalid() { show('deviceInvalid'); }
    function renderUser(user) {
        if (!requestReady) return;
        $('deviceSignedOut').hidden = !!user;
        $('deviceSignedIn').hidden = !user;
        if (user) {
            $('deviceUser').textContent = user.username || user.email || 'Player';
            if (!approving) approve();
        }
    }
    function inspect() {
        if (!validRequest() || !(window.GameVolt && GameVolt.deviceAuth)) { invalid(); return; }
        GameVolt.deviceAuth.inspect(requestId, approvalToken).then(function (result) {
            if (result.status !== 'pending') { invalid(); return; }
            requestReady = true;
            $('deviceCode').textContent = result.displayCode.slice(0, 3) + ' ' + result.displayCode.slice(3);
            show('deviceApproval');
            renderUser(GameVolt.auth.getUser());
        }).catch(invalid);
    }
    function approve() {
        if (approving || !requestReady) return;
        approving = true;
        $('deviceApprove').disabled = true;
        $('deviceMessage').textContent = 'Approving…';
        $('deviceMessage').className = 'device-message';
        GameVolt.deviceAuth.approve(requestId, approvalToken).then(function () {
            show('deviceSuccess');
        }).catch(function (error) {
            approving = false;
            $('deviceApprove').disabled = false;
            $('deviceMessage').textContent = error && error.status === 410 ? 'This request expired. Create a new QR code.' : 'Could not approve this screen. Try again.';
            $('deviceMessage').className = 'device-message error';
        });
    }

    function openPhoneLogin() {
        GameVolt.auth.login();
        var modal = document.getElementById('gv-auth-modal');
        if (!modal || typeof modal.querySelector !== 'function') return;
        var subtitle = modal.querySelector('.gv-sub');
        var note = modal.querySelector('.gv-note');
        if (subtitle) subtitle.textContent = 'Sign in on this phone to approve the other screen';
        if (note) note.textContent = 'After signing in, this screen will be approved automatically.';
    }

    if (!validRequest() || !window.GameVolt) { invalid(); return; }
    $('gv-login-btn').addEventListener('click', openPhoneLogin);
    $('deviceApprove').addEventListener('click', approve);
    GameVolt.auth.onStateChange(renderUser);
    GameVolt.onReady(function () { inspect(); });
    GameVolt.init('device-auth');
})();
