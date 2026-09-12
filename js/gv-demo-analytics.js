(function () {
  'use strict';

  var GA_ID = 'G-PY073ZX38N';
  var ALLOWED_SOURCES = ['homepage_demo', 'demos_index', 'demo_story', 'direct'];
  var MILESTONES = [30, 60, 120, 300];

  function normalizeSource(value) {
    return ALLOWED_SOURCES.indexOf(value) >= 0 ? value : 'direct';
  }

  function normalizeMode(value) {
    if (value === 'demo') return 'populated_city';
    if (value === 'play') return 'new_city';
    return 'direct';
  }

  function toolName(value) {
    var text = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    var tools = [
      ['water sewage', 'water_sewage'], ['fire rescue', 'fire_rescue'], ['public transport', 'transportation'],
      ['transit line', 'transit_lines'], ['info view', 'info_views'], ['photo mode', 'photo_mode'],
      ['landscap', 'landscaping'], ['tree', 'props_trees'], ['bulldoz', 'bulldoze'], ['electric', 'electricity'],
      ['garbage', 'garbage'], ['health', 'healthcare'], ['education', 'education'], ['police', 'police'],
      ['park', 'parks'], ['transport', 'transportation'], ['statistic', 'statistics'], ['journal', 'journal'],
      ['zoning', 'zoning'], ['zone', 'zoning'], ['road', 'roads']
    ];
    for (var i = 0; i < tools.length; i++) if (text.indexOf(tools[i][0]) >= 0) return tools[i][1];
    return '';
  }

  function ensureGA() {
    if (typeof window.gtag === 'function') return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);
  }

  function send(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (_) {}
  }

  function bindDiscovery() {
    document.addEventListener('click', function (event) {
      var entry = event.target.closest && event.target.closest('[data-demo-entry]');
      if (entry) send('demo_discover', { demo_id: 'simbuild', entry_source: entry.getAttribute('data-demo-entry') });
      var choice = event.target.closest && event.target.closest('[data-demo-choice]');
      if (choice) send('demo_launch_choice', {
        demo_id: 'simbuild',
        demo_mode: choice.getAttribute('data-demo-choice'),
        entry_source: normalizeSource(new URL(window.location.href).searchParams.get('from'))
      });
    });
  }

  function installDemoTracking() {
    var query = new URL(window.location.href).searchParams;
    var mode = normalizeMode(query.get('mode'));
    var source = normalizeSource(query.get('from'));
    var openedAt = Date.now();
    var ready = false;
    var started = false;
    var lastTick = Date.now();
    var activeMs = 0;
    var interactions = 0;
    var sentMilestones = {};
    var usedTools = {};

    function common() { return { demo_id: 'simbuild', demo_mode: mode, entry_source: source }; }
    function markReady() {
      if (ready) return;
      var boot = document.getElementById('boot');
      var pct = document.getElementById('bootpct');
      if (!boot || boot.classList.contains('hidden') || (pct && /100%/.test(pct.textContent || ''))) {
        ready = true;
        lastTick = Date.now();
        var data = common(); data.load_time_ms = Math.max(0, Date.now() - openedAt);
        send('demo_ready', data);
      }
    }
    function start() {
      if (!ready || started) return;
      started = true;
      lastTick = Date.now();
      send('demo_start', common());
      send('demo_first_interaction', common());
    }
    function interaction(event) {
      markReady();
      if (!ready) return;
      interactions++;
      start();
      var button = event.target && event.target.closest && event.target.closest('button,[role="button"],[data-tool],canvas');
      if (!button || button.tagName === 'CANVAS') return;
      var label = button.getAttribute('data-tool') || button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent;
      var tool = toolName(label);
      if (tool && !usedTools[tool]) {
        usedTools[tool] = true;
        var data = common(); data.tool_name = tool;
        send('demo_tool_used', data);
      }
    }
    function tick() {
      var now = Date.now();
      if (ready && started && !document.hidden) activeMs += Math.max(0, now - lastTick);
      lastTick = now;
      MILESTONES.forEach(function (seconds) {
        if (!sentMilestones[seconds] && activeMs >= seconds * 1000) {
          sentMilestones[seconds] = true;
          var data = common(); data.engagement_seconds = seconds;
          send('demo_engagement', data);
        }
      });
    }
    function finish() {
      tick();
      if (!started) return;
      var data = common();
      data.engagement_seconds = Math.round(activeMs / 1000);
      data.interaction_count = interactions;
      data.tools_used_count = Object.keys(usedTools).length;
      data.transport_type = 'beacon';
      send('demo_session_end', data);
    }

    document.addEventListener('pointerdown', interaction, true);
    document.addEventListener('keydown', interaction, true);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('pagehide', finish);
    window.addEventListener('error', function () { var data = common(); data.error_kind = 'runtime_error'; send('demo_error', data); });
    window.addEventListener('unhandledrejection', function () { var data = common(); data.error_kind = 'unhandled_rejection'; send('demo_error', data); });
    var observer = new MutationObserver(markReady);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    window.setInterval(function () { markReady(); tick(); }, 1000);
    markReady();
  }

  var api = { normalizeSource: normalizeSource, normalizeMode: normalizeMode, toolName: toolName, send: send };
  if (typeof window !== 'undefined') window.GVDemoAnalytics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  ensureGA();
  bindDiscovery();
  if (/^\/simbuild\/?$/.test(window.location.pathname)) installDemoTracking();
})();
