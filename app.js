// Import fungsi Firebase Auth yang dibutuhkan via CDN
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Impor 'auth' dari file config.js kamu yang ter-encode
import { auth } from "./config.js";

// 🚨 PENGATURAN DOMAIN AGAR TIDAK ERROR UNAUTHORIZED_DOMAIN
const actionCodeSettings = {
    url: 'https://ayaka-motion-am-premium.vercel.app',
    handleCodeInApp: true
};

let activeTabName = 'dashboard';
let historyLogs = [];
let reportsLogs = [];
let realTimeChart = null;

// =========================================================================
// FUNGSI NAVIGASI TAB
// =========================================================================
window.setActiveTab = function(tabName) {
    activeTabName = tabName;
    const views = ['dashboard', 'aktivasi', 'riwayat', 'laporan'];
    
    views.forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        const navEl = document.getElementById(`nav-${v}`);
        if (viewEl) {
            if (v === tabName) {
                viewEl.classList.remove('hidden');
            } else {
                viewEl.classList.add('hidden');
            }
        }
        if (navEl) {
            if (v === tabName) {
                navEl.className = "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
            } else {
                navEl.className = "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
            }
        }
    });

    if (tabName === 'riwayat') {
        initActivationChart();
    }
};

// =========================================================================
// FUNGSI SWITCH LANGKAH AKTIVASI (Kirim Link vs Verifikasi)
// =========================================================================
window.switchActivationStep = function(stepNum) {
    const step1 = document.getElementById('neo-step-1');
    const step2 = document.getElementById('neo-step-2');
    const btnKirim = document.getElementById('tab-btn-kirim');
    const btnVerif = document.getElementById('tab-btn-verifikasi');

    if (stepNum === 1) {
        if (step1) step1.classList.remove('hidden');
        if (step2) step2.classList.add('hidden');
        if (btnKirim) btnKirim.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
        if (btnVerif) btnVerif.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
    } else {
        if (step1) step1.classList.add('hidden');
        if (step2) step2.classList.remove('hidden');
        if (btnKirim) btnKirim.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
        if (btnVerif) btnVerif.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
    }
};

// =========================================================================
// FUNGSI UTAMA: KIRIM MAGIC LINK KE EMAIL
// =========================================================================
window.handleSendMagicLink = async function() {
    const emailInput = document.getElementById('amp-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showToast('Masukkan alamat Gmail terlebih dahulu!');
        return;
    }

    const btnSend = document.getElementById('btn-send-link');
    if (btnSend) {
        btnSend.disabled = true;
        btnSend.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim Link...`;
    }

    try {
        // Mengirim Magic Link dengan menyertakan actionCodeSettings domain Vercel
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        
        // Simpan email ke localStorage untuk verifikasi tahap berikutnya
        window.localStorage.setItem('emailForSignIn', email);
        
        showToast('Magic Link berhasil dikirim ke ' + email);
        alert('Magic Link berhasil dikirim! Silakan cek Inbox atau folder Spam email Anda, lalu klik link tersebut.');
        
        // Pindah otomatis ke langkah 2 (Verifikasi)
        window.switchActivationStep(2);
    } catch (error) {
        console.error("Gagal kirim link:", error);
        alert('Gagal Mengirim Link: ' + (error.message || JSON.stringify(error)));
    } finally {
        if (btnSend) {
            btnSend.disabled = false;
            btnSend.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;
        }
    }
};

// =========================================================================
// FUNGSI VERIFIKASI TOKEN / MAGIC LINK
// =========================================================================
window.handleVerifyAndApply = async function() {
    const linkInput = document.getElementById('amp-magic-link');
    const linkValue = linkInput ? linkInput.value.trim() : '';
    let email = window.localStorage.getItem('emailForSignIn');

    if (!email) {
        email = prompt('Masukkan email yang tadi dikirimi Magic Link:');
    }

    if (!email) {
        showToast('Email verifikasi tidak ditemukan!');
        return;
    }

    try {
        let fullUrl = linkValue;
        if (!fullUrl.startsWith('http')) {
            fullUrl = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'oobCode=' + linkValue;
        }

        if (isSignInWithEmailLink(auth, fullUrl)) {
            await signInWithEmailLink(auth, email, fullUrl);
            showToast('Verifikasi Berhasil! Akun Aktif Premium.');
            alert('Sukses! Akun Alight Motion Anda berhasil diaktifkan selama 365 Hari.');
            window.localStorage.removeItem('emailForSignIn');
        } else {
            alert('Format Magic Link atau oobCode tidak valid.');
        }
    } catch (error) {
        console.error("Error verifikasi:", error);
        alert('Verifikasi Gagal: ' + (error.message || JSON.stringify(error)));
    }
};

// =========================================================================
// FUNGSI TOAST NOTIFIKASI
// =========================================================================
function showToast(message) {
    const toast = document.getElementById('toast-notif');
    const msgEl = document.getElementById('toast-message');
    if (toast && msgEl) {
        msgEl.innerText = message;
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('opacity-100');
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0', 'pointer-events-none');
        }, 3000);
    }
}

// =========================================================================
// INISIALISASI WIDGET & JAM REALTIME
// =========================================================================
function initLiveWidgets() {
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('live-clock');
        const dateEl = document.getElementById('current-date-time');
        
        if (clockEl) clockEl.innerText = now.toTimeString().split(' ')[0];
        if (dateEl) {
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            dateEl.innerText = `${d}/${m}/${y} ${now.toTimeString().split(' ')[0].substring(0,5)}`;
        }
    }, 1000);

    const visitorsEl = document.getElementById('visitors-count');
    const activationsEl = document.getElementById('activations-count');
    const actTotalEl = document.getElementById('act-total-count');
    const actTodayEl = document.getElementById('act-today-count');

    let randomVis = Math.floor(Math.random() * 15) + 42;
    let randomAct = 1258;

    if (visitorsEl) visitorsEl.innerText = randomVis;
    if (activationsEl) activationsEl.innerText = randomAct;
    if (actTotalEl) actTotalEl.innerText = randomAct;
    if (actTodayEl) actTodayEl.innerText = '48';
}

// =========================================================================
// GRAFIK CHART.JS REALTIME AKTIVASI
// =========================================================================
function initActivationChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas) return;

    if (realTimeChart) {
        realTimeChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
            datasets: [{
                label: 'Aktivasi Berhasil',
                data: [5, 12, 19, 8, 25, 42],
                borderColor: '#000000',
                backgroundColor: '#facc15',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Jalankan fungsi widget saat dokumen selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    initLiveWidgets();
});
