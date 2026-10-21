let games = []; // Will be loaded from Supabase
let siteSettings = {};
let currentGameId = null;
let lastAppliedWinChance = null;
let gameConfigChannel = null;
let userWinRateChannel = null;
let userWinRateRealtimeSubscribed = false;
let gameConfigPollTimer = null;
let gamesRealtimeSubscribed = false;

// ---------- Legal / Information Pages ----------
function getSiteName() {
    return (typeof siteSettings !== 'undefined' && siteSettings.site_logo_text) || 'Khelun ar Jitun';
}

function getSupportContactText() {
    const contact = (typeof siteSettings !== 'undefined' && siteSettings.support_email)
        ? String(siteSettings.support_email).trim()
        : '';
    if (/example\.(com|org|net)$/i.test(contact)) {
        return 'Support is available through the social and chat links in the footer.';
    }
    const digits = contact.replace(/\D/g, '');
    if (digits.length >= 10) return `WhatsApp: ${contact}`;
    if (contact.includes('@')) return `Email: ${contact}`;
    return 'Support is available through the social and chat links in the footer.';
}

const LEGAL_PAGES = {
    about: {
        title: 'About Us',
        body: () => `
            <p>${getSiteName()} is an online gaming platform intended for adults aged 18 and over.</p>
            <p>We provide access to games, account management, deposit and withdrawal requests, and promotional rewards. All payments, withdrawals, and bonuses are subject to review and to the terms shown on this site.</p>
            <p>If you have questions about the platform, please contact support using the official channels listed in the footer.</p>
        `
    },
    contact: {
        title: 'Contact',
        body: () => `
            <p>For account, payment, or technical support, contact us using the official channels below.</p>
            <p><strong>${getSupportContactText()}</strong></p>
            <p>Only use the support links published on this website. We will never ask for your password or a one-time verification code.</p>
        `
    },
    privacy: {
        title: 'Privacy Policy',
        body: () => `
            <p>This policy explains what information ${getSiteName()} collects and how it is used.</p>
            <h3>Information we collect</h3>
            <ul>
                <li>Account details such as username, mobile number, and optional WhatsApp number.</li>
                <li>Transaction details, including deposit and withdrawal requests and uploaded payment receipts.</li>
                <li>Gameplay, balance, and account activity needed to operate your account.</li>
                <li>Basic device, browser, and server log data used for security and troubleshooting.</li>
            </ul>
            <h3>How we use information</h3>
            <ul>
                <li>To create and manage your account and process payments and withdrawals.</li>
                <li>To provide customer support and respond to requests.</li>
                <li>To detect fraud, abuse, multiple accounts, and unauthorized activity.</li>
                <li>To meet legal and regulatory obligations.</li>
            </ul>
            <h3>Storage and sharing</h3>
            <p>Account and transaction data are stored in our database and file storage providers. We do not sell your personal information. We may share it with service providers that help us operate the platform, or when required by law.</p>
            <h3>Security</h3>
            <p>We use access controls and take reasonable steps to protect your information. No method of transmission or storage is completely secure. Never share your password with anyone.</p>
            <h3>Your choices</h3>
            <p>You may contact support to request access to, correction of, or deletion of your account information, subject to legal and payment record requirements.</p>
            <h3>Children</h3>
            <p>The platform is not intended for anyone under 18. If we learn that an underage person has an account, we will close it.</p>
            <p>We may update this policy from time to time. Continued use of the site means you accept the updated policy.</p>
        `
    },
    terms: {
        title: 'Terms & Conditions',
        body: () => `
            <p>By using ${getSiteName()}, you agree to these terms.</p>
            <h3>Eligibility</h3>
            <p>You must be at least 18 years old and legally able to enter into these terms. You are responsible for complying with the laws that apply to you.</p>
            <h3>Your account</h3>
            <ul>
                <li>Provide accurate account information and keep it up to date.</li>
                <li>Maintain only one account unless we expressly approve otherwise.</li>
                <li>Keep your password confidential and notify support of any unauthorized use.</li>
                <li>You are responsible for activity performed through your account.</li>
            </ul>
            <h3>Deposits, withdrawals, and bonuses</h3>
            <ul>
                <li>Deposits and withdrawals may require verification and are credited or paid after review.</li>
                <li>Minimum amounts, processing times, and payment provider rules are shown on the relevant pages.</li>
                <li>Bonuses are subject to the eligibility rules and campaign terms displayed before claiming.</li>
                <li>We may correct errors, reverse duplicate credits, or withhold payment where fraud or abuse is suspected.</li>
            </ul>
            <h3>Prohibited conduct</h3>
            <p>You must not engage in fraud, collusion, money laundering, multiple-account abuse, use of automated tools, or any attempt to manipulate games, bonuses, or payment systems.</p>
            <h3>Suspension and termination</h3>
            <p>We may suspend or close an account that violates these terms, is linked to fraud or abuse, or is required to be closed by law. Where appropriate, we will return any legitimately owed balance after review.</p>
            <h3>Liability</h3>
            <p>The platform is provided on an "as available" basis. To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of the site or from interruptions beyond our reasonable control.</p>
            <h3>Changes</h3>
            <p>We may update these terms. Continued use of the site after changes are published means you accept the updated terms.</p>
            <p>For questions about these terms, contact support.</p>
        `
    },
    responsible: {
        title: 'Responsible Gaming',
        body: () => `
            <p>${getSiteName()} is for adults aged 18 and over. Gaming involves financial risk and can become harmful if it is not controlled.</p>
            <h3>Keep it safe</h3>
            <ul>
                <li>Never stake money you cannot afford to lose.</li>
                <li>Set a spending limit and a time limit before you start.</li>
                <li>Take regular breaks and avoid playing when upset, tired, or under the influence.</li>
                <li>Do not chase losses or borrow money to play.</li>
                <li>Do not play to recover debts or solve financial problems.</li>
            </ul>
            <h3>Self-exclusion</h3>
            <p>If you feel your gaming is becoming a problem, contact support and ask for a temporary or permanent account closure. We may ask for reasonable verification before applying the restriction.</p>
            <h3>Underage gaming</h3>
            <p>Underage accounts are not permitted. If you believe a minor has registered, contact support so the account can be closed.</p>
            <h3>Getting help</h3>
            <p>If gaming is affecting your health, relationships, or finances, speak with a qualified local support service or healthcare professional.</p>
        `
    }
};

