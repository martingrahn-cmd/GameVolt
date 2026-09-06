# Portal discovery measurement

The homepage labels each game entry and the player attaches that label to the
game's existing analytics events. The game tracker still decides when play
starts and when 30/60 seconds of foreground play have elapsed. A portal click,
an idle menu and the rotation notice do not create these gameplay milestones.

| Event | Meaning |
| --- | --- |
| `game_select` | A game link was activated on the homepage or in the player's sidebar |
| `game_open` | The player opened that game, including direct visits and reloads |
| `game_start` | The existing game tracker reported the start of play |
| `game_play_60s` | The existing game tracker reached 60 seconds of foreground play |

These events carry `game_id` (the catalog slug), `selection_source` and
`entry_mode` (`daily` or `default`). Existing fields such as `game_name` stay intact.
The same entry fields also accompany the game's other forwarded GA4 events.

`selection_source` values:

- `martins_picks`, `daily_challenges`, `catalog`: the three main homepage entries.
- `continue_playing`, `favorites`, `new_games`: other homepage sections.
- `sidebar`: another game selected from the player.
- `direct`: no recognized portal entry label, including other pages and search.
  This is an internal entry label, not GA4's traffic-source dimension.

Labels travel in the `from` URL parameter, so daily/challenge links, new tabs,
reloads and browser Back retain their entry. A sidebar switch replaces both the
source and iframe; late events from the previous game are ignored. No new
cookies, storage keys or personal identifiers are used. Context-menu opens may
have a `game_open` without a preceding `game_select`.

## GA4 reporting setup

Registered and verified on 2026-09-06 in **GameVolt.IO** (property `517817356`,
account **SmartProc Games**, measurement ID `G-PY073ZX38N`):

| Dimension name | Event parameter | Scope |
| --- | --- | --- |
| Selection source | `selection_source` | Event |
| Game ID | `game_id` | Event |
| Entry mode | `entry_mode` | Event |

The existing `Game Name` / `game_name` dimension was retained. View the saved
[custom definitions in Analytics](https://analytics.google.com/analytics/web/#/a378830303p517817356/admin/customdefinitions/hub).
The stream still has its legacy PulseGames.eu name, but its measurement ID
matches GameVolt's code. At registration time, the discovery code was local
and had not yet been published; these definitions alone do not collect the new
parameters.

For another property, add these Event-scoped dimensions in Admin → Data display
→ Custom definitions, reusing any that already exist.
Verify their values on events in Realtime/DebugView. Allow 24–48 hours for the
dimensions to become available in reports after both registration and collection.
See [Google's custom-dimension instructions](https://support.google.com/analytics/answer/14239696?hl=en).

Create a closed funnel exploration with `game_open` → `game_start` →
`game_play_60s`, broken down by `selection_source`. Start with the three main
homepage sources and filter to one `game_id` and entry mode when comparing like
with like. Use funnel users, not ratios of raw event counts: a visitor can
restart or open multiple games. `game_select` helps diagnose clicks that never
reach the player. This measures the new design prospectively; it does not
retroactively label older events or prove that a layout change caused a lift.

Local regression check: `node --test js/gv-discovery.test.js` exercises real
tracker milestones with a controlled clock and captures events without sending
test data to Google. It also checks daily links, sidebar attribution, stale
iframe events, unavailable analytics and the rotation exit's focus behavior.
