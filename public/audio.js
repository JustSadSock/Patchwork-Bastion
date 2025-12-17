class AudioBus {
  constructor() {
    this.enabled = false;
  }
  init() {
    if (this.enabled) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.enabled = true;
  }
  playClick(freq = 440) {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

window.AudioBus = AudioBus;
