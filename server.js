const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Basic server constants
const PORT = process.env.PORT || 3000;
const TICK_RATE = 20; // per second
const MAP_SIZE = 64;
const TILE_SIZE = 32;
const MAX_PLAYERS = 3;
const BUILD_PHASE_DURATION = 30000; // ms
const ACTION_PHASE_DURATION = 40000; // ms
const MAX_WIRE_LENGTH = 120; // meters total team wire length

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function createEmptyMap() {
  const tiles = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(0));
  // Add some obstacles to demonstrate routing
  for (let i = 10; i < 20; i++) {
    tiles[30][i] = 1;
    tiles[31][i] = 1;
  }
  return tiles;
}

function spawnEnemies(room) {
  const count = Math.max(1, Math.floor(room.tick / (TICK_RATE * 20)) + 2);
  for (let i = 0; i < count; i++) {
    room.enemies.push({
      id: uuidv4(),
      x: Math.random() * MAP_SIZE * TILE_SIZE,
      y: Math.random() * MAP_SIZE * TILE_SIZE,
      hp: 30,
      speed: 35 + Math.random() * 15,
      target: 'core',
    });
  }
}

function createRoom(code) {
  return {
    code,
    players: new Map(), // id -> player
    wires: [],
    buildings: [],
    enemies: [],
    tileMap: createEmptyMap(),
    resources: { fabric: 100, buttons: 20 },
    phase: 'build',
    phaseTime: Date.now(),
    tick: 0,
    core: {
      x: MAP_SIZE * TILE_SIZE / 2 - 64,
      y: MAP_SIZE * TILE_SIZE / 2 - 64,
      size: 4,
      hp: 300,
      ports: [
        { id: 'c1', type: 'purple', connectedTo: null },
        { id: 'c2', type: 'purple', connectedTo: null },
        { id: 'c3', type: 'purple', connectedTo: null },
      ],
    },
    wireLengthAvailable: MAX_WIRE_LENGTH,
  };
}

const rooms = new Map();

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function validateTile(room, tx, ty) {
  return tx >= 0 && ty >= 0 && tx < MAP_SIZE && ty < MAP_SIZE && room.tileMap[ty][tx] === 0;
}

function addBuilding(room, payload) {
  const { type, tx, ty, playerId } = payload;
  const size = type === 'coreHub' ? 2 : 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!validateTile(room, tx + x, ty + y)) return false;
    }
  }
  const cost = type === 'turret' ? 8 : type === 'wall' ? 3 : 12;
  if (room.resources.fabric < cost) return false;
  room.resources.fabric -= cost;
  const building = {
    id: uuidv4(),
    type,
    tx,
    ty,
    size,
    hp: type === 'wall' ? 80 : 100,
    ports: [],
    owner: playerId,
  };
  if (type === 'turret') {
    building.ports.push({ id: `${building.id}-p1`, type: 'red', connectedTo: null });
  } else if (type === 'coreHub') {
    building.ports.push({ id: `${building.id}-in`, type: 'purple', connectedTo: null, direction: 'in' });
    ['out1', 'out2', 'out3'].forEach(out => {
      building.ports.push({ id: `${building.id}-${out}`, type: 'adaptive', connectedTo: null, direction: 'out' });
    });
  }
  room.buildings.push(building);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      room.tileMap[ty + y][tx + x] = 2; // mark occupied
    }
  }
  return true;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function updateEnemies(room, dt) {
  room.enemies.forEach(enemy => {
    const targetX = room.core.x + 64;
    const targetY = room.core.y + 64;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / len) * enemy.speed * dt;
    enemy.y += (dy / len) * enemy.speed * dt;
    const dist = Math.hypot(targetX - enemy.x, targetY - enemy.y);
    if (dist < 40) {
      room.core.hp -= 5 * dt;
    }
    // Attack wires
    room.wires.forEach(w => {
      const midX = (w.points[0].x + w.points[w.points.length - 1].x) / 2;
      const midY = (w.points[0].y + w.points[w.points.length - 1].y) / 2;
      if (Math.hypot(midX - enemy.x, midY - enemy.y) < 30) {
        w.integrity -= 20 * dt;
      }
    });
  });
  room.enemies = room.enemies.filter(e => e.hp > 0);
}

function tickRoom(room, dt) {
  room.tick++;
  // Phase control
  const now = Date.now();
  if (room.phase === 'build' && now - room.phaseTime > BUILD_PHASE_DURATION) {
    room.phase = 'action';
    room.phaseTime = now;
    spawnEnemies(room);
  } else if (room.phase === 'action' && now - room.phaseTime > ACTION_PHASE_DURATION) {
    room.phase = 'build';
    room.phaseTime = now;
    room.enemies = [];
  }

  updateEnemies(room, dt);
  room.wires.forEach(w => {
    if (w.integrity <= 0) {
      room.wireLengthAvailable += w.length;
    }
  });
  room.wires = room.wires.filter(w => w.integrity > 0);
}

