const db = firebase.firestore();

function generateAccountNumber() {
  const prefix = "FIH1435";
  const suffix = Math.floor(100000 + Math.random() * 900000).toString();
  return prefix + suffix;
}

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
      loadUserInvoices();

      const currentUserId = localStorage.getItem("currentUserId");
      if (currentUserId === "011100") {
        document.getElementById("admin-tools").style.display = "block";
        assignMissingAccountNumbers();
      }
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}

function signup() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;

  const accountNumber = generateAccountNumber();

  db.collection("users").doc(userId).set({
    pin,
    balance: 100,
    loan: 0,
    investment: 0,
    investmentValue: 0,
    loanRequested: false,
    accountNumber
  }).then(() => {
    alert("Tili luotu onnistuneesti.");
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
    document.getElementById("account-number-display").innerText = `Tilinumero: ${data.accountNumber || "ei saatavilla"}`;
  });
}

function createInvoice() {
  const targetUserId = document.getElementById("invoice-user-id").value;
  const amount = parseFloat(document.getElementById("invoice-amount").value);
  const reference = "RF" + Math.floor(100000000 + Math.random() * 900000000); // yksinkertainen viite

  db.collection("invoices").add({
    userId: targetUserId,
    amount,
    paid: false,
    reference,
    created: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Lasku luotu!");
  });
}

function loadUserInvoices() {
  const userId = localStorage.getItem("currentUserId");
  const list = document.getElementById("invoice-list");
  list.innerHTML = "";

  db.collection("invoices").where("userId", "==", userId).where("paid", "==", false).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerText = `Lasku ${data.amount} €, Viite: ${data.reference}`;
        const payBtn = document.createElement("button");
        payBtn.innerText = "Maksa lasku";
        payBtn.onclick = () => payInvoice(doc.id, data.amount);
        li.appendChild(payBtn);
        list.appendChild(li);
      });
    });
}

function payInvoice(invoiceId, amount) {
  const userId = localStorage.getItem("currentUserId");
  const userRef = db.collection("users").doc(userId);

  db.runTransaction(async (t) => {
    const userDoc = await t.get(userRef);
    const balance = userDoc.data().balance;

    if (balance < amount) {
      alert("Ei riittävästi varoja.");
      return;
    }

    t.update(userRef, { balance: balance - amount });
    t.update(db.collection("invoices").doc(invoiceId), {
      paid: true,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Lasku maksettu!");
    loadBalance();
    loadUserInvoices();
  });
}

function assignMissingAccountNumbers() {
  db.collection("users").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.accountNumber) {
        const newAccountNumber = generateAccountNumber();
        db.collection("users").doc(doc.id).update({ accountNumber: newAccountNumber });
        console.log(`Tilinumero lisätty käyttäjälle ${doc.id}: ${newAccountNumber}`);
      }
    });
  });
}

window.onload = () => {
  const userId = localStorage.getItem("currentUserId");
  if (userId) {
    login(); // automaattinen uudelleenkirjautuminen
  }
};
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
      loadUserInvoices();

      if (userId === "011100") { // Admin-tarkistus
        document.getElementById("admin-tools").style.display = "block";
        assignMissingAccountNumbers();
      } else {
        document.getElementById("admin-tools").style.display = "none";
      }
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}

// Rahan lisäys vain adminille
function addMoney() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (currentUserId !== "011100") {
    return alert("Toiminto sallittu vain adminille.");
  }

  const targetUserId = document.getElementById("add-money-user-id").value.trim();
  const amount = parseFloat(document.getElementById("add-money-amount").value);

  if (!targetUserId || isNaN(amount) || amount <= 0) {
    return alert("Anna kelvollinen käyttäjä ja summa.");
  }

  const userRef = db.collection("users").doc(targetUserId);
  userRef.get().then(doc => {
    if (!doc.exists) return alert("Käyttäjää ei löytynyt.");
    const currentBalance = doc.data().balance || 0;
    userRef.update({ balance: currentBalance + amount })
      .then(() => {
        alert(`Lisättiin ${amount} € käyttäjälle ${targetUserId}`);
      });
  });
}
