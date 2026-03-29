// levels.js
export const LEVELS = [
  // --- LEVEL 1: "The Warmup" (12 rutor) ---
  // Lösning: Enkel rektangel
  {
    id: 1,
    difficulty: "easy",
    name: "Neon Start",
    pieces: ["1", "4", "1"], // L, Z, L
    map: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0], 
      [0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ]
  },

// --- LEVEL 2: "Cube Logic" (CORRECTED) ---
  // 3x3 var omöjligt. Vi kör 4x3 med 4 bitar istället!
  {
    id: 2,
    difficulty: "easy",
    name: "Cube Logic",
    pieces: ["8", "8", "8", "8"], // 4 st L-vinklar
    map: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ]
  },

  // --- LEVEL 3: "The Cross" (20 rutor) ---
  // Lösning: Ett kors. Kräver 5 bitar. Lite klurigare!
  {
    id: 3,
    difficulty: "medium",
    name: "Crossroads",
    pieces: ["1", "1", "6", "4", "4"], // L, L, T, Z, Z
    map: [
      [0, 0, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 0, 0]
    ]
  }
];