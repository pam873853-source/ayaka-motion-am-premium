// Import Auth dari config.js
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./config.js";

const actionCodeSettings = {
    url: 'https://ayaka-motion-am-premium.vercel.app',
    handleCodeInApp: true
};

// Start Time Uptime
let startTime = Date.now();

// 🔋 FUNGSI BATERAI LANGSUNG JALAN
async function initBattery() {
    const batEl = document.getElementById('battery-level');
    if (!batEl) return;

    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            const updateBat = () => {
                const lvl = Math.round(battery.level * 100);
                batEl.innerHTML = `🔋 ${lvl}%`;
            };
            updateBat();
            battery.addEventListener('levelchange', updateBat);
        } catch (e) {
            batEl.innerHTML = '🔋 92%'; // Fallback baterai HP kamu
        }
    } else {
        batEl.innerHTML = '🔋 92%'; // Fallback jika browser blokir Battery API
    }
}

// ⏱️ FUNGSI UPTIME & WAKTU REALTIME
function startClocks() {
    setInterval(() => {
        // Update Waktu HP
        const now = new Date();
        const clockEl = document.getElementById('live-clock');
        if (clockEl) {
            clockEl.innerText = now.toTimeString().split(' ')[0];
        }

        // Update Up Time
        const uptimeEl = document.getElementById('uptime-clock');
        if (uptimeEl) {
            const diffSecs = Math.floor((Date.now() - startTime) / 1000);
            const hrs = String(Math.floor(diffSecs / 3600)).padStart(2, '0');
            const mins = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(diffSecs % 60).padStart(2, '0');
            uptimeEl.innerText = `${hrs}:${mins}:${secs}`;
        }
    }, 1000);
}

// 📊 FUNGSI PENGUNJUNG ONLINE
function startVisitors() {
    const visEl = document.getElementById('visitors-count');
    if (!visEl) return;
    
    let count = 6;
    setInterval(() => {
        // Simulasi fluktuasi pengunjung yang halus (antara 4 sampai 9 orang)
        count += Math.floor(Math.random() * 3) - 1;
        if (count < 4) count = 4;
        if (count > 10) count = 8;
        visEl.innerText = count;
    }, 4000);
}

// Navigasi & Handlers Lainnya
window.setActiveTab = function(tabName) {
    const views = ['dashboard', 'aktivasi', 'riwayat', 'laporan'];
    views.forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        const navEl = document.getElementById(`nav-${v}`);
        if (viewEl) viewEl.classList.toggle('hidden', v !== tabName);
        if (navEl) {
            navEl.className = (v === tabName) 
                ? "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5" 
                : "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
    });
};

window.switchActivationStep = function(stepNum) {
    const step1 = document.getElementById('neo-step-1');
    const step2 = document.getElementById('neo-step-2');
    if (step1 && step2) {
        step1.classList.toggle('hidden', stepNum !== 1);
        step2.classList.toggle('hidden', stepNum !== 2);
    }
};

window.handleSendMagicLink = async function() {
    const emailInput = document.getElementById('amp-email');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
        alert('Masukkan alamat Gmail terlebih dahulu!');
        return;
    }

    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        alert('Magic Link berhasil dikirim ke ' + email);
        window.switchActivationStep(2);
    } catch (error) {
        alert('Gagal Mengirim Link: ' + (error.message || JSON.stringify(error)));
    }
};

// Jalankan Otomatis Saat Web Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
    initBattery();
    startClocks();
    startVisitors();
});
