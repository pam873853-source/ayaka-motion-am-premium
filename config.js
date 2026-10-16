// config.js
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'ayaka-motion-default';

export const FIREBASE_CONFIG = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ""; 

export const ALIGHT_MOTION_CONFIG = {
    ORDER_ID: import.meta.env.VITE_AM_ORDER_ID,
    API_KEY: import.meta.env.VITE_AM_API_KEY,
    TOKEN: import.meta.env.VITE_AM_TOKEN,
    SKU_TYPE: import.meta.env.VITE_AM_SKU_TYPE,
    FIREBASE_INSTANCE_ID_TOKEN: import.meta.env.VITE_AM_FIREBASE_INSTANCE_ID_TOKEN
};
