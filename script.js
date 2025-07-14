// Täydellinen script.js tiedosto Henrybankille let db, auth, currentUserId = "";

window.onload = () => { db = firebase.firestore(); auth = firebase.auth(); setInterval(updateInvestmentValue, 5000); haeKurssiFirestoresta(); };

// Kirjautuminen function login() { const id = document.getElementById("userId").value; const pin = document.getElementById("pin").value; auth.signInWithEmailAndPassword(id + "@henrybankki.fi", pin) .then(() => { currentUserId = id; document.getElementById("auth-section").style.display = "none"; document.getElementById("main-section").style.display = "block"; document.getElementById("welcome-user").innerText = id; loadUserData(id); näytäSiirtohistoria(id); if (id === "011100") { document.getElementById("admin-tools").style.display = "block"; loadLoanRequests(); } }) .catch(error => alert("Kirjautuminen epäonnistui: " + error.message)); }

// Tilin luonti function signup() { const id = document.getElementById("userId").value; const pin = document.getElementById("pin").value; auth.createUserWithEmailAndPassword(id + "@henrybankki.fi", pin) .then(() => { db.collection("users").doc(id).set({ balance: 100, loan: 0, loanRequested: false, investment: 0, investmentValue: 0 }); alert("Tili luotu!"); }) .catch(error => alert("Tiliä ei voitu luoda: " + error.message)); }

function loadUserData(id) { db.collection("users").doc(id).onSnapshot(doc => { const data = doc.data(); document.getElementById("balance").innerText = data.balance.toFixed(2); document.getElementById("loan-info").innerText = data.loan > 0 ? data.loan.toFixed(2) + " €" : "Ei lainaa"; document.getElementById("investment-value").innerText = data.investmentValue?.toFixed(2) ?? "0"; }); }

function logout() { auth.signOut().then(() => { currentUserId = ""; document.getElementById("auth-section").style.display = "block"; document.getElementById("main-section").style.display = "none"; document.getElementById("admin-tools").

