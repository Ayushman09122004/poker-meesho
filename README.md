# ♠ Felt & Friends — Home Poker

A polished, real-time multiplayer Texas Hold'em table for you and your friends. Server-authoritative
game engine, correct side-pot math, reconnect support, chat, stats, and a modern dark-casino UI —
built purely for casual fun.

**No real money, no gambling, no purchasable/redeemable chips.** Every stack is a virtual number that
lives only inside a game session.

## Stack

- **Server**: Node.js, TypeScript, Express, Socket.IO — owns all game logic and state. Clients never
  decide outcomes; they only send intents (`fold`, `raise 200`, …) and receive a fresh, per-player
  masked snapshot after every change.
- **Client**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Socket.IO client.
- **Shared**: a `shared/` folder of plain TypeScript types and event-name constants imported by both
  sides, so client and server can never drift out of sync on the wire protocol.

## Project layout

```
poker-game/
  server/    Express + Socket.IO app, the poker engine, hand evaluator, room manager
  client/    React SPA — lobby, table, chat, stats, host controls
  shared/    Types + Socket.IO event constants used by both
```

## Running it locally

Requires Node.js 18+ (tested on Node 24) and npm.

```bash
npm install
```

Then, in two terminals:

```bash
npm run dev:server   # starts the API/socket server on http://localhost:4000
npm run dev:client   # starts the Vite dev server on http://localhost:5173
```

Open `http://localhost:5173` — the Vite dev server proxies `/socket.io` and `/api` to the server, so
everything just works.

### Running as a single process (closer to how you'd host it)

```bash
npm run build          # builds shared types usage, server, and client
npm run start           # starts the server, which also serves client/dist
```

Then open `http://localhost:4000` — one process serves both the app and the game logic.

## Hosting it for your friends

The important thing: **your friends' browsers need to be able to reach the server's port.** A few
ways to do that, easiest first:

1. **Same Wi-Fi / LAN party**: run `npm run build && npm run start`, find your machine's local IP
   (e.g. `192.168.1.42`), and have friends open `http://192.168.1.42:4000`. Make sure your firewall
   allows inbound connections on port 4000.
2. **A quick public tunnel** (works from anywhere, no router config): run the app locally, then use a
   tunneling tool such as `ngrok http 4000` (or Cloudflare Tunnel / `localtunnel`) and share the
   `https://...` URL it gives you.
3. **A small cloud VM / PaaS** (Render, Railway, Fly.io, a $5 VPS, etc.): deploy the repo, run
   `npm run build` then `npm run start`, and open the port it needs (respect the platform's `PORT`
   env var — the server already reads `process.env.PORT`).

Whoever starts the room becomes the **host** and gets a 5-character room code to share (or a copyable
invite link). Everyone else picks a name/avatar and joins with that code.

## How a game session works

- The **host** sets starting chips, blinds, turn timer, max players, rebuy rules, blind-increase
  interval, and table theme before the game starts.
- Players click **I'm ready**; once everyone (2+) is ready, the first hand deals automatically (or the
  host can hit **Deal now**).
- Standard No-Limit Hold'em rules: blinds rotate every hand, betting is validated server-side (you
  physically cannot send an illegal action), side pots are computed correctly for multi-way all-ins,
  and ties split the pot with odd chips going to the player closest to the left of the dealer button.
- If someone's turn times out, they auto-check (if legal) or auto-fold — the game never stalls waiting
  on an AFK player.
- Disconnects don't lose your seat: reconnecting with the same browser tab (or after a refresh) resumes
  your session, chips and all. Session tokens are scoped per browser tab, so two different people can
  safely share one browser/computer without colliding.
- If you bust out and the host allows rebuys, you can buy back in to the starting stack between hands.
- Chips reset to the configured starting stack whenever the host restarts the game. Nothing persists
  after the server process restarts — this is intentionally an in-memory, ephemeral game night tool,
  not a ledger.

## Fairness & security notes

- Shuffling uses Node's `crypto.randomBytes` with rejection sampling (no modulo bias), not `Math.random`.
- All game state — deck, hole cards, betting, pot math — lives on the server. The client only ever
  receives the cards and actions it's allowed to see; opponents' hole cards are `null` until showdown.
- Every action is re-validated server-side against the current legal-action set, so a modified or
  malicious client can't force an illegal move, see hidden cards, or skip a turn.

## Tests

The poker engine and hand evaluator have an automated test suite covering hand ranking/tie-breaks,
side-pot math across multiple all-ins, turn-order edge cases (heads-up, full vs. short-all-in raises),
and a zero-sum invariant on session stats:

```bash
npm run test:server
```

## Feature checklist

- 2–9 players, private room codes, host-configurable settings, spectator-after-elimination
- Full betting action set (fold/check/call/bet/raise/all-in) with server-side legality checks
- Side pots, split pots, multiple all-ins, dealer button rotation, correct heads-up blind rules
- Reconnect-after-disconnect, turn timer with auto-fold/check, host can remove inactive players
- Live chat, emoji quick-reactions, quick-chat phrases
- Session stats (hands played/won, biggest pot, best hand, win streak, bluffs-won heuristic, net chips)
- Hand history viewer with full showdown reveal
- Animated dealing, card flips, chip movement, turn glow, winner banner with confetti on big pots
- Synthesized sound effects (deal, flip, chips, check/call/fold/all-in, win, turn alert) with mute
- Four table themes, avatar picker, responsive desktop-first/mobile-friendly layout
