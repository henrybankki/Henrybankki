
// Firebase init on tehty erillisessä tiedostossa
const db = firebase.firestore();

// Lisää JavaScript-toiminnot tänne (esim. login, signup jne.)
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

let investmentChart;

function loadInvestmentGraph() {
  const ctx = document.getElementById('investmentChart').getContext('2d');

  // Simuloidaan sijoitusten arvon kehitystä
  const labels = ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä'];
  const data = [100, 110, 105, 120, 125, 140];

  if (investmentChart) {
    investmentChart.destroy(); // tuhoaa vanhan jos on
  }

  investmentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sijoituksen arvo (€)',
        data: data,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

