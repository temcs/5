/**
 * Game Balance Bridge - PostMessage Based
 * Works across origins (GitHub Pages iframe -> main site)
 * Uses postMessage for secure cross-origin communication.
 */

const GameBridge = {

    _pendingRequests: {},
    _requestId: 0,
    _initialized: false,
    _gameConfig: null,
    _configListeners: [],

    // Hard cap for every game payout (total return multiplier on the bet).
    MAX_WIN_MULTIPLIER: 50,

    /**
     * Picks a random win multiplier between 1x and 50x.
     * The distribution is intentionally top-heavy on small wins:
     *   ~97%   -> 1x-5x (common)
     *   ~2%    -> 5x-10x
     *   ~0.7%  -> 10x-20x
     *   ~0.25% -> 20x-35x
     *   ~0.05% -> 35x-50x (very rare)
     */
    randomWinMultiplier: function () {
        const roll = Math.random() * 100;
        let mult;

        if (roll < 55) {
            mult = 1 + Math.random() * 0.5;           // 1.00 - 1.50
        } else if (roll < 82) {
            mult = 1.5 + Math.random() * 0.5;         // 1.50 - 2.00
        } else if (roll < 92) {
            mult = 2 + Math.random();                 // 2.00 - 3.00
        } else if (roll < 97) {
            mult = 3 + Math.random() * 2;             // 3.00 - 5.00
        } else if (roll < 99) {
            mult = 5 + Math.random() * 5;             // 5.00 - 10.00
        } else if (roll < 99.7) {
            mult = 10 + Math.random() * 10;           // 10.00 - 20.00
        } else if (roll < 99.95) {
            mult = 20 + Math.random() * 15;           // 20.00 - 35.00
        } else {
            mult = 35 + Math.random() * 15;           // 35.00 - 50.00
        }

        return this.capWinMultiplier(mult);
    },

    // Returns a safe multiplier clamped to the 0x-50x range.
    capWinMultiplier: function (mult) {
        const value = parseFloat(mult);
        if (!isFinite(value) || value <= 0) return 0;
        return Math.min(this.MAX_WIN_MULTIPLIER, Math.round(value * 100) / 100);
    },

    // Payout helper: bet * multiplier, never above 50x the bet.
    calculatePayout: function (bet, mult) {
        const amount = parseFloat(bet);
        if (!isFinite(amount) || amount <= 0) return 0;
        return amount * this.capWinMultiplier(mult);
    },

    // Formats bet amounts without trailing zeroes (10 instead of 10.00).
    formatBetAmount: function (value) {
        const amount = parseFloat(value);
        if (!isFinite(amount)) return '0';
        return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
    },

    init: function () {
        if (this._initialized) return;
        this._initialized = true;

        // Listen for responses from parent
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || data.source !== 'game-parent') return;

            // Live config push from the parent (admin changed win chance)
            if (data.type === 'game-config-update') {
                const cfg = this._normalizeConfig(data.config);
                if (cfg) this._setGameConfig(cfg);
                return;
            }

            if (data.type === 'balance-response' && data.requestId) {
                const resolve = this._pendingRequests[data.requestId];
                if (resolve) {
                    resolve(data.balance);
                    delete this._pendingRequests[data.requestId];
                }
            }

            if (data.type === 'update-response' && data.requestId) {
                const resolve = this._pendingRequests[data.requestId];
                if (resolve) {
                    resolve(data.result);
                    delete this._pendingRequests[data.requestId];
                }
            }

            if (data.type === 'game-config-response' && data.requestId) {
                const cfg = this._normalizeConfig(data.config);
                if (cfg) this._setGameConfig(cfg);
                const resolve = this._pendingRequests[data.requestId];
                if (resolve) {
                    resolve(cfg || data.config);
                    delete this._pendingRequests[data.requestId];
                }
            }
        });
    },

    _normalizeConfig: function (cfg) {
        if (!cfg) return null;
        const value = parseFloat(cfg.winChance);
        return { winChance: isNaN(value) ? 50 : Math.max(0, Math.min(100, value)) };
    },

    _setGameConfig: function (cfg) {
        this._gameConfig = cfg;
        this._configListeners.forEach((listener) => {
            try {
                listener(cfg);
            } catch (e) {
                console.error('[GameBridge] Config listener error:', e);
            }
        });
    },

    /**
     * Subscribe to live win-chance updates pushed by the parent page.
     * The callback fires immediately with the last known config (if any)
     * and again whenever the admin changes the game's win chance.
     */
    onGameConfigUpdate: function (callback) {
        if (typeof callback !== 'function') return;
        this._configListeners.push(callback);
        if (this._gameConfig) {
            try {
                callback(this._gameConfig);
            } catch (e) {
                console.error('[GameBridge] Config listener error:', e);
            }
        }
    },

    // Send a message to parent and wait for response
    _sendAndWait: function (message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const requestId = ++this._requestId;
            message.requestId = requestId;
            message.source = 'game-iframe';

            this._pendingRequests[requestId] = resolve;

            // Timeout fallback
            setTimeout(() => {
                if (this._pendingRequests[requestId]) {
                    delete this._pendingRequests[requestId];
                    reject(new Error('[GameBridge] Parent did not respond in time'));
                }
            }, timeout);

            window.parent.postMessage(message, '*');
        });
    },

    // Try direct access first (same-origin), fall back to postMessage
    getAuth: function () {
        try {
            if (window.parent && window.parent !== window && window.parent.simpleAuth) {
                return window.parent.simpleAuth;
            }
        } catch (e) {
            // Cross-origin - expected, will use postMessage
        }
        return null;
    },

    getSupabase: function () {
        try {
            if (window.parent && window.parent !== window && window.parent.supabase) {
                return window.parent.supabase;
            }
        } catch (e) { }
        return null;
    },

    // Get balance - tries direct access, then postMessage
    getBalance: function () {
        // Try direct access (same-origin)
        const auth = this.getAuth();
        if (auth && auth.currentUser) {
            return parseFloat(auth.currentUser.balance) || 0;
        }

        // Fallback: localStorage (only works same-origin)
        try {
            const savedUser = localStorage.getItem('casino_user');
            if (savedUser) return parseFloat(JSON.parse(savedUser).balance) || 0;
        } catch (e) { }

        return 0;
    },

    // Async version that uses postMessage for cross-origin
    getBalanceAsync: async function () {
        // Try direct first
        const auth = this.getAuth();
        if (auth && auth.currentUser) {
            return parseFloat(auth.currentUser.balance) || 0;
        }

        // Use postMessage
        try {
            const balance = await this._sendAndWait({ type: 'get-balance' });
            return parseFloat(balance) || 0;
        } catch (e) {
            console.warn('[GameBridge] getBalanceAsync failed:', e.message);
            return 0;
        }
    },

    /**
     * Gets the per-game configuration set by the admin (currently win chance %).
     * Resolves to an object like { winChance: 50 }.
     * Tries direct parent access (same-origin), then localStorage, then postMessage.
     */
    getGameConfig: async function () {
        // 1. Direct parent access (same-origin)
        try {
            if (window.parent && window.parent !== window && window.parent.currentGameConfig) {
                const cfg = this._normalizeConfig(window.parent.currentGameConfig);
                if (cfg) {
                    this._setGameConfig(cfg);
                    return cfg;
                }
            }
        } catch (e) { }

        // 2. localStorage fallback (same-origin)
        try {
            const stored = localStorage.getItem('current_game_config');
            if (stored) {
                const cfg = this._normalizeConfig(JSON.parse(stored));
                if (cfg) {
                    this._setGameConfig(cfg);
                    return cfg;
                }
            }
        } catch (e) { }

        // 3. postMessage to parent (cross-origin)
        try {
            const cfg = await this._sendAndWait({ type: 'get-game-config' }, 3000);
            const normalized = this._normalizeConfig(cfg);
            if (normalized) {
                this._setGameConfig(normalized);
                return normalized;
            }
        } catch (e) {
            console.warn('[GameBridge] getGameConfig failed:', e.message);
        }

        return { winChance: 50 };
    },

    /**
     * Updates the balance in the database.
     * @param {number} newTotal - The new total balance after win/loss.
     * @param {number} change - The amount of change (+ for win, - for loss).
     * @param {string} description - Transaction description.
     * @returns {object} result or { error }
     */
    updateBalance: async function (newTotal, change, description) {
        if (isNaN(newTotal)) {
            console.error("[GameBridge] Refusing to sync NaN balance");
            return { error: "Invalid balance value" };
        }
        console.log(`[GameBridge] Syncing balance: change=${change}, newTotal=${newTotal}, desc=${description}`);

        const auth = this.getAuth();
        const supabase = this.getSupabase();

        // --- Method 1: Direct parent access (same-origin only) ---
        if (auth && auth.currentUser && typeof auth.updateBalance === 'function') {
            try {
                console.log("[GameBridge] Using Method 1 (Direct Auth)");
                const result = await auth.updateBalance(newTotal);

                if (result && result.error) {
                    console.error('[GameBridge] Auth method error:', result.error);
                } else {
                    console.log("[GameBridge] Auth update success");
                    if (supabase && Math.abs(change) > 0) {
                        try {
                            await supabase.from('transactions').insert([{
                                user_id: auth.currentUser.id,
                                type: change > 0 ? 'game_win' : 'game_bet',
                                amount: Math.abs(change),
                                description: description || 'Game Activity',
                                status: 'completed'
                            }]);
                        } catch (txErr) {
                            console.warn("[GameBridge] Tx log failed:", txErr);
                        }
                    }
                    if (auth.currentUser) auth.currentUser.balance = newTotal;
                    return { data: result ? result.data : null, error: null };
                }
            } catch (e) {
                console.error("[GameBridge] Method 1 exception:", e);
            }
        }

        // --- Method 2: PostMessage to parent (cross-origin) ---
        try {
            console.log("[GameBridge] Using Method 2 (PostMessage)");
            const result = await this._sendAndWait({
                type: 'update-balance',
                newTotal: newTotal,
                change: change,
                description: description || 'Game Activity'
            });

            if (result && result.error) {
                console.error('[GameBridge] PostMessage update error:', result.error);
                return { error: result.error };
            }

            console.log("[GameBridge] PostMessage update success");
            return { data: result ? result.data : null, error: null };
        } catch (e) {
            console.error("[GameBridge] Method 2 exception:", e);
            return { error: e.message };
        }
    },

    isLoggedIn: function () {
        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) return true;
        if (auth && auth.currentUser) return true;

        // Try postMessage (fire and forget check)
        // For sync check, use localStorage fallback
        try {
            return localStorage.getItem('casino_user') !== null;
        } catch (e) { }

        return false;
    },

    // Async version for cross-origin
    isLoggedInAsync: async function () {
        const auth = this.getAuth();
        if (auth && auth.currentUser) return true;

        try {
            const balance = await this._sendAndWait({ type: 'get-balance' }, 2000);
            return balance !== null && balance !== undefined;
        } catch (e) {
            return false;
        }
    },

    goHome: function () {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ source: 'game-iframe', type: 'close-game' }, '*');
            }
        } catch (e) {
            window.location.href = '../../index.html';
        }
    }
};

// Auto-initialize
GameBridge.init();
window.GameBridge = GameBridge;
