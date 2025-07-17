const db = firebase.firestore();

function generateAccountNumber() {
  const prefix = "FIH1435";
  const suffix = Math.floor(100000 + Math.random() * 900000).toString();
  return prefix + suffix;
}

function generateReference() {
  return "RF" + Math.floor(100000000 + Math.random() * 900000000);
}

function login() {
  const userId = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;

  db.collection("users").doc(userId).get().then(doc => {
    if (doc.exists && doc.data().pin === pin) {
      localStorage.setItem("currentUserId", userId);
      showMainUI(userId);
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
    investment: {},
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

function showMainUI(userId) {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("main-section").style.display = "block";
  document.getElementById("welcome-text").innerText = `Tervetuloa ${userId}`;

  loadBalance();
  loadUserInvoices();
  if (userId === "011100") {
    document.getElementById("admin-tools").style.display = "block";
    assignMissingAccountNumbers();
    loadLoanRequests();
  } else {
    document.getElementById("admin-tools").style.display = "none";
  }
}

function loadBalance() {
  const userId = localStorage.getItem("currentUserId");
  db.collection("users").doc(userId).get().then(doc => {
    const data = doc.data();
    document.getElementById("balance-display").innerText = `Saldo: ${data.balance} €`;
    document.getElementById("account-number-display").innerText = `Tilinumero: ${data.accountNumber}`;
  });
}

function createInvoice() {
  const targetUserId = document.getElementById("invoice-user-id").value;
  const amount = parseFloat(document.getElementById("invoice-amount").value);
  const reference = generateReference();

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
      }
    });
  });
}

function sendMoney() {
  const fromUserId = localStorage.getItem("currentUserId");
  const toUserId = document.getElementById("send-to").value;
  const amount = parseFloat(document.getElementById("send-amount").value);

  const fromRef = db.collection("users").doc(fromUserId);
  const toRef = db.collection("users").doc(toUserId);

  db.runTransaction(async (t) => {
    const fromDoc = await t.get(fromRef);
    const toDoc = await t.get(toRef);

    if (!toDoc.exists) {
      alert("Vastaanottajaa ei löydy.");
      return;
    }

    const fromBalance = fromDoc.data().balance;
    const toBalance = toDoc.data().balance;

    if (fromBalance < amount) {
      alert("Ei riittävästi varoja.");
      return;
    }

    t.update(fromRef, { balance: fromBalance - amount });
    t.update(toRef, { balance: toBalance + amount });

    alert("Rahat lähetetty!");
    loadBalance();
  });
}

function addMoney() {
  const userId = document.getElementById("topup-user-id").value;
  const amount = parseFloat(document.getElementById("topup-amount").value);

  const ref = db.collection("users").doc(userId);
  ref.get().then(doc => {
    if (!doc.exists) return alert("Käyttäjää ei löydy.");
    const balance = doc.data().balance;
    ref.update({ balance: balance + amount }).then(() => {
      alert("Rahat lisätty.");
    });
  });
}

function invest() {
  const userId = localStorage.getItem("currentUserId");
  const target = document.getElementById("investment-target").value;
  const amount = parseFloat(document.getElementById("investment-amount").value);
  const ref = db.collection("users").doc(userId);

  db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    if (data.balance < amount) {
      alert("Ei riittävästi varoja.");
      return;
    }
    const currentInvestment = data.investment || {};
    currentInvestment[target] = (currentInvestment[target] || 0) + amount;

    t.update(ref, {
      balance: data.balance - amount,
      investment: currentInvestment
    });

    alert("Sijoitus tehty.");
    loadBalance();
  });
}

function redeemInvestment() {
  const userId = localStorage.getItem("currentUserId");
  const target = document.getElementById("investment-target").value;
  const ref = db.collection("users").doc(userId);

  db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    const amount = data.investment?.[target] || 0;

    if (amount <= 0) {
      alert("Ei sijoitusta tässä kohteessa.");
      return;
    }

    const updatedInvestment = { ...data.investment };
    delete updatedInvestment[target];

    t.update(ref, {
      balance: data.balance + amount,
      investment: updatedInvestment
    });

    alert("Sijoitus lunastettu.");
    loadBalance();
  });
}

function onInvestmentTargetChange() {
  const target = document.getElementById("investment-target").value;
  document.getElementById("chart-placeholder").innerText = `[Käyrä: ${target}]`;
}

function requestLoan() {
  const userId = localStorage.getItem("currentUserId");
  const amount = parseFloat(document.getElementById("loan-amount").value);
  db.collection("loanRequests").add({
    userId,
    amount,
    approved: false,
    created: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Lainapyyntö lähetetty.");
  });
}

function loadLoanRequests() {
  const list = document.getElementById("loan-requests-list");
  list.innerHTML = "";

  db.collection("loanRequests").where("approved", "==", false).get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.innerText = `${data.userId}: ${data.amount} € `;
      const approveBtn = document.createElement("button");
      approveBtn.innerText = "Hyväksy";
      approveBtn.onclick = () => approveLoan(doc.id, data.userId, data.amount);
      li.appendChild(approveBtn);
      list.appendChild(li);
    });
  });
}

function approveLoan(requestId, userId, amount) {
  const ref = db.collection("users").doc(userId);
  db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    t.update(ref, {
      balance: data.balance + amount,
      loan: (data.loan || 0) + amount
    });
    t.update(db.collection("loanRequests").doc(requestId), {
      approved: true,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Laina hyväksytty.");
  });
}

window.login = login;
window.signup = signup;
window.logout = logout;
window.createInvoice = createInvoice;
window.sendMoney = sendMoney;
window.addMoney = addMoney;
window.invest = invest;
window.redeemInvestment = redeemInvestment;
window.onInvestmentTargetChange = onInvestmentTargetChange;
window.requestLoan = requestLoan;

window.onload = () => {
  const userId = localStorage.getItem("currentUserId");
  if (userId) showMainUI(userId);
};
