class UI {
  constructor() {
    this.playerStrip = document.getElementById('player-strip');
    this.waveInfo = document.getElementById('wave-info');
    this.resources = document.getElementById('resources');
    this.menu = document.getElementById('menu');
    this.status = document.getElementById('status');
  }

  setConnected(text) {
    this.status.textContent = text;
    this.menu.style.display = 'none';
  }

  showMenu(text) {
    this.status.textContent = text;
    this.menu.style.display = 'flex';
  }

  updatePlayers(players) {
    this.playerStrip.innerHTML = '';
    players.forEach(p => {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = p.name || 'P';
      const bar = document.createElement('div');
      bar.className = 'health-bar';
      const inner = document.createElement('div');
      inner.className = 'health-inner';
      inner.style.width = `${p.hp}%`;
      bar.appendChild(inner);
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '6px';
      wrap.appendChild(badge);
      wrap.appendChild(bar);
      this.playerStrip.appendChild(wrap);
    });
  }

  updateWave(phase, elapsed) {
    const secs = Math.max(0, Math.floor((phase === 'build' ? 30 : 40) - elapsed / 1000));
    this.waveInfo.innerHTML = `<div class="badge">${phase.toUpperCase()} : ${secs}s</div>`;
  }

  updateResources(res, wireLength) {
    this.resources.innerHTML = '';
    const make = (label, value) => {
      const div = document.createElement('div');
      div.className = 'resource';
      const icon = document.createElement('div');
      icon.className = 'resource-icon';
      div.appendChild(icon);
      const text = document.createElement('span');
      text.textContent = `${label}: ${value}`;
      div.appendChild(text);
      this.resources.appendChild(div);
    };
    make('Fabric', res.fabric);
    make('Buttons', res.buttons);
    make('Wire', `${wireLength.toFixed(0)}m left`);
  }
}

window.UI = UI;
