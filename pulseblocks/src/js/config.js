console.log("CONFIG SAFE 1.0 LOADED");

export const CONFIG = {
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  SIDEBAR_COLS: 6,
  OUTER_MARGIN: 24,

  COLORS: {
    background: "#1a3a3a",        // Mörk teal
    
    boardBg: "#0d2626",           // Djup teal
    boardBorder: "#2d5a5a",       // Ljusare teal kant
    gridLine: "rgba(255,255,255,0.06)", // Subtila linjer
    clearFlash: "rgba(100,220,200,0.4)",  // Teal flash

    sidebarBg: "#12302f",         // Mörk teal
    sidebarBorder: "#2d5a5a",     // Matchande kant

    textPrimary: "#c8e6e3",       // Ljus teal/mint text
    textAccent: "#7ab5b0",        // Dämpad teal

    // Tetris-bitar – starkare pasteller med tryck
    pieceI: "#45d9c8",   // Stark turkos
    pieceT: "#a78bda",   // Rik lavendel
    pieceL: "#f5a623",   // Stark orange
    pieceJ: "#5b9ee8",   // Stark blå
    pieceS: "#5dd87a",   // Stark grön
    pieceZ: "#e85b6c",   // Stark rosa/röd
    pieceO: "#f5d63d",   // Stark gul
  },

  FONT: {
    hudFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
  },
};