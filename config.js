// Import fungsi yang dibutuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 1. KONFIGURASI FIREBASE & AUTH
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB4VVvmelfDPG-ZKyGXewQxP3Iy6o7cMC8", // 👈 Masukkan API Key Firebase kamu di sini
  authDomain: "ayaka-motion.firebaseapp.com",
  projectId: "ayaka-motion",
  storageBucket: "ayaka-motion.firebasestorage.app",
  messagingSenderId: "300496143837",
  appId: "1:300496143837:web:0f9da5d3d88bbe6436e234"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ==========================================
// 2. KONFIGURASI SUPABASE (URL & API KEY)
// ==========================================
export const SUPABASE_URL = 'https://mnmzvgqtbgiicousaqjy.supabase.co'; // 👈 Masukkan URL Supabase kamu
export const SUPABASE_KEY = 'sb_publishable_NW1b0B9_w3fryziDo7-zzg_5_kqZiWd';      // 👈 Masukkan Anon/API Key Supabase kamu

// ==========================================
// 3. PENGATURAN DOMAIN MAGIC LINK (FIREBASE)
// ==========================================
export const actionCodeSettings = {
  url: 'https://ayaka-motion-am-premium.vercel.app',
  handleCodeInApp: true
};
