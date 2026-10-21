// ============================================================
// connect.js — Central configuration & connections
// ============================================================
// Add your Supabase and other account keys HERE.
// This file is loaded before all other app scripts (see index.html / admin.html).
// ============================================================

// ------------------------------------------------------------
// SUPABASE
// ------------------------------------------------------------
const SUPABASE_URL = "https://nmcevtfrxtlfuyccruzt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tY2V2dGZyeHRsZnV5Y2NydXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDk1ODMsImV4cCI6MjEwNzYyNTU4M30.T7zBn7iDTzAUTGNNcSE_jiG6CZKJpkq-pLCmd-YfndE";

// ------------------------------------------------------------
// OTHER ACCOUNT / SERVICE KEYS (add as needed)
// ------------------------------------------------------------
const CONFIG = {
    // Payment / wallet
    bkash: "",
    nagad: "",
    rocket: "",
    usdt: "",

    // Third-party / API
    telegramBotToken: "",
    smsApiKey: "",
    emailApiKey: "",

    // Analytics / other
    googleAnalyticsId: "",
    firebaseApiKey: ""
};

// ------------------------------------------------------------
// Initialize Supabase client (global `window.supabase`)
// ------------------------------------------------------------
(function initSupabase() {
    try {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized");
    } catch (err) {
        console.error("Supabase Initialization Error:", err);
    }
})();

// Expose config globally for use in other scripts
window.CONFIG = CONFIG;
