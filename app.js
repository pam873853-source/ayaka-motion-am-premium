import { APP_ID, FIREBASE_CONFIG, SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { SupabaseClient, AlightMotionAuthBrowser } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);
const ampAuth = new AlightMotionAuthBrowser();

let app, db, auth, userId = null;
let historyLogs = [];
let totalVisitors = parseInt(localStorage.getItem('ayaka_stable_visitors') || '5', 10);
let reportsLogs = [];
let realTimeChart = null;
let activeTabName = 'dashboard';
let verifiedEmailTemp = '';

let startTime = localStorage.getItem('ayaka_uptime_start');
if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ayaka_uptime_start', startTime);
} else {
    startTime = parseInt(startTime, 10);
}

function initActivationChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas) return;

    if (realTimeChart) {
        realTimeChart.destroy();
        realTimeChart = null;
    }

    const ctx = canvas.getContext('2d');
    const hoursLabels = [];
    const dataCounts = [0, 0, 0, 0, 0, 0];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const h = new Date(now.getTime() - i * 3600000);
        hoursLabels.push(h.getHours().toString().padStart(2, '0') + ':00');
    }

    if (historyLogs && historyLogs.length > 0) {
        historyLogs.forEach(log => {
            const logTime = log.timestamp || Date.now();
            const diffHours = Math.floor((now.getTime() - logTime) / 3600000);
            if (diffHours >= 0 && diffHours < 6) {
                dataCounts[5 - diffHours]++;
            }
        });
    }

    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hoursLabels,
            datasets: [{
                label: 'Aktivasi',
                data: dataCounts,
                borderColor: '#000000',
                backgroundColor: 'rgba(250, 204, 21, 0.4)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#facc15',
                pointBorderColor: '#000000',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { weight: 'bold', size: 10 }, color: '#000' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { weight: 'bold', size: 10 }, color: '#000' },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            }
        }
    });
}

function updateChartData() {
    if (!realTimeChart) {
        initActivationChart();
        return;
    }
    const now = new Date();
    const dataCounts = [0, 0, 0, 0, 0, 0];

    if (historyLogs && historyLogs.length > 0) {
        historyLogs.forEach(log => {
            const logTime = log.timestamp || Date.now();
            const diffHours = Math.floor((now.getTime() - logTime) / 3600000);
            if (diffHours >= 0 && diffHours < 6) {
                dataCounts[5 - diffHours]++;
            }
        });
    }

    realTimeChart.data.datasets[0].data = dataCounts;
    realTimeChart.update('none');
}