function openLegalPage(key) {
    const page = LEGAL_PAGES[key];
    const modal = document.getElementById('legalModal');
    if (!page || !modal) return;

    document.getElementById('legalTitle').textContent = page.title;
    document.getElementById('legalBody').innerHTML = page.body();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLegalPage() {
    const modal = document.getElementById('legalModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Initialize content on load
document.addEventListener('DOMContentLoaded', () => {
    const legalModal = document.getElementById('legalModal');
    if (legalModal) {
        legalModal.addEventListener('click', (e) => {
            if (e.target === legalModal) closeLegalPage();
        });
    }
    loadSiteContent();
    initGameConfigRealtime();
    initUserWinRateRealtime();
    startGameConfigPolling();
    registerServiceWorker();
    initPwaInstall();
});

async function loadSiteContent() {
    try {
        console.log("Loading site content...");

        // 0. Init Registration Timer
        if (typeof initRegistrationTimer === 'function') {
            console.log("Starting timer check...");
            initRegistrationTimer();
        }

        // 1. Load Settings
        const { data: settings, error: settingsError } = await supabase.from('site_settings').select('*').single();
        if (settings) {
            siteSettings = settings;
            updateSiteSettings(settings);
        }

        // 2. Load Games
        let { data: fetchedGames, error: gamesError } = await supabase
            .from('games')
            .select('*')
            .eq('is_active', true)
            .order('display_priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (gamesError && /display_priority/i.test(gamesError.message || '')) {
            console.warn("games.display_priority column missing in DB - falling back to created_at. Run supabase.sql migration to enable ordering.");
            ({ data: fetchedGames } = await supabase
                .from('games')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false }));
        }

        if (fetchedGames) {
            games = fetchedGames;
            renderGames();
        } else {
            games = [];
            renderGames();
        }

        // 3. Load Carousel
        console.log("Loading carousel...");
        loadCarousel();

    } catch (e) {
        console.error("Error loading content:", e);
    }
}

function updateSiteSettings(settings) {
    // Update Logo
    const logoEl = document.querySelector('.logo');
    if (logoEl) {
        if (settings.site_logo_url) {
            logoEl.innerHTML = `<img src="${settings.site_logo_url}" alt="${settings.site_logo_text || 'Logo'}" style="height: 40px;">`;
        } else if (settings.site_logo_text) {
            logoEl.textContent = settings.site_logo_text;
        }
    }

    // Update Browser Tab Title
    if (settings.site_logo_text) {
        document.title = settings.site_logo_text;
    }

    // Update Welcome/Referral Bonus Texts elsewhere if needed

    // Update Social and Support links
    const updateLink = (id, url) => {
        const el = document.getElementById(id);
        if (el) {
            if (url && url.trim() !== '') {
                el.href = url;
                el.style.display = 'flex';
                el.target = '_blank';
            } else {
                el.style.display = 'none';
            }
        }
    };

    updateLink('linkTelegram', settings.telegram_link);
    updateLink('linkFacebook', settings.facebook_link);
    updateLink('linkWhatsapp', settings.whatsapp_link);
    updateLink('linkCustomChat', settings.livechat_link);

    const footerEmail = document.getElementById('footerEmail');
    if (footerEmail && settings.support_email) {
        const contact = String(settings.support_email).trim();
        const digits = contact.replace(/\D/g, '');

        if (/example\.(com|org|net)$/i.test(contact)) {
            footerEmail.textContent = 'Support: use the social links above';
            footerEmail.style.cursor = 'default';
            footerEmail.onclick = null;
        } else if (digits.length >= 10) {
            footerEmail.textContent = `WhatsApp: ${contact}`;
            footerEmail.style.cursor = 'pointer';
            footerEmail.onclick = () => window.open(`https://wa.me/${digits}`, '_blank');
        } else if (contact.includes('@')) {
            footerEmail.textContent = `Email: ${contact}`;
            footerEmail.style.cursor = 'pointer';
            footerEmail.onclick = () => { window.location.href = `mailto:${contact}`; };
        } else {
            footerEmail.textContent = 'Support: use the social links above';
            footerEmail.style.cursor = 'default';
            footerEmail.onclick = null;
        }
    }
}

async function loadCarousel() {
    try {
        const { data: items } = await supabase.from('carousel_items').select('*').order('created_at', { ascending: false });
        if (items && items.length > 0) {
            const carouselContainer = document.querySelector('.carousel');
            if (!carouselContainer) return;

            // Clear existing slides and dots
            carouselContainer.innerHTML = `
                <div class="carousel-dots"></div>
            `;

            items.forEach((item, index) => {
                const slide = document.createElement('div');
                slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
                slide.style.backgroundImage = `url('${item.image_url}')`;
                if (item.link_url) {
                    slide.style.cursor = 'pointer';
                    slide.onclick = () => window.open(item.link_url, '_blank');
                }
                carouselContainer.insertBefore(slide, carouselContainer.querySelector('.carousel-dots'));

                // Add dot
                const dot = document.createElement('div');
                dot.className = `dot ${index === 0 ? 'active' : ''}`;
                document.querySelector('.carousel-dots').appendChild(dot);
            });

            // Re-initialize carousel script if needed (handled by existing JS likely, but we need to check)
            // Since we replaced the DOM, we might need to restart the interval logic.
            startCarouselInterval();
        }
    } catch (e) {
        console.error("Carousel load error:", e);
    }
}

let carouselInterval;
function startCarouselInterval() {
    if (carouselInterval) clearInterval(carouselInterval);

    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;

    if (slides.length === 0) return;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    carouselInterval = setInterval(nextSlide, 5000);

    // Dot click handlers
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
            clearInterval(carouselInterval);
            carouselInterval = setInterval(nextSlide, 5000);
        });
    });
}


document.getElementById("depositMethod")?.addEventListener("change", function () {
    const paymentNumberInput = document.getElementById("depositMerchantNumber");
    const selectedMethod = this.value;

    if (!paymentNumberInput) return;

    // Use fetched settings or fallbacks
    const paymentNumbers = {
        bkash: siteSettings.bkash_number || "Not available",
        nagad: siteSettings.nagad_number || "Not available",
        rocket: siteSettings.rocket_number || "Not available",
        usdt: siteSettings.usdt_address || "Not available",
        crypto: siteSettings.usdt_address || "Not available"
    };

    if (selectedMethod === "") {
        paymentNumberInput.value = "";
        paymentNumberInput.placeholder = "Select a payment method above";
    } else {
        paymentNumberInput.value = paymentNumbers[selectedMethod] || "Not available";
    }
});





// the link you want to open
const targetLink = "https://www.facebook.com/profile.php?id=61583357891198";

// select all elements with class 'contact-info'
document.querySelectorAll(".live-chat").forEach(el => {
    el.addEventListener("click", () => {
        window.open(targetLink, "_blank"); // opens in new tab
    });
});






// Game data with categories, links, and names
// Games are now loaded dynamically from Supabase





// DOM elements
const gamesContainer = document.getElementById('gamesContainer');
const menuItems = document.querySelectorAll('.menu-item');
const pageContents = document.querySelectorAll('.page-content');
const navItems = document.querySelectorAll('.nav-item');

