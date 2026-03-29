// ============================================
// FINANCE4FUN — Firm Builder Game Engine (Beta)
// Investment Banking themed
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Constants ---
  const GAME_KEY = 'f4f_game_state';

  const BUILDING_IMAGES = [
    'images/game/firm-level-1.png',
    'images/game/firm-level-2.png',
    'images/game/firm-level-3.png',
    'images/game/firm-level-4.png'
  ];

  const UPGRADES = {
    office: {
      name: 'Office',
      icon: '🏢',
      maxTier: 3,
      tiers: [
        { name: 'Desk & Chair', cost: 10 },
        { name: 'Office Floor', cost: 50 },
        { name: 'Corner Office', cost: 200 }
      ]
    },
    team: {
      name: 'Team',
      icon: '👔',
      maxTier: 3,
      tiers: [
        { name: 'Intern', cost: 15 },
        { name: 'Analyst', cost: 75 },
        { name: 'Managing Director', cost: 300 }
      ]
    },
    deals: {
      name: 'Deals',
      icon: '📊',
      maxTier: 3,
      tiers: [
        { name: 'First Pitch', cost: 20 },
        { name: 'Deal Pipeline', cost: 100 },
        { name: 'Mega Merger', cost: 500 }
      ]
    }
  };

  // --- Elements ---
  const setupScreen = document.getElementById('game-setup');
  const mainScreen = document.getElementById('game-main');
  const firmNameInput = document.getElementById('firm-name-input');
  const startBtn = document.getElementById('start-firm-btn');
  const firmNameDisplay = document.getElementById('firm-name-display');
  const firmLevelDisplay = document.getElementById('firm-level-display');
  const coinBalanceDisplay = document.getElementById('coin-balance-display');
  const buildingImg = document.getElementById('building-img');
  const upgradesGrid = document.getElementById('upgrades-grid');

  if (!setupScreen || !mainScreen) {
    console.error('Game: Required elements not found.');
    return;
  }

  // --- Game State ---
  let gameState = null;

  function loadGame() {
    try {
      const saved = localStorage.getItem(GAME_KEY);
      if (saved) {
        gameState = JSON.parse(saved);
        return true;
      }
    } catch (e) { /* ignore corrupt data */ }
    return false;
  }

  function saveGame() {
    localStorage.setItem(GAME_KEY, JSON.stringify(gameState));
  }

  function createNewGame(firmName) {
    gameState = {
      firmName: firmName,
      level: 1,
      upgrades: { office: 0, team: 0, deals: 0 },
      totalSpent: 0
    };
    saveGame();
  }

  // --- Calculate Level ---
  function calculateLevel() {
    const total = Object.values(gameState.upgrades).reduce((a, b) => a + b, 0);
    // Level 1: 0 upgrades, Level 2: 1-2, Level 3: 3-5, Level 4: 6-9
    if (total >= 6) return 4;
    if (total >= 3) return 3;
    if (total >= 1) return 2;
    return 1;
  }

  // --- Get Building Image ---
  function getBuildingImage() {
    const level = calculateLevel();
    return BUILDING_IMAGES[level - 1];
  }

  // --- Render HUD ---
  function renderHUD() {
    const level = calculateLevel();
    gameState.level = level;
    firmNameDisplay.textContent = gameState.firmName;
    firmLevelDisplay.textContent = `Level ${level} — Investment Bank`;
    coinBalanceDisplay.textContent = F4FCoins.get().toLocaleString();
    saveGame();
  }

  // --- Render Building ---
  function renderBuilding() {
    const newSrc = getBuildingImage();
    if (buildingImg.src !== newSrc) {
      buildingImg.style.opacity = '0';
      setTimeout(() => {
        buildingImg.src = newSrc;
        buildingImg.style.opacity = '1';
      }, 300);
    }
  }

  // --- Render Upgrades ---
  function renderUpgrades() {
    upgradesGrid.innerHTML = '';
    const coins = F4FCoins.get();

    Object.entries(UPGRADES).forEach(([key, upgrade]) => {
      const currentTier = gameState.upgrades[key];
      const isMaxed = currentTier >= upgrade.maxTier;
      const nextTier = isMaxed ? null : upgrade.tiers[currentTier];
      const canAfford = nextTier ? coins >= nextTier.cost : false;

      const card = document.createElement('div');
      card.className = 'game-upgrade-card';
      if (isMaxed) card.classList.add('game-upgrade-maxed');
      if (!isMaxed && !canAfford) card.classList.add('game-upgrade-locked');

      const icon = document.createElement('div');
      icon.className = 'game-upgrade-icon';
      icon.textContent = upgrade.icon;

      const name = document.createElement('div');
      name.className = 'game-upgrade-name';
      name.textContent = upgrade.name;

      const tier = document.createElement('div');
      tier.className = 'game-upgrade-tier';
      if (isMaxed) {
        tier.textContent = `Tier ${currentTier}/${upgrade.maxTier}`;
      } else {
        tier.textContent = `${nextTier.name} (Tier ${currentTier + 1}/${upgrade.maxTier})`;
      }

      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(tier);

      if (isMaxed) {
        const maxText = document.createElement('div');
        maxText.className = 'game-upgrade-maxed-text';
        maxText.textContent = '✓ MAXED';
        card.appendChild(maxText);
      } else {
        const costDiv = document.createElement('div');
        costDiv.className = 'game-upgrade-cost';
        if (canAfford) costDiv.classList.add('game-affordable');
        costDiv.textContent = `🪙 ${nextTier.cost} FC`;
        card.appendChild(costDiv);

        if (canAfford) {
          card.addEventListener('click', () => purchaseUpgrade(key));
        }
      }

      upgradesGrid.appendChild(card);
    });
  }

  // --- Purchase Upgrade ---
  function purchaseUpgrade(key) {
    const upgrade = UPGRADES[key];
    const currentTier = gameState.upgrades[key];
    if (currentTier >= upgrade.maxTier) return;

    const cost = upgrade.tiers[currentTier].cost;
    if (!F4FCoins.spend(cost)) return;

    gameState.upgrades[key] = currentTier + 1;
    gameState.totalSpent += cost;

    // Check if level changed
    const oldLevel = gameState.level;
    const newLevel = calculateLevel();

    saveGame();
    renderHUD();
    renderUpgrades();

    if (newLevel > oldLevel) {
      renderBuilding();
      showLevelUpMessage(newLevel);
    }
  }

  // --- Level Up Message ---
  function showLevelUpMessage(level) {
    const popup = document.createElement('div');
    popup.className = 'game-coin-popup';
    popup.style.borderColor = '#8a8aff';
    popup.style.color = '#8a8aff';
    popup.textContent = `⬆ LEVEL UP! Level ${level}`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1600);
  }

  // --- Setup Screen ---
  firmNameInput.addEventListener('input', () => {
    startBtn.disabled = firmNameInput.value.trim().length < 2;
  });

  startBtn.addEventListener('click', () => {
    const name = firmNameInput.value.trim();
    if (name.length < 2) return;
    createNewGame(name);
    showMainScreen();
  });

  // --- Keyboard Enter on input ---
  firmNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
      startBtn.click();
    }
  });

  // --- Screen Transitions ---
  function showSetupScreen() {
    setupScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
  }

  function showMainScreen() {
    setupScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    renderHUD();
    renderBuilding();
    renderUpgrades();
  }

  // --- Auto-refresh coin balance every second (in case user earns on another tab) ---
  setInterval(() => {
    if (gameState) {
      coinBalanceDisplay.textContent = F4FCoins.get().toLocaleString();
      renderUpgrades();
    }
  }, 2000);

  // --- Init ---
  if (loadGame()) {
    showMainScreen();
  } else {
    showSetupScreen();
  }
});
