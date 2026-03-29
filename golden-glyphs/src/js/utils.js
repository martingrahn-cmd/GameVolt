export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function roundToGrid(x, y, originX, originY, cell, gap) {
  // Runda av skärmkoordinater till närmsta cellindex
  const pitch = cell + gap;
  const col = Math.floor((x - originX) / pitch);
  const row = Math.floor((y - originY) / pitch);
  return { col, row };
}