// Function to render games based on category
function renderGames(category = 'all') {
    gamesContainer.innerHTML = '';

    const filteredGames = (category === 'all'
        ? games
        : games.filter(game => game.category === category)
    ).slice().sort((a, b) => {
        const pa = a.display_priority != null ? Number(a.display_priority) : 1000;
        const pb = b.display_priority != null ? Number(b.display_priority) : 1000;
        if (pb !== pa) return pb - pa; // Higher priority first
        return new Date(b.created_at || 0) - new Date(a.created_at || 0); // Newest first
    });

    if (filteredGames.length === 0) {
        gamesContainer.innerHTML = '<div class="no-games">No games found in this category</div>';
        return;
    }

    filteredGames.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.innerHTML = `
            <div class="game-image-container">
                <img src="${game.image_url}" alt="${game.name}" class="game-image">
                <div class="game-overlay">
                    <button class="play-btn" onclick="openGame('${game.play_url}', '${game.vip_level_required || 'Bronze'}', '${game.name}', ${game.win_chance != null ? game.win_chance : 50}, '${game.id}')">PLAY</button>
                </div>
            </div>
            <div class="game-name">${game.name}</div>
        `;
        gamesContainer.appendChild(gameCard);
    });
}

function getActiveGameCategory() {
    const active = document.querySelector('.menu-item.active');
    return active ? (active.getAttribute('data-category') || 'all') : 'all';
}

// Apply the win chance to the active game and push it into the iframe live
function applyGameConfig(winChance, force = false) {
    const parsed = parseFloat(winChance);
    const normalized = Math.max(0, Math.min(100, isNaN(parsed) ? 50 : parsed));

    if (!force && lastAppliedWinChance === normalized && window.currentGameConfig) return;

    lastAppliedWinChance = normalized;
    window.currentGameConfig = { winChance: normalized };
    try {
        localStorage.setItem('current_game_config', JSON.stringify(window.currentGameConfig));
    } catch (e) { }

    const iframe = document.getElementById('gameIframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            source: 'game-parent',
            type: 'game-config-update',
            config: window.currentGameConfig
        }, '*');
    }
}

// Fetch this user's win-rate override for a game (if one exists).
// Returns null when the user has no override (or the table is not migrated yet).
async function fetchUserWinRateOverride(gameId) {
    if (!gameId || !window.supabase) return null;

    const user = (typeof simpleAuth !== 'undefined') ? simpleAuth.currentUser : null;
    if (!user || !user.id) return null;

    try {
        const { data, error } = await supabase
            .from('user_game_win_rates')
            .select('win_chance')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .maybeSingle();

        if (error) {
            if (!/user_game_win_rates/i.test(error.message || '')) {
                console.warn('Could not load user win rate override:', error.message);
            }
            return null;
        }
        if (!data || data.win_chance == null) return null;

        const parsed = parseFloat(data.win_chance);
        if (isNaN(parsed)) return null;
        return Math.max(0, Math.min(100, parsed));
    } catch (e) {
        console.warn('Failed to load user win rate override:', e);
        return null;
    }
}

// Fetch the latest win chance for the game currently being played.
// A per-user override always wins over the game's default win_chance.
async function refreshCurrentGameConfig() {
    if (!currentGameId || !window.supabase) return;

    try {
        const { data, error } = await supabase
            .from('games')
            .select('win_chance')
            .eq('id', currentGameId)
            .maybeSingle();

        const defaultWinChance = (!error && data && data.win_chance != null)
            ? parseFloat(data.win_chance)
            : null;
        const override = await fetchUserWinRateOverride(currentGameId);

        if (override != null) {
            applyGameConfig(override);
        } else if (defaultWinChance != null && !isNaN(defaultWinChance)) {
            applyGameConfig(defaultWinChance);
        }
    } catch (e) {
        console.warn('Failed to refresh game config:', e);
    }
}

// Instant updates via Supabase Realtime (all connected players)
function initGameConfigRealtime() {
    if (!window.supabase || gameConfigChannel) return;

    try {
        gameConfigChannel = supabase
            .channel('games-live-config')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, (payload) => {
                const updated = payload.new;
                if (!updated || !updated.id) return;

                const index = games.findIndex(g => g.id === updated.id);
                if (index !== -1) {
                    if (updated.is_active === false) {
                        games.splice(index, 1);
                    } else {
                        games[index] = { ...games[index], ...updated };
                    }
                    renderGames(getActiveGameCategory());
                }

                if (currentGameId === updated.id) {
                    refreshCurrentGameConfig();
                }
            })
            .subscribe((status) => {
                gamesRealtimeSubscribed = status === 'SUBSCRIBED';
                if (gamesRealtimeSubscribed) {
                    console.log('Live game config updates connected');
                }
            });
    } catch (e) {
        console.warn('Realtime game config subscription failed:', e);
    }
}

// Live per-user override updates (admin changes while the player is in a game)
function initUserWinRateRealtime() {
    if (!window.supabase || userWinRateChannel) return;

    try {
        userWinRateChannel = supabase
            .channel('user-game-win-rates-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_game_win_rates' }, (payload) => {
                const row = payload.new || payload.old;
                if (!row) return;

                const user = (typeof simpleAuth !== 'undefined') ? simpleAuth.currentUser : null;
                if (!user || !user.id) return;
                if (row.user_id !== user.id || row.game_id !== currentGameId) return;

                refreshCurrentGameConfig();
            })
            .subscribe((status) => {
                userWinRateRealtimeSubscribed = status === 'SUBSCRIBED';
            });
    } catch (e) {
        console.warn('Realtime user win-rate subscription failed:', e);
    }
}

// Fallback polling while a game is open (covers projects without Realtime enabled)
function startGameConfigPolling() {
    if (gameConfigPollTimer) return;

    gameConfigPollTimer = setInterval(() => {
        if (gamesRealtimeSubscribed && userWinRateRealtimeSubscribed) return;
        const modal = document.getElementById('gamePlayModal');
        if (!currentGameId || !modal || modal.style.display === 'none') return;
        refreshCurrentGameConfig();
    }, 3000);
}

async function openGame(url, vipRequired, name, winChance = 50, gameId = null) {
    console.log('Opening game:', name, 'URL:', url);

    // Track the active game and expose its win chance to the iframe
    const activeGameId = gameId || null;
    currentGameId = activeGameId;
    applyGameConfig(winChance, true);

    if (!simpleAuth.isLoggedIn()) {
        createAuthModal();
        document.getElementById('authModal').style.display = 'block';
        return;
    }

    // If no URL is set for this game, show the VIP/promotional popup from admin settings
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
        checkVipAndPlay(vipRequired || 'Bronze', name);
        return;
    }

    // Wait for the user's override so the game starts with the correct rate
    const override = await fetchUserWinRateOverride(activeGameId);
    if (currentGameId !== activeGameId) return;
    if (override != null) applyGameConfig(override, true);

    const modal = document.getElementById('gamePlayModal');
    const iframe = document.getElementById('gameIframe');

    if (modal && iframe) {
        // Force the URL to be relative if it's pointing to localhost/127.0.0.1
        // to avoid cross-origin issues during local testing
        let finalUrl = url;
        if (url.includes('127.0.0.1') || url.includes('localhost')) {
            try {
                const urlObj = new URL(url);
                finalUrl = urlObj.pathname.substring(1); // Remove leading slash
            } catch (e) { console.error("URL Parse error", e); }
        }

        // --- SINGLE GAME LOCK ---
        // Generate a unique ID for this specific game instance
        const instanceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        simpleAuth.currentGameInstanceId = instanceId;

        // Update DB to notify other tabs/devices to close their games
        supabase.from('profiles')
            .update({ active_game_id: instanceId })
            .eq('id', simpleAuth.currentUser.id)
            .then(({ error }) => {
                if (error) console.error('Failed to set active_game_id:', error);
            });
        // -------------------------

        iframe.src = finalUrl;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Ensure modal is on top
        modal.style.zIndex = '999999';

        // Pull the freshest win chance in case the page cached an old value
        refreshCurrentGameConfig();
    } else {
        console.error("Game Modal elements not found! Check that gamePlayModal and gameIframe exist in index.html");
    }
}

