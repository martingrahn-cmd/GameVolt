/**
 * PulseGames Solitaire - Firebase Leaderboard Module
 * Shared leaderboard functionality for all solitaire games
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCWwD3bbk2oVpNDr4BmJ_Q-j6Jo6QkoGHA",
    authDomain: "pulsegames-solitaire.firebaseapp.com",
    projectId: "pulsegames-solitaire",
    storageBucket: "pulsegames-solitaire.firebasestorage.app",
    messagingSenderId: "425880393670",
    appId: "1:425880393670:web:9e6c2fc30ba927527104c7"
};

// Firebase SDK URLs (using CDN for simplicity)
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

let db = null;
let firebaseLoaded = false;

/**
 * Load Firebase SDK dynamically
 */
async function loadFirebase() {
    if (firebaseLoaded) return true;
    
    try {
        // Load Firebase App
        await loadScript(FIREBASE_APP_URL);
        // Load Firestore
        await loadScript(FIREBASE_FIRESTORE_URL);
        
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        firebaseLoaded = true;
        console.log('Firebase loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load Firebase:', error);
        return false;
    }
}

/**
 * Helper to load scripts dynamically
 */
function loadScript(url) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Get or create player ID (anonymous)
 */
function getPlayerId() {
    let playerId = localStorage.getItem('pulsegames_player_id');
    if (!playerId) {
        playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pulsegames_player_id', playerId);
    }
    return playerId;
}

/**
 * Get player nickname
 */
function getPlayerNickname() {
    return localStorage.getItem('pulsegames_nickname') || 'Anonymous';
}

/**
 * Set player nickname
 */
function setPlayerNickname(nickname) {
    const clean = nickname.trim().substring(0, 20) || 'Anonymous';
    localStorage.setItem('pulsegames_nickname', clean);
    return clean;
}

/**
 * Submit a score to the leaderboard
 * @param {string} gameType - Game identifier (klondike, freecell, spider, pyramid, tripeaks, golf)
 * @param {number} score - Player's score
 * @param {number} time - Time in seconds
 * @param {number} moves - Number of moves
 * @param {object} extra - Extra data (optional)
 */
async function submitScore(gameType, score, time, moves, extra = {}) {
    if (!await loadFirebase()) {
        console.error('Firebase not available');
        return null;
    }
    
    const playerId = getPlayerId();
    const nickname = getPlayerNickname();
    
    const scoreData = {
        playerId,
        nickname,
        score: Math.round(score),
        time: Math.round(time),
        moves: Math.round(moves),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...extra
    };
    
    try {
        // Add to leaderboard collection
        const docRef = await db.collection(`leaderboards_${gameType}`).add(scoreData);
        console.log('Score submitted:', docRef.id);
        
        // Also update player's personal best if this is higher
        await updatePersonalBest(gameType, playerId, scoreData);
        
        return docRef.id;
    } catch (error) {
        console.error('Error submitting score:', error);
        return null;
    }
}

/**
 * Update personal best score
 */
