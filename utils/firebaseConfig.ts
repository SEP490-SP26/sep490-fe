// utils/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBFrXn0Ukwq5w-x-6wL6dbkDJR31WVCwEg",
  authDomain: "printingproject-ca520.firebaseapp.com",
  projectId: "printingproject-ca520",
  storageBucket: "printingproject-ca520.firebasestorage.app",
  messagingSenderId: "905550824748",
  appId: "1:905550824748:web:1a410ce1cb802787c69889",
  measurementId: "G-7K9VZZHDQT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);