function closeGameModal() {
    console.log('Closing game modal and refreshing balance...');
    const modal = document.getElementById('gamePlayModal');
    const iframe = document.getElementById('gameIframe');

    // Clear active game ID in DB when closed manually
    if (typeof simpleAuth !== 'undefined' && simpleAuth.currentUser) {
        supabase.from('profiles')
            .update({ active_game_id: null })
            .eq('id', simpleAuth.currentUser.id)
            .then(() => {
                simpleAuth.currentGameInstanceId = null;
            });
    }

    if (modal && iframe) {
        iframe.src = '';
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    currentGameId = null;
    lastAppliedWinChance = null;

    // Always refresh user profile from DB to get latest balance after game
    if (typeof simpleAuth !== 'undefined' && simpleAuth.currentUser) {
        simpleAuth.refreshUser().then(() => {
            console.log('Balance refreshed after game close');
        });
    }
}

// === Game Bridge PostMessage Listener (Cross-Origin Support) ===
window.addEventListener('message', async function (event) {
    const data = event.data;
    if (!data || data.source !== 'game-iframe') return;

    const iframe = document.getElementById('gameIframe');

    if (data.type === 'get-balance') {
        const balance = simpleAuth && simpleAuth.currentUser ? simpleAuth.currentUser.balance : 0;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                source: 'game-parent',
                type: 'balance-response',
                requestId: data.requestId,
                balance: balance
            }, '*');
        }
    }

    if (data.type === 'get-game-config') {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                source: 'game-parent',
                type: 'game-config-response',
                requestId: data.requestId,
                config: window.currentGameConfig || { winChance: 50 }
            }, '*');
        }
    }

    if (data.type === 'update-balance') {
        let result = { error: null, data: null };
        try {
            if (simpleAuth && simpleAuth.currentUser) {
                // Update balance in DB
                const { data: updated, error } = await supabase
                    .from('profiles')
                    .update({ balance: data.newTotal })
                    .eq('id', simpleAuth.currentUser.id)
                    .select()
                    .maybeSingle();

                if (error) {
                    result = { error: error.message };
                } else {
                    // Update local state
                    simpleAuth.currentUser.balance = data.newTotal;
                    localStorage.setItem('casino_user', JSON.stringify(simpleAuth.currentUser));
                    simpleAuth.updateHeaderBalance();

                    // Log transaction
                    if (Math.abs(data.change) > 0) {
                        await supabase.from('transactions').insert([{
                            user_id: simpleAuth.currentUser.id,
                            type: data.change > 0 ? 'game_win' : 'game_bet',
                            amount: Math.abs(data.change),
                            description: data.description || 'Game Activity',
                            status: 'completed'
                        }]);
                    }
                    result = { data: updated, error: null };
                }
            } else {
                result = { error: 'User not logged in' };
            }
        } catch (e) {
            result = { error: e.message };
        }

        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                source: 'game-parent',
                type: 'update-response',
                requestId: data.requestId,
                result: result
            }, '*');
        }
    }

    if (data.type === 'close-game') {
        closeGameModal();
    }
});

// Function to show specific page - UPDATED
function showPage(pageId) {
    console.log('Showing page:', pageId);

    // Check if user is logged in for protected pages
    const protectedPages = ['referralPage', 'depositPage', 'rewardsPage', 'accountPage'];

    if (protectedPages.includes(pageId) && !simpleAuth.isLoggedIn()) {
        // Show login modal instead of protected page
        createAuthModal();
        document.getElementById('authModal').style.display = 'block';
        return;
    }

    // Hide all pages
    pageContents.forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update active nav item
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });

    // Update page content if user is logged in
    if (simpleAuth.isLoggedIn() && simpleAuth.currentUser) {
        switch (pageId) {
            case 'accountPage':
                simpleAuth.updateAccountInfo();
                break;
            case 'referralPage':
                simpleAuth.updateReferralPage();
                break;
            case 'rewardsPage':
                simpleAuth.updateRewardsPage();
                break;
            case 'depositPage':
                simpleAuth.updateDepositPage();
                break;
        }
    }
}


// Initialize with all games
renderGames();

// Category filtering
menuItems.forEach(item => {
    item.addEventListener('click', function () {
        // Update active menu item
        menuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        // Filter games
        const category = this.getAttribute('data-category');
        renderGames(category);
    });
});

// Page navigation - UPDATED
navItems.forEach(item => {
    item.addEventListener('click', function () {
        const pageId = this.getAttribute('data-page');
        showPage(pageId);
    });
});

// Carousel functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.dot');

function showSlide(n) {
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    currentSlide = (n + slides.length) % slides.length;

    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

// Auto slide change
setInterval(() => {
    showSlide(currentSlide + 1);
}, 5000);

// Add click events to dots
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
    });
});

