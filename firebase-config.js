// Lataa Firebase v9+ modulikompatibiliteetilla
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

// Firebase-konfiguraatio
const firebaseConfig = {
  apiKey: "AIzaSyB3eAdsCYIFWI06DS6lj5GUMYBwooRNd_8",
  authDomain: "henrybank-12a99.firebaseapp.com",
  projectId: "henrybank-12a99",
  storageBucket: "henrybank-12a99.appspot.com", // korjattu .app → .com
  messagingSenderId: "404077920890",
  appId: "1:404077920890:web:9eee6fa70b11272bb671c3",
  measurementId: "G-NC2R6N5K7M"
};

// Alusta Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
