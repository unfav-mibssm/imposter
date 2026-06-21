# 🎭 IMPOSTER — Multiplayer Party Game

A real-time party game for friends in the same room. One player is secretly the Imposter — they don't know the word. Can the group find them?

---

## Files

```
imposter-game/
├── index.html          # Main HTML (all screens)
├── style.css           # Dark theme, mobile-first
├── script.js           # All game logic
├── firebase-config.js  # Firebase initialization
├── words.js            # 100+ word database with images
├── firebase.rules.json # Firebase Realtime DB security rules
└── README.md
```

---

## Setup

### 1. Host the files

Put all files on any static web host:
- **GitHub Pages** (free): commit the folder, enable Pages
- **Netlify** (free): drag-and-drop the folder at netlify.com/drop
- **Vercel** (free): `npx vercel` in the folder
- **Local**: open `index.html` directly in a browser (Firebase still works)

### 2. Apply Firebase Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Open the `mini-skribbl` project
3. Go to **Realtime Database → Rules**
4. Paste the contents of `firebase.rules.json`
5. Click **Publish**

### 3. Play!

- One player opens the URL and creates a room
- Other players join using the 6-character room code
- Everyone marks Ready, host presses Start

---

## How to Play

| Phase | What Happens |
|-------|-------------|
| **Lobby** | Players join & mark Ready |
| **Role Reveal** | Each player privately taps to see their role (word or imposter) |
| **Discussion** | 2-minute timer — talk in real life, debate who the imposter is |
| **Voting** | Everyone votes on who they think the imposter is |
| **Final Guess** | If imposter is caught, they get one guess to still win |
| **Results** | See votes, the imposter, and the secret word |

---

## Game Rules

- **Normal players** see a secret word + image. Don't reveal it!
- **The Imposter** sees nothing — they must deduce the word from discussion.
- If the imposter gets the most votes: they're caught, but get a final guess.
- If the imposter guesses correctly: **Imposter wins!**
- If the imposter guesses wrong: **Players win!**
- If the imposter is NOT voted out: **Imposter wins immediately.**

---

## Customization

### Add more words
Edit `words.js`. Each entry:
```js
{ word: "Volcano", category: "Nature", image: "https://..." }
```
Use any public image URL (Unsplash, etc.).

### Change default discussion time
In `script.js`, change the host stepper range or in the lobby settings.

### Minimum players
Currently 2 (for testing). Change `playerIds.length < 2` in `startGame()` to require more.

---

## Browser Support

Works in all modern browsers — Chrome, Safari, Firefox, Edge.
Mobile-first design works on phones in landscape or portrait.