// Login button functionality - UPDATED
document.getElementById('headerLoginBtn').addEventListener('click', function () {
    if (simpleAuth.isLoggedIn()) {
        // User is logged in, show logout confirmation
        if (confirm('Are you sure you want to logout?')) {
            simpleAuth.logout();
        }
    } else {
        // User is not logged in, show auth modal
        createAuthModal();
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
});

// Deposit form submission
document.getElementById('depositBtn')?.addEventListener('click', async function () {
    if (!simpleAuth.isLoggedIn()) {
        alert('Please login first');
        return;
    }

    const method = document.getElementById('depositMethod').value;
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const trxId = document.getElementById('depositTrxId').value;
    const receiptFile = document.getElementById('depositReceipt').files[0];

    if (!method || !amount || amount < 500 || !trxId) {
        alert('Minimum deposit ৳500, and check Transaction ID');
        return;
    }

    if (!receiptFile) {
        alert('Please upload a deposit receipt screenshot');
        return;
    }

    try {
        const btn = document.getElementById('depositBtn');
        const originalText = btn.textContent;
        btn.textContent = 'UPLOADING RECEIPT...';
        btn.disabled = true;

        let receiptUrl = '';
        try {
            const fileName = `${Date.now()}_${simpleAuth.currentUser.username}_receipt.${receiptFile.name.split('.').pop()}`;
            const { data, error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(`receipts/${fileName}`, receiptFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('site-assets')
                .getPublicUrl(`receipts/${fileName}`);

            receiptUrl = publicUrl;
        } catch (uploadErr) {
            console.error('File upload error:', uploadErr);
            throw new Error('Failed to upload receipt image. Please try again.');
        }

        btn.textContent = 'SUBMITTING...';
        const { error } = await supabase.from('transactions').insert([{
            user_id: simpleAuth.currentUser.id,
            type: 'deposit',
            amount: amount,
            description: `Deposit via ${method}. TrxID: ${trxId || 'N/A'}`,
            receipt_url: receiptUrl,
            status: 'pending',
            created_at: new Date().toISOString()
        }]);

        if (error) throw error;

        alert('আপনার অনুরোধ সফল হয়েছে , দয়া করে আমাদের সময় দিন আপনার ডিপোজিট প্রসেস করতে।');

        // Reset form
        document.getElementById('depositAmount').value = '';
        document.getElementById('depositTrxId').value = '';
        document.getElementById('depositReceipt').value = '';

        btn.textContent = originalText;
        btn.disabled = false;
    } catch (e) {
        alert('Submission failed: ' + e.message);
        const btn = document.getElementById('depositBtn');
        btn.textContent = 'DEPOSIT NOW';
        btn.disabled = false;
    }
});

// Withdraw form submission
document.getElementById('withdrawBtn')?.addEventListener('click', async function () {
    if (!simpleAuth.isLoggedIn()) {
        alert('Please login first');
        return;
    }

    const method = document.getElementById('withdrawMethod').value;
    const number = document.getElementById('withdrawNumber').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);

    if (!method || !number || !amount || amount < 1000) {
        alert('Minimum withdraw ৳1000');
        return;
    }

    if (simpleAuth.currentUser.balance < amount) {
        alert('Insufficient balance!');
        return;
    }

    if (!confirm(`Are you sure you want to withdraw ৳${amount} to ${number} (${method})?`)) return;

    try {
        const btn = document.getElementById('withdrawBtn');
        const originalText = btn.textContent;
        btn.textContent = 'PROCESSING...';
        btn.disabled = true;

        // Direct deduct from balance
        const { error: balanceError } = await simpleAuth.addToBalance(-amount);
        if (balanceError) throw balanceError;

        // Create pending transaction
        const { error: txError } = await supabase.from('transactions').insert([{
            user_id: simpleAuth.currentUser.id,
            type: 'withdraw',
            amount: amount,
            description: `Withdrawal to ${number} (${method})`,
            status: 'pending',
            created_at: new Date().toISOString()
        }]);

        if (txError) throw txError;

        alert('Withdrawal request submitted! Amount deducted from balance.');

        // Reset form
        document.getElementById('withdrawNumber').value = '';
        document.getElementById('withdrawAmount').value = '';

        btn.textContent = originalText;
        btn.disabled = false;

        // Update account info display
        if (typeof simpleAuth !== 'undefined') simpleAuth.updateAccountInfo();

    } catch (e) {
        alert('Withdrawal failed: ' + e.message);
        const btn = document.getElementById('withdrawBtn');
        btn.textContent = 'Withdraw NOW';
        btn.disabled = false;
    }
});

// Global Claim Bonus Function
// Global Claim Bonus Function
async function claimBonus(bonusType, campaignId, isSilent = false) {
    if (!simpleAuth.isLoggedIn()) {
        if (!isSilent) alert('Please login first to claim your bonus!');
        return;
    }

    try {
        // ... (referral bonus logic) ...
        if (bonusType === 'referral_bonus') {
            const { data: settings } = await supabase.from('site_settings').select('referral_bonus').single();
            const refBonusAmt = settings?.referral_bonus || 0;

            // Re-fetch user detail for accurate count
            const { data: user } = await supabase.from('profiles').select('friends_referred, total_earnings').eq('id', simpleAuth.currentUser.id).single();
            const { data: allTransactions } = await supabase.from('transactions').select('description').eq('user_id', simpleAuth.currentUser.id).eq('type', 'bonus');

            const referredFriends = user?.friends_referred || 0;
            // Count successful referral bonus claims with stricter matching (same as rewards page)
            const claimedRefs = (allTransactions || []).filter(c => {
                const desc = (c.description || '');
                return desc === 'Referral Bonus Claim' ||
                    desc === 'Referral Bonus: Claimed success referral' ||
                    desc.toLowerCase() === 'referral bonus claim';
            }).length;

            const unclaimedRefs = referredFriends - claimedRefs;

            if (unclaimedRefs <= 0) {
                if (!isSilent) alert('No pending referral bonuses to claim!');
                return;
            }

            const totalClaimAmount = refBonusAmt * unclaimedRefs;

            // Process claim (Add to balance)
            const { error: balanceErr } = await simpleAuth.addToBalance(totalClaimAmount);
            if (balanceErr) throw balanceErr;

            // Update total_earnings in profile if schema allow (usually it should, if not it just ignores)
            const newTotalEarnings = (user.total_earnings || 0) + totalClaimAmount;
            await supabase.from('profiles').update({ total_earnings: newTotalEarnings }).eq('id', simpleAuth.currentUser.id);

            // Insert transitions (one per referral for clean history and correct unclaimed calculation)
            const transactions = [];
            for (let i = 0; i < unclaimedRefs; i++) {
                transactions.push({
                    user_id: simpleAuth.currentUser.id,
                    type: 'bonus',
                    amount: refBonusAmt,
                    description: 'Referral Bonus Claim',
                    status: 'completed',
                    created_at: new Date().toISOString()
                });
            }
            await supabase.from('transactions').insert(transactions);

            if (!isSilent) alert(`Congratulations! You have successfully claimed ${unclaimedRefs} referral bonus(es) total of ৳${totalClaimAmount}!`);

            // Refresh UI
            await simpleAuth.updateRewardsPage();
            simpleAuth.updateAccountInfo();
            return;
        }

        // 1. Fetch Campaign Details (for dynamic campaigns)
        const { data: camp, error: campErr } = await supabase
            .from('available_bonuses')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campErr || !camp) throw new Error('Bonus campaign not found or inactive.');

        // 2. Double-check eligibility (Manual or Auto-Unlock)
        // For Re-claims: Find the OLDEST unused eligibility record for this user/type/amount
        const [eligRes, claimsRes] = await Promise.all([
            supabase.from('user_bonus_eligibility')
                .select('*')
                .eq('user_id', simpleAuth.currentUser.id)
                .eq('bonus_type', bonusType)
                .eq('amount', camp.amount)
                .eq('is_available', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle(),
            supabase.from('transactions')
                .select('description')
                .eq('user_id', simpleAuth.currentUser.id)
                .eq('type', 'bonus')
        ]);

        const eligibility = eligRes.data;
        const allBonusClaims = claimsRes.data || [];
        const maxClaims = camp.max_claims_per_user || 1;

        // Strict count matching the rewards page logic
        const claimCount = allBonusClaims.filter(c => {
            if (!c.description) return false;
            const desc = c.description;
            return desc === `Claimed Bonus: ${camp.bonus_name}` ||
                desc === `${camp.bonus_name} Bonus Claimed` ||
                desc === camp.bonus_name;
        }).length;

        // Logic: 
        // 1. If it's manual (eligibility exists), allow claim.
        // 2. If it's auto-unlock AND claimCount < maxClaims, allow claim.
        // 3. Otherwise, reject.

        const canClaimManual = !!eligibility;
        const canClaimAuto = camp.auto_unlock && claimCount < maxClaims;

        if (!canClaimManual && !canClaimAuto) {
            const msg = camp.auto_unlock ? 'Maximum claims reached.' : 'You have already claimed your available grant. Ask an admin for a re-grant!';
            if (!isSilent) alert(msg);
            return;
        }

        // 3. Process Claim
        console.log(`Processing claim for ${camp.bonus_name}...`);

        // Add to balance
        const { error: balanceErr } = await simpleAuth.addToBalance(camp.amount);
        if (balanceErr) throw balanceErr;

        // Create transaction
        await supabase.from('transactions').insert([{
            user_id: simpleAuth.currentUser.id,
            type: 'bonus',
            amount: camp.amount,
            description: `Claimed Bonus: ${camp.bonus_name}`,
            status: 'completed',
            created_at: new Date().toISOString()
        }]);

        // Consume THIS SPECIFIC eligibility record
        if (eligibility) {
            await supabase.from('user_bonus_eligibility')
                .update({
                    is_available: false,
                    claims_used: 1
                })
                .eq('id', eligibility.id);
        }

        if (!isSilent) alert(`Congratulations! You have successfully claimed ৳${camp.amount} ${camp.bonus_name}!`);

        // 4. Refresh UI (Avoid recursion in silent mode)
        if (!isSilent) {
            simpleAuth.updateRewardsPage();
        }
        simpleAuth.updateAccountInfo();

    } catch (err) {
        console.error('Error claiming bonus:', err);
        if (!isSilent) alert('Failed to claim bonus: ' + err.message);
    }
}

// Account action buttons
document.querySelectorAll('.action-btn').forEach(button => {
    button.addEventListener('click', function () {
        const action = this.textContent.trim();
    });
});

// Auth Modal Functions
function createAuthModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('authModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="authModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2 style="color: #ffcc00; text-align: center; margin-bottom: 20px;">Welcome</h2>
                <div class="auth-tabs">
                    <button class="tab-btn active" data-tab="login">Login</button>
                    <button class="tab-btn" data-tab="signup">Register</button>
                </div>
                
                <div id="loginTab" class="tab-content active">
                    <form id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Username or Mobile</label>
                            <input type="text" class="form-input" id="loginUsername" required placeholder="Enter username or mobile">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="loginPassword" required placeholder="Enter password">
                        </div>
                        <button type="submit" class="submit-btn">LOGIN</button>
                    </form>
                </div>
                
                <div id="signupTab" class="tab-content">
                    <form id="signupForm">
                        <div class="form-group">
                            <label class="form-label">Username *</label>
                            <input type="text" class="form-input" id="signupUsername" required placeholder="Choose a username">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mobile Number *</label>
                            <input type="tel" class="form-input" id="signupMobile" required placeholder="Enter mobile number">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password *</label>
                            <input type="password" class="form-input" id="signupPassword" required minlength="6" placeholder="At least 6 characters">
                        </div>
                        <div class="form-group">
                            <label class="form-label">WhatsApp (Optional)</label>
                            <input type="number" class="form-input" id="signupEmail" placeholder="WhatsApp Number">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Referral Code (Optional)</label>
                            <input type="text" class="form-input" id="signupReferralCode" placeholder="Enter referral code if any">
                        </div>
                        <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                            <input type="checkbox" id="signupAgeConfirm" required style="width: auto; margin-top: 4px;">
                            <label for="signupAgeConfirm" class="form-label"
                                style="margin: 0; text-transform: none; font-size: 12px; line-height: 1.4;">
                                I am at least 18 years old and agree to the
                                <a href="#" onclick="openLegalPage('terms'); return false;" style="color: #ffcc00;">Terms &amp; Conditions</a>
                                and
                                <a href="#" onclick="openLegalPage('privacy'); return false;" style="color: #ffcc00;">Privacy Policy</a>.
                            </label>
                        </div>
                        <button type="submit" class="submit-btn">CREATE ACCOUNT</button>
                    </form>
                </div>
                
                <div id="authMessage" class="auth-message"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add modal event listeners
    const modal = document.getElementById('authModal');
    const closeBtn = modal.querySelector('.close');
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleSimpleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSimpleSignup);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function handleSimpleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('authMessage');

    try {
        messageEl.textContent = 'Logging in...';
        messageEl.className = 'auth-message info';

        const result = await simpleAuth.login(identifier, password);

        if (result.success) {
            messageEl.textContent = 'Login successful!';
            messageEl.className = 'auth-message success';

            setTimeout(() => {
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.style.display = 'none';
                }
                messageEl.textContent = '';
                document.getElementById('loginForm').reset();
            }, 1000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        messageEl.textContent = error.message;
        messageEl.className = 'auth-message error';
    }
}

async function handleSimpleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const mobile = document.getElementById('signupMobile').value;
    const password = document.getElementById('signupPassword').value;
    const email = document.getElementById('signupEmail').value;
    const referralCode = document.getElementById('signupReferralCode').value;
    const ageConfirmed = document.getElementById('signupAgeConfirm')?.checked;
    const messageEl = document.getElementById('authMessage');

    if (!ageConfirmed) {
        messageEl.textContent = 'You must confirm that you are 18 or older to register.';
        messageEl.className = 'auth-message error';
        return;
    }

    try {
        messageEl.textContent = 'Creating account...';
        messageEl.className = 'auth-message info';

        const result = await simpleAuth.register(username, mobile, password, email, referralCode);

        if (result.success) {
            messageEl.textContent = `Account created successfully! Welcome to ${getSiteName()}!`;
            messageEl.className = 'auth-message success';

            setTimeout(() => {
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.style.display = 'none';
                }
                messageEl.textContent = '';
                document.getElementById('signupForm').reset();
            }, 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        messageEl.textContent = error.message;
        messageEl.className = 'auth-message error';
    }
}

// Temporary fix: Clear corrupted auth data
function clearAuthData() {
    const savedUser = localStorage.getItem('casino_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            if (!user.id || !user.username) {
                localStorage.removeItem('casino_user');
                console.log('Cleared corrupted auth data');
            }
        } catch (error) {
            localStorage.removeItem('casino_user');
            console.log('Cleared invalid auth data');
        }
    }
}

