function startAutoUpdate(symbol) {
  if (autoUpdateInterval) clearInterval(autoUpdateInterval);
  loadInvestmentGraph(symbol);
  autoUpdateInterval = setInterval(() => {
    loadInvestmentGraph(symbol);
  }, 10000); // päivitys 10 s välein
}



// Firebase Firestore
const db = firebase.firestore();

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

// ---------- LOGIN JA KÄYTTÄJÄ ----------
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
      loadInvestmentTargets(); // <-- Käynnistä sijoitukset
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

// ---------- SIJOITUS ----------
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

function startAutoUpdate(symbol) {
  if (autoUpdateInterval) clearInterval(autoUpdateInterval);
  loadInvestmentGraph(symbol);
  autoUpdateInterval = setInterval(() => {
    loadInvestmentGraph(symbol);
  }, 10000); // päivitys 10 sek välein
}

// ---------- SIJOITA JA LUNASTA ----------
async function invest() {
  const userId = localStorage.getItem("currentUserId");
  const amount = parseFloat(document.getElementById("investment-amount").value);
  if (!amount || amount <= 0) return alert("Anna oikea summa");

  const docRef = db.collection("users").doc(userId);
  const docSnap = await docRef.get();
  const data = docSnap.data();

  if (data.balance < amount) return alert("Ei tarpeeksi saldoa");

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

vasync function sendMoney() {
  const senderId = localStorage.getItem("currentUserId");
  const iban = document.getElementById("transfer-iban").value.trim().toUpperCase();
  const amount = parseFloat(document.getElementById("transfer-amount").value);

  // IBAN-validointi
  if (!/^FIH[A-Z0-9]{6,}$/i.test(iban)) {
    alert("Virheellinen IBAN-muoto (esim. FI1435123456)");
    return;
  }

  if (!iban || isNaN(amount) || amount <= 0) {
    alert("Anna oikeat tiedot");
    return;
  }

  const senderRef = db.collection("users").doc(senderId);

  try {
    // Hae vastaanottajan käyttäjä IBANin perusteella
    const querySnapshot = await db.collection("users").where("accountNumber", "==", iban).get();

    if (querySnapshot.empty) {
      alert("Tilinumeroa ei löytynyt");
      return;
    }

    const receiverDoc = querySnapshot.docs[0];
    const receiverId = receiverDoc.id;

    if (receiverId === senderId) {
      alert("Et voi lähettää rahaa omalle tilillesi");
      return;
    }

    const receiverRef = db.collection("users").doc(receiverId);

    await db.runTransaction(async (transaction) => {
      const senderSnap = await transaction.get(senderRef);
      const receiverSnap = await transaction.get(receiverRef);

      if (!senderSnap.exists) throw "Lähettäjän tiliä ei löytynyt";
      if (!receiverSnap.exists) throw "Vastaanottajan tiliä ei löytynyt";

      const senderData = senderSnap.data();
      const receiverData = receiverSnap.data();

      if (senderData.balance < amount) throw "Ei tarpeeksi saldoa";

      transaction.update(senderRef, { balance: senderData.balance - amount });
      transaction.update(receiverRef, { balance: (receiverData.balance || 0) + amount });
    });

    alert(`Lähetetty ${amount} € tilille ${iban}`);
    loadBalance();
    document.getElementById("transfer-iban").value = "";
    document.getElementById("transfer-amount").value = "";
  } catch (error) {
    alert("Virhe: " + error);
    console.error(error);
  }
}
