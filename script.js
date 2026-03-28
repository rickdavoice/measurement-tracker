// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyD0pX1qDgrE9PfXJugJPxByJr12Fikm3C0",
  authDomain: "measurement-tracker-ba16e.firebaseapp.com",
  projectId: "measurement-tracker-ba16e",
  storageBucket: "measurement-tracker-ba16e.firebasestorage.app",
  messagingSenderId: "730850323255",
  appId: "1:730850323255:web:7f6a081b4d4595a5d708b2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Variables ---
function getLocalYYYYMMDD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

let currentDate = getLocalYYYYMMDD();
let calendarMonth = new Date().getMonth(); // 0-11
let calendarYear = new Date().getFullYear();

// --- DOM ---
const todayDateEl = document.getElementById("todayDate");
const historyContainer = document.getElementById("historyContainer");
todayDateEl.textContent = new Date().toLocaleDateString();

// --- Utility to parse fractions ---
function parseFraction(input) {
  if(!input) return null;
  input = input.trim();
  if(input.includes(' ')){
    const [whole, frac] = input.split(' ');
    const [num, denom] = frac.split('/');
    return parseFloat(whole) + parseFloat(num)/parseFloat(denom);
  } else if(input.includes('/')){
    const [num, denom] = input.split('/');
    return parseFloat(num)/parseFloat(denom);
  } else return parseFloat(input);
}

// --- Save Measurement ---
async function saveMeasurement() {
  const measurement = {
    date: currentDate,
    weight: parseFraction(document.getElementById("weight").value),
    forearms: parseFraction(document.getElementById("forearms").value),
    arms: parseFraction(document.getElementById("arms").value),
    chest: parseFraction(document.getElementById("chest").value),
    shoulders: parseFraction(document.getElementById("shoulders").value),
    waist: parseFraction(document.getElementById("waist").value),
    butt: parseFraction(document.getElementById("butt").value),
    createdAt: new Date()
  };

  try {
    await db.collection("measurements").add(measurement);

loadHistory(currentDate);   // form fields
loadLatestHistory();        // 🔥 THIS WAS MISSING
renderGraph();
renderCalendar();
    alert("Saved!");
  } catch(e) {
    console.error("Save failed:", e);
  }
}

// --- Load History ---
async function loadHistory(filterDate = null) {
  const snapshot = await db.collection("measurements").orderBy("date","desc").get();
  const docs = snapshot.docs.map(doc => doc.data());

  const filteredDocs = filterDate 
    ? docs.filter(d => d.date.trim() === filterDate) 
    : docs;

  // --- FORM FIELDS (selected date only) ---
  if(filteredDocs.length > 0){
    const selectedData = filteredDocs[0];

    ["weight","forearms","arms","chest","shoulders","waist","butt"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = selectedData[id] ?? '';
    });
  } else {
    ["weight","forearms","arms","chest","shoulders","waist","butt"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
  }

  
}
async function loadLatestHistory() {
  const snapshot = await db.collection("measurements")
    .orderBy("date","desc")
    .limit(1)
    .get();

  if(snapshot.empty){
    historyContainer.innerHTML = '<p>No measurements yet.</p>';
    return;
  }

  const d = snapshot.docs[0].data();

  historyContainer.innerHTML = `
    <div class="history-day">
      <div class="history-row"><strong>${d.date}</strong></div>
      <div class="history-row">Weight: ${d.weight} lbs</div>
      <div class="history-row">Forearms: ${d.forearms}"</div>
      <div class="history-row">Arms: ${d.arms}"</div>
      <div class="history-row">Chest: ${d.chest}"</div>
      <div class="history-row">Shoulders: ${d.shoulders}"</div>
      <div class="history-row">Waist: ${d.waist}"</div>
      <div class="history-row">Butt: ${d.butt}"</div>
    </div>
  `;
}


// --- Graph ---
async function renderGraph() {
  const snapshot = await db.collection("measurements").orderBy("date").get();
  const docs = snapshot.docs.map(doc => doc.data());

  const labels = docs.map(d => d.date);
  const dataSets = ["weight","forearms","arms","chest","shoulders","waist","butt"].map((key,i) => ({
    label: key,
    data: docs.map(d => d[key]),
    borderColor: ["#6c3483","#2ecc71","#3498db","#e67e22","#e74c3c","#f1c40f","#9b59b6"][i],
    backgroundColor: "transparent",
    tension: 0.2
  }));

  const ctx = document.getElementById("measurementChart").getContext("2d");
  if(window.chartInstance) window.chartInstance.destroy();

  window.chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: dataSets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

// --- Calendar ---
async function renderCalendar() {
  const fullCalendar = document.getElementById('fullCalendar');

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

  // Fetch measurement dates to show dots
  const snapshot = await db.collection("measurements").get();
  const measurementDates = snapshot.docs.map(doc => doc.data().date.trim());

  // Header with month navigation
  let html = `
    <div class="full-calendar-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <button class="cal-nav" id="prevMonth">←</button>
      <div>${firstDay.toLocaleString('default', { month: 'long' })} ${calendarYear}</div>
      <button class="cal-nav" id="nextMonth">→</button>
    </div>
    <div class="full-calendar-grid">
  `;

  const weekdays = ['S','M','T','W','T','F','S'];
  weekdays.forEach(d => {
    html += `<div class="full-calendar-day" style="font-weight:bold;background:#181a1b;">${d}</div>`;
  });

  for (let i = 0; i < startDay; i++) html += `<div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === getLocalYYYYMMDD();
    const isSelected = dateStr === currentDate;
    const hasData = measurementDates.includes(dateStr);

    html += `
      <div class="full-calendar-day" data-date="${dateStr}" 
           style="position:relative;
                  ${isToday || isSelected ? 'background:#6c3483;color:white;border-radius:6px;' : ''}">
        <p style="margin:0;padding:0;text-align:center;">${d}</p>
        ${hasData ? '<div style="width:6px;height:6px;background:#2ecc71;border-radius:50%;position:absolute;top:4px;right:1px;transform:translateX(-50%)"></div>' : ''}
      </div>
    `;
  }

  html += `</div>`;
  fullCalendar.innerHTML = html;

  // Month navigation
  document.getElementById('prevMonth').onclick = () => {
    calendarMonth--;
    if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; }
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = () => {
    calendarMonth++;
    if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; }
    renderCalendar();
  };

  // Click day to set currentDate
  fullCalendar.querySelectorAll('.full-calendar-day[data-date]').forEach(el => {
    el.onclick = () => {
      currentDate = el.dataset.date;
      const [year, month, day] = currentDate.split('-').map(Number);
const localDate = new Date(year, month - 1, day);

todayDateEl.textContent = localDate.toLocaleDateString();
      document.getElementById('calendarModal').style.display = 'none';

      loadHistory(currentDate);
      renderGraph();
      renderCalendar(); // re-render to update selected highlight
    };
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const calendarBtn = document.getElementById('calendarBtn');
  const calendarModal = document.getElementById('calendarModal');
  const closeCalendarModal = document.getElementById('closeCalendarModal');

  if (calendarBtn && calendarModal) {
    calendarBtn.onclick = () => {
      calendarModal.style.display = 'flex';
      renderCalendar();
    };
  }

  if (closeCalendarModal) {
    closeCalendarModal.onclick = () => {
      calendarModal.style.display = 'none';
    };
  }

  loadHistory(currentDate);     // form fields
  loadLatestHistory();          // history section
  renderGraph();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.error('Service Worker registration failed:', err));
}