// Run this on page load
document.addEventListener('DOMContentLoaded', function () {
    clearAuthData();
});


// --- VIP Level Check for Game Play ---
const VIP_LEVELS = {
    'Bronze': 1,
    'Silver': 2,
    'Gold': 3,
    'Platinum': 4,
    'Diamond': 5
};

async function checkVipAndPlay(requiredVipLevel, gameName) {
    // Check if user is logged in - show Visitor Popup if not
    if (!simpleAuth.currentUser) {
        try {
            const { data: settings, error } = await supabase
                .from('site_settings')
                .select('visitor_text')
                .eq('id', 1)
                .single();

            if (error) throw error;

            showVipPopup('Visitor', settings.visitor_text || 'Please login to play games.');
        } catch (e) {
            console.error(e);
            showVipPopup('Visitor', 'Please login to play games.');
        }
        return;
    }

    // Get the appropriate message based on USER'S VIP level if logged in, otherwise use required level
    const userVipLevel = simpleAuth.currentUser ? simpleAuth.currentUser.vip_level : 'Visitor';
    const effectiveVipLevel = simpleAuth.currentUser ? userVipLevel : requiredVipLevel;

    try {
        // Fetch site settings to get VIP popup messages
        const { data: settings, error } = await supabase
            .from('site_settings')
            .select('vip_bronze_text, vip_silver_text, vip_gold_text, vip_platinum_text, vip_diamond_text, vip_popup_text')
            .eq('id', 1)
            .single();

        if (error) throw error;

        // Get the appropriate message based on the effective VIP level
        let popupMessage = settings.vip_popup_text || 'Please upgrade your VIP level to play this game.';

        switch (effectiveVipLevel) {
            case 'Bronze':
                popupMessage = settings.vip_bronze_text || popupMessage;
                break;
            case 'Silver':
                popupMessage = settings.vip_silver_text || popupMessage;
                break;
            case 'Gold':
                popupMessage = settings.vip_gold_text || popupMessage;
                break;
            case 'Platinum':
                popupMessage = settings.vip_platinum_text || popupMessage;
                break;
            case 'Diamond':
                popupMessage = settings.vip_diamond_text || popupMessage;
                break;
        }

        // Show popup with the configured message
        showVipPopup(effectiveVipLevel, popupMessage);

    } catch (error) {
        console.error('Error fetching VIP settings:', error);
        // Fallback message if settings can't be loaded
        showVipPopup(requiredVipLevel, 'অনুগ্রহ করে ডিপোজিট করুন');
    }
}

