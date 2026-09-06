// Short, verified versions of the games' existing guides. Keep controls in sync
// with the source game when changing its input scheme.
(function () {
    'use strict';

    var guides = {
        'short-circuit': {
            goal: 'Uncover conductors and swap them into a route from IN to OUT before the current catches up.',
            touch: 'Tap to uncover a tile. Tap two revealed conductors to swap them.',
            desktop: 'Click tiles, or move with the arrow keys and select with Enter.',
            tip: 'The game menu’s How to play option runs a guided practice lock.'
        },
        'manny-the-mole': {
            goal: 'Dig through the mine, avoid falling blocks and solve the circuit locks.',
            touch: 'Drag to move and dig. Tap tiles when working a circuit lock.',
            desktop: 'Left / Right to walk, Down to drop, and Space + a direction to drill. P pauses.'
        },
        snake: {
            goal: 'Eat food to grow and score. Avoid your own tail and the hazards of your chosen mode.',
            touch: 'Swipe in the direction you want to turn.',
            desktop: 'Use the arrow keys to change direction.'
        },
        breakout: {
            goal: 'Bounce the ball into the bricks and keep it from falling past your paddle.',
            touch: 'Turn sideways and move the paddle with your finger.',
            desktop: 'Move the paddle with the mouse or arrow keys.',
            tip: 'Catch falling power-ups for an extra edge.'
        },
        taprush: {
            goal: 'Hit targets quickly and accurately while avoiding bombs.',
            touch: 'Tap the targets as they appear.',
            desktop: 'Click the targets with the mouse.'
        },
        solitaire: {
            goal: 'Choose one of six card games and complete its layout. Klondike is a good place to start.',
            touch: 'Tap and drag cards to move them.',
            desktop: 'Click and drag cards with the mouse.',
            tip: 'Each variant has different rules; check its own help after choosing a game.'
        },
        connect4: {
            goal: 'Connect four of your discs horizontally, vertically or diagonally before your opponent.',
            touch: 'Tap a column to drop a disc.',
            desktop: 'Click a column to drop a disc.'
        },
        blockstorm: {
            goal: 'Fit falling blocks into complete rows before the stack reaches the top.',
            touch: 'Swipe sideways to move, down for a soft drop, up for a hard drop. Tap to rotate.',
            desktop: 'Arrows / A and D move; Up / W / X rotates, Z rotates back, Space drops. P / Esc pauses.'
        },
        hoverdash: {
            goal: 'Survive the run, dodge obstacles and collect coins and boosts.',
            touch: 'Swipe sideways to steer, swipe up or tap to jump, and swipe down to duck or dive.',
            desktop: 'A / D or Left / Right steer. W / Up / Space jumps; hold to float. S / Down ducks or dives. P / Esc pauses.',
            tip: 'The game’s Guide tab explains obstacles, boosts and scoring.'
        },
        'vector-hexagon': {
            goal: 'Rotate through gaps in the incoming walls for as long as you can.',
            touch: 'Hold the left or right half of the screen to rotate that way.',
            desktop: 'Use Left / Right or A / D, or hold either side with the mouse. Space retries; Backspace returns to the menu.'
        },
        spinburn: {
            goal: 'Return the ball, aim past your opponent and win the table-tennis match.',
            touch: 'Drag to move your paddle. Tap to toss a serve, then swipe to strike. Swipe through the ball to aim.',
            desktop: 'Use the mouse to drag your paddle, click to toss the serve and drag through the ball to strike.'
        },
        gridburn: {
            goal: 'Outlast the other rider without crashing into a wall or a light trail. First to three rounds wins.',
            touch: 'Swipe to steer, or tap left / right to turn.',
            desktop: 'Use WASD or the arrow keys to steer. Gamepads are also supported.'
        },
        axeluga: {
            goal: 'Pilot your ship through enemy waves and survive the space battle.',
            touch: 'Use the on-screen touch controls in portrait mode.',
            desktop: 'Arrow keys move, Space fires and B launches a bomb. Gamepads are also supported.'
        },
        gravitywell: {
            goal: 'Feed your black hole with energy particles while avoiding antimatter and hunters.',
            touch: 'Move the black hole with your finger. Use PULSE to push threats away.',
            desktop: 'Move with the mouse. Space activates the repulsion pulse.',
            tip: 'A pulse costs 120 mass, so save it for nearby threats.'
        },
        sudoku: {
            goal: 'Fill every row, column and 3 × 3 box with the digits 1–9 exactly once.',
            touch: 'Tap a cell, then a number. Toggle Notes to add candidates.',
            desktop: 'Click a cell and number, or use arrows and 1–9. N toggles notes; Ctrl + Z undoes.'
        },
        'manga-match3': {
            goal: 'Swap adjacent tiles to match three or more and reach the stage’s goal.',
            touch: 'Swap neighbouring tiles with your finger.',
            desktop: 'Use the mouse to swap neighbouring tiles.',
            tip: 'Bigger matches and chains charge Fever mode.'
        },
        'golden-glyphs': {
            goal: 'Fit all the glyph pieces into the board without gaps or overlaps.',
            touch: 'Drag pieces from the tray onto the board.',
            desktop: 'Drag with the mouse, or use Tab to select a piece, arrows to move it and Enter to place it.',
            tip: 'Use the game’s hint button if you get stuck.'
        },
        'one-stroke': {
            goal: 'Visit every node exactly once in one continuous path from the highlighted start.',
            touch: 'Drag between neighbouring nodes. Drag back along your path to undo.',
            desktop: 'Drag with the mouse. Z undoes, R resets and H gives a hint.'
        },
        'asteroid-storm': {
            goal: 'Destroy asteroids and enemies, collect power-ups and survive the waves.',
            touch: 'Turn sideways. Steer with the left joystick, shoot on the right and use the teleport button to escape.',
            desktop: 'Arrow keys rotate, thrust and brake. / or . fires; Right Shift teleports. Keys can be changed in Settings.'
        },
        minesweeper: {
            goal: 'Reveal every safe square. Numbers show how many mines touch that square.',
            touch: 'Tap to reveal, long-press to flag, or use the flag toggle. Tap a revealed number to clear its safe neighbours.',
            desktop: 'Click to reveal, right-click to flag. Double-click a number once its neighbouring mines are flagged.'
        },
        'type-or-die': {
            goal: 'Type the words above zombies before they reach you, or choose Speed Test to measure your typing.',
            touch: 'This game requires a desktop or laptop with a physical keyboard.',
            desktop: 'Type the displayed words on your keyboard. Tab restarts the run.'
        },
        'chain-reaction': {
            goal: 'Merge equal tiles to reach 2048 before the board fills up.',
            touch: 'Swipe in a direction to slide all tiles.',
            desktop: 'Use the arrow keys or WASD to slide all tiles.'
        },
        livewire: {
            goal: 'Connect every pair of matching dots without crossing wires or touching other dots.',
            touch: 'Drag from a dot to its matching partner. Tap a wire to remove it.',
            desktop: 'Click and drag between matching dots. Click a wire to remove it.',
            tip: 'Undo steps back, Clear restarts the board, and Hint helps at the cost of a star.'
        }
    };

    function create(options) {
        var dialog = document.getElementById('gameHelp');
        var body = document.getElementById('gameHelpBody');
        var open = document.getElementById('helpBtn');
        var panel = document.getElementById('gameLoadStatus');
        var message = document.getElementById('gameLoadMessage');
        var actions = document.getElementById('gameLoadActions');
        var currentFrame, timer, currentName;

        open.addEventListener('click', function () { dialog.showModal(); });
        document.getElementById('helpClose').addEventListener('click', function () { dialog.close(); });
        dialog.addEventListener('close', function () { open.focus({ preventScroll: true }); });
        document.getElementById('helpReload').addEventListener('click', function () {
            dialog.close(); options.retry();
        });
        document.getElementById('gameLoadRetry').addEventListener('click', function () { options.retry(); });
        document.getElementById('gameLoadWait').addEventListener('click', function () {
            panel.hidden = true; open.focus({ preventScroll: true });
        });

        function showSlow() {
            message.textContent = currentName + ' is taking longer than expected. Keep waiting or try loading it again.';
            actions.hidden = false;
            panel.hidden = false;
        }

        return {
            dialog: dialog,
            watch: function (frame, key, name) {
                clearTimeout(timer);
                currentFrame = frame;
                currentName = name;
                var guide = guides[key];
                document.getElementById('gameHelpTitle').textContent = 'How to play ' + name;
                body.replaceChildren();
                [['Goal', guide.goal], ['Touch', guide.touch], ['Mouse & keyboard', guide.desktop], ['Tip', guide.tip]].forEach(function (section) {
                    if (!section[1]) return;
                    var heading = document.createElement('h3'), text = document.createElement('p');
                    heading.textContent = section[0]; text.textContent = section[1];
                    body.append(heading, text);
                });
                message.textContent = 'Opening ' + name + '…';
                panel.hidden = false;
                actions.hidden = true;
                frame.onload = function () {
                    if (frame !== currentFrame) return;
                    clearTimeout(timer);
                    panel.hidden = true;
                    if (!dialog.open) options.ready();
                };
                frame.onerror = function () {
                    if (frame !== currentFrame) return;
                    clearTimeout(timer); showSlow();
                };
                timer = setTimeout(function () { if (frame === currentFrame) showSlow(); }, 15000);
            }
        };
    }

    window.GVPlayerSupport = { guides: guides, create: create };
})();
