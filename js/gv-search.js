// ============================================================
// GameVolt Search — injected into all page headers
// Load via: <script src="/js/gv-search.js"></script>
// ============================================================
(function() {
  'use strict';

  var GAMES = [
    { id: 'one-stroke',    name: 'One Stroke',    cat: 'Puzzle', thumb: '/assets/thumbnails/one-stroke.webp', tags: 'puzzle logic path hamiltonian daily' },
    { id: 'golden-glyphs', name: 'Golden Glyphs', cat: 'Puzzle', thumb: '/assets/thumbnails/golden-glyphs.webp', tags: 'puzzle block campaign zen' },
    { id: 'manga-match3',  name: 'Manga Match',   cat: 'Puzzle', thumb: '/assets/thumbnails/manga-match3.webp', tags: 'puzzle match3 anime combo' },
    { id: 'sudoku',        name: 'Sudoku',         cat: 'Puzzle', thumb: '/assets/thumbnails/sudoku.webp', tags: 'puzzle number logic brain' },
    { id: 'blockstorm',    name: 'BlockStorm',     cat: 'Puzzle', thumb: '/assets/thumbnails/blockstorm.webp', tags: 'puzzle tetris block' },
    { id: 'hoverdash',     name: 'HoverDash',      cat: 'Action', thumb: '/hoverdash/og-image.png', tags: 'action runner neon dodge' },
    { id: 'axeluga',       name: 'Axeluga',        cat: 'Action', thumb: '/assets/thumbnails/axeluga.webp', tags: 'action shoot space' },
    { id: 'snake',         name: 'Snake Neo',      cat: 'Arcade', thumb: '/assets/thumbnails/snake.webp', tags: 'arcade classic snake' },
    { id: 'breakout',      name: 'Breakout',       cat: 'Arcade', thumb: '/assets/thumbnails/breakout.webp', tags: 'arcade brick breaker classic' },
    { id: 'taprush',       name: 'Tap Rush',       cat: 'Arcade', thumb: '/assets/thumbnails/taprush.webp', tags: 'arcade tap speed' },
    { id: 'gravitywell',   name: 'Gravity Well',   cat: 'Arcade', thumb: '/assets/thumbnails/gravitywell.webp', tags: 'arcade gravity physics' },
    { id: 'solitaire',     name: 'Solitaire',      cat: 'Board',  thumb: '/assets/thumbnails/solitaire.webp', tags: 'board card classic klondike' },
    { id: 'connect4',      name: 'Connect 4',      cat: 'Board',  thumb: '/assets/thumbnails/connect4-thumbnail.webp', tags: 'board strategy classic' }
  ];

  var wrap = null;
  var input = null;
  var dropdown = null;
  var isOpen = false;

  function init() {
    // Find header — works for both homepage and play page
    var header = document.querySelector('header .header-right, header .gv-header-right, header .header-content');
    if (!header) return;

    // Inject CSS
    var style = document.createElement('style');
    style.textContent =
      '.gv-search-wrap{position:relative;display:flex;align-items:center}' +
      '.gv-search-input{width:0;padding:0;border:none;background:transparent;color:#f0f0ff;font-size:0.85rem;font-family:inherit;outline:none;transition:width .25s,padding .25s}' +
      '.gv-search-wrap.open .gv-search-input{width:200px;padding:7px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(124,92,252,0.3);border-radius:8px}' +
      '.gv-search-btn{background:none;border:none;color:#a0a4c0;cursor:pointer;padding:6px;display:flex;align-items:center}' +
      '.gv-search-btn:hover{color:#f0f0ff}' +
      '.gv-search-dropdown{position:absolute;top:calc(100% + 6px);right:0;width:280px;max-height:360px;overflow:auto;background:#181c30;border:1px solid rgba(124,92,252,0.2);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.5);z-index:9999;display:none}' +
      '.gv-search-wrap.open .gv-search-dropdown{display:block}' +
      '.gv-search-item{display:flex;align-items:center;gap:10px;padding:10px 12px;text-decoration:none;color:#f0f0ff;transition:background .15s}' +
      '.gv-search-item:hover,.gv-search-item.active{background:rgba(124,92,252,0.12)}' +
      '.gv-search-thumb{width:48px;height:36px;border-radius:6px;object-fit:cover;background:#222}' +
      '.gv-search-info{flex:1;min-width:0}' +
      '.gv-search-name{font-size:0.85rem;font-weight:700}' +
      '.gv-search-cat{font-size:0.7rem;color:#a0a4c0}' +
      '.gv-search-empty{padding:16px;text-align:center;color:#626580;font-size:0.82rem}' +
      '@media(max-width:600px){.gv-search-wrap.open .gv-search-input{width:140px}.gv-search-dropdown{width:calc(100vw - 32px);right:-8px}}';
    document.head.appendChild(style);

    // Build DOM
    wrap = document.createElement('div');
    wrap.className = 'gv-search-wrap';

    var btn = document.createElement('button');
    btn.className = 'gv-search-btn';
    btn.setAttribute('aria-label', 'Search games');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

    input = document.createElement('input');
    input.type = 'search';
    input.className = 'gv-search-input';
    input.placeholder = 'Search games...';
    input.setAttribute('aria-label', 'Search games');

    dropdown = document.createElement('div');
    dropdown.className = 'gv-search-dropdown';
    dropdown.setAttribute('role', 'listbox');

    wrap.append(input, btn, dropdown);

    // Insert before user area or at start of header-right
    var userArea = header.querySelector('#gv-user-area');
    if (userArea) {
      userArea.parentNode.insertBefore(wrap, userArea);
    } else {
      header.insertBefore(wrap, header.firstChild);
    }

    // Events
    btn.addEventListener('click', function() {
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    input.addEventListener('input', function() {
      render(input.value.trim());
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Enter') {
        var first = dropdown.querySelector('.gv-search-item');
        if (first) { window.location.href = first.href; }
      }
    });

    document.addEventListener('click', function(e) {
      if (isOpen && !wrap.contains(e.target)) close();
    });

    // Show all on open with empty query
    render('');
  }

  function open() {
    isOpen = true;
    wrap.classList.add('open');
    input.focus();
    render(input.value.trim());
  }

  function close() {
    isOpen = false;
    wrap.classList.remove('open');
    input.value = '';
  }

  function render(query) {
    var q = query.toLowerCase();
    var results = GAMES.filter(function(g) {
      if (!q) return true;
      return g.name.toLowerCase().indexOf(q) >= 0 ||
             g.cat.toLowerCase().indexOf(q) >= 0 ||
             g.tags.indexOf(q) >= 0;
    });

    dropdown.innerHTML = '';
    if (results.length === 0) {
      dropdown.innerHTML = '<div class="gv-search-empty">No games found</div>';
      return;
    }

    results.forEach(function(g) {
      var a = document.createElement('a');
      a.className = 'gv-search-item';
      a.href = '/play/?game=' + g.id;
      a.setAttribute('role', 'option');
      a.innerHTML =
        '<img class="gv-search-thumb" src="' + g.thumb + '" alt="" loading="lazy">' +
        '<div class="gv-search-info">' +
          '<div class="gv-search-name">' + g.name + '</div>' +
          '<div class="gv-search-cat">' + g.cat + '</div>' +
        '</div>';
      dropdown.appendChild(a);
    });
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