function showVipPopup(requiredLevel, message) {
    // Create popup if it doesn't exist
    let overlay = document.getElementById('vip-popup-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'vip-popup-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'vip-popup-overlay' || e.target.id === 'close-popup') {
                overlay.style.display = 'none';
            }
        });
    }

    // Determine popup styling based on VIP level
    let bgColor, titleColor, btnColor, icon;

    switch (requiredLevel.toLowerCase()) {
        case 'bronze':
            bgColor = '#fff3cd';
            titleColor = '#b87333';
            btnColor = '#b87333';
            icon = '🥉';
            requiredLevel += ' VIP';
            break;
        case 'silver':
            bgColor = '#e6e6e6';
            titleColor = 'silver';
            btnColor = '#777';
            icon = '🥈';
            requiredLevel += ' VIP';
            break;
        case 'gold':
            bgColor = '#fffbe6';
            titleColor = 'gold';
            btnColor = 'gold';
            icon = '🥇';
            requiredLevel += ' VIP';
            break;
        case 'platinum':
            bgColor = '#e5e4e2';
            titleColor = '#e5e4e2';
            btnColor = '#666';
            icon = '💎';
            requiredLevel += ' VIP';
            break;
        case 'diamond':
            bgColor = '#b9f2ff';
            titleColor = '#00bfff';
            btnColor = '#00bfff';
            icon = '💎';
            requiredLevel += ' VIP';
            break;
        case 'visitor':
            bgColor = '#fff';
            titleColor = 'black';
            btnColor = '#ff4444';
            icon = '🔒';
            requiredLevel = 'Login Required'; // Override title text
            break;
        default:
            bgColor = '#fff';
            titleColor = 'black';
            btnColor = '#ff4444';
            icon = '🎮';
    }

    // Create popup HTML with original design
    overlay.innerHTML = `
        <div id="popup-box" style="
            background: ${bgColor};
            padding: 25px 30px;
            border-radius: 12px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            line-height: 1.5;
        ">
            <h2 style="color: ${titleColor}; margin-bottom: 15px;">${icon} ${requiredLevel}</h2>
            <div id="vip-popup-message" style="
                color: #333;
                font-size: 16px;
                margin-bottom: 20px;
                white-space: pre-wrap;
            ">${message}</div>
            <button id="close-popup" style="
                background: ${btnColor};
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 15px;
            ">Close</button>
        </div>
    `;

    overlay.style.display = 'flex';
}

