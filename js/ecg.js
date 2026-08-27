/* ==========================================================================
   SYNAPSE-Med — 12-Lead ECG Waveform Canvas Oscilloscope Engine
   ========================================================================== */

class ECGMonitor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.bpm = 74;
    this.lead = 'Lead II';
    this.arrhythmia = 'NSR'; // NSR, VTACH, AFIB, STEMI
    this.sweepX = 0;
    this.speed = 2.2; // Pixels per frame
    this.points = [];
    this.animId = null;

    this.initCanvas();
    window.addEventListener('resize', () => this.initCanvas());
    this.start();
  }

  initCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
    this.points = new Array(Math.floor(this.width)).fill(this.height / 2);
  }

  setBPM(bpm) {
    this.bpm = bpm;
  }

  setLead(leadName) {
    this.lead = leadName;
  }

  setArrhythmia(type) {
    this.arrhythmia = type;
  }

  generateECGValue(t) {
    const midY = this.height / 2;
    const period = (60 / this.bpm) * 60; // Frames per beat at 60fps
    const phase = (t % period) / period;

    let sample = 0;

    if (this.arrhythmia === 'VTACH') {
      // Rapid wide-complex ventricular wave
      sample = Math.sin(phase * Math.PI * 4) * 45 + (Math.random() - 0.5) * 4;
    } else if (this.arrhythmia === 'AFIB') {
      // Irregular baseline with no P wave and random R-R
      const fibrillate = Math.sin(phase * Math.PI * 24) * 6 + (Math.random() - 0.5) * 5;
      if (phase > 0.45 && phase < 0.52) {
        sample = -Math.sin((phase - 0.45) / 0.07 * Math.PI) * 55;
      } else {
        sample = fibrillate;
      }
    } else if (this.arrhythmia === 'STEMI') {
      // ST-segment elevation
      if (phase > 0.40 && phase < 0.45) sample = -Math.sin((phase - 0.40) / 0.05 * Math.PI) * 65; // R-Peak
      else if (phase >= 0.45 && phase < 0.70) sample = -22 + Math.sin((phase - 0.45) / 0.25 * Math.PI) * 15; // ST Elevation
      else sample = (Math.random() - 0.5) * 2;
    } else {
      // Normal Sinus Rhythm (P-Q-R-S-T)
      if (phase >= 0.10 && phase < 0.20) {
        // P Wave
        sample = -Math.sin((phase - 0.10) / 0.10 * Math.PI) * 8;
      } else if (phase >= 0.38 && phase < 0.40) {
        // Q Dip
        sample = 6;
      } else if (phase >= 0.40 && phase < 0.44) {
        // R Spike
        sample = -Math.sin((phase - 0.40) / 0.04 * Math.PI) * 70;
      } else if (phase >= 0.44 && phase < 0.47) {
        // S Dip
        sample = 14;
      } else if (phase >= 0.60 && phase < 0.75) {
        // T Wave
        sample = -Math.sin((phase - 0.60) / 0.15 * Math.PI) * 16;
      } else {
        // Baseline Isometric Trace
        sample = (Math.random() - 0.5) * 1.5;
      }
    }

    // Lead amplitude scaling
    let scale = 1.0;
    if (this.lead === 'Lead I') scale = 0.8;
    if (this.lead === 'Lead V5') scale = 1.25;

    return midY + sample * scale;
  }

  draw(time) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Compute new points for sweep
    const frame = Math.floor(time / 16.6);
    const val = this.generateECGValue(frame);

    const x = Math.floor(this.sweepX);
    this.points[x] = val;

    // Draw Continuous ECG Line
    this.ctx.beginPath();
    this.ctx.lineWidth = 2.2;
    this.ctx.strokeStyle = this.arrhythmia !== 'NSR' ? '#ef4444' : '#10b981';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.arrhythmia !== 'NSR' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';

    for (let i = 0; i < this.width; i++) {
      if (Math.abs(i - this.sweepX) < 12) continue; // Gap around sweep bar
      const y = this.points[i] || this.height / 2;
      if (i === 0) this.ctx.moveTo(i, y);
      else this.ctx.lineTo(i, y);
    }
    this.ctx.stroke();

    // Draw Sweep Cursor Bar
    this.ctx.beginPath();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#38bdf8';
    this.ctx.moveTo(this.sweepX, 0);
    this.ctx.lineTo(this.sweepX, this.height);
    this.ctx.stroke();

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
