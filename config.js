// Konfigurasi Aplikasi & API Key
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'ayaka-motion-default';

export const FIREBASE_CONFIG = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Konfigurasi Supabase (Silakan ubah dengan kredensial Supabase Anda)
export const SUPABASE_URL = "https://xxxx.supabase.co"; 
export const SUPABASE_KEY = "sbp_xxxxxxxxxxxx";

// Konfigurasi Alight Motion Auth
export const ALIGHT_MOTION_CONFIG = {
    ORDER_ID: "GPA",
    API_KEY: "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0",
    TOKEN: "mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw",
    SKU_TYPE: "subs",
    FIREBASE_INSTANCE_ID_TOKEN: "cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI"
};