window.setActiveTab = function(tab) {
    activeTabName = tab;
    ['dashboard', 'aktivasi', 'riwayat', 'laporan'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-${t}`);
        if (view) view.classList.toggle('hidden', t !== tab);
        if (btn) {
            btn.className = (t === tab) 
                ? "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5" 
                : "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
    });
    if (tab === 'riwayat') {
        renderHistory();
        setTimeout(() => { initActivationChart(); }, 50);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.switchActivationStep = function(step) {
    const s1 = document.getElementById('neo-step-1');
    const s2 = document.getElementById('neo-step-2');
    const b1 = document.getElementById('tab-btn-kirim');
    const b2 = document.getElementById('tab-btn-verifikasi');
    if (step === 1) {
        s1.classList.remove('hidden');
        s2.classList.add('hidden');
        b1.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
        b2.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
    } else {
        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        b1.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
        b2.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
    }
};

window.handleSendMagicLink = async function() {
    const email = document.getElementById('amp-email').value.trim();
    if (!email) {
        showToast("Masukkan email terlebih dahulu!");
        return;
    }
    const btn = document.getElementById('btn-send-link');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;

    const res = await ampAuth.sendMagicLink(email);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;

    if (res.success) {
        verifiedEmailTemp = email;
        showToast("Magic Link berhasil dikirim ke email!");
        switchActivationStep(2);
    } else {
        showToast("Gagal: " + res.error);
    }
};

window.handleVerifyAndApply = async function() {
    const email = verifiedEmailTemp || document.getElementById('amp-email').value.trim();
    const link = document.getElementById('amp-magic-link').value.trim();
    const pkg = document.getElementById('amp-package').value;

    if (!email || !link) {
        showToast("Email dan Magic Link wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-verify-apply');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memproses...`;

    const res = await ampAuth.verifyAndApply(email, link, pkg);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan Sekarang`;

    if (res.success) {
        showToast("Akun Berhasil Diaktifkan ke Premium!");
        const todayStr = new Date().toDateString();
        const logData = {
            user: email,
            type: pkg.includes('annual') ? '1 Tahun Premium' : '1 Bulan Premium',
            timestamp: Date.now(),
            dateString: todayStr,
            sender_id: userId
        };

        await supabase.addActivation(logData);

        if (db && userId) {
            try {
                await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'activations'), logData);
            } catch (e) {
                console.error("Firestore sync error:", e);
            }
        }

        document.getElementById('amp-email').value = '';
        document.getElementById('amp-magic-link').value = '';
        switchActivationStep(1);
        syncSupabaseActivations();
    } else {
        showToast("Gagal: " + res.error);
    }
};

function renderHistory() {
    const container = document.getElementById('history-feed-container');
    if (!historyLogs || historyLogs.length === 0) {
        container.innerHTML = `
            <div class="neo-card p-8 text-center space-y-2 bg-white">
                <i class="fa-solid fa-box-open text-3xl text-gray-400"></i>
                <p class="text-xs font-black">Belum Ada Riwayat Aktivasi</p>
            </div>
        `;
        return;
    }
    container.innerHTML = historyLogs.map(item => `
        <div class="neo-card p-3.5 flex items-center justify-between bg-white">
            <div>
                <p class="text-xs font-black">${item.user}</p>
                <p class="text-[10px] font-bold text-gray-500">${item.type}</p>
            </div>
            <span class="px-2.5 py-1 bg-emerald-400 border-2 border-black rounded-lg text-[10px] font-black">
                AKTIF
            </span>
        </div>
    `).join('');
}

window.clearHistoryFeed = function() {
    if (confirm("Hapus seluruh riwayat lokal?")) {
        historyLogs = [];
        renderHistory();
        updateCounts();
        showToast("Riwayat dibersihkan.");
    }
};

window.submitBugReport = async function() {
    const category = document.getElementById('report-category').value;
    const description = document.getElementById('report-description').value.trim();

    if (!description) {
        showToast("Mohon isi deskripsi kendala/saran terlebih dahulu!");
        return;
    }

    const btn = document.getElementById('btn-submit-report');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`;
    }

    const reportData = {
        category: category,
        description: description,
        timestamp: Date.now(),
        date_string: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
        sender_id: userId || 'Anonymous'
    };

    await supabase.addReport(reportData);

    if (db && userId) {
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), reportData);
        } catch (e) {
            console.error("Firestore report sync error:", e);
        }
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-database"></i> Kirim & Simpan Laporan ke Database`;
    }

    document.getElementById('report-description').value = '';
    showToast("Laporan/Saran berhasil disimpan ke Database!");
    syncSupabaseReports();
};

function renderReports() {
    const container = document.getElementById('reports-list-container');
    const badge = document.getElementById('reports-count-badge');
    if (!container) return;

    if (badge) badge.textContent = (reportsLogs ? reportsLogs.length : 0) + " Laporan";

    if (!reportsLogs || reportsLogs.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 font-bold text-center py-4">Belum ada laporan tersimpan.</p>`;
        return;
    }

    container.innerHTML = reportsLogs.map(item => `
        <div class="neo-card p-3 bg-zinc-50 border-2 border-black space-y-1">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-300 border border-black">${item.category}</span>
                <span class="text-[9px] font-mono font-bold text-gray-500">${item.date_string || ''}</span>
            </div>
            <p class="text-xs font-semibold text-black break-words pt-1">${item.description}</p>
        </div>
    `).join('');
}

async function syncSupabaseReports() {
    if (supabase.isConfigured()) {
        const sbReports = await supabase.getReports();
        if (sbReports) {
            reportsLogs = sbReports;
            renderReports();
        }
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast-notif');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
}

function updateCounts() {
    const countActivations = historyLogs.length;
    const actEl = document.getElementById('activations-count');
    const actTotalEl = document.getElementById('act-total-count');
    const actTodayEl = document.getElementById('act-today-count');

    if (actEl) actEl.textContent = countActivations;
    if (actTotalEl) actTotalEl.textContent = countActivations;

    const todayStr = new Date().toDateString();
    const todayCount = historyLogs.filter(h => h.dateString === todayStr || h.date_string?.includes(todayStr)).length;
    if (actTodayEl) actTodayEl.textContent = todayCount;

    // Stabilisasi angka pengunjung agar tidak turun drastis saat refresh
    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) {
        const currentDisplayed = parseInt(visitorsEl.textContent) || 0;
        const finalVisitors = Math.max(currentDisplayed > 0 ? currentDisplayed : 1, totalVisitors);
        visitorsEl.textContent = finalVisitors;
        localStorage.setItem('ayaka_stable_visitors', finalVisitors);
    }

    updateChartData();
}

