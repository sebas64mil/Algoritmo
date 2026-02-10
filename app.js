// =====================
// 1) Datos base
// =====================

const videojuegos = [
  "Minecraft",
  "Grand Theft Auto V",
  "The Legend of Zelda: Breath of the Wild",
  "Fortnite",
  "Call of Duty: Warzone",
  "League of Legends",
  "The Witcher 3",
  "Red Dead Redemption 2",
  "Elden Ring",
  "FIFA 24"
];

const segmentos = {
  "C": "Jugador casual",
  "H": "Jugador hardcore",
  "M": "Multiplayer / competitivo",
  "S": "Single player / historia"
};

const contextos = {
  "D": "¿Cuál es más divertido?",
  "H": "¿Cuál tiene mejor historia?",
  "M": "¿Cuál es mejor para jugar con amigos?",
  "C": "¿Cuál es más competitivo?"
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 2) Estado
// =====================

const STORAGE_KEY = "gamemash_state_v1";

function defaultState(){
  const buckets = {};
  for (const s of Object.keys(segmentos)){
    for (const c of Object.keys(contextos)){
      const key = `${s}__${c}`;
      buckets[key] = {};
      videojuegos.forEach(v => buckets[key][v] = RATING_INICIAL);
    }
  }
  return { buckets };
}

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// =====================
// 3) Elo
// =====================

function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, a, b, winner){
  const ra = bucket[a];
  const rb = bucket[b];

  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  bucket[a] = ra + K * ((winner === "A" ? 1 : 0) - ea);
  bucket[b] = rb + K * ((winner === "B" ? 1 : 0) - eb);
}

// =====================
// 4) Utilidades
// =====================

function randomPair(){
  const a = videojuegos[Math.floor(Math.random() * videojuegos.length)];
  let b = a;
  while (b === a){
    b = videojuegos[Math.floor(Math.random() * videojuegos.length)];
  }
  return [a, b];
}

function bucketKey(s, c){ return `${s}__${c}`; }

function topN(bucket, n=10){
  return Object.entries(bucket)
    .map(([j, r]) => ({j, r}))
    .sort((x,y) => y.r - x.r)
    .slice(0,n);
}

// =====================
// 5) UI
// =====================

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const topBox = document.getElementById("topBox");

let currentA, currentB;

function fillSelect(el, obj){
  el.innerHTML = "";
  for (const k in obj){
    const o = document.createElement("option");
    o.value = k;
    o.textContent = obj[k];
    el.appendChild(o);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  questionEl.textContent = contextos[contextSelect.value];
}

function vote(w){
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  updateElo(state.buckets[key], currentA, currentB, w);
  saveState();
  renderTop();
  newDuel();
}

function renderTop(){
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  const rows = topN(state.buckets[key]);
  topBox.innerHTML = rows.map((r,i)=>`
    <div class="toprow">
      <div><b>${i+1}.</b> ${r.j}</div>
      <div>${r.r.toFixed(1)}</div>
    </div>
  `).join("");
}

document.getElementById("btnA").onclick = ()=>vote("A");
document.getElementById("btnB").onclick = ()=>vote("B");
document.getElementById("btnNewPair").onclick = newDuel;
document.getElementById("btnShowTop").onclick = renderTop;
document.getElementById("btnReset").onclick = ()=>{
  state = defaultState();
  saveState();
  newDuel();
  renderTop();
};

document.getElementById("btnExport").onclick = () => {
  let csv = "Tipo de Jugador,Criterio,Juego,Puntuacion\n";
  
  for(const key in state.buckets){
    const [segment, context] = key.split("__");
    const segName = segmentos[segment] || segment;
    const ctxName = contextos[context] || context;
    
    const rows = topN(state.buckets[key], 100);
    rows.forEach((r) => {
      const gameName = String(r.j).replaceAll('"', '""');
      csv += `"${segName}","${ctxName}","${gameName}",${r.r.toFixed(1)}\n`;
    });
  }
  
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "gamemash_export_"+new Date().getTime()+".csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


newDuel();
renderTop();
