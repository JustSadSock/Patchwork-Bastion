# Patchwork Bastion

Prototype 3-player co-op top-down defense with handcrafted/patchwork styling. Includes a Node.js authoritative server and a Canvas client that can also run offline demo mode for Netlify static hosting.

## Features
- Host/Join lobbies (max 3) with simple room codes.
- Authoritative server storing map, buildings, wires, enemies, and resources.
- Build walls, turrets, and hubs on a grid while routing free-form wires with length limits.
- Build/Action phases with enemy waves that target the Core and sometimes damage wires.
- Minimal UI strip: players, timer, resources.
- Offline demo mode when no WebSocket server is reachable.

## Getting started
1. Ensure Node.js 18+ is installed.
2. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000 to load the Canvas client. You can also open `index.html` directly from disk for the offline demo; keep the `public` folder next to it so the relative asset paths resolve.

### Using `run_local.bat`
On Windows, double-click `run_local.bat` to:
- Install dependencies if `node_modules` is missing (stays open on failures so you can read the error).
- Start the Node server on port 3000 in its own console.
- Start the Cloudflare tunnel `irgri-tunnel` using the config in `C:\Users\SadSock\.cloudflared\config.yml` (command window stays open; the config flag is passed before `run` to satisfy cloudflared's CLI). If the config lives elsewhere, update the `CFG_PATH` variable near the top of `run_local.bat`.
- Open the browser at http://localhost:3000.
- Leave the launcher window open until you press a key so you can spot any startup errors.

## Project structure
- `index.html` — entry point for Netlify/static hosting.
- `/public` — client JS/CSS and placeholder assets.
- `server.js` — express + ws authoritative server serving both API and static files.
- `run_local.bat` — Windows helper for server + cloudflared tunnel.

## Replacing art and audio
- Place your sprites or UI PNGs into `public/assets`. The renderer currently uses vector drawing; hook your images in `public/render.js`.
- Drop sound effects or music into `public/assets` and load them in `public/audio.js` (AudioContext scaffold is provided).

## Gameplay controls (MVP)
- **WASD / Arrow Keys**: move.
- **Host/Join buttons**: connect to a room; offline demo continues otherwise.
- Building/wiring/repair interactions are simulated on the server; expand `public/game.js` and `server.js` to bind them to mouse clicks when adding full input UX.

## Notes
- Map size is 64×64 tiles (32px each). Core sits near center with purple power ports.
- Wires subtract from a shared length pool and are rejected if the route crosses occupied tiles.
- Enemies slowly seek the Core, dealing damage to the core and nearby wires.

