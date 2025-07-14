let db, auth;

window.onload = () => {
  db = firebase.firestore();
  auth = firebase.auth();
};

function login() {
  const id = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  auth.signInWithEmailAndPassword(id + "@henrybankki.fi", pin)
    .then(() => {
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("main-section").style.display = "block";
      document.getElementById("welcome-user").innerText = id;

      db.collection("users").doc(id).get().then(doc => {
        document.getElementById("balance").innerText = doc.data().balance || 0;
      });

      if (id === "011100") {
        document.getElementById("admin-tools").style.display = "block";
      }
    })
    .catch(error => alert("Kirjautuminen epäonnistui: " + error.message));
}

function signup() {
  const id = document.getElementById("userId").value;
  const pin = document.getElementById("pin").value;
  auth.createUserWithEmailAndPassword(id + "@henrybankki.fi", pin)
    .then(() => {
      db.collection("users").doc(id).set({ balance: 100 }); // <- tämä luo Firestoreen dokumentin!
      alert("Tili luotu! Voit nyt kirjautua sisään.");
    })
    .catch(error => alert("Tiliä ei voitu luoda: " + error.message));
}

function sendMoney() {
  const senderId = document.getElementById("userId").value;
  const receiverId = document.getElementById("receiverId").value;
  const amount = parseFloat(document.getElementById("amount").value);

  const senderRef = db.collection("users").doc(senderId);
  const receiverRef = db.collection("users").doc(receiverId);

  db.runTransaction(async (transaction) => {
    const senderDoc = await transaction.get(senderRef);
    const receiverDoc = await transaction.get(receiverRef);

    if (!senderDoc.exists || !receiverDoc.exists) throw "Virhe: käyttäjää ei löydy";

    const senderBalance = senderDoc.data().balance || 0;
    const receiverBalance = receiverDoc.data().balance || 0;

    if (senderBalance < amount) throw "Ei tarpeeksi rahaa";

    transaction.update(senderRef, { balance: senderBalance - amount });
    transaction.update(receiverRef, { balance: receiverBalance + amount });
  })
  .then(() => alert("Rahat lähetetty!"))
  .catch(err => alert("Virhe rahansiirrossa: " + err));
}

function logout() {
  auth.signOut().then(() => {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
    document.getElementById("admin-tools").style.display = "none";
  });
}

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
