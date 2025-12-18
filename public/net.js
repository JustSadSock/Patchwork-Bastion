class NetClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.handlers = {};
  }

  connect(name, code) {
    return new Promise((resolve) => {
      const url = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host;
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ t: 'join', name, code }));
      };
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.t === 'joined') {
          this.connected = true;
          resolve(msg);
        }
        this.dispatch(msg);
      };
      this.ws.onclose = () => {
        this.connected = false;
        this.dispatch({ t: 'disconnected' });
      };
    });
  }

  on(type, cb) {
    this.handlers[type] = cb;
  }

  dispatch(msg) {
    if (this.handlers[msg.t]) this.handlers[msg.t](msg);
  }

  sendInput(dx, dy, pulling) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({ t: 'input', dx, dy, pulling }));
  }

  build(type, tx, ty) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({ t: 'build', type, tx, ty }));
  }

  sendWire(fromPort, toPort, points) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({ t: 'wire', fromPort, toPort, points }));
  }

  repair(id) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({ t: 'repair', id }));
  }
}

window.NetClient = NetClient;
