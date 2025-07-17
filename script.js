
// Firebase init on tehty erillisessä tiedostossa
const db = firebase.firestore();

// Lisää JavaScript-toiminnot tänne (esim. login, signup jne.)
function login() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;

  db.collection("users").doc(userId).get().then(doc => {
    if (doc.exists && doc.data().pin === pin) {
      localStorage.setItem("currentUserId", userId);
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("main-section").style.display = "block";
      document.getElementById("welcome-text").innerText = `Tervetuloa ${userId}`;
      loadBalance();
      loadInvestmentGraph(); // <-- LISÄTTY
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}


function signup() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  const accountNumber = "FIH1435" + Math.floor(100000 + Math.random() * 900000);
  db.collection("users").doc(userId).set({
    pin,
    balance: 100,
    accountNumber
  }).then(() => {
    alert("Tili luotu!");
  });
}

function logout() {
  localStorage.removeItem("currentUserId");
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("main-section").style.display = "none";
}

function loadBalance() {
  const userId = localStorage.getItem("currentUserId");
  db.collection("users").doc(userId).get().then(doc => {
    const data = doc.data();
    document.getElementById("balance-display").innerText = `Saldo: ${data.balance} €`;
    document.getElementById("account-number-display").innerText = `Tilinumero: ${data.accountNumber}`;
  });
}

let investmentChart;

function loadInvestmentGraph() {
  const ctx = document.getElementById('investmentChart').getContext('2d');

  // Simuloidaan sijoitusten arvon kehitystä
  const labels = ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä'];
  const data = [100, 110, 105, 120, 125, 140];

  if (investmentChart) {
    investmentChart.destroy(); // tuhoaa vanhan jos on
  }

  investmentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sijoituksen arvo (€)',
        data: data,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}


const cryptoMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple"
};

const stockMap = {
  NOKIA: "NOKIA.HE",
  KONE: "KNEBV.HE",
  FORTUM: "FORTUM.HE",
  SAMPO: "SAMPO.HE",
  NESTE: "NESTE.HE"
};

let investmentChart = null;
let currentSymbol = null;
let autoUpdateInterval = null;

// Lataa ja piirtää graafin
async function loadInvestmentGraph(symbol) {
  currentSymbol = symbol; // Päivitetään valittu kohde
  const ctx = document.getElementById("investmentChart").getContext("2d");

  let labels = [];
  let prices = [];

  try {
    if (cryptoMap[symbol]) {
      // CoinGecko API (krypto)
      const id = cryptoMap[symbol];
      const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=30`;
      const res = await fetch(url);
      const data = await res.json();
      labels = data.prices.map(p => {
        const date = new Date(p[0]);
        return date.toLocaleDateString("fi-FI", { day: "2-digit", month: "short" });
      });
      prices = data.prices.map(p => p[1]);
    } else if (stockMap[symbol]) {
      // Yahoo Finance API + CORS proxy
      const ticker = stockMap[symbol];
      const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`;
      const res = await fetch(url);
      const json = await res.json();
      const result = json.chart.result[0];
      const timestamps = result.timestamp;
      const closePrices = result.indicators.quote[0].close;

      labels = timestamps.map(ts => {
        const date = new Date(ts * 1000);
        return date.toLocaleDateString("fi-FI", { day: "2-digit", month: "short" });
      });
      prices = closePrices;
    } else {
      console.warn("Tuntematon symboli:", symbol);
      return;
    }

    // Piirretään Chart.js
    if (investmentChart) investmentChart.destroy();
    investmentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: symbol,
          data: prices,
          borderColor: "blue",
          backgroundColor: "rgba(0,0,255,0.1)",
          fill: true
        }]
      },
      options: {
        responsive: true,
        animation: false, // nopeampi päivitys
        scales: {
          y: { beginAtZero: false }
        }
      }
    });

  } catch (err) {
    console.error("Virhe ladattaessa dataa:", err);
  }
}

// Kun valitaan uusi sijoituskohde
function onInvestmentTargetChange() {
  const symbol = document.getElementById("investment-target").value;
  startAutoUpdate(symbol);
}

// Lataa sijoituskohdelista
function loadInvestmentTargets() {
  const targets = [
    { id: "BTC", name: "Bitcoin" },
    { id: "ETH", name: "Ethereum" },
    { id: "BNB", name: "Binance Coin" },
    { id: "SOL", name: "Solana" },
    { id: "XRP", name: "Ripple" },
    { id: "NOKIA", name: "Nokia Oyj" },
    { id: "KONE", name: "KONE Oyj" },
    { id: "FORTUM", name: "Fortum Oyj" },
    { id: "SAMPO", name: "Sampo Oyj" },
    { id: "NESTE", name: "Neste Oyj" }
  ];
  const sel = document.getElementById("investment-target");
  sel.innerHTML = "";
  targets.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });

  // Käynnistä päivitys ensimmäiselle kohteelle
  startAutoUpdate(targets[0].id);
}

// Aloita automaattinen päivitys
function startAutoUpdate(symbol) {
  if (autoUpdateInterval) clearInterval(autoUpdateInterval);
  loadInvestmentGraph(symbol);
  autoUpdateInterval = setInterval(() => {
    loadInvestmentGraph(symbol);
  }, 5000); // päivitys 5 sek välein
}

