// Firebase Firestore
const db = firebase.firestore();

let investmentChart = null;
let currentSymbol = null;
let autoUpdateInterval = null;

// 🔐 Login
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
      loadInvestmentTargets();
      loadTransferHistory();
      loadInvoices();
      if (userId === "011100" && pin === "143000") {
        document.getElementById("admin-tools").style.display = "block";
      }
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}

// 🔐 Signup
function signup() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  const accountNumber = "FI" + Math.floor(10000000000 + Math.random() * 90000000000);

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

// ✅ Rahansiirto IBAN:lla
async function sendMoney() {
  const fromUser = localStorage.getItem("currentUserId");
  const amount = parseFloat(document.getElementById("send-amount").value);
  const targetIban = document.getElementById("send-iban").value;

  if (!amount || amount <= 0 || !targetIban) {
    alert("Anna summa ja IBAN");
    return;
  }

  const fromDoc = await db.collection("users").doc(fromUser).get();
  const fromData = fromDoc.data();

  if (fromData.balance < amount) {
    alert("Ei tarpeeksi saldoa");
    return;
  }

  const toQuery = await db.collection("users").where("accountNumber", "==", targetIban).get();
  if (toQuery.empty) {
    alert("Vastaanottajaa ei löytynyt");
    return;
  }

  const toDoc = toQuery.docs[0];
  const toUserId = toDoc.id;
  const toData = toDoc.data();

  await db.collection("users").doc(fromUser).update({ balance: fromData.balance - amount });
  await db.collection("users").doc(toUserId).update({ balance: toData.balance + amount });

  // Tallenna historia
  await db.collection("transfers").add({
    from: fromData.accountNumber,
    to: targetIban,
    amount,
    date: new Date().toISOString()
  });

  alert("Siirto onnistui!");
  loadBalance();
  loadTransferHistory();
}

// ✅ Näytä siirtohistoria
function loadTransferHistory() {
  const userId = localStorage.getItem("currentUserId");

  db.collection("users").doc(userId).get().then(doc => {
    const accountNumber = doc.data().accountNumber;

    db.collection("transfers")
      .where("from", "==", accountNumber)
      .get()
      .then(snapshot => {
        let html = "<h3>Siirtohistoria</h3><ul>";
        snapshot.forEach(doc => {
          const data = doc.data();
          html += `<li>Lähetetty ${data.amount} € → ${data.to} (${new Date(data.date).toLocaleString()})</li>`;
        });
        html += "</ul>";
        document.getElementById("main-section").insertAdjacentHTML("beforeend", html);
      });
  });
}

// ✅ Laskujen lataus
function loadInvoices() {
  const userId = localStorage.getItem("currentUserId");
  db.collection("invoices").where("userId", "==", userId).get().then(snapshot => {
    const list = document.getElementById("invoice-list");
    list.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `Lasku: ${data.amount} €`;
      list.appendChild(li);
    });
  });
}

// ✅ Luo lasku (admin)
function createInvoice() {
  const userId = document.getElementById("invoice-user-id").value;
  const amount = parseFloat(document.getElementById("invoice-amount").value);
  if (!userId || !amount) {
    alert("Anna käyttäjä ja summa");
    return;
  }
  db.collection("invoices").add({ userId, amount });
  alert("Lasku luotu");
}

// ✅ Lisää rahaa (admin)
function addMoney() {
  const userId = document.getElementById("target-user-id").value;
  const amount = parseFloat(document.getElementById("add-money-amount").value);
  if (!userId || !amount) {
    alert("Anna käyttäjä ja summa");
    return;
  }
  db.collection("users").doc(userId).get().then(doc => {
    if (!doc.exists) {
      alert("Käyttäjää ei löydy");
      return;
    }
    const currentBalance = doc.data().balance;
    db.collection("users").doc(userId).update({ balance: currentBalance + amount });
    alert("Rahaa lisätty");
  });
}

// ✅ Sijoitukset (CoinGecko + Yahoo Finance)
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

function onInvestmentTargetChange() {
  const symbol = document.getElementById("investment-target").value;
  startAutoUpdate(symbol);
}

function startAutoUpdate(symbol) {
  if (autoUpdateInterval) clearInterval(autoUpdateInterval);
  loadInvestmentGraph(symbol);
  autoUpdateInterval = setInterval(() => {
    loadInvestmentGraph(symbol);
  }, 5000);
}

async function loadInvestmentGraph(symbol) {
  currentSymbol = symbol;
  const ctx = document.getElementById("investmentChart").getContext("2d");

  let labels = [];
  let prices = [];

  try {
    if (cryptoMap[symbol]) {
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
      }
    });
  } catch (err) {
    console.error("Virhe ladattaessa dataa:", err);
  }
}
