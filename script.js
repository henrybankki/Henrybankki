let db, auth, currentUserId = "";

window.onload = () => {
  db = firebase.firestore();
  auth = firebase.auth();
  setInterval(updateInvestmentValue, 5000); // sijoitus päivittyy automaattisesti
};

// KIRJAUTUMINEN
function login() {
  const id = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  auth.signInWithEmailAndPassword(id + "@henrybankki.fi", pin)
    .then(() => {
      currentUserId = id;
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("main-section").style.display = "block";
      document.getElementById("welcome-user").innerText = id;
      loadUserData(id);
      if (id === "011100") {
        document.getElementById("admin-tools").style.display = "block";
        loadLoanRequests();
      }
    })
    .catch(error => alert("Kirjautuminen epäonnistui: " + error.message));
}

// REKISTERÖITYMINEN
function signup() {
  const id = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  auth.createUserWithEmailAndPassword(id + "@henrybankki.fi", pin)
    .then(() => {
      db.collection("users").doc(id).set({
        balance: 100,
        loan: 0,
        loanRequested: false,
        investment: 0,
        investmentValue: 0
      });
      alert("Tili luotu!");
    })
    .catch(error => alert("Tiliä ei voitu luoda: " + error.message));
}

// KÄYTTÄJÄN TIEDOT
function loadUserData(id) {
  db.collection("users").doc(id).onSnapshot(doc => {
    const data = doc.data();
    document.getElementById("balance").innerText = data.balance.toFixed(2);
    document.getElementById("loan-info").innerText = data.loan > 0 ? data.loan.toFixed(2) + " €" : "Ei lainaa";
    document.getElementById("investment-value").innerText = data.investmentValue?.toFixed(2) ?? "0";
  });
}

// RAHAN LÄHETYS
function sendMoney() {
  const receiverId = document.getElementById("receiverId").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const senderRef = db.collection("users").doc(currentUserId);
  const receiverRef = db.collection("users").doc(receiverId);

  db.runTransaction(async (transaction) => {
    const senderDoc = await transaction.get(senderRef);
    const receiverDoc = await transaction.get(receiverRef);
    const senderBalance = senderDoc.data().balance;

    if (senderBalance < amount) throw "Ei tarpeeksi saldoa";
    transaction.update(senderRef, { balance: senderBalance - amount });
    transaction.update(receiverRef, {
      balance: (receiverDoc.exists ? receiverDoc.data().balance : 0) + amount
    });
  })
  .then(() => alert("Rahat lähetetty!"))
  .catch(err => alert("Virhe: " + err));
}

// ULOS
function logout() {
  auth.signOut().then(() => {
    currentUserId = "";
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
    document.getElementById("admin-tools").style.display = "none";
  });
}

// ADMIN: LISÄÄ RAHAA
function addMoney() {
  const targetId = document.getElementById("targetId").value;
  const amount = parseFloat(document.getElementById("amountToAdd").value);
  const userRef = db.collection("users").doc(targetId);

  userRef.get().then(doc => {
    const balance = doc.exists ? (doc.data().balance || 0) : 0;
    userRef.set({ balance: balance + amount }, { merge: true });
    alert("Lisättiin " + amount + " € käyttäjälle " + targetId);
  });
}

// PYYSI LAINAA
function requestLoan() {
  db.collection("users").doc(currentUserId).get().then(doc => {
    const data = doc.data();
    if (data.loan > 0 || data.loanRequested) {
      alert("Sinulla on jo laina tai pyyntö vireillä.");
    } else {
      db.collection("users").doc(currentUserId).update({
        loanRequested: true,
        loanAmount: 100
      });
      alert("Lainapyyntö lähetetty!");
    }
  });
}

// ADMIN: NÄYTÄ LAINAPYYNNÖT
function loadLoanRequests() {
  db.collection("users").where("loanRequested", "==", true).onSnapshot(snapshot => {
    const container = document.getElementById("loan-requests");
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const userId = doc.id;
      const amount = doc.data().loanAmount;
      const div = document.createElement("div");
      div.innerHTML = `Käyttäjä ${userId} pyytää ${amount}€ <button onclick="approveLoan('${userId}', ${amount})">Hyväksy</button>`;
      container.appendChild(div);
    });
  });
}

// ADMIN: HYVÄKSY LAINA
function approveLoan(userId, amount) {
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 2);
  db.collection("users").doc(userId).get().then(doc => {
    const balance = doc.data().balance || 0;
    db.collection("users").doc(userId).update({
      balance: balance + amount,
      loan: amount,
      loanRequested: false,
      loanDueDate: dueDate.toISOString()
    });
  });
  alert("Laina hyväksytty!");
}

