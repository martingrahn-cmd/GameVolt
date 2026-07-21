#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.resolve(toolDir, '../src/js');

async function loadExports(fileName) {
    return import(pathToFileURL(path.join(jsDir, fileName)).href);
}

const { SHAPES } = await loadExports('config.js');
const levelFiles = ['levels_easy.js', 'levels_medium.js', 'levels_hard.js', 'levels_arcane.js', 'levels_daily.js'];

function cellKey(col, row) { return `${col},${row}`; }

function transformShape(shape, rotation, flipped) {
    let result = shape.map(([col, row]) => [col, row]);
    if (flipped) result = result.map(([col, row]) => [-col, row]);
    for (let i = 0; i < rotation; i++) result = result.map(([col, row]) => [-row, col]);
    return result;
}

function canonicalShape(shape) {
    const minCol = Math.min(...shape.map(([col]) => col));
    const minRow = Math.min(...shape.map(([, row]) => row));
    return shape.map(([col, row]) => [col - minCol, row - minRow]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function orientations(shape) {
    const unique = new Map();
    for (const flipped of [false, true]) {
        for (let rotation = 0; rotation < 4; rotation++) {
            const normalized = canonicalShape(transformShape(shape, rotation, flipped));
            unique.set(JSON.stringify(normalized), normalized);
        }
    }
    return [...unique.values()];
}

function validateAuthoredSolution(level) {
    if (!Array.isArray(level.solution) || level.solution.length !== level.pieces.length) return 'missing or incomplete authored solution';
    const target = new Set();
    level.map.forEach((row, rowIndex) => row.forEach((value, colIndex) => { if (value === 1) target.add(cellKey(colIndex, rowIndex)); }));
    const covered = new Set();
    const remaining = [...level.pieces];

    for (const placement of level.solution) {
        const pieceIndex = remaining.indexOf(String(placement.key));
        if (pieceIndex < 0) return `solution uses unavailable piece ${placement.key}`;
        remaining.splice(pieceIndex, 1);
        const shape = transformShape(SHAPES[placement.key], placement.rotation || 0, !!placement.flipped);
        for (const [deltaCol, deltaRow] of shape) {
            const key = cellKey(placement.col + deltaCol, placement.row + deltaRow);
            if (!target.has(key)) return `solution places ${placement.key} outside target at ${key}`;
            if (covered.has(key)) return `solution overlaps at ${key}`;
            covered.add(key);
        }
    }
    if (covered.size !== target.size) return `solution covers ${covered.size}/${target.size} target cells`;
    return null;
}

function countSolutions(level, limit = 2) {
    const target = new Set();
    level.map.forEach((row, rowIndex) => row.forEach((value, colIndex) => { if (value === 1) target.add(cellKey(colIndex, rowIndex)); }));
    const pieceCounts = new Map();
    level.pieces.forEach((key) => pieceCounts.set(String(key), (pieceCounts.get(String(key)) || 0) + 1));
    const placementsByPiece = new Map();

    for (const pieceKey of pieceCounts.keys()) {
        const placements = [];
        const seen = new Set();
        for (const shape of orientations(SHAPES[pieceKey])) {
            for (let row = 0; row < level.map.length; row++) {
                for (let col = 0; col < level.map[row].length; col++) {
                    const cells = shape.map(([deltaCol, deltaRow]) => cellKey(col + deltaCol, row + deltaRow));
                    if (cells.every((key) => target.has(key))) {
                        const signature = cells.slice().sort().join('|');
                        if (!seen.has(signature)) { seen.add(signature); placements.push(cells); }
                    }
                }
            }
        }
        placementsByPiece.set(pieceKey, placements);
    }

    let solutions = 0;
    const occupied = new Set();
    function search() {
        if (solutions >= limit) return;
        if (occupied.size === target.size) { solutions++; return; }
        let chosenCell = null;
        let candidates = null;
        for (const cell of target) {
            if (occupied.has(cell)) continue;
            const current = [];
            for (const [pieceKey, count] of pieceCounts) {
                if (count <= 0) continue;
                for (const placement of placementsByPiece.get(pieceKey)) {
                    if (placement.includes(cell) && placement.every((key) => !occupied.has(key))) current.push([pieceKey, placement]);
                }
            }
            if (!candidates || current.length < candidates.length) { chosenCell = cell; candidates = current; }
            if (current.length === 0) break;
        }
        if (!chosenCell || !candidates || candidates.length === 0) return;
        for (const [pieceKey, placement] of candidates) {
            pieceCounts.set(pieceKey, pieceCounts.get(pieceKey) - 1);
            placement.forEach((key) => occupied.add(key));
            search();
            placement.forEach((key) => occupied.delete(key));
            pieceCounts.set(pieceKey, pieceCounts.get(pieceKey) + 1);
            if (solutions >= limit) return;
        }
    }
    search();
    return solutions;
}

let checked = 0;
let unique = 0;
let multiple = 0;
const errors = [];

for (const fileName of levelFiles) {
    const exports = await loadExports(fileName);
    const levels = exports[Object.keys(exports).find((key) => key.startsWith('LEVELS_'))];
    levels.forEach((level, index) => {
        checked++;
        const label = `${fileName} #${index + 1} (${level.id})`;
        const targetCells = level.map.flat().filter((value) => value === 1).length;
        const pieceCells = level.pieces.reduce((sum, key) => sum + (SHAPES[key]?.length || 0), 0);
        if (targetCells !== pieceCells) errors.push(`${label}: ${targetCells} target cells but ${pieceCells} piece cells`);
        const authoredError = validateAuthoredSolution(level);
        if (authoredError) errors.push(`${label}: ${authoredError}`);
        const solutionCount = countSolutions(level);
        if (solutionCount === 0) errors.push(`${label}: solver found no solution`);
        else if (solutionCount === 1) unique++;
        else multiple++;
    });
}

const { LEVELS_DAILY } = await loadExports('levels_daily.js');
const dailyDistribution = LEVELS_DAILY.reduce((counts, level) => {
    counts[level.pieces.length] = (counts[level.pieces.length] || 0) + 1;
    return counts;
}, {});
const expectedDailyDistribution = { 3: 6, 4: 20, 5: 5 };
for (const [pieceCount, expected] of Object.entries(expectedDailyDistribution)) {
    if ((dailyDistribution[pieceCount] || 0) !== expected) {
        errors.push(`Daily pool: expected ${expected} levels with ${pieceCount} pieces, found ${dailyDistribution[pieceCount] || 0}`);
    }
}

console.log(`Validated ${checked} levels: ${unique} unique, ${multiple} with multiple solutions.`);
if (errors.length) {
    errors.forEach((error) => console.error(`ERROR: ${error}`));
    process.exitCode = 1;
} else {
    console.log('All authored solutions and board cell counts are valid.');
    console.log(`Daily balance: ${dailyDistribution[3]} quick / ${dailyDistribution[4]} standard / ${dailyDistribution[5]} hard.`);
}