function closeVipPopup() {
    const overlay = document.getElementById('vip-popup-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// --- 5️⃣ Close popup ---
document.addEventListener("click", e => {
    const overlay = document.getElementById("popup-overlay");
    if (!overlay) return;

    if (e.target.id === "close-popup" || e.target.id === "popup-overlay") {
        overlay.style.display = "none";
    }
});


// --- 6️⃣ Registration Timer Popup Logic ---

// Inject Styles
const timerStyles = `
    .timer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 2000000;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s ease;
    }
    .timer-modal {
        background: linear-gradient(135deg, #2c3e50, #000000);
        width: 90%;
        max-width: 450px;
        border-radius: 20px;
        position: relative;
        padding: 30px;
        box-shadow: 0 0 30px rgba(255, 204, 0, 0.3);
        border: 2px solid #ffcc00;
        text-align: center;
        animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .timer-modal-header {
        margin-bottom: 20px;
    }
    .timer-modal-icon {
        font-size: 50px;
        color: #ffcc00;
        margin-bottom: 15px;
        filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.5));
    }
    .timer-modal-title {
        font-size: 24px;
        font-weight: 800;
        color: #ffcc00;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0;
    }
    .timer-modal-body {
        margin-bottom: 25px;
    }
    .timer-modal-message {
        font-size: 16px;
        line-height: 1.6;
        color: #fff;
        font-weight: 400;
        margin: 15px 0;
    }
    .timer-modal-countdown {
        background: rgba(255, 204, 0, 0.1);
        padding: 15px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        gap: 12px;
        border: 1px dashed #ffcc00;
        margin-top: 10px;
        animation: pulse 1s infinite;
    }
    .timer-modal-time {
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 28px;
        font-weight: 900;
        color: #ffcc00;
    }
    .timer-modal-close {
        position: absolute;
        top: -15px;
        right: -15px;
        width: 40px;
        height: 40px;
        background: #ffcc00;
        border: none;
        border-radius: 50%;
        color: #000;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        transition: transform 0.2s;
    }
    .timer-modal-close:hover {
        transform: scale(1.1);
    }
    @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes pulse {
        0%, 100% { 
            background: rgba(255, 204, 0, 0.1); 
            box-shadow: 0 0 5px rgba(255, 204, 0, 0.2); 
        }
        50% { 
            background: rgba(255, 204, 0, 0.3); 
            box-shadow: 0 0 20px rgba(255, 204, 0, 0.6);
            transform: scale(1.02);
        }
    }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = timerStyles.trim();
document.head.appendChild(styleSheet);

// Make global immediately
window.initRegistrationTimer = initRegistrationTimer;
window.hideTimerPopup = hideTimerPopup;

let timerManuallyClosed = false;
let registrationTimerInterval = null;

async function initRegistrationTimer() {
    console.log("%cTimer: Initializing...", "color: #ffcc00; font-weight: bold;");
    try {
        if (typeof simpleAuth === 'undefined' || !simpleAuth) {
            console.warn("Timer: simpleAuth not found, waiting 1s...");
            setTimeout(initRegistrationTimer, 1000);
            return;
        }

        if (!simpleAuth.isLoggedIn()) {
            console.log("Timer: User not logged in. Banner will show after login/signup.");
            // We don't need to poll here, SimpleAuth will call us on login.
            return;
        }

        const user = simpleAuth.currentUser;
        if (!user) {
            console.warn("Timer: No current user profile found.");
            return;
        }

        console.log("Timer: Checking eligibility for:", user.username);

        // Fetch settings (siteSettings is global from initial load)
        let settings = siteSettings;
        if (!settings || Object.keys(settings).length === 0 || typeof settings.timer_popup_enabled === 'undefined') {
            console.log("Timer: Fetching fresh settings...");
            const { data: freshSettings } = await supabase.from('site_settings').select('*').single();
            settings = freshSettings;
            if (settings) siteSettings = settings; // Update global
        }

        if (!settings) {
            console.error("Timer: Could not load site settings.");
            return;
        }

        const isEnabled = String(settings.timer_popup_enabled) === 'true' || settings.timer_popup_enabled === true || settings.timer_popup_enabled === 1;
        if (!isEnabled) {
            console.log("Timer: Banner is DISABLED in settings. (Value:", settings.timer_popup_enabled, ")");
            return;
        }

        const creationDateStr = user.created_at || user.member_since;
        if (!creationDateStr) {
            console.log("Timer: Account creation date missing. Cannot show timer.");
            return;
        }

        // Parse date safely
        const memberSinceStr = creationDateStr.replace(' ', 'T');
        const memberSinceDate = new Date(memberSinceStr);

        if (isNaN(memberSinceDate.getTime())) {
            console.error("Timer: Invalid date format:", creationDateStr);
            return;
        }

        const memberSince = memberSinceDate.getTime();
        const durationMs = (parseFloat(settings.timer_popup_duration) || 1) * 60 * 60 * 1000;
        const expiryTime = memberSince + durationMs;
        const now = Date.now();

        const remainingMs = expiryTime - now;

        console.log("Timer: Created at:", memberSinceDate.toISOString());
        console.log("Timer: Duration:", (parseFloat(settings.timer_popup_duration) || 1), "hours");
        console.log("Timer: Current status:", remainingMs > 0 ? "Active" : "Expired");
        console.log("Timer: Time left:", Math.round(remainingMs / 1000), "seconds");

        if (remainingMs <= 0) {
            console.log("%cTimer: Time period EXPIRED. (Remaining: " + Math.round(remainingMs / 1000) + "s)", "color: #ff4444;");
            hideTimerPopup(true);
            return;
        }

        // Check if manually closed in this specific page view
        if (timerManuallyClosed) {
            console.log("Timer: Banner hidden (previously closed in this page view).");
            return;
        }

        const updateTimer = () => {
            const currentTime = Date.now();
            const remaining = expiryTime - currentTime;

            if (remaining <= 0) {
                console.log("Timer: Countdown reached 0.");
                hideTimerPopup(true);
                return;
            }

            showTimerPopup(settings, remaining);
        };

        if (registrationTimerInterval) clearInterval(registrationTimerInterval);

        updateTimer();
        registrationTimerInterval = setInterval(updateTimer, 1000);

    } catch (e) {
        console.error("Timer: Runtime error:", e);
    }
}

function showTimerPopup(settings, remainingMs) {
    if (timerManuallyClosed) return;

    let overlay = document.getElementById('registrationTimerOverlay');

    // Create the overlay and modal structure ONLY ONCE
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'registrationTimerOverlay';
        overlay.className = 'timer-overlay';
        overlay.innerHTML = `
            <div class="timer-modal">
                <button class="timer-modal-close" onclick="hideTimerPopup()" title="Close">&times;</button>
                <div class="timer-modal-header">
                    <div class="timer-modal-icon"><i class="fas fa-gift"></i></div>
                    <h2 class="timer-modal-title">${settings.timer_popup_title || 'Special Gift!'}</h2>
                </div>
                <div class="timer-modal-body">
                    <p class="timer-modal-message">${settings.timer_popup_message || 'Complete your first deposit within the time limit to claim your bonus!'}</p>
                    <div class="timer-modal-countdown">
                        <i class="fas fa-history" style="color: #ffcc00; font-size: 20px;"></i>
                        <span id="timerModalTimeDisplay" class="timer-modal-time">0:00:00</span>
                    </div>
                </div>
                <button class="submit-btn" onclick="if(window.simpleAuth) simpleAuth.showPage('depositPage'); hideTimerPopup();" style="margin-top: 10px;">DEPOSIT NOW</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.style.display = 'flex';
    }

    // Update ONLY the time text every second
    const timeDisplay = document.getElementById('timerModalTimeDisplay');
    if (timeDisplay) {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        const timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timeDisplay.textContent = timeStr;
    }

    if (overlay.style.display !== 'flex') {
        overlay.style.display = 'flex';
    }
}

function hideTimerPopup(isPermanent = false) {
    const overlay = document.getElementById('registrationTimerOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }

    timerManuallyClosed = true;

    if (registrationTimerInterval) {
        clearInterval(registrationTimerInterval);
        registrationTimerInterval = null;
    }
}

// --- 7️⃣ PWA Installation Logic ---
let deferredPrompt;

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        });
    }
}

function initPwaInstall() {
    const installBtn = document.getElementById('pwaInstallBtn');
    if (!installBtn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can add to home screen
        installBtn.style.display = 'flex';

        installBtn.addEventListener('click', (e) => {
            // hide our user interface that shows our A2HS button
            installBtn.style.display = 'none';
            // Show the prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                deferredPrompt = null;
            });
        });
    });

    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        installBtn.style.display = 'none';
    });
}