// MAKSA LAINA
function repayLoan() {
  const userRef = db.collection("users").doc(currentUserId);
  userRef.get().then(doc => {
    const data = doc.data();
    if (!data.loan || data.loan <= 0) return alert("Ei lainaa maksettavana.");
    
    let repayAmount = data.loan;
    const due = new Date(data.loanDueDate);
    const now = new Date();
    if (now > due) repayAmount *= 1.15; // lisäkorko

    if (data.balance >= repayAmount) {
      userRef.update({
        balance: data.balance - repayAmount,
        loan: 0,
        loanDueDate: null
      });
      alert("Laina maksettu takaisin!");
    } else {
      alert("Ei tarpeeksi saldoa maksaa laina.");
    }
  });
}

// SIJOITA RAHAA
function invest() {
  const amount = parseFloat(document.getElementById("investAmount").value);
  const userRef = db.collection("users").doc(currentUserId);
  userRef.get().then(doc => {
    const data = doc.data();
    if (data.balance >= amount) {
      userRef.update({
        balance: data.balance - amount,
        investment: (data.investment || 0) + amount,
        investmentValue: (data.investmentValue || 0) + amount
      });
      alert("Sijoitus tehty!");
    } else {
      alert("Ei tarpeeksi saldoa.");
    }
  });
}

// SIJOITUKSEN ARVON PÄIVITYS
function updateInvestmentValue() {
  if (!currentUserId) return;
  const userRef = db.collection("users").doc(currentUserId);
  userRef.get().then(doc => {
    const data = doc.data();
    if (!data.investmentValue || data.investmentValue <= 0) return;

    const changePercent = (Math.random() * 0.2 - 0.1); // -10% to +10%
    const newValue = Math.max(0, data.investmentValue * (1 + changePercent));
    userRef.update({ investmentValue: newValue });
  });
}

// SIJOITUKSEN LUNASTUS
function redeemInvestment() {
  const userRef = db.collection("users").doc(currentUserId);
  userRef.get().then(doc => {
    const data = doc.data();
    const value = data.investmentValue || 0;

    if (value > 0) {
      userRef.update({
        balance: data.balance + value,
        investment: 0,
        investmentValue: 0
      });
      alert("Sijoitus lunastettu! Sait " + value.toFixed(2) + " €");
    } else {
      alert("Ei sijoitusta lunastettavana.");
    }
  });
}

function näytäSiirtohistoria(käyttäjäId) {
  const historyList = document.getElementById("transferHistory");
  historyList.innerHTML = "";

  firebase.firestore().collection("users").doc(käyttäjäId).collection("transactions")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const item = document.createElement("li");
        item.textContent = `${data.type} ${data.amount}€ käyttäjälle ${data.to || "-"} (${new Date(data.timestamp.toDate()).toLocaleString()})`;
        historyList.appendChild(item);
      });
    })
    .catch(error => {
      console.error("Siirtohistorian haku epäonnistui:", error);
    });
}

// Oletetaan että muuttujat fromUserId, toUserId, amount on määritelty

const timestamp = firebase.firestore.FieldValue.serverTimestamp();

firebase.firestore()
  .collection("users")
  .doc(fromUserId)
  .collection("transactions")
  .add({
    type: "Lähetys",
    to: toUserId,
    amount: amount,
    timestamp: timestamp
  });

firebase.firestore()
  .collection("users")
  .doc(toUserId)
  .collection("transactions")
  .add({
    type: "Vastaanotto",
    from: fromUserId,
    amount: amount,
    timestamp: timestamp
  });


  // Tallenna Firestoreen
  firebase.firestore()
    .collection("kurssit")
    .add({
      arvo: uusiKurssi,
      timestamp: timestamp
    });

  // Päivitä visuaalinen käyrä
  kurssiHistoria.push(uusiKurssi);
  if (kurssiHistoria.length > 10) kurssiHistoria.shift();
  piirräKurssikäyrä(kurssiHistoria);
}, 5000);

function haeKurssiFirestoresta() {
  firebase.firestore()
    .collection("kurssit")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      const data = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        data.unshift(d.arvo); // vanhin ensin
      });
      piirräKurssikäyrä(data);
    })
    .catch(e => console.error("Kurssien hakuvirhe:", e));
}
haeKurssiFirestoresta();

