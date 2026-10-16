// auth.js
import { ALIGHT_MOTION_CONFIG } from './config.js';

export class SupabaseClient {
    constructor(url, key) {
        this.url = url ? url.replace(/\/$/, '') : '';
        this.key = key;
    }

    isConfigured() {
        return this.url && this.url.includes("supabase.co") && this.key && this.key.length > 5;
    }

    async headers() {
        return {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async addActivation(logData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/activations`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify({
                    user: logData.user,
                    type: logData.type,
                    timestamp: logData.timestamp || Date.now(),
                    dateString: logData.dateString || new Date().toDateString(),
                    sender_id: logData.sender_id || 'guest'
                })
            });
        } catch (e) {
            console.error("Supabase addActivation error:", e);
        }
    }

    async getActivations() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/activations?select=*&order=timestamp.desc`, {
                headers: await this.headers()
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("Supabase getActivations error:", e);
        }
        return null;
    }

    async addReport(reportData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/reports`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify(reportData)
            });
        } catch (e) {
            console.error("Supabase addReport error:", e);
        }
    }

    async getReports() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/reports?select=*&order=timestamp.desc`, {
                headers: await this.headers()
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("Supabase getReports error:", e);
        }
        return null;
    }

    async updatePresence(visitorId) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/visitors`, {
                method: 'POST',
                headers: {
                    ...(await this.headers()),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    visitor_id: visitorId,
                    last_seen: new Date().toISOString()
                })
            });
        } catch (e) {
            console.error("Supabase presence error:", e);
        }
    }

    async getActiveVisitors() {
        if (!this.isConfigured()) return null;
        try {
            const cutoff = new Date(Date.now() - 60000).toISOString();
            const res = await fetch(`${this.url}/rest/v1/visitors?select=visitor_id&last_seen=gt.${cutoff}`, {
                headers: await this.headers()
            });
            if (res.ok) {
                const data = await res.json();
                return Math.max(1, data.length);
            }
        } catch (e) {
            console.error("Supabase active visitors error:", e);
        }
        return null;
    }
}

export class AlightMotionAuthBrowser {
    constructor() {
        this.config = ALIGHT_MOTION_CONFIG;
        this.HEADERS = {
            "Content-Type": "application/json",
            "X-Android-Package": "com.alightcreative.motion",
            "X-Android-Cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
            "User-Agent": "Mozilla/5.0 (Linux; Android 15; Mobile)"
        };
    }

    extractOobCode(fullUrl) {
        if (!fullUrl) return null;
        try {
            let cleanUrl = fullUrl.replace(/&amp;/g, '&');
            try { cleanUrl = decodeURIComponent(cleanUrl); } catch(e) {}
            const match = cleanUrl.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/oobCode=([a-zA-Z0-9_-]+)/i);
            if (match && match[1]) return match[1];
            return cleanUrl.trim();
        } catch (e) {
            return fullUrl.trim();
        }
    }

    async sendMagicLink(email) {
        try {
            await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.HEADERS,
                body: JSON.stringify({ identifier: email, continueUri: "http://localhost" })
            });
            
            const res = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.HEADERS,
                body: JSON.stringify({
                    requestType: 6,
                    email: email,
                    androidInstallApp: true,
                    canHandleCodeInApp: true,
                    continueUrl: "https://alightcreative.com",
                    androidPackageName: "com.alightcreative.motion",
                    clientType: "CLIENT_TYPE_ANDROID"
                })
            });
            if (!res.ok) throw new Error(await res.text());
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyAndApply(email, rawLink, productId) {
        try {
            const oobCode = this.extractOobCode(rawLink);
            if (!oobCode) throw new Error("Gagal mengekstrak oobCode.");
            
            const signinRes = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=${this.config.API_KEY}`, {
                method: 'POST',
                headers: this.HEADERS,
                body: JSON.stringify({ email: email, oobCode: oobCode, clientType: "CLIENT_TYPE_ANDROID" })
            });
            const signinData = await signinRes.json();
            if (!signinRes.ok || !signinData.idToken) throw new Error("Verifikasi Token Gagal");

            const codeorder = Math.floor(10000 + Math.random() * 90000).toString();
            const purchaseRes = await fetch('https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase', {
                method: 'POST',
                headers: {
                    "authorization": "Bearer " + signinData.idToken,
                    "firebase-instance-id-token": this.config.FIREBASE_INSTANCE_ID_TOKEN,
                    "content-type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({
                    data: {
                        productId: productId,
                        token: this.config.TOKEN,
                        skuType: this.config.SKU_TYPE,
                        orderId: this.config.ORDER_ID + "-" + codeorder
                    }
                })
            });
            if (!purchaseRes.ok) throw new Error("Gagal menerapkan pembelian premium");
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}
