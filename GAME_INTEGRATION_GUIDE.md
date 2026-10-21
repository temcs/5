# GAME INTEGRATION GUIDE

Each game lives in its own folder as a **single self-contained `index.html`** with the
CSS in a `<style>` block and the game logic in a `<script>` block. The shared
`../balancer.js` (`GameBridge`) is kept external and loaded **before** the inline script.

```
games/
  balancer.js          <- shared by every game (keep external)
  GameName/
    index.html         <- structure + <style> + <script> (all-in-one)
```

- **Link:** `games/FOLDER_NAME/index.html`
- **Active:** `True`

---

### index.html (single file)

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Title</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
    <style>
        /* ===== All game CSS goes here (was style.css) ===== */
        :root {
            --bg-dark: #0a0b10;
            --card-bg: #141621;
            --accent: #ffcc00;
            --text: #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background: var(--bg-dark);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }

        .app-container {
            width: 100%; max-width: 1000px; height: 90vh;
            background: var(--card-bg); border-radius: 20px;
            display: flex; flex-direction: column; overflow: hidden;
        }

        .game-header {
            padding: 15px 25px; display: flex;
            justify-content: space-between; align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .game-main { flex: 1; padding: 20px; position: relative; }

        .controls-container {
            padding: 20px; background: rgba(0,0,0,0.2);
            display: flex; gap: 15px; justify-content: center;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 600px) {
            body { overflow: auto; height: auto; align-items: flex-start; }
            .app-container { height: 100dvh; border-radius: 0; }
            .game-main { padding: 10px; flex: 1; }
            .controls-container { padding: 10px; flex-direction: column; }
        }
    </style>
</head>

<body>
    <div class="app-container">
        <!-- Header -->
        <header class="game-header">
            <div class="logo">
                <div onclick="GameBridge.goHome()" style="cursor: pointer; background: rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 8px; margin-right: 12px; display: inline-flex; align-items: center; gap: 6px; font-size:0.8rem;">
                    <i class="fas fa-home"></i> <span>HOME</span>
                </div>
                <span class="logo-text">GAME NAME</span>
            </div>
            <div class="balance-container">
                <span class="balance-label">BALANCE</span>
                <span id="balance-amount" class="balance-value">৳0.00</span>
            </div>
        </header>

        <!-- Main Area -->
        <main class="game-main">
            <div id="game-area">
                <!-- Place game visuals here -->
            </div>
        </main>

        <!-- Controls -->
        <div class="controls-container">
            <input type="number" id="bet-amount" value="10">
            <button id="play-btn">START</button>
        </div>
    </div>

    <!-- Shared bridge first, then the inline game logic -->
    <script src="../balancer.js"></script>
    <script>
        /* ===== All game logic goes here (was script.js) ===== */
        let balance = GameBridge.getBalance();
        const balanceDisplay = document.getElementById('balance-amount');
        const betInput = document.getElementById('bet-amount');

        function updateUI() {
            balanceDisplay.innerText = `৳${balance.toFixed(2)}`;
        }

        // 1. PLACE BET (Loss/Deduction)
        async function handleBet() {
            const amount = parseFloat(betInput.value);
            if (amount > balance) return alert("Low balance");

            balance -= amount;
            updateUI();
            await GameBridge.updateBalance(balance, -amount, "Game Bet");
        }

        // 2. HANDLE WIN (Profit)
        async function handleWin(winAmount) {
            balance += winAmount;
            updateUI();
            await GameBridge.updateBalance(balance, winAmount, "Game Win");
        }

        // 3. GO HOME: trigger GameBridge.goHome() via the HTML button

        updateUI();
    </script>
</body>

</html>
```

### Notes
- Do **not** add separate `style.css` / `script.js` files — keep everything inside `index.html`.
- Any inlined JS must not contain the literal sequence `</script>` (it would close the block early).
- Keep `<script src="../balancer.js"></script>` **before** the inline `<script>` so `GameBridge` is defined.
- Points scored via the admin panel use the folder path `games/FOLDER_NAME/index.html`.

### Payout rules (all games)

Every game must obey a **maximum total return of 50x the bet** (bet 10 -> max 500,
bet 50000 -> max 2,500,000). Common wins are 1x-5x; 35x-50x must stay very rare.
The per-game **win chance (%)** is controlled from the admin panel and is available
through `GameBridge.getGameConfig()` / `GameBridge.onGameConfigUpdate()`.

Use the shared helpers in `../balancer.js` instead of hard-coding payouts:

```js
// Weighted 1x-50x multiplier (~97% of wins land in 1x-5x)
const mult = GameBridge.randomWinMultiplier();

// bet * mult, clamped to 50x
const payout = GameBridge.calculatePayout(bet, mult);

// Clamp any game-specific multiplier (ladders, dice odds, crash points)
const capped = GameBridge.capWinMultiplier(mult);
```

For progressive games (Mines, Tower, Chicken Road, Aviator), build ladders/crash
points up to 50x and always pass them through `capWinMultiplier()` before crediting.
