// Firebase init (firebase-config.js sisältää asetukset)
const db = firebase.firestore();

// ==== Kirjautuminen ====
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
      loadInvestmentTargets(); // Käynnistää sijoituskohteet ja graafin
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}

function signup() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  const accountNumber = "FI" + Math.floor(1000000000 + Math.random() * 9000000000);

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

// ==== Saldo ====
function loadBalance() {
  const userId = localStorage.getItem("currentUserId");
  db.collection("users").doc(userId).get().then(doc => {
    const data = doc.data();
    document.getElementById("balance-display").innerText = `Saldo: ${data.balance} €`;
    document.getElementById("account-number-display").innerText = `Tilinumero: ${data.accountNumber}`;
  });
}

// ==== Sijoitukset ====
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
let autoUpdateInterval = null;

async function loadInvestmentGraph(symbol) {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  let labels = [];
  let prices = [];

  try {
    if (cryptoMap[symbol]) {
      const id = cryptoMap[symbol];
      const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=30`;
      const res = await fetch(url);
      const data = await res.json();
      labels = data.prices.map(p => new Date(p[0]).toLocaleDateString("fi-FI", { day: "2-digit", month: "short" }));
      prices = data.prices.map(p => p[1]);
    } else if (stockMap[symbol]) {
      const ticker = stockMap[symbol];
      const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`;
      const res = await fetch(url);
      const json = await res.json();
      const result = json.chart.result[0];
      const timestamps = result.timestamp;
      const closePrices = result.indicators.quote[0].close;
      labels = timestamps.map(ts => new Date(ts * 1000).toLocaleDateString("fi-FI", { day: "2-digit", month: "short" }));
      prices = closePrices;
    }

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
      options: { responsive: true }
    });
  } catch (err) {
    console.error("Virhe ladattaessa dataa:", err);
  }
}

function onInvestmentTargetChange() {
  const symbol = document.getElementById("investment-target").value;
  startAutoUpdate(symbol);
}

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
  startAutoUpdate(targets[0].id);
}

function startAutoUpdate(symbol) {
  if (autoUpdateInterval) clearInterval(autoUpdateInterval);
  loadInvestmentGraph(symbol);
  autoUpdateInterval = setInterval(() => loadInvestmentGraph(symbol), 10000);
}
