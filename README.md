# 🏥 SYNAPSE-Med — Real-Time Emergency ICU Vital Telemetry & Alarm Dispatch Platform

Institutional-grade, next-generation medical telemetry and clinical risk calculation platform built with a **Clinical Dark Slate & Monochrome Medical Interface**, sub-second 12-Lead ECG waveform oscilloscope canvas, automated NEWS2 clinical risk evaluation, and mobile ICU ambulance telemetry dispatching.

---

## 🌟 Key Architecture & Capabilities

### 1. 🫀 12-Lead ECG Waveform Canvas Oscilloscope Engine (`js/ecg.js`)
- High-frequency 60 FPS HTML5 Canvas oscilloscope drawing continuous P-Q-R-S-T cardiac waveforms with adjustable R-peak detection, sweep speed (25 mm/s), and lead calibration (Lead II, Lead I, Lead V5).
- Real-time cardiac arrhythmia synthesis: Normal Sinus Rhythm (NSR), Ventricular Tachycardia (V-Tach), Atrial Fibrillation (A-Fib), and ST-Segment Elevation Myocardial Infarction (STEMI).

### 2. 📊 NEWS2 (National Early Warning Score) Risk Engine (`js/app.js`)
- Clinical-grade automated risk score calculator evaluating:
  - Respiration Rate (/min)
  - Blood Oxygen Saturation SpO2 (%)
  - Systolic Blood Pressure NIBP (mmHg)
  - Heart Rate BPM & Cardiac Rhythm
  - Body Temperature (°C)
- Instant risk stratification (Low Risk, Medium Risk, High Sepsis/Cardiac Risk) with mandatory escalation protocols.

### 3. 🛌 ICU Ward Bed Allocation & Triage Matrix
- 8 Live ICU Bed telemetry stations (`Bed 01: Post-Op Cardiac`, `Bed 03: Acute STEMI Watch`, `Bed 04: Septic Shock Alert`, `Bed 08: Trauma ICU Bay`).
- 1-Click Bed Selector allowing attending clinicians to switch main ECG canvas and vital telemetry feeds to any patient in the ICU ward.

### 4. 📄 EMR Telemetry Audit Exporter & Ambulance Dispatcher
- 1-Click export of formal printable ICU Medical Telemetry Audit Reports (.txt / PDF summary).
- Emergency Ambulance Telemetry Fleet Dispatcher with real-time ETA tracking.

---

## 💻 Tech Stack & Standards

- **Core Microservices**: Go (Golang 1.22) & Python 3.11 Telemetry APIs
- **Frontend Engine**: HTML5 Canvas, Vanilla ES6+, CSS3 Custom Properties
- **Design System**: Clinical Dark Slate & Monochrome Medical Console Interface (Datadog/Linear Enterprise Aesthetic)
- **Clinical Standards**: NEWS2 (Royal College of Physicians), IEEE 11073 Medical Device Communication, ISO 27001 Security Audit Log Compliance

---

## 🌐 Live Web Application & Deployment

- **Live Application**: [yaya2127.github.io/synapse-med-platform](https://yaya2127.github.io/synapse-med-platform/)
- **GitHub Repository**: [github.com/yaya2127/synapse-med-platform](https://github.com/yaya2127/synapse-med-platform)

---

## 📄 License

MIT License — Developed by **Yared Kinetibeb Tesfaye** (5th-Year Computer Engineering Senior @ Addis Ababa Science and Technology University).
