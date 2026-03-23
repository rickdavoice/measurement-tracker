// --- Firebase ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Variables ---
let currentDate = new Date().toISOString().slice(0,10);

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
    loadHistory();
    renderGraph();
    alert("Saved!");
  } catch(e) {
    console.error("Save failed:", e);
  }
}

// --- Load History ---
async function loadHistory() {
  const snapshot = await db.collection("measurements").orderBy("date","desc").get();
  const docs = snapshot.docs.map(doc => doc.data());

  historyContainer.innerHTML = docs.map(d => `
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
  `).join('');
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

// --- Init ---
loadHistory();
renderGraph();
