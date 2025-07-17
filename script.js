// Firebase init (firebase-config.js pitää olla mukana!)
const db = firebase.firestore();

// Admin-tunnukset
const ADMIN_USER = "011100";
const ADMIN_PIN = "143000";

// ========== Kirjautuminen ==========
async function login() {
  const userId = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value.trim();

  if (!userId || !pin) {
    alert("Täytä tunnus ja PIN.");
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      alert("Käyttäjää ei löytynyt.");
      return;
    }

    const data = userDoc.data();
    if (data.pin !== pin) {
      alert("Virheellinen PIN.");
      return;
    }

    // Kirjautuminen onnistui
    localStorage.setItem("currentUserId", userId);
    localStorage.setItem("currentUserIsAdmin", data.isAdmin ? "1" : "0");

    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-section").style.display = "block";
    document.getElementById("welcome-text").innerText = `Tervetuloa ${userId}`;
    
    await loadBalance();
    toggleAdminTools();
    loadInvestmentTargets();
    loadInvoices();
    loadLoanRequests();

  } catch (err) {
    console.error(err);
    alert("Virhe kirjautumisessa: " + err.message);
  }
}

// Luo tili
async function signup() {
  const userId = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value.trim();

  if (!userId || !pin) {
    alert("Täytä tunnus ja PIN.");
    return;
  }

  const accountNumber = "FI" + Math.floor(1000000000 + Math.random() * 9000000000);
  const isAdmin = (userId === ADMIN_USER && pin === ADMIN_PIN);

  try {
    await db.collection("users").doc(userId).set({
      pin,
      balance: 100,
      accountNumber,
      isAdmin
    });
    alert("Tili luotu!");
  } catch (err) {
    console.error(err);
    alert("Virhe tilin luonnissa: " + err.message);
  }
}

// Kirjaudu ulos
function logout() {
  localStorage.removeItem("currentUserId");
  localStorage.removeItem("currentUserIsAdmin");
  document.getElementById("main-section").style.display = "none";
  document.getElementById("auth-section").style.display = "block";
}

// ========== Näytä/piilota admin-työkalut ==========
function toggleAdminTools() {
  const isAdmin = localStorage.getItem("currentUserIsAdmin") === "1";
  document.getElementById("admin-tools").style.display = isAdmin ? "block" : "none";
}

// ========== Lataa saldo ==========
async function loadBalance() {
  const userId = localStorage.getItem("currentUserId");
  const snap = await db.collection("users").doc(userId).get();
  if (snap.exists) {
    const data = snap.data();
    document.getElementById("balance-display").innerText = `Saldo: ${data.balance.toFixed(2)} €`;
    document.getElementById("account-number-display").innerText = `IBAN: ${data.accountNumber}`;
  }
}

// ========== Rahansiirto IBAN:lla ==========
async function sendMoney() {
  const senderId = localStorage.getItem("currentUserId");
  const amount = parseFloat(document.getElementById("send-amount").value);
  const iban = document.getElementById("send-iban").value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert("Anna kelvollinen summa.");
    return;
  }
  if (!iban.startsWith("FI") || iban.length < 10) {
    alert("Virheellinen IBAN.");
    return;
  }

  try {
    const senderRef = db.collection("users").doc(senderId);
    const receiverSnap = await db.collection("users").where("accountNumber", "==", iban).get();
    if (receiverSnap.empty) {
      alert("Vastaanottajaa ei löytynyt.");
      return;
    }
    const receiverRef = receiverSnap.docs[0].ref;

    await db.runTransaction(async (tx) => {
      const senderDoc = await tx.get(senderRef);
      if (!senderDoc.exists) throw new Error("Lähettäjää ei löydy");
      const senderBal = senderDoc.data().balance;
      if (senderBal < amount) throw new Error("Ei tarpeeksi rahaa.");

      const receiverDoc = await tx.get(receiverRef);
      if (!receiverDoc.exists) throw new Error("Vastaanottajaa ei löydy");

      tx.update(senderRef, { balance: senderBal - amount });
      tx.update(receiverRef, { balance: (receiverDoc.data().balance || 0) + amount });
    });

    alert(`Lähetetty ${amount} € tilille ${iban}.`);
    loadBalance();
    document.getElementById("send-amount").value = "";
    document.getElementById("send-iban").value = "";
  } catch (err) {
    console.error(err);
    alert("Virhe siirrossa: " + err.message);
  }
}

// ========== Admin: Lisää rahaa ==========
async function addMoney() {
  const isAdmin = localStorage.getItem("currentUserIsAdmin") === "1";
  if (!isAdmin) {
    alert("Ei oikeuksia.");
    return;
  }

  const targetId = document.getElementById("target-user-id").value.trim();
  const amount = parseFloat(document.getElementById("add-money-amount").value);

  if (!targetId || isNaN(amount) || amount <= 0) {
    alert("Virheellinen syöte.");
    return;
  }

  try {
    const targetRef = db.collection("users").doc(targetId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(targetRef);
      if (!snap.exists) throw new Error("Käyttäjää ei löytynyt");
      const newBal = (snap.data().balance || 0) + amount;
      tx.update(targetRef, { balance: newBal });
    });
    alert(`Lisätty ${amount} € käyttäjälle ${targetId}.`);
    document.getElementById("add-money-amount").value = "";
  } catch (err) {
    console.error(err);
    alert("Virhe lisättäessä rahaa: " + err.message);
  }
}

// ========== Sijoitukset ==========
let chart;
function loadInvestmentTargets() {
  const select = document.getElementById("investment-target");
  select.innerHTML = `
    <option value="osakkeet">Osakkeet</option>
    <option value="rahasto">Rahasto</option>
    <option value="krypto">Kryptot</option>
  `;
  startInvestmentChart();
}

function startInvestmentChart() {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [{
        label: 'Arvon kehitys',
        data: [100, 102, 105, 103, 108],
        borderColor: 'blue'
      }]
    }
  });
}

function invest() {
  alert("Sijoitus tehty (simuloitu).");
}

function redeemInvestment() {
  alert("Sijoitus lunastettu (simuloitu).");
}

// ========== Laskut (simppeli placeholder) ==========
function loadInvoices() {
  document.getElementById("invoice-list").innerHTML = "<li>Ei laskuja</li>";
}

// ========== Lainapyynnöt (simppeli placeholder) ==========
function loadLoanRequests() {
  document.getElementById("loan-requests").innerHTML = "<li>Ei lainapyyntöjä</li>";
}

function requestLoan() {
  alert("Lainapyyntö lähetetty (simuloitu).");
}
