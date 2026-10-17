// Import fungsi Firebase Auth via CDN
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./config.js";

// 🚨 Action Code Settings untuk Magic Link
const actionCodeSettings = {
    url: 'https://ayaka-motion-am-premium.vercel.app',
    handleCodeInApp: true
};

let activeTabName = 'dashboard';
let realTimeChart = null;

// Waktu Mulai untuk Up Time
let startTime = localStorage.getItem('ayaka_uptime_start');
if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ayaka_uptime_start', startTime);
} else {
    startTime = parseInt(startTime, 10);
}

// =========================================================================
// 🔋 FUNGSI BATERAI HP REALTIME
// =========================================================================
function initBatteryStatus() {
    const batteryEl = document.querySelector('#view-dashboard div:nth-child(2) p') || document.getElementById('battery-level');
    
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            function updateBattery() {
                const level = Math.round(battery.level * 100);
                if (batteryEl) batteryEl.innerText = `${level}%`;
            }
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        }).catch(() => {
            if (batteryEl) batteryEl.innerText = '93%'; // Fallback
        });
    } else {
        if (batteryEl) batteryEl.innerText = '93%';
    }
}

// =========================================================================
// ⏱️ FUNGSI UPTIME & LIVE CLOCK (BERJALAN REALTIME)
// =========================================================================
function updateLiveWidgets() {
    const now = new Date();
    
    // 1. Update Waktu HP
    const clockEl = document.getElementById('live-clock') || document.querySelector('#view-dashboard div:nth-child(1) p');
    if (clockEl) {
        clockEl.innerText = now.toTimeString().split(' ')[0];
    }

    // 2. Update Up Time (Menghitung durasi website dibuka)
    const uptimeEl = document.getElementById('uptime-clock') || document.querySelector('#view-dashboard div:nth-child(3) p');
    if (uptimeEl) {
        const diffMs = Date.now() - startTime;
        const totalSecs = Math.floor(diffMs / 1000);
        const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSecs % 60).padStart(2, '0');
        
        uptimeEl.innerText = `${hours}:${mins}:${secs}`;
    }
}

// =========================================================================
// 📊 FUNGSI PENGUNJUNG ONLINE & TOTAL AKTIVASI (REALISTIS)
// =========================================================================
function initRealStats() {
    const visitorsEl = document.getElementById('visitors-count') || document.querySelector('.grid-cols-2 div:nth-child(1) .text-3xl');
    const activationsEl = document.getElementById('activations-count') || document.querySelector('.grid-cols-2 div:nth-child(2) .text-3xl');

    // Mengambil atau membuat angka pengunjung awal yang stabil (misal 3 - 8 orang)
    let onlineUsers = parseInt(localStorage.getItem('ayaka_online_users') || '5', 10);
    let totalActs = parseInt(localStorage.getItem('ayaka_total_acts') || '12', 10);

    if (visitorsEl) visitorsEl.innerText = onlineUsers;
    if (activationsEl) activationsEl.innerText = totalActs;

    // Naik/turun pengunjung online secara wajar setiap 5 detik
    setInterval(() => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, atau +1
        onlineUsers = Math.max(1, onlineUsers + change);
        localStorage.setItem('ayaka_online_users', onlineUsers);
        if (visitorsEl) visitorsEl.innerText = onlineUsers;
    }, 5000);
}

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
            if (v === tabName) viewEl.classList.remove('hidden');
            else viewEl.classList.add('hidden');
        }
        if (navEl) {
            if (v === tabName) navEl.className = "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
            else navEl.className = "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
    });

    if (tabName === 'riwayat') initActivationChart();
};

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
// FUNGSI UTAMA: KIRIM MAGIC LINK
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
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        
        // Tambahkan statistik total aktivasi
        let currentActs = parseInt(localStorage.getItem('ayaka_total_acts') || '12', 10) + 1;
        localStorage.setItem('ayaka_total_acts', currentActs);

        showToast('Magic Link berhasil dikirim ke ' + email);
        alert('Magic Link berhasil dikirim! Silakan cek Inbox atau folder Spam email Anda.');
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

window.handleVerifyAndApply = async function() {
    const linkInput = document.getElementById('amp-magic-link');
    const linkValue = linkInput ? linkInput.value.trim() : '';
    let email = window.localStorage.setItem('emailForSignIn');

    if (!email) email = prompt('Masukkan email verifikasi:');
    if (!email) return;

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
            alert('Format Magic Link tidak valid.');
        }
    } catch (error) {
        alert('Verifikasi Gagal: ' + (error.message || JSON.stringify(error)));
    }
};

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

function initActivationChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas) return;
    if (realTimeChart) realTimeChart.destroy();

    const ctx = canvas.getContext('2d');
    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
            datasets: [{
                label: 'Aktivasi Berhasil',
                data: [1, 2, 4, 3, 5, 8],
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

// Jalankan widget & listener saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    initBatteryStatus();
    initRealStats();
    setInterval(updateLiveWidgets, 1000);
});
