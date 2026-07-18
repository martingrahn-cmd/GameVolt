const LEVEL_MECHANICS = {
  1: {
    key: 'classic',
    label: 'CLASSIC BREAKOUT',
    description: 'Clean aim and build your combo.'
  },
  2: {
    key: 'row-chain',
    label: 'ROW CHAIN',
    description: 'Clear a full stripe for +250.'
  },
  3: {
    key: 'armor',
    label: 'ARMORED CAPS',
    description: 'Silver armor absorbs the first hit.'
  },
  4: {
    key: 'linked',
    label: 'LINKED PAIRS',
    description: 'A hit also damages its cyan-linked twin.'
  },
  5: {
    key: 'blast',
    label: 'BLAST BRICKS',
    description: 'Destroy marked cores to damage nearby bricks.'
  },
  6: {
    key: 'shifting',
    label: 'SHIFTING ROWS',
    description: 'The formation slides while you aim.'
  },
  7: {
    key: 'fleet',
    label: 'DESCENDING FLEET',
    description: 'Every paddle return brings the fleet closer.'
  },
  8: {
    key: 'prism',
    label: 'PRISM DEFLECTION',
    description: 'Diamond bricks bend the ball trajectory.'
  },
  9: {
    key: 'gates',
    label: 'SWITCH GATES',
    description: 'Break both switches to unlock gold gates.'
  },
  10: {
    key: 'final-boss',
    label: 'NEON GOD // FINAL',
    description: 'Break four shield nodes, then destroy the moving core.'
  }
};

export function getLevelMechanic(designID) {
  const id = Math.max(1, Math.min(10, Math.floor(Number(designID) || 1)));
  return LEVEL_MECHANICS[id];
}

export function getBrickOptions(designID, row, col, hp, brickWidth) {
  const id = Math.max(1, Math.min(10, Math.floor(Number(designID) || 1)));
  const options = {
    row,
    col,
    kind: 'normal',
    armor: 0,
    linkId: null,
    locked: false,
    isSwitch: false,
    moveAmplitude: 0,
    moveSpeed: 0,
    movePhase: 0,
    prismDirection: 0,
    isGodSentinel: false,
    isGodCore: false
  };

  if (id === 3 && hp >= 3) {
    options.kind = 'armor';
    options.armor = 1;
  }

  if (id === 4) {
    options.kind = 'linked';
    options.linkId = `${row}:${Math.min(col, 9 - col)}`;
  }

  if (
    id === 5 &&
    (
      (row === 2 && (col === 2 || col === 7)) ||
      (row === 3 && (col === 4 || col === 5))
    )
  ) {
    options.kind = 'bomb';
  }

  if (id === 6) {
    options.kind = 'moving';
    options.moveAmplitude = brickWidth * 0.28;
    options.moveSpeed = 1.05 + row * 0.08;
    options.movePhase = row % 2 === 0 ? 0 : Math.PI;
  }

  if (id === 7) {
    options.kind = 'invader';
  }

  if (id === 8 && (row + col) % 4 === 0) {
    options.kind = 'prism';
    options.prismDirection = col < 5 ? -1 : 1;
  }

  if (id === 9) {
    if (row === 2 && (col === 2 || col === 7)) {
      options.kind = 'switch';
      options.isSwitch = true;
    } else if (row === 5 && (col <= 3 || col >= 6)) {
      options.kind = 'locked';
      options.locked = true;
    }
  }

  if (id === 10) {
    if (
      (row === 0 && (col === 1 || col === 8)) ||
      (row === 4 && (col === 1 || col === 8))
    ) {
      options.kind = 'god-sentinel';
      options.isGodSentinel = true;
      options.armor = 1;
    } else if (row === 0 && (col === 0 || col === 9)) {
      options.kind = 'armor';
      options.armor = 1;
    } else if (row === 1 && (col === 0 || col === 9)) {
      options.kind = 'bomb';
    } else if (row === 2 && (col === 2 || col === 7)) {
      options.kind = 'prism';
      options.prismDirection = col < 5 ? -1 : 1;
    } else if (row === 3 && (col === 0 || col === 9)) {
      options.kind = 'linked';
      options.linkId = `${row}:${Math.min(col, 9 - col)}`;
    } else if (row === 5) {
      options.kind = 'moving';
      options.moveAmplitude = brickWidth * 0.2;
      options.moveSpeed = 1.2;
      options.movePhase = 0;
    }
  }

  return options;
}

export function rotateVelocity(vx, vy, degrees) {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    vx: vx * cos - vy * sin,
    vy: vx * sin + vy * cos
  };
}
