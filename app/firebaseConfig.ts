import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_tW-LJLJF-Cpd2ROP10biewm8JpO3EDE",
  authDomain: "currency-exchange-31f4e.firebaseapp.com",
  projectId: "currency-exchange-31f4e",
  storageBucket: "currency-exchange-31f4e.appspot.com",
  messagingSenderId: "487954622068",
  appId: "1:487954622068:web:eecb47fb27298d28ae9321",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);
