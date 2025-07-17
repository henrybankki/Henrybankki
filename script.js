
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

// Poistetaan vanha loadInvestmentGraph ja käytetään vain tätä API-versiota

async function loadInvestmentGraph(symbol) {
  currentSymbol = symbol;
  const ctx = document.getElementById("investmentChart").getContext("2d");

  let labels = [], prices = [];

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
      labels = result.timestamp.map(ts => new Date(ts * 1000).toLocaleDateString("fi-FI", { day: "2-digit", month: "short" }));
      prices = result.indicators.quote[0].close;
    }

    if (investmentChart) investmentChart.destroy();
    investmentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
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

// 🔹 Uudet funktiot
async function invest() {
  const userId = localStorage.getItem("currentUserId");
  const amount = parseFloat(document.getElementById("investment-amount").value);
  if (!amount || amount <= 0) return alert("Anna oikea summa");

  const docRef = db.collection("users").doc(userId);
  const docSnap = await docRef.get();
  const data = docSnap.data();

  if (data.balance < amount) return alert("Ei tarpeeksi saldoa");

  // Vähennä saldo
  await docRef.update({
    balance: data.balance - amount,
    investment: {
      symbol: currentSymbol,
      amount: (data.investment?.amount || 0) + amount
    }
  });

  alert(`Sijoitettu ${amount} € kohteeseen ${currentSymbol}`);
  loadBalance();
}

async function redeemInvestment() {
  const userId = localStorage.getItem("currentUserId");
  const docRef = db.collection("users").doc(userId);
  const docSnap = await docRef.get();
  const data = docSnap.data();

  if (!data.investment || data.investment.amount <= 0) return alert("Ei sijoituksia lunastettavaksi");

  const redeemed = data.investment.amount;
  await docRef.update({
    balance: data.balance + redeemed,
    investment: firebase.firestore.FieldValue.delete()
  });

  alert(`Lunastettu ${redeemed} €`);
  loadBalance();
}
