// File config.js versi bersih & terstruktur
// Mengambil variabel dari .env (Contoh untuk platform berbasis Vite/React)

export const APP_ID = import.meta.env.VITE_APP_ID || 'ayaka-motion-default';

export const FIREBASE_CONFIG = JSON.parse(
typeof __firebase_config !== 'undefined' ? __firebase_config : '{}'
);

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

export const ALIGHT_MOTION_CONFIG = {
'ORDER_ID': import.meta.env.VITE_ALIGHT_ORDER_ID || 'GPA',
'API_KEY': import.meta.env.VITE_ALIGHT_API_KEY || '',
'TOKEN': import.meta.env.VITE_ALIGHT_TOKEN || '',
'SKU_TYPE': import.meta.env.VITE_ALIGHT_SKU_TYPE || 'subs',
'FIREBASE_INSTANCE_ID_TOKEN': import.meta.env.VITE_ALIGHT_FIREBASE_TOKEN || ''
};