async function updatePersonalBest(gameType, playerId, scoreData) {
    const personalRef = db.collection(`personal_bests_${gameType}`).doc(playerId);
    
    try {
        const doc = await personalRef.get();
        if (!doc.exists || doc.data().score < scoreData.score) {
            await personalRef.set({
                ...scoreData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error updating personal best:', error);
    }
}

/**
 * Get top scores for a game
 * @param {string} gameType - Game identifier
 * @param {number} limit - Number of scores to fetch (default 100)
 */
async function getLeaderboard(gameType, limit = 100) {
    if (!await loadFirebase()) {
        return [];
    }
    
    try {
        const snapshot = await db.collection(`leaderboards_${gameType}`)
            .orderBy('score', 'desc')
            .limit(limit)
            .get();
        
        const scores = [];
        snapshot.forEach((doc, index) => {
            scores.push({
                id: doc.id,
                rank: scores.length + 1,
                ...doc.data()
            });
        });
        
        return scores;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

/**
 * Get today's top scores
 * @param {string} gameType - Game identifier
 * @param {number} limit - Number of scores to fetch
 */
async function getTodayLeaderboard(gameType, limit = 50) {
    if (!await loadFirebase()) {
        return [];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
        const snapshot = await db.collection(`leaderboards_${gameType}`)
            .where('timestamp', '>=', today)
            .orderBy('timestamp')
            .orderBy('score', 'desc')
            .limit(limit)
            .get();
        
        const scores = [];
        snapshot.forEach(doc => {
            scores.push({
                id: doc.id,
                rank: scores.length + 1,
                ...doc.data()
            });
        });
        
        // Re-sort by score since Firestore requires timestamp first
        scores.sort((a, b) => b.score - a.score);
        scores.forEach((s, i) => s.rank = i + 1);
        
        return scores;
    } catch (error) {
        console.error('Error fetching today leaderboard:', error);
        return [];
    }
}

/**
 * Get player's rank for a game
 * @param {string} gameType - Game identifier
 * @param {number} score - Score to check rank for
 */
async function getPlayerRank(gameType, score) {
    if (!await loadFirebase()) {
        return null;
    }
    
    try {
        const snapshot = await db.collection(`leaderboards_${gameType}`)
            .where('score', '>', score)
            .get();
        
        return snapshot.size + 1;
    } catch (error) {
        console.error('Error fetching player rank:', error);
        return null;
    }
}

/**
 * Get player's personal best
 * @param {string} gameType - Game identifier
 */
async function getPersonalBest(gameType) {
    if (!await loadFirebase()) {
        return null;
    }
    
    const playerId = getPlayerId();
    
    try {
        const doc = await db.collection(`personal_bests_${gameType}`).doc(playerId).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching personal best:', error);
        return null;
    }
}

/**
 * Format time for display (seconds to M:SS)
 */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + s.toString().padStart(2, '0');
}

/**
 * Format timestamp for display
 */
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

// Create leaderboard UI modal
function createLeaderboardModal() {
    if (document.getElementById('leaderboardModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'leaderboardModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal leaderboard-modal">
            <div class="modal-header">
                <h2 class="modal-title">🏆 Leaderboard</h2>
                <div class="leaderboard-tabs">
                    <button class="lb-tab active" data-tab="all">All Time</button>
                    <button class="lb-tab" data-tab="today">Today</button>
                </div>
            </div>
            <div class="modal-body">
                <div class="nickname-section">
                    <label>Your Nickname:</label>
                    <input type="text" id="nicknameInput" maxlength="20" placeholder="Anonymous">
                    <button class="btn btn-secondary" id="saveNicknameBtn">Save</button>
                </div>
                <div class="leaderboard-list" id="leaderboardList">
                    <div class="loading">Loading...</div>
                </div>
                <div class="personal-best" id="personalBestSection">
                    <h4>Your Best</h4>
                    <div id="personalBestInfo">-</div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" id="closeLeaderboardBtn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .leaderboard-modal { max-width: 550px; }
        .leaderboard-tabs { display: flex; gap: 10px; margin-top: 15px; }
        .lb-tab {
            padding: 8px 16px; background: rgba(255,255,255,0.1); border: none;
            color: var(--text-primary); border-radius: 6px; cursor: pointer;
            font-size: 0.85rem; transition: all 0.2s;
        }
        .lb-tab:hover { background: rgba(255,255,255,0.2); }
        .lb-tab.active { background: var(--gold); color: #1a1a1a; }
        .nickname-section {
            display: flex; gap: 10px; align-items: center;
            margin-bottom: 20px; padding-bottom: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .nickname-section label { font-size: 0.85rem; color: var(--text-secondary); }
        .nickname-section input {
            flex: 1; padding: 8px 12px; border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1); color: var(--text-primary);
            font-size: 0.9rem;
        }
        .leaderboard-list { max-height: 350px; overflow-y: auto; }
        .lb-entry {
            display: grid; grid-template-columns: 40px 1fr 80px 60px;
            gap: 10px; padding: 10px; border-radius: 6px;
            align-items: center; transition: background 0.2s;
        }
        .lb-entry:nth-child(odd) { background: rgba(255,255,255,0.03); }
        .lb-entry:hover { background: rgba(255,255,255,0.08); }
        .lb-entry.you { background: rgba(251, 191, 36, 0.15); border: 1px solid var(--gold); }
        .lb-rank {
            font-family: 'Playfair Display', serif; font-size: 1.1rem;
            font-weight: 700; color: var(--gold);
        }
        .lb-rank.gold { color: #ffd700; }
        .lb-rank.silver { color: #c0c0c0; }
        .lb-rank.bronze { color: #cd7f32; }
        .lb-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lb-score { font-family: 'Playfair Display', serif; font-weight: 600; color: var(--gold-light); text-align: right; }
        .lb-time { font-size: 0.85rem; color: var(--text-secondary); text-align: right; }
        .personal-best {
            margin-top: 20px; padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .personal-best h4 { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        #personalBestInfo { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--gold); }
        .loading { text-align: center; padding: 40px; color: var(--text-secondary); }
        .no-scores { text-align: center; padding: 40px; color: var(--text-secondary); }
    `;
    document.head.appendChild(style);
    
    // Event listeners
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    
    document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.getElementById('saveNicknameBtn').addEventListener('click', () => {
        const input = document.getElementById('nicknameInput');
        const newName = setPlayerNickname(input.value);
        input.value = newName;
        showToastMessage('Nickname saved!');
    });
    
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const currentGame = modal.dataset.gameType;
            if (currentGame) {
                if (tab.dataset.tab === 'today') {
                    loadTodayLeaderboard(currentGame);
                } else {
                    loadAllTimeLeaderboard(currentGame);
                }
            }
        });
    });
}

/**
 * Show toast message (uses game's toast if available)
 */
function showToastMessage(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
}

/**
 * Open leaderboard modal for a specific game
 */
async function showLeaderboard(gameType) {
    createLeaderboardModal();
    
    const modal = document.getElementById('leaderboardModal');
    modal.dataset.gameType = gameType;
    
    // Set current nickname
    document.getElementById('nicknameInput').value = getPlayerNickname();
    
    // Reset to All Time tab
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.lb-tab[data-tab="all"]').classList.add('active');
    
    modal.classList.add('active');
    
    await loadAllTimeLeaderboard(gameType);
    await loadPersonalBest(gameType);
}

/**
 * Load all-time leaderboard
 */
async function loadAllTimeLeaderboard(gameType) {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="loading">Loading...</div>';
    
    const scores = await getLeaderboard(gameType, 100);
    renderLeaderboard(scores);
}

/**
 * Load today's leaderboard
 */
async function loadTodayLeaderboard(gameType) {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="loading">Loading...</div>';
    
    const scores = await getTodayLeaderboard(gameType, 50);
    renderLeaderboard(scores);
}

/**
 * Render leaderboard entries
 */
function renderLeaderboard(scores) {
    const list = document.getElementById('leaderboardList');
    const playerId = getPlayerId();
    
    if (scores.length === 0) {
        list.innerHTML = '<div class="no-scores">No scores yet. Be the first!</div>';
        return;
    }
    
    list.innerHTML = scores.map(entry => {
        const isYou = entry.playerId === playerId;
        const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : '';
        
        return `
            <div class="lb-entry ${isYou ? 'you' : ''}">
                <div class="lb-rank ${rankClass}">#${entry.rank}</div>
                <div class="lb-name">${escapeHtml(entry.nickname)}${isYou ? ' (You)' : ''}</div>
                <div class="lb-score">${entry.score.toLocaleString()}</div>
                <div class="lb-time">${formatTime(entry.time)}</div>
            </div>
        `;
    }).join('');
}

/**
 * Load personal best
 */
async function loadPersonalBest(gameType) {
    const best = await getPersonalBest(gameType);
    const section = document.getElementById('personalBestInfo');
    
    if (best) {
        section.innerHTML = `${best.score.toLocaleString()} pts • ${formatTime(best.time)} • ${best.moves} moves`;
    } else {
        section.textContent = 'No games completed yet';
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for use in games
window.Leaderboard = {
    submit: submitScore,
    getAll: getLeaderboard,
    getToday: getTodayLeaderboard,
    getRank: getPlayerRank,
    getPersonalBest,
    show: showLeaderboard,
    getNickname: getPlayerNickname,
    setNickname: setPlayerNickname,
    formatTime,
    formatDate
};