async function syncSupabaseActivations() {
    if (supabase.isConfigured()) {
        const sbData = await supabase.getActivations();
        if (sbData) {
            historyLogs = sbData;
            historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            updateCounts();
            if (activeTabName === 'riwayat') {
                renderHistory();
            }
        }
    }
}

async function initFirebase() {
    try {
        if (FIREBASE_CONFIG && Object.keys(FIREBASE_CONFIG).length > 0) {
            app = initializeApp(FIREBASE_CONFIG);
            db = getFirestore(app);
            auth = getAuth(app);

            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
            userId = auth.currentUser?.uid || crypto.randomUUID();

            const visitorRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'visitors', userId);
            await setDoc(visitorRef, {
                lastSeen: Date.now(),
                userAgent: navigator.userAgent
            }, { merge: true });

            const visitorsCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'visitors');
            onSnapshot(visitorsCol, (snapshot) => {
                totalVisitors = Math.max(totalVisitors, snapshot.size);
                updateCounts();
            });

            const activationsCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'activations');
            onSnapshot(activationsCol, (snapshot) => {
                let firestoreLogs = [];
                snapshot.forEach(docSnap => { firestoreLogs.push(docSnap.data()); });
                
                if (!supabase.isConfigured() || firestoreLogs.length > historyLogs.length) {
                    historyLogs = firestoreLogs;
                    historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    updateCounts();
                    if (activeTabName === 'riwayat') renderHistory();
                }
            });

            const reportsCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports');
            onSnapshot(reportsCol, (snapshot) => {
                let firestoreReports = [];
                snapshot.forEach(docSnap => { firestoreReports.push(docSnap.data()); });
                if (!supabase.isConfigured() && firestoreReports.length > 0) {
                    reportsLogs = firestoreReports;
                    reportsLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    renderReports();
                }
            });
        } else {
            userId = crypto.randomUUID();
            updateCounts();
        }
    } catch (e) {
        console.error("Firebase init error:", e);
        if (!userId) userId = crypto.randomUUID();
        updateCounts();
    }
}

async function pingPresence() {
    if (supabase.isConfigured()) {
        if (!userId) userId = crypto.randomUUID();
        await supabase.updatePresence(userId);
        const sbVisitors = await supabase.getActiveVisitors();
        if (sbVisitors !== null && sbVisitors > 0) {
            totalVisitors = Math.max(totalVisitors, sbVisitors);
            localStorage.setItem('ayaka_stable_visitors', totalVisitors);
            updateCounts();
        }
    } else {
        updateCounts();
    }
}

initFirebase();
pingPresence();
setInterval(pingPresence, 8000);

syncSupabaseActivations();
syncSupabaseReports();

setInterval(() => {
    syncSupabaseActivations();
    syncSupabaseReports();
}, 5000);

let batteryInstance = null;
if ('getBattery' in navigator) {
    navigator.getBattery().then(batt => {
        batteryInstance = batt;
        updateBatteryDisplay();
        batt.addEventListener('levelchange', updateBatteryDisplay);
        batt.addEventListener('chargingchange', updateBatteryDisplay);
    }).catch(() => {});
}

function updateBatteryDisplay() {
    const batTextEl = document.getElementById('battery-text');
    if (batteryInstance && batTextEl) {
        const levelPct = Math.round(batteryInstance.level * 100);
        const isCharging = batteryInstance.charging;
        batTextEl.textContent = levelPct + '%' + (isCharging ? ' ⚡' : '');
    } else if (batTextEl) {
        batTextEl.textContent = '100% (OK)';
    }
}

function updateLiveWidgets() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = timeStr;

    const fullDateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
    const dtEl = document.getElementById('current-date-time');
    if (dtEl) dtEl.textContent = fullDateStr;

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const uptimeEl = document.getElementById('live-uptime');
    if (uptimeEl) uptimeEl.textContent = `${mins}:${secs}`;
}

updateLiveWidgets();
setInterval(updateLiveWidgets, 1000);

async function updateLatency() {
    const latencyEl = document.getElementById('header-latency');
    if (!latencyEl) return;
    const start = performance.now();
    try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        const end = performance.now();
        const latency = Math.round(end - start);
        latencyEl.textContent = Math.max(8, Math.min(latency, 120)) + 'ms';
    } catch (e) {
        const randomMs = Math.floor(Math.random() * 15) + 10;
        latencyEl.textContent = randomMs + 'ms';
    }
}
setInterval(updateLatency, 4000);
updateLatency();
