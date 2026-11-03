# Touchline Career Sim

A football manager career game that runs in the browser. Pick a club, set your tactics and live with the results.

**Play it:** https://playtouchline.app

An unofficial fan-made game. It is not affiliated with or endorsed by any league, club, player or game publisher.

## What is in it

- Real 2026/27 squads across many leagues, with a full transfer market, loans, scouting, contracts, a dressing room and a board
- Live matches with all 22 players simulated on the pitch
- Tactics that depend on your players: a high line with slow defenders is punished, a press needs a midfield that works
- Friends leagues (a six-character code, play at your own pace), a daily challenge, and a career score leaderboard
- Optional Google sign-in to back up careers and continue on another device

## How it is built

No framework and no build step for the game itself: plain JavaScript in the browser.

| File | What it does |
|---|---|
| `data.js` | Clubs, leagues and players |
| `engine.js` | The game logic and match simulation (no DOM, also runs in Node for tests) |
| `ui.js` | Every screen, including the welcome flow and the quieter in-game layout |
| `index.html` | Page and base styles |
| `web/` | The deployable website: `build.py` copies the four files above in and writes `web/index.html` with the share-card tags. Also holds the Firebase adapter (`tl-firebase.js`), analytics with consent (`tl-analytics.js`), music (`tl-music.js`), the website skin (`tl-skin.css`) and the Firestore rules |

## Run it locally

```bash
python3 web/build.py
cd web && python3 -m http.server 8000
```

Then open http://localhost:8000. Without a Firebase config the game runs single-player: careers, tactics, matches and the daily challenge all work, while friends leagues and the shared leaderboard are switched off.

## Deploy

The site is hosted on Vercel with Firebase (Firestore and anonymous plus Google sign-in) for multiplayer and cloud saves. See `web/DEPLOY.md`. Put your own Firebase web config in `web/firebase-config.js` and publish `web/firestore.rules`.

## Credits

Background music: "Chill Wave", "Dream Culture", "Wallpaper", "Local Forecast - Elevator", "Backbay Lounge" and "Easy Lemon" by Kevin MacLeod ([incompetech.com](https://incompetech.com)), licensed under [Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Built with Claude.
