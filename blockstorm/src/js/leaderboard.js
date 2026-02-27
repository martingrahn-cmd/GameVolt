/**
 * BlockStorm - Leaderboard Module
 * Firebase leaderboard with random name generator
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

// Firebase SDK URLs
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

let db = null;
let firebaseLoaded = false;

// Collection names per game mode
const COLLECTIONS = {
  marathon: 'leaderboards_pulse_marathon',
  sprint: 'leaderboards_pulse_sprint',
  ultra: 'leaderboards_pulse_ultra'
};

// ============================================================
// Name Generator
// ============================================================

const ADJECTIVES = [
  'Swift', 'Cool', 'Neon', 'Lazy', 'Wild',
  'Happy', 'Crazy', 'Mighty', 'Silent', 'Cosmic',
  'Electric', 'Turbo', 'Mega', 'Super', 'Hyper',
  'Chill', 'Funky', 'Sneaky', 'Lucky', 'Brave'
];

const ANIMALS = [
  'Fox', 'Tiger', 'Panda', 'Wolf', 'Bear',
  'Eagle', 'Shark', 'Falcon', 'Dragon', 'Lynx',
  'Cobra', 'Phoenix', 'Raven', 'Panther', 'Otter',
  'Hawk', 'Lion', 'Viper', 'Owl', 'Jaguar'
];

function generatePlayerName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${adj}${animal}${num}`;
}

function getPlayerName() {
  let name = localStorage.getItem('gamevolt_player_name');
  if (!name) {
    name = generatePlayerName();
    localStorage.setItem('gamevolt_player_name', name);
  }
  return name;
}

function regeneratePlayerName() {
  const name = generatePlayerName();
  localStorage.setItem('gamevolt_player_name', name);
  return name;
}

// ============================================================
// Firebase Loading
// ============================================================

function loadScript(url) {
  return new Promise((resolve, reject) => {
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

async function loadFirebase() {
  if (firebaseLoaded) return true;
  
  try {
    await loadScript(FIREBASE_APP_URL);
    await loadScript(FIREBASE_FIRESTORE_URL);
    
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

// ============================================================
// Leaderboard Functions
// ============================================================

/**
 * Submit a score to the leaderboard
 * @param {string} mode - 'marathon', 'sprint', or 'ultra'
 * @param {object} data - { score, level, lines, time }
 */
async function submitScore(mode, data) {
  if (!await loadFirebase()) {
    console.error('Firebase not available');
    return null;
  }
  
  const collection = COLLECTIONS[mode];
  if (!collection) {
    console.error('Invalid game mode:', mode);
    return null;
  }
  
  const playerName = getPlayerName();
  
  const entry = {
    name: playerName,
    score: data.score || 0,
    level: data.level || 0,
    lines: data.lines || 0,
    time: data.time || 0,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const docRef = await db.collection(collection).add(entry);
    console.log('Score submitted:', entry);
    return { id: docRef.id, ...entry, name: playerName };
  } catch (error) {
    console.error('Failed to submit score:', error);
    return null;
  }
}

/**
 * Get top scores for a game mode
 * @param {string} mode - 'marathon', 'sprint', or 'ultra'
 * @param {number} limit - Number of scores to fetch (default 10)
 */
async function getLeaderboard(mode, limit = 10) {
  if (!await loadFirebase()) {
    return [];
  }
  
  const collection = COLLECTIONS[mode];
  if (!collection) {
    console.error('Invalid game mode:', mode);
    return [];
  }
  
  try {
    let query;
    
    if (mode === 'sprint') {
      // Sprint: lowest time wins (only completed games with 40 lines)
      query = db.collection(collection)
        .where('lines', '>=', 40)
        .orderBy('lines')
        .orderBy('time', 'asc')
        .limit(limit);
    } else {
      // Marathon & Ultra: highest score wins
      query = db.collection(collection)
        .orderBy('score', 'desc')
        .limit(limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

/**
 * Get player's best score and rank for a mode
 * @param {string} mode - 'marathon', 'sprint', or 'ultra'
 */
async function getPlayerBest(mode) {
  if (!await loadFirebase()) {
    return null;
  }
  
  const collection = COLLECTIONS[mode];
  const playerName = getPlayerName();
  
  try {
    let query;
    
    if (mode === 'sprint') {
      query = db.collection(collection)
        .where('name', '==', playerName)
        .where('lines', '>=', 40)
        .orderBy('lines')
        .orderBy('time', 'asc')
        .limit(1);
    } else {
      query = db.collection(collection)
        .where('name', '==', playerName)
        .orderBy('score', 'desc')
        .limit(1);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Failed to get player best:', error);
    return null;
  }
}

// ============================================================
// Exports
// ============================================================

export {
  getPlayerName,
  regeneratePlayerName,
  submitScore,
  getLeaderboard,
  getPlayerBest,
  loadFirebase
};
