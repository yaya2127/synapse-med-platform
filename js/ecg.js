/* ==========================================================================
   SYNAPSE-Med — Hardware Bedside Oscilloscope Engine (1mV Cal Pulse & Dual Lead)
   ========================================================================== */

class ECGMonitor {
  constructor(ecgCanvasId, plethCanvasId) {
    this.ecgCanvas = document.getElementById(ecgCanvasId);
    this.plethCanvas = document.getElementById(plethCanvasId);
    if (!this.ecgCanvas) return;

    this.ecgCtx = this.ecgCanvas.getContext('2d');
    this.plethCtx = this.plethCanvas ? this.plethCanvas.getContext('2d') : null;

    this.bpm = 74;
    this.spo2 = 98;
    this.lead = 'Lead II';
    this.arrhythmia = 'NSR'; // NSR, VTACH, AFIB, STEMI
    this.sweepX = 0;
    this.speed = 2.5; // Default 25 mm/s
    this.audioEnabled = false;
    this.audioCtx = null;

    this.ecgPoints = [];
    this.plethPoints = [];
    this.animId = null;

    this.initCanvas();
    window.addEventListener('resize', () => this.initCanvas());
    this.start();
  }

  initCanvas() {
    const setupCanvas = (canvas) => {
      if (!canvas) return { width: 0, height: 0 };
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      return { width: rect.width, height: rect.height };
    };

    const ecgDim = setupCanvas(this.ecgCanvas);
    this.width = ecgDim.width;
    this.ecgHeight = ecgDim.height;

    const plethDim = setupCanvas(this.plethCanvas);
    this.plethHeight = plethDim.height || 140;

    this.ecgPoints = new Array(Math.floor(this.width)).fill(this.ecgHeight / 2);
    this.plethPoints = new Array(Math.floor(this.width)).fill(this.plethHeight / 2);
  }

  setSpeed(speedVal) {
    this.speed = speedVal;
  }

  setBPM(bpm) {
    this.bpm = Math.max(30, Math.min(220, bpm));
  }

  setSpO2(spo2) {
    this.spo2 = Math.max(70, Math.min(100, spo2));
  }

  setLead(leadName) {
    this.lead = leadName;
  }

  setArrhythmia(type) {
    this.arrhythmia = type;
  }

