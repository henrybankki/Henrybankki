let chart; // globaali muuttuja

function piirräKurssikäyrä(dataPisteet) {
  const ctx = document.getElementById("investmentChart").getContext("2d");

  if (chart) chart.destroy(); // jos aiempi käyrä on olemassa

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataPisteet.map((_, i) => `t${i + 1}`),
      datasets: [{
        label: 'Sijoituskäyrä',
        data: dataPisteet,
        fill: false,
        borderColor: 'green',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Esimerkkikäyttö: päivitä käyrä 5 sek välein
let kurssiHistoria = [];

setInterval(() => {
  const uusiKurssi = Math.round(50 + Math.random() * 50); // esimerkkikurssi
  kurssiHistoria.push(uusiKurssi);
  if (kurssiHistoria.length > 10) kurssiHistoria.shift();
  piirräKurssikäyrä(kurssiHistoria);
}, 5000);

setInterval(() => {
  const uusiKurssi = Math.round(50 + Math.random() * 50); // Esimerkkikurssi
  const timestamp = firebase.firestore.Timestamp.now();

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
haeKurssiFirestoresta();
