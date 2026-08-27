/* ==========================================================================
   SYNAPSE-Med — Advanced Dual-Channel Oscilloscope Engine (ECG + SpO2 Pleth)
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
    this.speed = 2.4;
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
    this.plethHeight = plethDim.height || 100;

    this.ecgPoints = new Array(Math.floor(this.width)).fill(this.ecgHeight / 2);
    this.plethPoints = new Array(Math.floor(this.width)).fill(this.plethHeight / 2);
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
      osc.frequency.value = this.arrhythmia !== 'NSR' ? 880 : 587.33; // Pitch
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  generateECGValue(t) {
    const midY = this.ecgHeight / 2;
    const period = (60 / this.bpm) * 60;
    const phase = (t % period) / period;

    let sample = 0;

    // Pulse beep at R-Peak
    if (Math.abs(phase - 0.42) < 0.015) {
      this.playBeep();
    }

    if (this.arrhythmia === 'VTACH') {
      sample = Math.sin(phase * Math.PI * 4) * 45 + (Math.random() - 0.5) * 4;
    } else if (this.arrhythmia === 'AFIB') {
      const fibrillate = Math.sin(phase * Math.PI * 24) * 6 + (Math.random() - 0.5) * 5;
      sample = phase > 0.45 && phase < 0.52 ? -Math.sin((phase - 0.45) / 0.07 * Math.PI) * 55 : fibrillate;
    } else if (this.arrhythmia === 'STEMI') {
      if (phase > 0.40 && phase < 0.45) sample = -Math.sin((phase - 0.40) / 0.05 * Math.PI) * 65;
      else if (phase >= 0.45 && phase < 0.70) sample = -22 + Math.sin((phase - 0.45) / 0.25 * Math.PI) * 15;
      else sample = (Math.random() - 0.5) * 2;
    } else {
      if (phase >= 0.10 && phase < 0.20) sample = -Math.sin((phase - 0.10) / 0.10 * Math.PI) * 8;
      else if (phase >= 0.38 && phase < 0.40) sample = 6;
      else if (phase >= 0.40 && phase < 0.44) sample = -Math.sin((phase - 0.40) / 0.04 * Math.PI) * 70;
      else if (phase >= 0.44 && phase < 0.47) sample = 14;
      else if (phase >= 0.60 && phase < 0.75) sample = -Math.sin((phase - 0.60) / 0.15 * Math.PI) * 16;
      else sample = (Math.random() - 0.5) * 1.5;
    }

    let scale = 1.0;
    if (this.lead === 'Lead I') scale = 0.8;
    if (this.lead === 'Lead V5') scale = 1.25;

    return midY + sample * scale;
  }

  generatePlethValue(t) {
    const midY = this.plethHeight / 2;
    const period = (60 / this.bpm) * 60;
    const phase = (t % period) / period;

    let sample = 0;
    // Photoplethysmogram (PPG) Systolic Peak + Dicrotic Notch
    if (phase >= 0.35 && phase < 0.65) {
      const pPhase = (phase - 0.35) / 0.30;
      sample = -Math.sin(pPhase * Math.PI) * 35;
      if (pPhase > 0.4 && pPhase < 0.6) {
        sample += Math.sin((pPhase - 0.4) / 0.2 * Math.PI) * 8; // Dicrotic notch
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
    const ecgVal = this.generateECGValue(frame);
    const plethVal = this.generatePlethValue(frame);

    const x = Math.floor(this.sweepX);
    this.ecgPoints[x] = ecgVal;
    this.plethPoints[x] = plethVal;

    // Draw ECG Channel
    this.ecgCtx.beginPath();
    this.ecgCtx.lineWidth = 2.2;
    this.ecgCtx.strokeStyle = this.arrhythmia !== 'NSR' ? '#ef4444' : '#10b981';
    this.ecgCtx.shadowBlur = 8;
    this.ecgCtx.shadowColor = this.arrhythmia !== 'NSR' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';

    for (let i = 0; i < this.width; i++) {
      if (Math.abs(i - this.sweepX) < 12) continue;
      const y = this.ecgPoints[i] || this.ecgHeight / 2;
      if (i === 0) this.ecgCtx.moveTo(i, y);
      else this.ecgCtx.lineTo(i, y);
    }
    this.ecgCtx.stroke();

    // Draw SpO2 Pleth Channel
    if (this.plethCtx) {
      this.plethCtx.beginPath();
      this.plethCtx.lineWidth = 2.0;
      this.plethCtx.strokeStyle = '#06b6d4';
      this.plethCtx.shadowBlur = 8;
      this.plethCtx.shadowColor = 'rgba(6, 182, 212, 0.8)';

      for (let i = 0; i < this.width; i++) {
        if (Math.abs(i - this.sweepX) < 12) continue;
        const y = this.plethPoints[i] || this.plethHeight / 2;
        if (i === 0) this.plethCtx.moveTo(i, y);
        else this.plethCtx.lineTo(i, y);
      }
      this.plethCtx.stroke();
    }

    // Draw Cursor Line
    this.ecgCtx.beginPath();
    this.ecgCtx.lineWidth = 3;
    this.ecgCtx.strokeStyle = '#38bdf8';
    this.ecgCtx.shadowBlur = 10;
    this.ecgCtx.shadowColor = '#38bdf8';
    this.ecgCtx.moveTo(this.sweepX, 0);
    this.ecgCtx.lineTo(this.sweepX, this.ecgHeight);
    this.ecgCtx.stroke();

    if (this.plethCtx) {
      this.plethCtx.beginPath();
      this.plethCtx.lineWidth = 3;
      this.plethCtx.strokeStyle = '#38bdf8';
      this.plethCtx.shadowBlur = 10;
      this.plethCtx.shadowColor = '#38bdf8';
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