  toggleAudio(enable) {
    this.audioEnabled = enable;
    if (enable && !this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep() {
    if (!this.audioEnabled || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = this.arrhythmia !== 'NSR' ? 880 : 587.33;
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  generateECGValue(t, x) {
    const midY = this.ecgHeight / 2;

    // Hardware 1mV / 10mm Calibration Pulse Mark at start of sweep (x < 35)
    if (x >= 10 && x <= 14) return midY;
    if (x > 14 && x < 28) return midY - 45; // 1mV calibration pulse height
    if (x >= 28 && x <= 32) return midY;

    const period = (60 / this.bpm) * 60;
    const phase = (t % period) / period;

    let sample = 0;

    if (Math.abs(phase - 0.42) < 0.015) {
      this.playBeep();
    }

    if (this.arrhythmia === 'VTACH') {
      sample = Math.sin(phase * Math.PI * 4) * 50 + (Math.random() - 0.5) * 4;
    } else if (this.arrhythmia === 'AFIB') {
      const fibrillate = Math.sin(phase * Math.PI * 24) * 6 + (Math.random() - 0.5) * 5;
      sample = phase > 0.45 && phase < 0.52 ? -Math.sin((phase - 0.45) / 0.07 * Math.PI) * 60 : fibrillate;
    } else if (this.arrhythmia === 'STEMI') {
      if (phase > 0.40 && phase < 0.45) sample = -Math.sin((phase - 0.40) / 0.05 * Math.PI) * 70;
      else if (phase >= 0.45 && phase < 0.70) sample = -25 + Math.sin((phase - 0.45) / 0.25 * Math.PI) * 16;
      else sample = (Math.random() - 0.5) * 2;
    } else {
      if (phase >= 0.10 && phase < 0.20) sample = -Math.sin((phase - 0.10) / 0.10 * Math.PI) * 10;
      else if (phase >= 0.38 && phase < 0.40) sample = 8;
      else if (phase >= 0.40 && phase < 0.44) sample = -Math.sin((phase - 0.40) / 0.04 * Math.PI) * 75;
      else if (phase >= 0.44 && phase < 0.47) sample = 16;
      else if (phase >= 0.60 && phase < 0.75) sample = -Math.sin((phase - 0.60) / 0.15 * Math.PI) * 18;
      else sample = (Math.random() - 0.5) * 1.5;
    }

    let scale = 1.0;
    if (this.lead === 'Lead I') scale = 0.85;
    if (this.lead === 'Lead V5') scale = 1.3;

    return midY + sample * scale;
  }

  generatePlethValue(t, x) {
    const midY = this.plethHeight / 2;
    if (x >= 10 && x <= 32) return midY; // Flat during cal

    const period = (60 / this.bpm) * 60;
    const phase = (t % period) / period;

    let sample = 0;
    if (phase >= 0.35 && phase < 0.65) {
      const pPhase = (phase - 0.35) / 0.30;
      sample = -Math.sin(pPhase * Math.PI) * 40;
      if (pPhase > 0.4 && pPhase < 0.6) {
        sample += Math.sin((pPhase - 0.4) / 0.2 * Math.PI) * 9;
      }
    } else {
      sample = (Math.random() - 0.5) * 1.2;
    }

    const amplitude = (this.spo2 / 100) * 0.95;
    return midY + sample * amplitude;
  }

  draw(time) {
    this.ecgCtx.clearRect(0, 0, this.width, this.ecgHeight);
    if (this.plethCtx) this.plethCtx.clearRect(0, 0, this.width, this.plethHeight);

    const frame = Math.floor(time / 16.6);
    const x = Math.floor(this.sweepX);

    const ecgVal = this.generateECGValue(frame, x);
    const plethVal = this.generatePlethValue(frame, x);

    this.ecgPoints[x] = ecgVal;
    this.plethPoints[x] = plethVal;

    // Draw ECG Channel
    this.ecgCtx.beginPath();
    this.ecgCtx.lineWidth = 2.4;
    this.ecgCtx.strokeStyle = this.arrhythmia !== 'NSR' ? '#ff1744' : '#00e676';
    this.ecgCtx.shadowBlur = 8;
    this.ecgCtx.shadowColor = this.arrhythmia !== 'NSR' ? 'rgba(255, 23, 68, 0.8)' : 'rgba(0, 230, 118, 0.8)';

    for (let i = 0; i < this.width; i++) {
      if (Math.abs(i - this.sweepX) < 14) continue;
      const y = this.ecgPoints[i] || this.ecgHeight / 2;
      if (i === 0) this.ecgCtx.moveTo(i, y);
      else this.ecgCtx.lineTo(i, y);
    }
    this.ecgCtx.stroke();

    // Draw SpO2 Channel
    if (this.plethCtx) {
      this.plethCtx.beginPath();
      this.plethCtx.lineWidth = 2.2;
      this.plethCtx.strokeStyle = '#00e5ff';
      this.plethCtx.shadowBlur = 8;
      this.plethCtx.shadowColor = 'rgba(0, 229, 255, 0.8)';

      for (let i = 0; i < this.width; i++) {
        if (Math.abs(i - this.sweepX) < 14) continue;
        const y = this.plethPoints[i] || this.plethHeight / 2;
        if (i === 0) this.plethCtx.moveTo(i, y);
        else this.plethCtx.lineTo(i, y);
      }
      this.plethCtx.stroke();
    }

    // Draw Sweep Cursor Line
    this.ecgCtx.beginPath();
    this.ecgCtx.lineWidth = 3;
    this.ecgCtx.strokeStyle = '#ffffff';
    this.ecgCtx.shadowBlur = 12;
    this.ecgCtx.shadowColor = '#ffffff';
    this.ecgCtx.moveTo(this.sweepX, 0);
    this.ecgCtx.lineTo(this.sweepX, this.ecgHeight);
    this.ecgCtx.stroke();

    if (this.plethCtx) {
      this.plethCtx.beginPath();
      this.plethCtx.lineWidth = 3;
      this.plethCtx.strokeStyle = '#ffffff';
      this.plethCtx.shadowBlur = 12;
      this.plethCtx.shadowColor = '#ffffff';
      this.plethCtx.moveTo(this.sweepX, 0);
      this.plethCtx.lineTo(this.sweepX, this.plethHeight);
      this.plethCtx.stroke();
    }

    this.sweepX = (this.sweepX + this.speed) % this.width;
    this.animId = requestAnimationFrame((t) => this.draw(t));
  }

  start() {
    if (!this.animId) {
      this.animId = requestAnimationFrame((t) => this.draw(t));
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
