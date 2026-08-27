/* ==========================================================================
   SYNAPSE-Med — Advanced Clinical Application & Drug Titration Orchestrator
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Dual Canvas Oscilloscope (ECG + SpO2 Pleth)
  const ecgMonitor = new ECGMonitor('ecg-canvas', 'pleth-canvas');

  // ICU Patient Bed Dataset
  let bedsData = [
    { id: 1, name: "Bed 01 — Post-Op Cardiac", patient: "Bekele T. (M/62)", hr: 74, spo2: 98, bp: "120/80", rr: 16, temp: 36.8, arrhythmia: "NSR", lead: "Lead II" },
    { id: 2, name: "Bed 02 — Telemetry Watch", patient: "Sara M. (F/48)", hr: 82, spo2: 97, bp: "128/84", rr: 18, temp: 37.1, arrhythmia: "NSR", lead: "Lead II" },
    { id: 3, name: "Bed 03 — Acute STEMI Watch", patient: "Yonas A. (M/55)", hr: 118, spo2: 91, bp: "95/60", rr: 26, temp: 38.4, arrhythmia: "STEMI", lead: "Lead V5" },
    { id: 4, name: "Bed 04 — Septic Shock Alert", patient: "Tigist G. (F/71)", hr: 132, spo2: 88, bp: "85/50", rr: 30, temp: 39.2, arrhythmia: "AFIB", lead: "Lead II" },
    { id: 5, name: "Bed 05 — Respiratory Stepdown", patient: "Dawit K. (M/39)", hr: 68, spo2: 99, bp: "116/76", rr: 14, temp: 36.6, arrhythmia: "NSR", lead: "Lead I" },
    { id: 6, name: "Bed 06 — Post-CABG Rehab", patient: "Abebe B. (M/67)", hr: 76, spo2: 96, bp: "124/78", rr: 15, temp: 36.9, arrhythmia: "NSR", lead: "Lead II" },
    { id: 7, name: "Bed 07 — Stable Observation", patient: "Helen F. (F/52)", hr: 71, spo2: 98, bp: "118/75", rr: 16, temp: 36.7, arrhythmia: "NSR", lead: "Lead II" },
    { id: 8, name: "Bed 08 — Trauma ICU Bay", patient: "Kirubel H. (M/29)", hr: 145, spo2: 93, bp: "102/64", rr: 24, temp: 37.8, arrhythmia: "VTACH", lead: "Lead II" }
  ];

  let activeBedId = 1;
  let audioMuted = true;

  // DOM Elements
  const valHr = document.getElementById('val-hr');
  const valSpo2 = document.getElementById('val-spo2');
  const valBp = document.getElementById('val-bp');
  const valRr = document.getElementById('val-rr');
  const valTemp = document.getElementById('val-temp');

  const news2ScoreDisplay = document.getElementById('news2-score-display');
  const news2RiskLabel = document.getElementById('news2-risk-label');
  const news2ProtocolText = document.getElementById('news2-protocol-text');
  const currentPatientName = document.getElementById('current-patient-name');
  const currentBedTitle = document.getElementById('current-bed-title');
  const readLead = document.getElementById('read-lead');

  const bedMatrixGrid = document.getElementById('bed-matrix-grid');
  const leadBtns = document.querySelectorAll('.lead-btn');
  const btnExportEmr = document.getElementById('btn-export-emr');
  const btnDispatchAmbulance = document.getElementById('btn-dispatch-ambulance');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const btnAdmitModal = document.getElementById('btn-admit-modal');
  const btnSimulateShift = document.getElementById('btn-simulate-shift');
  const triageInput = document.getElementById('triage-input');
  const toastContainer = document.getElementById('toast-container');

  // Drug Infusion Calculator Elements
  const drugSelect = document.getElementById('drug-select');
  const drugWeight = document.getElementById('drug-weight');
  const drugDose = document.getElementById('drug-dose');
  const drugResultRate = document.getElementById('drug-result-rate');

  // Modal Elements
  const modalAdmit = document.getElementById('modal-admit');
  const modalSimulate = document.getElementById('modal-simulate');
  const formAdmit = document.getElementById('form-admit');
  const formSimulate = document.getElementById('form-simulate');
  const closeModals = document.querySelectorAll('.modal-close');

  // Calculate NEWS2 (National Early Warning Score)
  function calculateNEWS2(bed) {
    let score = 0;
    if (bed.rr <= 8 || bed.rr >= 25) score += 3;
    else if (bed.rr >= 21) score += 2;
    else if (bed.rr <= 11) score += 1;

    if (bed.spo2 <= 91) score += 3;
    else if (bed.spo2 <= 93) score += 2;
    else if (bed.spo2 <= 95) score += 1;

    if (bed.hr <= 40 || bed.hr >= 131) score += 3;
    else if (bed.hr >= 111) score += 2;
    else if (bed.hr <= 50 || bed.hr >= 91) score += 1;

    if (bed.temp <= 35.0 || bed.temp >= 39.1) score += 3;
    else if (bed.temp >= 38.1) score += 1;

    if (bed.arrhythmia !== 'NSR') score += 2;
    return score;
  }

  // Update NEWS2 UI
  function updateNEWS2UI(score) {
    if (!news2ScoreDisplay) return;
    news2ScoreDisplay.textContent = score;
    news2ScoreDisplay.className = 'news2-score-display';

    if (score >= 7) {
      news2ScoreDisplay.classList.add('high');
      news2RiskLabel.textContent = "CRITICAL / SEVERE SEPSIS RISK";
      news2RiskLabel.style.color = "#ef4444";
      news2ProtocolText.textContent = "⚠️ Emergency Registrar & ICU Outreach Response: Continuous cardiac telemetry, blood gas, & blood cultures.";
    } else if (score >= 5) {
      news2ScoreDisplay.classList.add('medium');
      news2RiskLabel.textContent = "HIGH CLINICAL RISK";
      news2RiskLabel.style.color = "#f59e0b";
      news2ProtocolText.textContent = "⚡ Urgent Senior Nurse & Registrar Review within 30 min. Increase vitals monitoring q30m.";
    } else if (score >= 1) {
      news2ScoreDisplay.classList.add('medium');
      news2RiskLabel.textContent = "MEDIUM CLINICAL RISK";
      news2RiskLabel.style.color = "#38bdf8";
      news2ProtocolText.textContent = "ℹ️ Ward nurse monitoring q4h. Inform team of deteriorating vital signs trend.";
    } else {
      news2RiskLabel.textContent = "LOW CLINICAL RISK";
      news2RiskLabel.style.color = "#10b981";
      news2ProtocolText.textContent = "✅ Standard ICU ward telemetry monitoring routine q4h - q6h.";
    }
  }

  // Load Active Bed
  function loadBed(bedId) {
    activeBedId = bedId;
    const bed = bedsData.find(b => b.id === bedId);
    if (!bed) return;

    if (currentBedTitle) currentBedTitle.textContent = bed.name;
    if (currentPatientName) currentPatientName.textContent = `Patient: ${bed.patient}`;
    if (readLead) readLead.textContent = bed.lead;

    if (valHr) valHr.textContent = bed.hr;
    if (valSpo2) valSpo2.textContent = bed.spo2;
    if (valBp) valBp.textContent = bed.bp;
    if (valRr) valRr.textContent = bed.rr;
    if (valTemp) valTemp.textContent = bed.temp.toFixed(1);

    if (ecgMonitor) {
      ecgMonitor.setBPM(bed.hr);
      ecgMonitor.setSpO2(bed.spo2);
      ecgMonitor.setArrhythmia(bed.arrhythmia);
      ecgMonitor.setLead(bed.lead);
    }

    const score = calculateNEWS2(bed);
    updateNEWS2UI(score);
    renderBedGrid();
  }

  // Render ICU Bed Matrix with Filter Search
  function renderBedGrid() {
    if (!bedMatrixGrid) return;
    bedMatrixGrid.innerHTML = '';
    const query = triageInput ? triageInput.value.toLowerCase().trim() : '';

    bedsData.forEach(bed => {
      if (query && !bed.name.toLowerCase().includes(query) && !bed.patient.toLowerCase().includes(query) && !bed.arrhythmia.toLowerCase().includes(query)) {
        return;
      }

      const card = document.createElement('div');
      const score = calculateNEWS2(bed);
      const isCritical = score >= 5 || bed.arrhythmia !== 'NSR';

      card.className = `bed-card ${bed.id === activeBedId ? 'active' : ''} ${isCritical ? 'critical' : ''}`;
      card.innerHTML = `
        <div class="bed-header">
          <span>${bed.name.split('—')[0].trim()}</span>
          <span style="color: ${isCritical ? '#ef4444' : '#10b981'}; font-weight:800;">${bed.arrhythmia}</span>
        </div>
        <div class="bed-patient">${bed.patient}</div>
        <div class="bed-vitals-mini">
          <span>HR: ${bed.hr}</span>
          <span>SpO2: ${bed.spo2}%</span>
          <span>NEWS2: ${score}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        loadBed(bed.id);
        showToast(`Loaded Telemetry Feed for ${bed.name}`);
      });

      bedMatrixGrid.appendChild(card);
    });
  }

  if (triageInput) triageInput.addEventListener('input', renderBedGrid);

  // Pharmacological Drug Infusion Titration Calculator
  function calculateDrugRate() {
    if (!drugResultRate || !drugSelect || !drugWeight || !drugDose) return;

    const drug = drugSelect.value;
    const weight = parseFloat(drugWeight.value) || 70;
    const dose = parseFloat(drugDose.value) || 0.05;

    let rateMLHr = 0;

    if (drug === 'norepinephrine') {
      // Dose in mcg/kg/min; Standard Bag 4 mg in 250 mL D5W (16 mcg/mL)
      const mcgPerMin = dose * weight;
      rateMLHr = (mcgPerMin * 60) / 16;
    } else if (drug === 'amiodarone') {
      // Dose in mg/min; Standard Bag 450 mg in 250 mL D5W (1.8 mg/mL)
      rateMLHr = (dose * 60) / 1.8;
    } else if (drug === 'propofol') {
      // Dose in mcg/kg/min; Standard 10 mg/mL (10,000 mcg/mL)
      const mcgPerMin = dose * weight;
      rateMLHr = (mcgPerMin * 60) / 10000;
    } else if (drug === 'dobutamine') {
      // Dose in mcg/kg/min; Standard 500 mg in 250 mL (2000 mcg/mL)
      const mcgPerMin = dose * weight;
      rateMLHr = (mcgPerMin * 60) / 2000;
    }

    drugResultRate.textContent = `${rateMLHr.toFixed(1)} mL/hr`;
  }

  if (drugSelect) drugSelect.addEventListener('change', calculateDrugRate);
  if (drugWeight) drugWeight.addEventListener('input', calculateDrugRate);
  if (drugDose) drugDose.addEventListener('input', calculateDrugRate);
  calculateDrugRate();

  // Audio Alarm Sound Toggle
  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      audioMuted = !audioMuted;
      ecgMonitor.toggleAudio(!audioMuted);
      btnToggleAudio.innerHTML = audioMuted ? 
        `<i class="fas fa-volume-mute"></i> Audio Muted` : 
        `<i class="fas fa-volume-up" style="color:#10b981;"></i> QRS Beep On`;
      showToast(audioMuted ? "Telemetry QRS Audio Muted" : "Telemetry QRS Audio Beep Activated 🔊");
    });
  }

  // Lead Buttons
  leadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      leadBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const leadName = btn.getAttribute('data-lead');
      if (ecgMonitor) ecgMonitor.setLead(leadName);
      if (readLead) readLead.textContent = leadName;
      showToast(`Switched ECG Monitor to ${leadName}`);
    });
  });

  // Modal Control
  if (btnAdmitModal) btnAdmitModal.addEventListener('click', () => modalAdmit.classList.add('open'));
  if (btnSimulateShift) btnSimulateShift.addEventListener('click', () => modalSimulate.classList.add('open'));

  closeModals.forEach(b => {
    b.addEventListener('click', () => {
      modalAdmit.classList.remove('open');
      modalSimulate.classList.remove('open');
    });
  });

  // Handle Admit Form
  if (formAdmit) {
    formAdmit.addEventListener('submit', (e) => {
      e.preventDefault();
      const pName = document.getElementById('admit-name').value;
      const pAge = document.getElementById('admit-age').value;
      const pGender = document.getElementById('admit-gender').value;
      const pDiag = document.getElementById('admit-diag').value;

      const newId = bedsData.length + 1;
      const newBed = {
        id: newId,
        name: `Bed 0${newId} — ${pDiag}`,
        patient: `${pName} (${pGender}/${pAge})`,
        hr: 75, spo2: 98, bp: "120/80", rr: 16, temp: 36.8,
        arrhythmia: "NSR", lead: "Lead II"
      };

      bedsData.push(newBed);
      modalAdmit.classList.remove('open');
      loadBed(newId);
      showToast(`Admitted New Patient: ${pName} to Bed 0${newId}! 🎉`);
    });
  }

  // Handle Shift Simulation Form
  if (formSimulate) {
    formSimulate.addEventListener('submit', (e) => {
      e.preventDefault();
      const current = bedsData.find(b => b.id === activeBedId);
      if (current) {
        current.hr = parseInt(document.getElementById('sim-hr').value) || current.hr;
        current.spo2 = parseInt(document.getElementById('sim-spo2').value) || current.spo2;
        current.arrhythmia = document.getElementById('sim-arrhythmia').value;
        loadBed(activeBedId);
        modalSimulate.classList.remove('open');
        showToast(`Simulated Vital Shift for ${current.name}! ⚡`);
      }
    });
  }

  // Toast Alerts
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-heartbeat" style="color:#10b981;"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Export EMR Telemetry Summary
  if (btnExportEmr) {
    btnExportEmr.addEventListener('click', () => {
      const currentBed = bedsData.find(b => b.id === activeBedId);
      const score = calculateNEWS2(currentBed);

      const emrSummary = `
=================================================================
SYNAPSE-MED ICU CLINICAL TELEMETRY AUDIT REPORT
Hospital: Addis Ababa University Medical Center — ICU Tower B
Timestamp: ${new Date().toLocaleString()}
=================================================================
Bed Station   : ${currentBed.name}
Patient Info  : ${currentBed.patient}

VITAL SIGNS TELEMETRY:
-----------------------------------------------------------------
• Heart Rate (HR)         : ${currentBed.hr} BPM (${currentBed.arrhythmia})
• Blood Oxygen (SpO2)     : ${currentBed.spo2} %
• Blood Pressure (NIBP)   : ${currentBed.bp} mmHg
• Respiration Rate (RR)   : ${currentBed.rr} /min
• Body Temperature        : ${currentBed.temp} °C

CLINICAL EARLY WARNING RISK EVALUATION (NEWS2):
-----------------------------------------------------------------
• NEWS2 Score             : ${score}
• Risk Stratification     : ${score >= 5 ? 'HIGH RISK' : 'LOW-MEDIUM RISK'}
• ECG Lead Monitored      : ${currentBed.lead}

PHARMACOLOGICAL DRUG INFUSION SUMMARY:
-----------------------------------------------------------------
• Norepinephrine Titration Rate: ${drugResultRate ? drugResultRate.textContent : '0 mL/hr'}

Attending Physician Sign-Off: ___________________________________
=================================================================
      `;

      const blob = new Blob([emrSummary], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SYNAPSE_EMR_Bed_${activeBedId}_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Generated & Downloaded EMR Medical Telemetry Report 📄");
    });
  }

  if (btnDispatchAmbulance) {
    btnDispatchAmbulance.addEventListener('click', () => {
      showToast("🚀 Emergency Telemetry Dispatch Relay Initiated! Unit Alpha-1 En Route.");
    });
  }

  // Initial Load Bed 1
  loadBed(1);
});
