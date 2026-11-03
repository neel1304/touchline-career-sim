# Putting Touchline on the web

The site is this `web/` folder. `build.py` fills it from the game files one level up, so after any change to the game run:

```
python3 web/build.py https://YOUR-ADDRESS.vercel.app
```

The address is used for the share card that X/Twitter shows. Until you know it, leave it out (it defaults to `https://touchline-career-sim.vercel.app`).

## 1. Firebase: leaderboards and friends leagues (about 10 minutes)

Without this the site still works, but single-player only.

1. Go to https://console.firebase.google.com and click **Create a project**. Name it something like `touchline`. Google Analytics can stay off.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.** Players never see a sign-in screen; each browser just gets its own private id.
3. **Build → Firestore Database → Create database.** Pick a location near most of your players (`eur3` for Europe, `nam5` for the US) and choose **Start in production mode**.
4. In Firestore, open the **Rules** tab, replace everything with the contents of `web/firestore.rules`, and click **Publish**.
5. In Firestore, open **Indexes → Composite → Create index** and add these two. Each takes a few minutes to build.
   - Collection `scores`, fields `k` Ascending, then `sc` Descending, query scope Collection
   - Collection `scores`, fields `day` Ascending, then `sc` Descending, query scope Collection
6. Click the **gear (Project settings) → General → Your apps → Web (`</>`)**. Register an app called `touchline-web` (leave Firebase Hosting unticked). Copy the `firebaseConfig` object it shows into `web/firebase-config.js`, like this:

   ```js
   window.TL_FIREBASE = {
     apiKey: "…",
     authDomain: "…",
     projectId: "…",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "…"
   };
   ```

   This config is meant to be public; the security rules from step 4 are what protect the data.

### What it costs

The free (Spark) plan allows 50,000 reads a day. A visit reads at most about 150 documents, so the free plan covers roughly 300 visits a day with leaderboards on. If the post takes off past that, leaderboards and leagues pause until the quota resets at midnight Pacific time, while the game itself keeps working.

To stay up through a busy spell, switch to the **Blaze** plan (pay as you go) and set a budget alert under **Usage and billing**. As a rough guide, 10,000 visits a day comes to under $1 a day.

## 2. Vercel: the website

You need Node.js installed (`node -v` works in Terminal).

```
cd "/Users/nilargharoy/Desktop/TouchLine Career Sim/web"
npx vercel login
npx vercel --prod
```

Answer the prompts: set up and deploy, your account, no existing project, project name `touchline-career-sim`, directory `./`, and no to changing settings. It prints your address.

If the address is not `https://touchline-career-sim.vercel.app`, rebuild with the real one and deploy again:

```
cd "/Users/nilargharoy/Desktop/TouchLine Career Sim"
python3 web/build.py https://THE-REAL-ADDRESS.vercel.app
cd web && npx vercel --prod
```

To use your own domain, add it under the project's **Settings → Domains** in Vercel, then rebuild with that address.

## 3. Before you post

- Open the site on your phone, start a career, and play a match.
- If Firebase is set up: create a friends league in one browser and join it from another (a private window works), then play a fixture.
- Paste the link into a draft post on X. The card with the friends-league table should appear.
- Saves live in each player's browser. Clearing site data, or switching between phone and laptop, starts a fresh career.

## Notes

- This is an unofficial fan game. The site says so at the bottom of every page, and the EA name has been removed. Real club and player names are still in the data, so a rights holder could still ask for changes.
- Every score and league row records which browser wrote it, and the rules only let that browser change it. Leaderboard scores are not verified against real play, so a determined player can post a fake score.
