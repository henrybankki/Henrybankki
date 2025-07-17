let db, auth, currentUserId = "", chart;

window.onload = () => {
  // Jos firebase-config.js ei sisällä initApp, tee se täällä (poista jos on jo init)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig); // oletetaan, että firebaseConfig on firebase-config.js:ssa
  }

  db = firebase.firestore();
  auth = firebase.auth();

  setInterval(updateInvestmentValue, 5000);
  setInterval(fetchInvestmentChart, 5000);
};

function login() {
  const id = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value;

  if (!id || !pin) return alert("Täytä kaikki kentät.");

  auth.signInWithEmailAndPassword(`${id}@henrybankki.fi`, pin)
    .then(() => {
      currentUserId = id;
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("main-section").style.display = "block";
      document.getElementById("welcome-user").innerText = id;
      loadUserData(id);
      loadTransferHistory(id);

      if (id === "011100") {
        document.getElementById("admin-tools").style.display = "block";
        loadLoanRequests();
      }
    })
    .catch(e => alert("Kirjautuminen epäonnistui: " + e.message));

  function assignMissingAccountNumbers() {
  db.collection("users").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.accountNumber) {
        const accountNumber = generateAccountNumber();
        db.collection("users").doc(doc.id).update({ accountNumber });
        console.log("Lisätty tilinumero käyttäjälle", doc.id);
      }
    });
  });
}


  
  function signup() {
  const id = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value;

  if (!id || !pin) return alert("Täytä kaikki kentät.");

  const accountNumber = generateAccountNumber();

  auth.createUserWithEmailAndPassword(`${id}@henrybankki.fi`, pin)
    .then(() =>
      db.collection("users").doc(id).set({
        balance: 100,
        loan: 0,
        loanRequested: false,
        investment: 0,
        investmentValue: 0,
        accountNumber
      })
    )
    .then(() => alert("Tili luotu! Tilinumero: " + accountNumber))
    .catch(e => alert("Tiliä ei voitu luoda: " + e.message));
}

function generateAccountNumber() {
  const randomSix = Math.floor(100000 + Math.random() * 900000);
  return `FIH1435${randomSix}`;
}


function loadUserData(id) {
  db.collection("users").doc(id).onSnapshot(doc => {
    const data = doc.data() || {};

    document.getElementById("balance").innerText = (data.balance || 0).toFixed(2);
    document.getElementById("loan-info").innerText =
      data.loan > 0 ? `${data.loan.toFixed(2)} €` : "Ei lainaa";
    document.getElementById("investment-value").innerText =
      (data.investmentValue || 0).toFixed(2);
  });
}

function sendMoney() {
  const receiverAccount = document.getElementById("receiverId").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);

  if (!receiverAccount || isNaN(amount) || amount <= 0) {
    return alert("Anna tilinumero ja summa.");
  }

  const senderRef = db.collection("users").doc(currentUserId);

  db.collection("users").where("accountNumber", "==", receiverAccount)
    .get().then(snapshot => {
      if (snapshot.empty) return alert("Vastaanottajaa ei löytynyt.");
      const receiverDoc = snapshot.docs[0];
      const receiverRef = receiverDoc.ref;

      db.runTransaction(async tx => {
        const sender = await tx.get(senderRef);
        const balance = sender.data().balance;

        if (balance < amount) throw new Error("Ei tarpeeksi saldoa");

        tx.update(senderRef, { balance: balance - amount });
        tx.update(receiverRef, {
          balance: firebase.firestore.FieldValue.increment(amount)
        });
      }).then(() => alert("Rahat lähetetty!"))
        .catch(e => alert("Virhe: " + e.message));
    });
}


function logout() {
  auth.signOut().then(() => {
    currentUserId = "";
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
    document.getElementById("admin-tools").style.display = "none";
  });
}

function addMoney() {
  const targetId = document.getElementById("targetId").value.trim();
  const amount = parseFloat(document.getElementById("amountToAdd").value);

  if (!targetId || isNaN(amount) || amount <= 0) {
    return alert("Anna kelvollinen käyttäjä ja summa.");
  }

  const userRef = db.collection("users").doc(targetId);
  userRef.get().then(doc => {
    const balance = doc.exists ? doc.data().balance : 0;
    userRef.set({ balance: balance + amount }, { merge: true });
    alert(`Lisättiin ${amount} € käyttäjälle ${targetId}`);
  });
}

// Lainapyyntöfunktiot eri summille
function requestLoan1() {
  requestLoanWithAmount(5);
}
function requestLoan() {
  requestLoanWithAmount(100);
}
function requestLoan2() {
  requestLoanWithAmount(20);
}
function requestLoan3() {
  requestLoanWithAmount(50);
}
function requestLoanWithAmount(amount) {
  const ref = db.collection("users").doc(currentUserId);
  ref.get().then(doc => {
    const data = doc.data() || {};
    if (data.loan > 0 || data.loanRequested) {
      return alert("Sinulla on jo laina tai pyyntö.");
    }
    ref.update({ loanRequested: true, loanAmount: amount });
    alert("Lainapyyntö lähetetty!");
  });
}

function loadLoanRequests() {
  db.collection("users").where("loanRequested", "==", true)
    .onSnapshot(snapshot => {
      const container = document.getElementById("loan-requests");
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const id = doc.id;
        const amount = doc.data().loanAmount;
        const div = document.createElement("div");
        div.innerHTML = `Käyttäjä ${id} pyytää ${amount}€ 
          <button onclick="approveLoan('${id}', ${amount})">Hyväksy</button>`;
        container.appendChild(div);
      });
    });
}

