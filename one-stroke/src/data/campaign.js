import {
  CAMPAIGN_LEVELS as GENERATED_LEVELS,
  DIFFICULTY_ORDER,
} from "./campaign-levels.js";
import { DIFFICULTY_META } from "./difficulty.js";
import { TUTORIAL_LEVELS } from "./tutorial-levels.js";

const TUTORIAL_COUNT = TUTORIAL_LEVELS.length;
const EARLY_RAMP_END = 20;

function compareStructure(a, b) {
  return a.branchingRatio - b.branchingRatio
    || a.turnRatio - b.turnRatio
    || a.id.localeCompare(b.id);
}

const LARGE_BRANCH_JUMP = 0.15;

function transitionCost(from, to) {
  const distance = Math.abs(from.branchingRatio - to.branchingRatio);
  return {
    jumps: distance > LARGE_BRANCH_JUMP ? 1 : 0,
    distance,
  };
}

function addCost(a, b) {
  return {
    jumps: a.jumps + b.jumps,
    distance: a.distance + b.distance,
  };
}

function isBetterCost(candidate, current) {
  return !current
    || candidate.jumps < current.jumps
    || (candidate.jumps === current.jumps && candidate.distance < current.distance - 1e-9);
}

function internalCost(levels) {
  let cost = { jumps: 0, distance: 0 };
  for (let index = 1; index < levels.length; index += 1) {
    cost = addCost(cost, transitionCost(levels[index - 1], levels[index]));
  }
  return cost;
}

function curateDifficulty(levels) {
  const parValues = [...new Set(levels.map((level) => level.par))].sort((a, b) => a - b);
  const groups = parValues.map((par) => {
    const ascending = levels.filter((level) => level.par === par).sort(compareStructure);
    return [ascending, [...ascending].reverse()];
  });
  let states = groups[0].map((order, orientation) => ({
    cost: internalCost(order),
    orientation,
    path: [orientation],
  }));

  for (let groupIndex = 1; groupIndex < groups.length; groupIndex += 1) {
    const nextStates = [];
    for (let orientation = 0; orientation < 2; orientation += 1) {
      const order = groups[groupIndex][orientation];
      let best = null;
      for (const previousState of states) {
        const previousOrder = groups[groupIndex - 1][previousState.orientation];
        const boundary = transitionCost(previousOrder.at(-1), order[0]);
        const cost = addCost(addCost(previousState.cost, boundary), internalCost(order));
        const candidate = {
          cost,
          orientation,
          path: [...previousState.path, orientation],
        };
        if (isBetterCost(candidate.cost, best?.cost)) best = candidate;
      }
      nextStates.push(best);
    }
    states = nextStates;
  }

  const best = states.reduce((current, candidate) =>
    isBetterCost(candidate.cost, current?.cost) ? candidate : current
  , null);
  return best.path.flatMap((orientation, index) => groups[index][orientation]);
}

// IDs remain stable for save compatibility. Only their campaign slots change.
// The existing first 20 slots stay fixed for onboarding and active early-game
// saves. Later boards rise primarily by solution length, then structural flow.
const earlyRamp = GENERATED_LEVELS
  .slice(TUTORIAL_COUNT, EARLY_RAMP_END)
  .sort((a, b) => {
    const complexity = (level) =>
      (level.par + 1) + level.branchingRatio * 5 + level.turnRatio * 2;
    return complexity(a) - complexity(b) || a.id.localeCompare(b.id);
  });
const lockedIds = new Set([...TUTORIAL_LEVELS, ...earlyRamp].map((level) => level.id));
const generatedPool = GENERATED_LEVELS.filter((level) => !lockedIds.has(level.id));
const curatedGenerated = DIFFICULTY_ORDER.flatMap((difficulty) =>
  curateDifficulty(generatedPool.filter((level) => level.difficulty === difficulty))
);

export const CAMPAIGN_LEVELS = [
  ...TUTORIAL_LEVELS,
  ...earlyRamp,
  ...curatedGenerated,
].map((level, index) => ({
  ...level,
  campaignIndex: index + 1,
  name: level.pathStyle === "tutorial" || level.pathStyle === "bridge"
    ? level.name
    : `${DIFFICULTY_META[level.difficulty].label} ${String(index + 1).padStart(2, "0")}`,
}));

export const CAMPAIGN_TOTAL_LEVELS = CAMPAIGN_LEVELS.length;
