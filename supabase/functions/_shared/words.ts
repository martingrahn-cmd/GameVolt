// Versioned dictionary — MUST stay identical to the client (js/words.js).
// If this list and the client's diverge, seed→words derivation breaks and
// every Speed Test submission fails validation. Keep them in lockstep.

import { mulberry32 } from "./prng.ts";

export const DICTIONARY_VERSION = "en-common-1";

export const WORDS: string[] = [
  "the", "and", "you", "that", "was", "for", "are", "with", "his", "they",
  "this", "have", "from", "one", "had", "word", "but", "not", "what", "all",
  "were", "when", "your", "can", "said", "there", "use", "each", "which", "she",
  "how", "their", "will", "other", "about", "out", "many", "then", "them", "these",
  "some", "her", "would", "make", "like", "him", "into", "time", "has", "look",
  "two", "more", "write", "see", "number", "way", "could", "people", "than", "first",
  "water", "been", "call", "who", "now", "find", "long", "down", "day", "did",
  "get", "come", "made", "may", "part", "over", "new", "sound", "take", "only",
  "little", "work", "know", "place", "year", "live", "back", "give", "most", "very",
  "after", "thing", "our", "just", "name", "good", "sentence", "man", "think", "say",
  "great", "where", "help", "through", "much", "before", "line", "right", "too", "mean",
  "old", "any", "same", "tell", "boy", "follow", "came", "want", "show", "also",
  "around", "form", "three", "small", "set", "put", "end", "does", "another", "well",
  "large", "must", "big", "even", "such", "because", "turn", "here", "why", "ask",
  "went", "men", "read", "need", "land", "different", "home", "move", "try", "kind",
  "hand", "picture", "again", "change", "play", "spell", "air", "away", "animal", "house",
  "point", "page", "letter", "mother", "answer", "found", "study", "still", "learn", "should",
  "world", "high", "every", "near", "add", "food", "between", "own", "below", "country",
  "plant", "last", "school", "father", "keep", "tree", "never", "start", "city", "earth",
  "eye", "light", "thought", "head", "under", "story", "saw", "left", "few", "while",
];

const WORD_SET = new Set(WORDS);

export function isDictionaryWord(w: string): boolean {
  return WORD_SET.has(w);
}

export function generateWords(seed: number, count: number): string[] {
  const rng = mulberry32(seed);
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = WORDS[Math.floor(rng() * WORDS.length)];
  }
  return out;
}