function approveLoan(id, amount) {
  const due = new Date();
  due.setMonth(due.getMonth() + 2);

  db.collection("users").doc(id).update({
    loan: amount,
    loanRequested: false,
    loanDueDate: due.toISOString(),
    balance: firebase.firestore.FieldValue.increment(amount)
  });

  alert("Laina hyväksytty!");
}

function repayLoan() {
  const ref = db.collection("users").doc(currentUserId);
  ref.get().then(doc => {
    const d = doc.data() || {};
    if (!d.loan || d.loan <= 0) {
      return alert("Ei lainaa maksettavana.");
    }

    let repay = d.loan;
    if (d.loanDueDate && new Date() > new Date(d.loanDueDate)) repay *= 1.15;

    if (d.balance >= repay) {
      ref.update({
        balance: d.balance - repay,
        loan: 0,
        loanDueDate: null
      });
      alert("Laina maksettu!");
    } else {
      alert("Ei tarpeeksi saldoa.");
    }
  });
}

function invest() {
  const amount = parseFloat(document.getElementById("investAmount").value);
  if (isNaN(amount) || amount <= 0) {
    return alert("Anna sijoitussumma.");
  }

  const ref = db.collection("users").doc(currentUserId);
  ref.get().then(doc => {
    const d = doc.data() || {};
    if (d.balance >= amount) {
      ref.update({
        balance: d.balance - amount,
        investment: (d.investment || 0) + amount,
        investmentValue: (d.investmentValue || 0) + amount
      });
      alert("Sijoitus tehty!");
    } else {
      alert("Ei tarpeeksi saldoa.");
    }
  });
}

function redeemInvestment() {
  const ref = db.collection("users").doc(currentUserId);
  ref.get().then(doc => {
    const d = doc.data() || {};
    const value = d.investmentValue || 0;
    if (value > 0) {
      ref.update({
        balance: d.balance + value,
        investment: 0,
        investmentValue: 0
      });
      alert(`Sijoitus lunastettu! Sait ${value.toFixed(2)} €`);
    } else {
      alert("Ei lunastettavaa sijoitusta.");
    }
  });
}

function updateInvestmentValue() {
  if (!currentUserId) return;

  const ref = db.collection("users").doc(currentUserId);
  ref.get().then(doc => {
    const d = doc.data() || {};
    if (!d.investmentValue || d.investmentValue <= 0) return;

    const change = 1 + (Math.random() * 0.2 - 0.1); // ±10%
    const newValue = Math.max(0, d.investmentValue * change);

    ref.update({ investmentValue: newValue });
    db.collection("kurssit").add({
      arvo: newValue,
      timestamp: firebase.firestore.Timestamp.now()
    });
  });
}

function fetchInvestmentChart() {
  db.collection("kurssit")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      const data = [];
      snapshot.forEach(doc => data.unshift(doc.data().arvo));
      renderChart(data);
    });
}

function renderChart(data) {
  const ctx = document.getElementById("investmentChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((_, i) => `T${i + 1}`),
      datasets: [{
        label: 'Sijoituksen arvo',
        data,
        borderColor: 'green',
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function loadTransferHistory(id) {
  const ul = document.getElementById("transferHistory");
  ul.innerHTML = "";

  db.collection("users").doc(id)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const li = document.createElement("li");
        li.textContent = `${d.type} ${d.amount}€ ${d.to || d.from || "-"}`;
        ul.appendChild(li);
      });
    });
      }












  function createInvoice() {
  const targetId = document.getElementById("invoice-target-id").value.trim();
  const amount = parseFloat(document.getElementById("invoice-amount").value);
  if (!targetId || isNaN(amount) || amount <= 0) return alert("Täytä kentät oikein.");

  const ref = db.collection("invoices").doc();
  const reference = "RF" + Math.floor(100000000 + Math.random() * 900000000); // yksinkertainen viitenumero

  ref.set({
    userId: targetId,
    amount,
    paid: false,
    reference,
    created: firebase.firestore.Timestamp.now()
  }).then(() => alert("Lasku luotu viitteellä: " + reference));
}

let selectedInvoiceId = null;

function loadUserInvoices() {
  const ul = document.getElementById("invoiceList");
  ul.innerHTML = "";

  db.collection("invoices")
    .where("userId", "==", currentUserId)
    .where("paid", "==", false)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const li = document.createElement("li");
        li.textContent = `${d.amount} € – Viite: ${d.reference}`;
        li.onclick = () => {
          selectedInvoiceId = doc.id;
          alert("Lasku valittu");
        };
        ul.appendChild(li);
      });
    });
}

function payInvoice() {
  if (!selectedInvoiceId) return alert("Valitse lasku ensin.");

  const invoiceRef = db.collection("invoices").doc(selectedInvoiceId);
  const userRef = db.collection("users").doc(currentUserId);

  db.runTransaction(async tx => {
    const invoiceDoc = await tx.get(invoiceRef);
    const userDoc = await tx.get(userRef);
    const data = invoiceDoc.data();
    if (!data || data.paid) throw new Error("Lasku ei kelpaa.");

    const balance = userDoc.data().balance;
    if (balance < data.amount) throw new Error("Saldo ei riitä.");

    tx.update(userRef, { balance: balance - data.amount });
    tx.update(invoiceRef, { paid: true, paidAt: firebase.firestore.Timestamp.now() });

    selectedInvoiceId = null;
  })
    .then(() => alert("Lasku maksettu!"))
    .catch(err => alert("Virhe maksussa: " + err.message));
}
