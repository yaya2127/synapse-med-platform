/* ==========================================================================
   SYNAPSE-Med — Physical Bedside Console Orchestrator & Alarm Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Hardware Oscilloscope Canvas Engine
  const ecgMonitor = new ECGMonitor('ecg-canvas', 'pleth-canvas');

  // ICU Bed Datasets
  let bedsData = [
    { id: 1, name: "BED 01 — POST-OP CARDIAC", patient: "BEKELE T. (M/62)", hr: 74, spo2: 98, bp: "120/80", rr: 16, temp: 36.8, arrhythmia: "NSR", lead: "Lead II" },
    { id: 2, name: "BED 02 — TELEMETRY WATCH", patient: "SARA M. (F/48)", hr: 82, spo2: 97, bp: "128/84", rr: 18, temp: 37.1, arrhythmia: "NSR", lead: "Lead II" },
    { id: 3, name: "BED 03 — ACUTE STEMI ALERT", patient: "YONAS A. (M/55)", hr: 118, spo2: 91, bp: "95/60", rr: 26, temp: 38.4, arrhythmia: "STEMI", lead: "Lead V5" },
    { id: 4, name: "BED 04 — SEPTIC SHOCK WATCH", patient: "TIGIST G. (F/71)", hr: 132, spo2: 88, bp: "85/50", rr: 30, temp: 39.2, arrhythmia: "AFIB", lead: "Lead II" },
    { id: 5, name: "BED 05 — RESPIRATORY BAY", patient: "DAWIT K. (M/39)", hr: 68, spo2: 99, bp: "116/76", rr: 14, temp: 36.6, arrhythmia: "NSR", lead: "Lead I" },
    { id: 6, name: "BED 06 — POST-CABG REHAB", patient: "ABEBE B. (M/67)", hr: 76, spo2: 96, bp: "124/78", rr: 15, temp: 36.9, arrhythmia: "NSR", lead: "Lead II" },
    { id: 7, name: "BED 07 — STABLE TELEMETRY", patient: "HELEN F. (F/52)", hr: 71, spo2: 98, bp: "118/75", rr: 16, temp: 36.7, arrhythmia: "NSR", lead: "Lead II" },
    { id: 8, name: "BED 08 — TRAUMA ICU BAY", patient: "KIRUBEL H. (M/29)", hr: 145, spo2: 93, bp: "102/64", rr: 24, temp: 37.8, arrhythmia: "VTACH", lead: "Lead II" }
  ];

  let activeBedId = 1;
  let audioMuted = true;

  // DOM Elements
  const valHr = document.getElementById('val-hr');
  const valSpo2 = document.getElementById('val-spo2');
  const valBp = document.getElementById('val-bp');
  const valRr = document.getElementById('val-rr');
  const valTemp = document.getElementById('val-temp');

  const blockHr = document.getElementById('block-hr');
  const blockSpo2 = document.getElementById('block-spo2');

  const ribbonBedName = document.getElementById('ribbon-bed-name');
  const ribbonPatient = document.getElementById('ribbon-patient');
  const readLead = document.getElementById('read-lead');

  const bedChipGrid = document.getElementById('bed-chip-grid');
  const btnSilenceAlarm = document.getElementById('btn-silence-alarm');
  const btnNibpStart = document.getElementById('btn-nibp-start');
  const btnPrintStrip = document.getElementById('btn-print-strip');
  const btnSpeedToggle = document.getElementById('btn-speed-toggle');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const btnAdmitModal = document.getElementById('btn-admit-modal');
  const btnDrugModal = document.getElementById('btn-drug-modal');

  const modalAdmit = document.getElementById('modal-admit');
  const modalDrug = document.getElementById('modal-drug');
  const formAdmit = document.getElementById('form-admit');
  const closeModals = document.querySelectorAll('.modal-close');
  const toastContainer = document.getElementById('toast-container');

  // Drug Calc
  const drugSelect = document.getElementById('drug-select');
  const drugWeight = document.getElementById('drug-weight');
  const drugDose = document.getElementById('drug-dose');
  const drugResultRate = document.getElementById('drug-result-rate');

  // Load Active Bed
  function loadBed(bedId) {
    activeBedId = bedId;
    const bed = bedsData.find(b => b.id === bedId);
    if (!bed) return;

    if (ribbonBedName) ribbonBedName.textContent = bed.name;
    if (ribbonPatient) ribbonPatient.textContent = bed.patient;
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

    // Alarm Limit Highlighting
    if (blockHr) {
      if (bed.hr > 120 || bed.hr < 50 || bed.arrhythmia !== 'NSR') {
        blockHr.classList.add('alarm-trigger');
      } else {
        blockHr.classList.remove('alarm-trigger');
      }
    }
    if (blockSpo2) {
      if (bed.spo2 < 92) blockSpo2.classList.add('alarm-trigger');
      else blockSpo2.classList.remove('alarm-trigger');
    }

    renderBedGrid();
  }

  // Render ICU Bed Matrix Chips
  function renderBedGrid() {
    if (!bedChipGrid) return;
    bedChipGrid.innerHTML = '';

    bedsData.forEach(bed => {
      const chip = document.createElement('div');
      chip.className = `bed-chip ${bed.id === activeBedId ? 'active' : ''}`;
      chip.textContent = `BED 0${bed.id}`;
      chip.addEventListener('click', () => {
        loadBed(bed.id);
        showToast(`Loaded Telemetry Feed for ${bed.name}`);
      });
      bedChipGrid.appendChild(chip);
    });
  }

  // Drug Titrator
  function calculateDrugRate() {
    if (!drugResultRate || !drugSelect || !drugWeight || !drugDose) return;
    const drug = drugSelect.value;
    const weight = parseFloat(drugWeight.value) || 70;
    const dose = parseFloat(drugDose.value) || 0.05;
    let rateMLHr = 0;

    if (drug === 'norepinephrine') rateMLHr = (dose * weight * 60) / 16;
    else if (drug === 'amiodarone') rateMLHr = (dose * 60) / 1.8;
    else if (drug === 'propofol') rateMLHr = (dose * weight * 60) / 10000;
    else if (drug === 'dobutamine') rateMLHr = (dose * weight * 60) / 2000;

    drugResultRate.textContent = `${rateMLHr.toFixed(1)} mL/hr`;
  }

  if (drugSelect) drugSelect.addEventListener('change', calculateDrugRate);
  if (drugWeight) drugWeight.addEventListener('input', calculateDrugRate);
  if (drugDose) drugDose.addEventListener('input', calculateDrugRate);
  calculateDrugRate();

  // Rocker Control Buttons
  if (btnSilenceAlarm) {
    btnSilenceAlarm.addEventListener('click', () => {
      showToast("🔇 Alarms Paused for 2 Minutes (Clinical Protocol)");
    });
  }

  if (btnNibpStart) {
    btnNibpStart.addEventListener('click', () => {
      showToast("🩺 NIBP Cuff Inflating... Measuring Arterial Blood Pressure");
      setTimeout(() => {
        const current = bedsData.find(b => b.id === activeBedId);
        if (current && valBp) valBp.textContent = current.bp;
        showToast(`🩺 NIBP Cycle Complete: ${current.bp} mmHg`);
      }, 2500);
    });
  }

  if (btnPrintStrip) {
    btnPrintStrip.addEventListener('click', () => {
      showToast("🖨️ Printing 25mm/s Thermal Telemetry ECG Strip...");
    });
  }

  let currentSpeed = 2.5;
  if (btnSpeedToggle) {
    btnSpeedToggle.addEventListener('click', () => {
      if (currentSpeed === 2.5) {
        currentSpeed = 5.0;
        btnSpeedToggle.innerHTML = `<i class="fas fa-running"></i> SPEED: 50mm/s`;
      } else {
        currentSpeed = 2.5;
        btnSpeedToggle.innerHTML = `<i class="fas fa-tachometer-alt"></i> SPEED: 25mm/s`;
      }
      ecgMonitor.setSpeed(currentSpeed);
      showToast(`Oscilloscope Sweep Speed Set to ${currentSpeed === 2.5 ? '25 mm/s' : '50 mm/s'}`);
    });
  }

  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      audioMuted = !audioMuted;
      ecgMonitor.toggleAudio(!audioMuted);
      btnToggleAudio.innerHTML = audioMuted ? `<i class="fas fa-volume-mute"></i> AUDIO MUTED` : `<i class="fas fa-volume-up" style="color:#00e676;"></i> QRS BEEP ON`;
      showToast(audioMuted ? "QRS Pulse Audio Muted" : "QRS Pulse Audio Beep Activated 🔊");
    });
  }

  // Modals
  if (btnAdmitModal) btnAdmitModal.addEventListener('click', () => modalAdmit.classList.add('open'));
  if (btnDrugModal) btnDrugModal.addEventListener('click', () => modalDrug.classList.add('open'));

  closeModals.forEach(b => {
    b.addEventListener('click', () => {
      modalAdmit.classList.remove('open');
      modalDrug.classList.remove('open');
    });
  });

  if (formAdmit) {
    formAdmit.addEventListener('submit', (e) => {
      e.preventDefault();
      const pName = document.getElementById('admit-name').value;
      const pAge = document.getElementById('admit-age').value;
      const pGender = document.getElementById('admit-gender').value;
      const pDiag = document.getElementById('admit-diag').value;

      const newId = bedsData.length + 1;
      bedsData.push({
        id: newId,
        name: `BED 0${newId} — ${pDiag.toUpperCase()}`,
        patient: `${pName.toUpperCase()} (${pGender}/${pAge})`,
        hr: 75, spo2: 98, bp: "120/80", rr: 16, temp: 36.8, arrhythmia: "NSR", lead: "Lead II"
      });

      modalAdmit.classList.remove('open');
      loadBed(newId);
      showToast(`Admitted Patient: ${pName} to Bed 0${newId}! 🎉`);
    });
  }

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-heartbeat" style="color:#00e676;"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Initial Load
  loadBed(1);
});
