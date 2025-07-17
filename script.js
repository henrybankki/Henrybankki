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

      if (userId === "011100") {
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
    document.getElementById("balance-display").innerText = `Saldo: ${data.balance.toFixed(2)} €`;
    document.getElementById("account-number-display").innerText = `Tilinumero: ${data.accountNumber || "ei saatavilla"}`;
  });
}

function sendMoney() {
  const senderId = localStorage.getItem("currentUserId");
  const receiverId = document.getElementById("sendReceiverId").value.trim();
  const amount = parseFloat(document.getElementById("sendAmount").value);

  if (!receiverId || isNaN(amount) || amount <= 0) {
    alert("Täytä vastaanottajan käyttäjätunnus ja kelvollinen summa.");
    return;
  }
  if (receiverId === senderId) {
    alert("Et voi lähettää rahaa itsellesi.");
    return;
  }

  const senderRef = db.collection("users").doc(senderId);
  const receiverRef = db.collection("users").doc(receiverId);

  receiverRef.get().then(doc => {
    if (!doc.exists) {
      alert("Vastaanottajaa ei löytynyt.");
      return;
    }

    db.runTransaction(async (transaction) => {
      const senderDoc = await transaction.get(senderRef);
      const senderBalance = senderDoc.data().balance || 0;

      if (senderBalance < amount) {
        throw "Saldo ei riitä.";
      }

      transaction.update(senderRef, { balance: senderBalance - amount });

      const receiverBalance = doc.data().balance || 0;
      transaction.update(receiverRef, { balance: receiverBalance + amount });
    }).then(() => {
      alert("Raha lähetetty onnistuneesti!");
      loadBalance();
    }).catch(err => alert("Virhe siirrossa: " + err));
  });
}

function createInvoice() {
  const targetUserId = document.getElementById("invoice-user-id").value.trim();
  const amount = parseFloat(document.getElementById("invoice-amount").value);
  const reference = "RF" + Math.floor(100000000 + Math.random() * 900000000); // yksinkertainen viite

  if (!targetUserId || isNaN(amount) || amount <= 0) {
    alert("Täytä laskun tiedot oikein.");
    return;
  }

  db.collection("invoices").add({
    userId: targetUserId,
    amount,
    paid: false,
    reference,
    created: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Lasku luotu!");
    loadUserInvoices();
  });
}

function loadUserInvoices() {
  const userId = localStorage.getItem("currentUserId");
  const list = document.getElementById("invoice-list");
  list.innerHTML = "";

  db.collection("invoices")
    .where("userId", "==", userId)
    .where("paid", "==", false)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        list.innerHTML = "<li>Ei avoimia laskuja</li>";
        return;
      }
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerText = `Lasku ${data.amount.toFixed(2)} €, Viite: ${data.reference}`;

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
  const invoiceRef = db.collection("invoices").doc(invoiceId);

  db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (!userDoc.exists || !invoiceDoc.exists) {
      throw "Tiedot eivät ole saatavilla.";
    }

    const balance = userDoc.data().balance || 0;
    if (balance < amount) {
      alert("Ei riittävästi varoja.");
      return;
    }

    transaction.update(userRef, { balance: balance - amount });
    transaction.update(invoiceRef, {
      paid: true,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(() => {
    alert("Lasku maksettu!");
    loadBalance();
    loadUserInvoices();
  }).catch(err => {
    alert("Virhe maksussa: " + err);
  });
}

function addMoney() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (currentUserId !== "011100") {
    alert("Vain admin voi lisätä rahaa.");
    return;
  }

  const targetUserId = document.getElementById("add-money-user-id").value.trim();
  const amount = parseFloat(document.getElementById("add-money-amount").value);

  if (!targetUserId || isNaN(amount) || amount <= 0) {
    alert("Täytä tiedot oikein.");
    return;
  }

  const userRef = db.collection("users").doc(targetUserId);

  userRef.get().then(doc => {
    if (!doc.exists) {
      alert("Käyttäjää ei löytynyt.");
      return;
    }
    const currentBalance = doc.data().balance || 0;
    userRef.update({ balance: currentBalance + amount }).then(() => {
      alert(`Lisättiin ${amount.toFixed(2)} € käyttäjälle ${targetUserId}.`);
    });
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
    login();
  }
};

// Käyttäjä pyytää lainaa
function requestLoan() {
  const userId = localStorage.getItem("currentUserId");
  if (!userId) {
    alert("Kirjaudu ensin sisään.");
    return;
  }

  const amount = parseFloat(document.getElementById("loanAmount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Anna kelvollinen lainan summa.");
    return;
  }

  const userRef = db.collection("users").doc(userId);

  userRef.get().then(doc => {
    if (!doc.exists) {
      alert("Käyttäjää ei löytynyt.");
      return;
    }

    const data = doc.data();
    if (data.loanRequested) {
      alert("Sinulla on jo aktiivinen lainapyyntö.");
      return;
    }

    userRef.update({
      loanRequested: true,
      loanAmount: amount
    }).then(() => {
      alert("Lainapyyntö lähetetty. Odota hyväksyntää.");
      document.getElementById("loanAmount").value = "";
    });
  });
}

// Admin lataa lainapyyntöjä
function loadLoanRequests() {
  const userId = localStorage.getItem("currentUserId");
  if (userId !== "011100") return; // vain admin

  document.getElementById("loan-requests").style.display = "block";

  db.collection("users").where("loanRequested", "==", true).onSnapshot(snapshot => {
    const container = document.getElementById("loan-requests-list");
    container.innerHTML = "";

    snapshot.forEach(doc => {
      const id = doc.id;
      const data = doc.data();
      const amount = data.loanAmount;

      const div = document.createElement("div");
      div.innerHTML = `
        Käyttäjä <strong>${id}</strong> pyytää lainaa: ${amount} €
        <button onclick="approveLoan('${id}', ${amount})">Hyväksy</button>
        <button onclick="rejectLoan('${id}')">Hylkää</button>
      `;
      container.appendChild(div);
    });
  });
}

// Admin hyväksyy lainan
function approveLoan(userId, amount) {
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 2); // lainan eräpäivä 2kk päästä

  const userRef = db.collection("users").doc(userId);

  userRef.update({
    loan: amount,
    loanRequested: false,
    loanAmount: 0,
    loanDueDate: dueDate.toISOString(),
    balance: firebase.firestore.FieldValue.increment(amount)
  }).then(() => {
    alert(`Laina ${amount} € hyväksytty käyttäjälle ${userId}.`);
  });
}

// Admin hylkää lainan
function rejectLoan(userId) {
  const userRef = db.collection("users").doc(userId);

  userRef.update({
    loanRequested: false,
    loanAmount: 0
  }).then(() => {
    alert(`Lainapyyntö hylätty käyttäjältä ${userId}.`);
  });
}

// Kutsu adminin latausfunktio kirjautumisen yhteydessä
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

      if (userId === "011100") {
        document.getElementById("admin-tools").style.display = "block";
        loadLoanRequests(); // Lataa lainapyyntöjä adminille
        assignMissingAccountNumbers();
      } else {
        document.getElementById("admin-tools").style.display = "none";
        document.getElementById("loan-requests").style.display = "none";
      }
    } else {
      alert("Virheellinen käyttäjätunnus tai PIN");
    }
  });
}

// Lisäksi kutsu tätä ikkunan latauduttua (jos haluat automaattisen kirjautumisen)
// window.onload = () => {
//   const userId = localStorage.getItem("currentUserId");
//   if (userId) {
//     login();
//   }
// };

