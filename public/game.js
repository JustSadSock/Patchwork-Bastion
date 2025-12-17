(() => {
  const canvas = document.getElementById('game');
  const renderer = new Renderer(canvas);
  const ui = new UI();
  const audio = new AudioBus();
  const net = new NetClient();

  let playerId = null;
  let state = {
    players: [],
    buildings: [],
    wires: [],
    enemies: [],
    core: null,
    phase: 'build',
    phaseElapsed: 0,
    mapSize: 64,
    tileSize: 32,
    resources: { fabric: 0, buttons: 0 },
    wireLengthAvailable: 0,
  };

  // Offline demo data
  let offline = true;
  function loadOfflineDemo() {
    state.core = { x: 320, y: 320, size: 4, ports: [{ id: 'c1', type: 'purple' }, { id: 'c2', type: 'purple' }] };
    state.players = [{ id: 'local', name: 'You', x: 400, y: 400, hp: 100 }];
    state.buildings = [
      { id: 'w1', type: 'wall', tx: 15, ty: 15, size: 1, hp: 100, ports: [] },
      { id: 't1', type: 'turret', tx: 18, ty: 17, size: 1, hp: 100, ports: [{ id: 't1p', type: 'red' }] },
    ];
    state.wires = [
      { id: 'wire1', from: 'c1', to: 't1p', points: [{ x: 320, y: 320 }, { x: 420, y: 420 }], length: 4, refType: 'red', integrity: 100 },
    ];
    state.enemies = [];
    state.resources = { fabric: 50, buttons: 10 };
    state.wireLengthAvailable = 80;
  }

  loadOfflineDemo();

  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') audio.init();
  });
  window.addEventListener('keyup', (e) => (keys[e.code] = false));

  const nameInput = document.getElementById('name');
  const roomInput = document.getElementById('room');
  document.getElementById('host').onclick = () => connect(true);
  document.getElementById('join').onclick = () => connect(false);

  async function connect(host) {
    const name = nameInput.value || 'Crafter';
    const room = host ? (roomInput.value || 'PATCH') : roomInput.value || 'PATCH';
    try {
      const joined = await net.connect(name, room);
      playerId = joined.id;
      offline = false;
      state.mapSize = joined.mapSize;
      state.tileSize = joined.tileSize;
      ui.setConnected(`Connected to room ${joined.code}`);
      audio.playClick(620);
    } catch (e) {
      ui.showMenu('Failed to connect');
    }
  }

  net.on('state', (msg) => {
    state.players = msg.players;
    state.buildings = msg.buildings;
    state.wires = msg.wires;
    state.enemies = msg.enemies;
    state.core = msg.core;
    state.phase = msg.phase;
    state.phaseElapsed = msg.phaseElapsed;
    state.resources = msg.resources;
    state.wireLengthAvailable = msg.wireLengthAvailable;
    state.tick = msg.tick;
  });

  net.on('disconnected', () => {
    ui.showMenu('Connection lost - offline demo');
    offline = true;
  });

  function handleInput(dt) {
    const dx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    const dy = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    if (!offline && net.connected) {
      net.sendInput(dx, dy, false);
    } else {
      const speed = 110;
      const player = state.players[0];
      if (player) {
        player.x += dx * speed * dt;
        player.y += dy * speed * dt;
      }
    }
  }

  function render() {
    renderer.clear();
    if (!state.core) return requestAnimationFrame(render);
    const localPlayer = state.players.find(p => p.id === playerId) || state.players[0];
    if (localPlayer) renderer.setCamera(localPlayer.x, localPlayer.y);

    renderer.drawGrid(state.tileSize, state.mapSize);
    state.buildings.forEach(b => renderer.drawBuilding(b, state.tileSize));
    if (state.core) renderer.drawCore(state.core, state.tileSize);
    state.wires.forEach(w => renderer.drawWire(w));
    state.enemies.forEach(e => renderer.drawEnemies([e]));
    state.players.forEach(p => renderer.drawPlayer(p, p.id === playerId));
  }

  function loop(last) {
    const now = performance.now();
    const dt = (now - last) / 1000;
    handleInput(dt);
    if (state.phase) ui.updateWave(state.phase, state.phaseElapsed || 0);
    if (state.resources) ui.updateResources(state.resources, state.wireLengthAvailable || 0);
    ui.updatePlayers(state.players);
    render();
    requestAnimationFrame(() => loop(now));
  }

  requestAnimationFrame((t) => loop(t));
})();
