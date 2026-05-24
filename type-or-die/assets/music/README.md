# Music tracks

The zombie mode plays **adaptive music**: two looping tracks crossfaded by
the in-game intensity (wave, lives lost, boss waves). Drop two files here:

| File | When it's heard | Vibe |
|---|---|---|
| `calm.mp3` | early waves, breathers, safe | low, eerie, sparse — "lågmält ambient hot" (GDD §8) |
| `intense.mp3` | high waves, low lives, boss waves | driving, urgent, high tension |

The game loads them at runtime. **If the files are missing the game just
runs silently** — no error.

## Generating them (Suno)

Generate both so they **loop cleanly** and ideally share tempo/key/length —
the crossfade is volume-based, so a mismatch is tolerable but a match sounds
better. Suggested prompts:

- **calm.mp3** — `dark ambient horror drone, slow and sparse, distant
  unease, deep sub bass, no drums, eerie pads, loopable, instrumental`
- **intense.mp3** — `driving horror action loop, fast pulsing bass,
  urgent percussion, dread and panic, aggressive, loopable, instrumental`

Export as MP3, name them exactly `calm.mp3` and `intense.mp3`, place here.
Keep each file modest in size (a 1–2 minute loop is plenty).