function broadcastRoom(room) {
  const snapshot = {
    t: 'state',
    tick: room.tick,
    phase: room.phase,
    phaseElapsed: Date.now() - room.phaseTime,
    core: room.core,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      hp: p.hp,
      pulling: p.pulling,
    })),
    buildings: room.buildings,
    wires: room.wires,
    enemies: room.enemies,
    resources: room.resources,
    wireLengthAvailable: room.wireLengthAvailable,
  };
  const data = JSON.stringify(snapshot);
  room.players.forEach(p => {
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  });
}

function findRoom(code) {
  if (!rooms.has(code)) rooms.set(code, createRoom(code));
  return rooms.get(code);
}

function findPort(room, portId) {
  if (room.core.ports.some(p => p.id === portId)) {
    return { host: room.core, port: room.core.ports.find(p => p.id === portId) };
  }
  for (const b of room.buildings) {
    const p = b.ports.find(p => p.id === portId);
    if (p) return { host: b, port: p };
  }
  return null;
}

function pathIsClear(room, points) {
  // simple collision: ensure each segment doesn't cross occupied tiles
  function tileBlocked(px, py) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    return room.tileMap[ty] && room.tileMap[ty][tx] && room.tileMap[ty][tx] !== 0;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      if (tileBlocked(px, py)) return false;
    }
  }
  return true;
}

function createWire(room, payload) {
  const { fromPort, toPort, points, playerId } = payload;
  const from = findPort(room, fromPort);
  const to = findPort(room, toPort);
  if (!from || !to) return false;
  if (from.port.connectedTo || to.port.connectedTo) return false;
  const length = points.reduce((acc, pt, idx) => {
    if (idx === 0) return 0;
    const prev = points[idx - 1];
    return acc + Math.hypot(pt.x - prev.x, pt.y - prev.y);
  }, 0) / TILE_SIZE; // meters
  if (length <= 0 || length > room.wireLengthAvailable) return false;
  if (!pathIsClear(room, points)) return false;

  from.port.connectedTo = to.port.id;
  to.port.connectedTo = from.port.id;
  const wire = {
    id: uuidv4(),
    from: from.port.id,
    to: to.port.id,
    points,
    length,
    integrity: 100,
    owner: playerId,
  };
  room.wires.push(wire);
  room.wireLengthAvailable -= length;
  return true;
}

function removePlayer(room, id) {
  if (!room) return;
  room.players.delete(id);
  if (room.players.size === 0) rooms.delete(room.code);
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  let room = null;
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    if (msg.t === 'join') {
      room = findRoom(msg.code || 'PATCH');
      if (room.players.size >= MAX_PLAYERS) {
        ws.send(JSON.stringify({ t: 'error', message: 'Room full' }));
        return;
      }
      const spawnX = room.core.x + (Math.random() * 80 - 40);
      const spawnY = room.core.y + (Math.random() * 80 - 40);
      room.players.set(clientId, {
        id: clientId,
        name: msg.name || 'Player',
        x: spawnX,
        y: spawnY,
        hp: 100,
        pulling: false,
        ws,
      });
      ws.send(JSON.stringify({ t: 'joined', id: clientId, code: room.code, mapSize: MAP_SIZE, tileSize: TILE_SIZE }));
      return;
    }
    if (!room) return;
    const player = room.players.get(clientId);
    if (!player) return;
    switch (msg.t) {
      case 'input': {
        const speed = player.pulling ? 90 : 120;
        const dt = 1 / TICK_RATE;
        player.x = clamp(player.x + msg.dx * speed * dt, 0, MAP_SIZE * TILE_SIZE);
        player.y = clamp(player.y + msg.dy * speed * dt, 0, MAP_SIZE * TILE_SIZE);
        player.pulling = msg.pulling;
        break;
      }
      case 'build': {
        addBuilding(room, { ...msg, playerId: clientId });
        break;
      }
      case 'wire': {
        createWire(room, { ...msg, playerId: clientId });
        break;
      }
      case 'repair': {
        const targetWire = room.wires.find(w => w.id === msg.id);
        if (targetWire) {
          targetWire.integrity = clamp(targetWire.integrity + 15, 0, 100);
        }
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    removePlayer(room, clientId);
  });
});

setInterval(() => {
  const dt = 1 / TICK_RATE;
  rooms.forEach(room => {
    tickRoom(room, dt);
    broadcastRoom(room);
  });
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`Patchwork Bastion server running on http://localhost:${PORT}`);
});
