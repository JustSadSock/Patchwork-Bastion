const COLORS = {
  red: '#f56565',
  green: '#5bc77c',
  blue: '#6aa9ff',
  purple: '#af7ce0',
  adaptive: '#f0e68c',
};

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setCamera(x, y) {
    this.camera.x = x - this.canvas.width / 2;
    this.camera.y = y - this.canvas.height / 2;
  }

  worldToScreen(x, y) {
    return { x: x - this.camera.x, y: y - this.camera.y };
  }

  drawGrid(tileSize, mapSize) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < mapSize * tileSize; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x - this.camera.x, -this.camera.y);
      ctx.lineTo(x - this.camera.x, mapSize * tileSize - this.camera.y);
      ctx.stroke();
    }
    for (let y = 0; y < mapSize * tileSize; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(-this.camera.x, y - this.camera.y);
      ctx.lineTo(mapSize * tileSize - this.camera.x, y - this.camera.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTile(tx, ty, tileSize, color) {
    const ctx = this.ctx;
    const { x, y } = this.worldToScreen(tx * tileSize, ty * tileSize);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(x, y, tileSize, tileSize);
  }

  drawPlayer(p, local) {
    const ctx = this.ctx;
    const screen = this.worldToScreen(p.x, p.y);
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.fillStyle = local ? '#ffd166' : '#a0d2eb';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3425';
    ctx.stroke();
    ctx.fillStyle = '#4a3425';
    ctx.fillText(p.name || 'P', -8, 24);
    ctx.restore();
  }

  drawCore(core, tileSize) {
    const ctx = this.ctx;
    const sizePx = core.size * tileSize;
    const { x, y } = this.worldToScreen(core.x, core.y);
    ctx.fillStyle = '#fbe0c3';
    ctx.fillRect(x, y, sizePx, sizePx);
    ctx.strokeStyle = '#b0834a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, sizePx, sizePx);
    core.ports.forEach((port, idx) => {
      const px = x + 12 + idx * 28;
      const py = y - 10;
      ctx.fillStyle = COLORS[port.type] || '#eee';
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3425';
      ctx.stroke();
    });
  }

  drawBuilding(b, tileSize) {
    const ctx = this.ctx;
    const { x, y } = this.worldToScreen(b.tx * tileSize, b.ty * tileSize);
    const sizePx = b.size * tileSize;
    ctx.fillStyle = b.type === 'turret' ? '#d6f0ff' : b.type === 'wall' ? '#c1b7a1' : '#d7c2f5';
    ctx.fillRect(x, y, sizePx, sizePx);
    ctx.strokeStyle = '#4a3425';
    ctx.strokeRect(x, y, sizePx, sizePx);
    b.ports?.forEach((p, i) => {
      const px = x + 8 + i * 18;
      const py = y - 8;
      ctx.fillStyle = COLORS[p.type] || '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3425';
      ctx.stroke();
    });
  }

  drawEnemies(enemies) {
    const ctx = this.ctx;
    enemies.forEach(e => {
      const { x, y } = this.worldToScreen(e.x, e.y);
      ctx.fillStyle = '#ff7eb6';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3425';
      ctx.stroke();
    });
  }

  drawWire(wire) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = COLORS[w.refType || 'adaptive'] || '#ccc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    wire.points.forEach((pt, i) => {
      const { x, y } = this.worldToScreen(pt.x, pt.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

window.Renderer = Renderer;
window.COLORS = COLORS;
