// ============================================
// FINANCE4FUN — Firm Builder (Phaser 3 Engine)
// Isometric tycoon game with interactive sprites
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const GAME_KEY = 'f4f_game_state';
  const GRID_W = 10, GRID_H = 8;
  const INTERN_SLOTS = [
    {gx: 2, gy: 1}, {gx: 3, gy: 1}, {gx: 4, gy: 1}, {gx: 5, gy: 1}, {gx: 6, gy: 1}, {gx: 7, gy: 1}, {gx: 8, gy: 1},
    {gx: 1, gy: 3}, {gx: 2, gy: 3}, {gx: 3, gy: 3}, {gx: 4, gy: 3}, {gx: 5, gy: 3}, {gx: 6, gy: 3}, {gx: 7, gy: 3}, {gx: 8, gy: 3},
    {gx: 2, gy: 5}, {gx: 3, gy: 5}, {gx: 4, gy: 5}, {gx: 5, gy: 5}, {gx: 6, gy: 5}, {gx: 7, gy: 5}, {gx: 8, gy: 5}
  ];

  const UPGRADES = {
    intern_station: { 
      name: 'Increase Workforce', 
      icon: '👔', 
      maxTier: 22, 
      baseCost: 10,
      costIncrement: 10
    }
  };

  // ===== DOM =====
  const setupScreen = document.getElementById('game-setup');
  const mainScreen  = document.getElementById('game-main');
  const firmInput   = document.getElementById('firm-name-input');
  const startBtn    = document.getElementById('start-firm-btn');
  const nameDisp    = document.getElementById('firm-name-display');
  const levelDisp   = document.getElementById('firm-level-display');
  const coinDisp    = document.getElementById('coin-balance-display');
  const upGrid      = document.getElementById('upgrades-grid');
  if (!setupScreen || !mainScreen) return;

  // ===== GAME STATE =====
  let gameState = null;

  function loadGame() {
    try { const s = localStorage.getItem(GAME_KEY); if (s) { gameState = JSON.parse(s); return true; } } catch(e) {}
    return false;
  }
  function saveGame() { localStorage.setItem(GAME_KEY, JSON.stringify(gameState)); }
  function createNewGame(name) {
    const gender = document.querySelector('.game-gender-option.selected')?.dataset.gender || 'boy';
    const skinColor = document.querySelector('.game-skin-circle.selected')?.dataset.skin || '#FFCCBC';
    const hairColor = document.querySelector('.game-hair-circle.selected')?.dataset.hair || '#1A1A1A';
    gameState = { firmName: name, gender: gender, skinColor: skinColor, hairColor: hairColor, level: 1, upgrades: { intern_station:0 }, totalSpent: 0, parkingLot: generateParkingLot() };
    saveGame();
  }

  function generateParkingLot() {
    const allColors = [
      '#8B1A1A', '#A52A2A', '#C0392B', '#1B3A5C', '#2C5F8A', '#4A7FB5',
      '#1A1A1A', '#2D2D2D', '#F5F5F0', '#E8E8E0', '#C0C0C0', '#808080',
      '#2E4A2E', '#3D6B3D', '#4A235A', '#6C3483', '#7D6608', '#BDA60E',
      '#5D4E37', '#8B7355', '#EF6C00', '#D4A843'
    ];
    const types = ['sedan', 'suv', 'coupe'];
    const numCars = 1 + Math.floor(Math.random() * 5); // 1–5 cars
    const spots = [0, 1, 2, 3, 4, 5, 6, 7];
    // Shuffle and pick random spots
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const chosen = spots.slice(0, numCars).sort((a,b) => a - b);
    return chosen.map(spot => ({
      spot: spot,
      color: allColors[Math.floor(Math.random() * allColors.length)],
      type: types[Math.floor(Math.random() * types.length)]
    }));
  }
  function calcLevel() {
    const t = Object.values(gameState.upgrades).reduce((a,b) => a+b, 0);
    if (t >= 15) return 4; if (t >= 8) return 3; if (t >= 1) return 2; return 1;
  }

  // ===== PHASER SCENE =====
  class FirmScene extends Phaser.Scene {
    constructor() { super('FirmScene'); }

    create() {
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;

      // Layout: top 65% = carpet, bottom 35% = asphalt
      this.carpetH = Math.round(H * 0.65);
      this.asphaltH = H - this.carpetH;

      // Tile sizing for room objects — fit objects within the carpet area
      this.TW = Math.floor(W / 12);
      this.TH = Math.round(this.TW / 2);

      // Origin for isometric grid — centered in the carpet rectangle
      this.OX = Math.round(W / 2);
      this.OY = Math.round(this.carpetH * 0.25);
      this.WH = Math.round(this.TW * 1.1); // wall height for legacy helpers

      this.roomObjects = [];
      this.colliders = []; // collision rectangles {x, y, w, h}

      // Chair / blue screen state (must init before buildRoom)
      this._chairPos = null;
      this._blueScreen = null;
      this._atDesk = false;
      this._deskPos = null;
      this._computerPrompt = null;
      this._computerGlow = null;

      this.drawBackground();
      this.buildRoom();

      // === COMPUTER CLICK HANDLER (global scene click) ===
      const COMPUTER_CLICK_RANGE = 38; // ~1cm at 96dpi
      this.input.on('pointerdown', (pointer) => {
        if (!this.player || !this._deskPos || this._blueScreen) return;
        const p = this.player;
        const dp = this._deskPos;
        const playerDist = Math.sqrt((p.x - dp.x) ** 2 + (p.y - dp.y) ** 2);
        if (playerDist > COMPUTER_CLICK_RANGE) return;
        // Player is within 1cm of the computer — open screen
        if (!this._atDesk) {
          this._atDesk = true;
          this._openComputerScreen();
        }
      });

      // === PLAYER CHARACTER ===
      const isGirl = gameState && gameState.gender === 'girl';
      const skinHex = gameState ? gameState.skinColor : null;
      const hairHex = gameState ? gameState.hairColor : null;
      const col = isGirl ? 0xE91E63 : 0x1565C0;
      const startPos = this.toScr(3, 4);

      this.player = {
        g: this.add.graphics(),
        x: startPos.x,
        y: startPos.y,
        col: col,
        isGirl: isGirl,
        skinCol: skinHex ? parseInt(skinHex.replace('#',''), 16) : 0xFFCCBC,
        hairCol: hairHex ? parseInt(hairHex.replace('#',''), 16) : 0x1A1A1A,
        speed: 2.5,
        walkFrame: 0,
        walkTimer: 0,
        moving: false,
        facing: 'down',
        isPlayer: true
      };
      // Derive hand color
      const sc = this.player.skinCol;
      const _sr = (sc >> 16) & 0xFF, _sg = (sc >> 8) & 0xFF, _sb = sc & 0xFF;
      this.player.handCol = ((Math.max(0,_sr-15)) << 16) | ((Math.max(0,_sg-10)) << 8) | Math.max(0,_sb-5);

      this.drawCharacter(this.player);

      // WASD + Arrow keys + E
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        e: Phaser.Input.Keyboard.KeyCodes.E
      });

      // Auto-focus canvas for keyboard input
      const canvas = this.game.canvas;
      canvas.setAttribute('tabindex', '1');
      canvas.focus();
      canvas.addEventListener('mousedown', () => canvas.focus());

      // E key tracking
      this._ePressed = false;
      document.addEventListener('keydown', (evt) => {
        if (evt.code === 'KeyE' && !evt.repeat) this._ePressed = true;
      });

      // Door animation state
      this._doorOpen = false;
      this._doorAnimating = false;
    }

    // ===== DRAW CHARACTER =====
    drawCharacter(p) {
      if (!p || !p.g) return;
      const g = p.g;
      const TW = this.TW, TH = this.TH;
      const s = TW * 0.04;
      const dir = p.facing;
      const wf = p.walkFrame;
      const mv = p.moving;

      g.clear();

      // Shadow
      g.fillStyle(0x000000, 0.1); g.fillEllipse(0, TH*0.08, s*5, s*2);

      // Walk offsets
      const legSwing = mv ? [[-s*0.5, s*0.5], [0, 0], [s*0.5, -s*0.5], [0, 0]][wf] : [0, 0];
      const armSwing = mv ? ((wf % 2 === 0) ? s*0.5 : -s*0.5) : 0;

      // Shared drawing helpers
      const pantsCol = 0x2C3E50;
      const legT = -s * 4.4; // Updated: Legs start lower to make room for hips
      const legH = s * 4.4;   // Updated: Shorter legs
      const drawHip = (ox) => {
        // Draw the hips as an iso box to bridge legs and torso
        this.drawIsoBox(g, ox, legT, 0.14, 0.1, s*1.1, pantsCol, this.shade(pantsCol,-10), this.shade(pantsCol,10));
      };
      const drawTorso = (ox) => {
        this.drawIsoBox(g, ox, -s*5.5, 0.14, 0.1, s*3.5, p.col, this.shade(p.col,-30), this.shade(p.col,20));
      };
      const drawHead = (ox) => {
        g.fillStyle(p.skinCol); g.fillCircle(ox, -s*10, s*1.8);
      };
      const drawHairTop = (ox) => {
        g.fillStyle(p.hairCol);
        g.beginPath(); g.arc(ox, -s*11, s*1.85, Math.PI, Math.PI*2); g.closePath(); g.fillPath();
      };

      if (dir === 'down') {
        // ========== DOWN (front-facing) ==========
        g.fillStyle(pantsCol);
        g.fillRect(-s*1.2, legT + legSwing[0], s*0.8, legH);
        g.fillRect(s*0.4, legT + legSwing[1], s*0.8, legH);
        drawHip(0);
        drawTorso(0);
        g.fillStyle(this.shade(p.col,-15));
        g.fillRect(-s*2.2, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillRect(s*1.5, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol);
        g.fillRect(-s*2.2, -s*4.8 + armSwing, s*0.8, s*0.8);
        g.fillRect(s*1.5, -s*4.8 - armSwing, s*0.8, s*0.8);
        drawHead(0); drawHairTop(0);
        if (p.isGirl) { g.fillStyle(p.hairCol); g.fillRect(-s*1.7, -s*11, s*0.6, s*4.5); g.fillRect(s*1.1, -s*11, s*0.6, s*4.5); }
        g.fillStyle(0x333333);
        g.fillRect(-s*0.8, -s*10.2, s*0.5, s*0.5);
        g.fillRect(s*0.3, -s*10.2, s*0.5, s*0.5);

      } else if (dir === 'up') {
        // ========== UP (back-facing) ==========
        g.fillStyle(pantsCol);
        g.fillRect(-s*1.2, legT + legSwing[0], s*0.8, legH);
        g.fillRect(s*0.4, legT + legSwing[1], s*0.8, legH);
        drawHip(0);
        drawTorso(0);
        g.fillStyle(this.shade(p.col,-15));
        g.fillRect(-s*2.2, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillRect(s*1.5, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol);
        g.fillRect(-s*2.2, -s*4.8 + armSwing, s*0.8, s*0.8);
        g.fillRect(s*1.5, -s*4.8 - armSwing, s*0.8, s*0.8);
        drawHead(0);
        g.fillStyle(p.hairCol); g.fillCircle(0, -s*10, s*1.9);
        if (p.isGirl) { g.fillRect(-s*1.7, -s*11, s*0.6, s*5); g.fillRect(s*1.1, -s*11, s*0.6, s*5); }

      } else if (dir === 'left') {
        // ========== LEFT (side profile facing left) ==========
        g.fillStyle(this.shade(pantsCol, -15)); g.fillRect(-s*0.3, legT + legSwing[1], s*0.8, legH);
        drawHip(0);
        drawTorso(0);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(-s*0.3, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(-s*0.3, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(-s*0.3, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(-s*0.5, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(-s*0.5, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(0); drawHairTop(0);
        g.fillStyle(p.hairCol); g.fillRect(s*0.2, -s*11.5, s*1.2, s*1.5);
        if (p.isGirl) { g.fillStyle(p.hairCol); g.fillRect(s*0.2, -s*11.5, s*0.8, s*5.5); }
        g.fillStyle(0x333333); g.fillRect(-s*0.5, -s*10.2, s*0.5, s*0.5);

      } else if (dir === 'right') {
        // ========== RIGHT (side profile facing right) ==========
        g.fillStyle(this.shade(pantsCol,-15)); g.fillRect(-s*0.3, legT + legSwing[1], s*0.8, legH);
        drawHip(0);
        drawTorso(0);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(-s*0.3, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(-s*0.3, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(-s*0.3, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(s*0.5, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(s*0.5, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(0); drawHairTop(0);
        g.fillStyle(p.hairCol); g.fillRect(-s*1.2, -s*11.5, s*1.2, s*1.5);
        if (p.isGirl) { g.fillStyle(p.hairCol); g.fillRect(-s*1.2, -s*11.5, s*0.8, s*5.5); }
        g.fillStyle(0x333333); g.fillRect(s*0.3, -s*10.2, s*0.5, s*0.5);

      } else if (dir === 'downright') {
        // ========== DOWN-RIGHT (3/4 front, turned right) ==========
        g.fillStyle(this.shade(pantsCol,-15)); g.fillRect(-s*0.8, legT + legSwing[1], s*0.8, legH);
        drawHip(s*0.4);
        drawTorso(s*0.4);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(-s*2.0, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(-s*2.0, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(s*0.6, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(s*2.0, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(s*2.0, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(s*0.4); drawHairTop(s*0.4);
        if (p.isGirl) { g.fillStyle(p.hairCol); g.fillRect(-s*1.2, -s*11, s*0.6, s*4.5); g.fillRect(s*1.4, -s*11, s*0.5, s*3.5); }
        g.fillStyle(0x333333);
        g.fillRect(s*0.6, -s*10.2, s*0.5, s*0.5);
        g.fillRect(-s*0.3, -s*10.2, s*0.35, s*0.45);

      } else if (dir === 'downleft') {
        // ========== DOWN-LEFT (3/4 front, turned left) ==========
        g.fillStyle(this.shade(pantsCol,-15)); g.fillRect(s*0.4, legT + legSwing[1], s*0.8, legH);
        drawHip(-s*0.4);
        drawTorso(-s*0.4);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(s*2.0, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(s*2.0, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(-s*0.6, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(-s*2.0, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(-s*2.0, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(-s*0.4); drawHairTop(-s*0.4);
        if (p.isGirl) { g.fillStyle(p.hairCol); g.fillRect(s*0.8, -s*11, s*0.6, s*4.5); g.fillRect(-s*1.7, -s*11, s*0.5, s*3.5); }
        g.fillStyle(0x333333);
        g.fillRect(-s*0.9, -s*10.2, s*0.5, s*0.5);
        g.fillRect(s*0.0, -s*10.2, s*0.35, s*0.45);

      } else if (dir === 'upright') {
        // ========== UP-RIGHT (3/4 back, turned right) ==========
        g.fillStyle(this.shade(pantsCol,-15)); g.fillRect(-s*0.8, legT + legSwing[1], s*0.8, legH);
        drawHip(s*0.4);
        drawTorso(s*0.4);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(-s*2.0, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(-s*2.0, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(s*0.6, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(s*2.0, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(s*2.0, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(s*0.4);
        g.fillStyle(p.hairCol); g.fillCircle(s*0.4, -s*10, s*1.9);
        g.fillRect(-s*0.6, -s*11.5, s*1.4, s*2.2);
        if (p.isGirl) { g.fillRect(-s*1.2, -s*11, s*0.6, s*5); g.fillRect(s*1.4, -s*11, s*0.5, s*4); }

      } else if (dir === 'upleft') {
        // ========== UP-LEFT (3/4 back, turned left) ==========
        g.fillStyle(this.shade(pantsCol,-15)); g.fillRect(s*0.4, legT + legSwing[1], s*0.8, legH);
        drawHip(-s*0.4);
        drawTorso(-s*0.4);
        g.fillStyle(this.shade(p.col,-25)); g.fillRect(s*2.0, -s*7.5 - armSwing, s*0.7, s*3);
        g.fillStyle(this.shade(p.handCol,-10)); g.fillRect(s*2.0, -s*4.8 - armSwing, s*0.8, s*0.8);
        g.fillStyle(pantsCol); g.fillRect(-s*0.6, legT + legSwing[0], s*0.8, legH);
        g.fillStyle(this.shade(p.col,-15)); g.fillRect(-s*2.0, -s*7.5 + armSwing, s*0.7, s*3);
        g.fillStyle(p.handCol); g.fillRect(-s*2.0, -s*4.8 + armSwing, s*0.8, s*0.8);
        drawHead(-s*0.4);
        g.fillStyle(p.hairCol); g.fillCircle(-s*0.4, -s*10, s*1.9);
        g.fillRect(s*0.0, -s*11.5, s*1.4, s*2.2);
        if (p.isGirl) { g.fillRect(s*0.8, -s*11, s*0.6, s*5); g.fillRect(-s*1.7, -s*11, s*0.5, s*4); }
      }

      g.setPosition(p.x, p.y);
      g.setDepth(p.isPlayer ? 1000 : ((p.y - this.OY) * 2 / this.TH) + 1);
    }

    // ===== UPDATE (runs every frame) =====
    update(time, delta) {
      const p = this.player;
      if (!p) return;

      let dx = 0, dy = 0;
      if (this.keys.a.isDown || this.keys.left.isDown) dx -= 1;
      if (this.keys.d.isDown || this.keys.right.isDown) dx += 1;
      if (this.keys.w.isDown || this.keys.up.isDown) dy -= 1;
      if (this.keys.s.isDown || this.keys.down.isDown) dy += 1;

      p.moving = (dx !== 0 || dy !== 0);

      // Set facing direction immediately
      if (p.moving) {
        if (dx !== 0 && dy !== 0) {
          if (dy > 0) p.facing = dx > 0 ? 'downright' : 'downleft';
          else p.facing = dx > 0 ? 'upright' : 'upleft';
        } else if (dy !== 0) {
          p.facing = dy > 0 ? 'down' : 'up';
        } else {
          p.facing = dx > 0 ? 'right' : 'left';
        }
      }

      if (p.moving) {
        // Normalize diagonal
        const len = Math.sqrt(dx*dx + dy*dy);
        dx = (dx / len) * p.speed;
        dy = (dy / len) * p.speed;

        p.x += dx;
        p.y += dy;

        // === COLLISION WITH BLACK BORDERS ===
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        const pad = 15;

        // Canvas outer borders
        p.x = Phaser.Math.Clamp(p.x, pad, W - pad);
        p.y = Phaser.Math.Clamp(p.y, pad + 20, H - pad);

        // Dividing line collision
        const doorStart = W * 0.10;
        const doorEnd = doorStart + W * 0.126;
        const wallY = this.carpetH;
        const wallThick = 6;
        const prevY = p.y - dy;
        const inDoorway = (p.x >= doorStart && p.x <= doorEnd);

        if (!inDoorway) {
          if (prevY <= wallY - wallThick && p.y > wallY - wallThick) {
            p.y = wallY - wallThick;
          }
          if (prevY >= wallY + wallThick && p.y < wallY + wallThick) {
            p.y = wallY + wallThick;
          }
        }

        // Object collisions — push player out of any overlapping collider
        const pr = 8; // player collision radius
        for (const c of this.colliders) {
          // Check if player circle overlaps with collider rect
          const closestX = Phaser.Math.Clamp(p.x, c.x, c.x + c.w);
          const closestY = Phaser.Math.Clamp(p.y, c.y, c.y + c.h);
          const distX = p.x - closestX;
          const distY = p.y - closestY;
          if (distX * distX + distY * distY < pr * pr) {
            // Push player out — revert to previous position on whichever axis caused overlap
            p.x -= dx;
            p.y -= dy;
            break;
          }
        }

        // Walk animation timer
        p.walkTimer += delta;
        if (p.walkTimer > 120) {
          p.walkFrame = (p.walkFrame + 1) % 4;
          p.walkTimer = 0;
        }
      } else {
        p.walkFrame = 0;
        p.walkTimer = 0;
      }


      // === CORNER OFFICE DOOR PROXIMITY ===
      const co = this.cornerOffice;
      if (co && this._doorRight && this._doorBottom) {
        // Shortest distance from player to each door LINE SEGMENT (not just center)
        // Right door: vertical segment from (co.w, co.h - co.openW) to (co.w, co.h)
        const rClampY = Phaser.Math.Clamp(p.y, co.h - co.openW, co.h);
        const distR = Math.sqrt((p.x - co.w) ** 2 + (p.y - rClampY) ** 2);
        // Bottom door: horizontal segment from (co.w - co.openW, co.h) to (co.w, co.h)
        const bClampX = Phaser.Math.Clamp(p.x, co.w - co.openW, co.w);
        const distB = Math.sqrt((p.x - bClampX) ** 2 + (p.y - co.h) ** 2);
        const nearest = Math.min(distR, distB);
        const openRange = 22;   // ~0.57cm at 96dpi
        const closeRange = 50;

        if (!this._doorOpen && !this._doorAnimating && nearest < openRange) {
          this._doorOpen = true;
          this._doorAnimating = true;
          // Remove door colliders so player can walk through
          this._doorColliders.forEach(dc => {
            const idx = this.colliders.indexOf(dc);
            if (idx !== -1) this.colliders.splice(idx, 1);
          });
          this.tweens.add({
            targets: this._doorRight,
            y: this._doorRightHome.y - co.openW,
            alpha: 0.15,
            duration: 300, ease: 'Power2'
          });
          this.tweens.add({
            targets: this._doorBottom,
            x: this._doorBottomHome.x - co.openW,
            alpha: 0.15,
            duration: 300, ease: 'Power2',
            onComplete: () => { this._doorAnimating = false; }
          });
        } else if (this._doorOpen && !this._doorAnimating && nearest > closeRange) {
          this._doorOpen = false;
          this._doorAnimating = true;
          this.tweens.add({
            targets: this._doorRight,
            y: this._doorRightHome.y,
            alpha: 1,
            duration: 350, ease: 'Power2'
          });
          this.tweens.add({
            targets: this._doorBottom,
            x: this._doorBottomHome.x,
            alpha: 1,
            duration: 350, ease: 'Power2',
            onComplete: () => {
              this._doorAnimating = false;
              // Re-add door colliders
              this._doorColliders.forEach(dc => {
                if (!this.colliders.includes(dc)) this.colliders.push(dc);
              });
            }
          });
        }
      }

      // === COMPUTER PROXIMITY PROMPT ===
      const COMPUTER_CLICK_RANGE = 38; // ~1cm at 96dpi
      if (this._deskPos && !this._blueScreen) {
        const dp = this._deskPos;
        const dist = Math.sqrt((p.x - dp.x) ** 2 + (p.y - dp.y) ** 2);

        if (dist <= COMPUTER_CLICK_RANGE) {
          // Show prompt + glow when in range
          if (!this._computerPrompt) {
            this._computerPrompt = this.add.text(dp.x, dp.y - dp.promptOffsetY * 0.55, 'Click', {
              fontSize: '8px',
              fontFamily: '"Press Start 2P", monospace',
              color: '#00FF88',
            }).setOrigin(0.5).setDepth(2000).setAlpha(0.9);
            // Gentle pulsing animation
            this.tweens.add({
              targets: this._computerPrompt,
              alpha: 0.45,
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
          if (!this._computerGlow && this._coComputer) {
            this._coComputer.setAlpha(0.8);
          }
          // Only show pointer cursor when mouse is hovering near the computer
          const mouseX = this.input.activePointer.worldX;
          const mouseY = this.input.activePointer.worldY;
          const mouseDist = Math.sqrt((mouseX - dp.x) ** 2 + (mouseY - dp.y) ** 2);
          if (mouseDist <= COMPUTER_CLICK_RANGE) {
            this.input.setDefaultCursor('pointer');
          } else {
            this.input.setDefaultCursor('default');
          }
        } else {
          // Remove prompt when out of range
          if (this._computerPrompt) {
            this._computerPrompt.destroy();
            this._computerPrompt = null;
          }
          if (this._coComputer) {
            this._coComputer.setAlpha(1);
          }
          this.input.setDefaultCursor('default');
        }
      } else if (this._blueScreen && this._computerPrompt) {
        this._computerPrompt.destroy();
        this._computerPrompt = null;
      }

      this.drawCharacter(this.player);
    }

    toScr(gx, gy) {
      return { x: (gx - gy) * this.TW / 2 + this.OX, y: (gx + gy) * this.TH / 2 + this.OY };
    }


    // ===== BACKGROUND =====
    drawBackground() {
      const W = this.cameras.main.width, H = this.cameras.main.height;
      if (this.textures.exists('bg')) this.textures.remove('bg');
      const tex = this.textures.createCanvas('bg', W, H);
      const ctx = tex.context;

      const carpetH = this.carpetH;
      const asphaltY = carpetH;
      const asphaltH = this.asphaltH;

      // === TOP RECTANGLE: CARPET FLOOR ===
      // Base carpet color — warm neutral commercial carpet
      const carpGrad = ctx.createLinearGradient(0, 0, 0, carpetH);
      carpGrad.addColorStop(0, '#6B8F71');   // slightly lighter at top
      carpGrad.addColorStop(0.5, '#5A7D60');
      carpGrad.addColorStop(1, '#4E6E54');   // darker at bottom
      ctx.fillStyle = carpGrad;
      ctx.fillRect(0, 0, W, carpetH);

      // Carpet texture — subtle darker/lighter speckles
      for (let i = 0; i < 600; i++) {
        const cx = Math.random() * W;
        const cy = Math.random() * carpetH;
        const shade = Math.random();
        if (shade > 0.6) {
          ctx.fillStyle = 'rgba(80,130,85,0.15)';
        } else if (shade > 0.3) {
          ctx.fillStyle = 'rgba(60,100,65,0.12)';
        } else {
          ctx.fillStyle = 'rgba(40,80,45,0.1)';
        }
        ctx.fillRect(cx, cy, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }

      // Carpet grid lines (very subtle woven look)
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < carpetH; y += 6) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Thin border line at the bottom of carpet (baseboard trim)
      ctx.fillStyle = '#3D5040';
      ctx.fillRect(0, carpetH - 3, W, 3);

      // === BOTTOM RECTANGLE: ASPHALT ===
      const asphGrad = ctx.createLinearGradient(0, asphaltY, 0, H);
      asphGrad.addColorStop(0, '#454545');
      asphGrad.addColorStop(0.5, '#3A3A3A');
      asphGrad.addColorStop(1, '#333333');
      ctx.fillStyle = asphGrad;
      ctx.fillRect(0, asphaltY, W, asphaltH);

      // Asphalt texture — random speckles
      for (let i = 0; i < 400; i++) {
        const ax = Math.random() * W;
        const ay = asphaltY + Math.random() * asphaltH;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60,60,60,0.4)' : 'rgba(80,80,80,0.25)';
        ctx.fillRect(ax, ay, 1 + Math.random(), 1 + Math.random());
      }

      // Parking lines — white vertical lines for parking spots
      const spotCount = 8;
      const spotW = W / spotCount;
      const lineTop = asphaltY + asphaltH * 0.1;
      const lineBot = asphaltY + asphaltH * 0.85;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= spotCount; i++) {
        const lx = i * spotW;
        ctx.beginPath(); ctx.moveTo(lx, lineTop); ctx.lineTo(lx, lineBot); ctx.stroke();
      }

      // Top edge line of parking area
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, lineTop); ctx.lineTo(W, lineTop); ctx.stroke();

      // Detailed top-down cars from saved parking lot config
      const parkingLot = (gameState && gameState.parkingLot) ? gameState.parkingLot : [
        { spot: 0, color: '#C62828', type: 'sedan' },
        { spot: 2, color: '#1565C0', type: 'suv' },
        { spot: 5, color: '#2D2D2D', type: 'coupe' }
      ];

      parkingLot.forEach(car => {
        const si = car.spot;
        const carX = si * spotW + spotW * 0.12;
        const carY = lineTop + (lineBot - lineTop) * 0.08;
        const carW = spotW * 0.76;
        const carH = (lineBot - lineTop) * 0.82;
        const color = car.color;

        // Store car collision box
        this.colliders.push({ x: carX, y: carY, w: carW, h: carH, isCar: true });

        // Color helpers
        const hexToRGB = (hex) => {
          const h = hex.replace('#','');
          return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16) };
        };
        const rgb = hexToRGB(color);
        const rgbStr = `${rgb.r},${rgb.g},${rgb.b}`;
        const dk = (amt) => `rgb(${Math.max(0,rgb.r-amt)},${Math.max(0,rgb.g-amt)},${Math.max(0,rgb.b-amt)})`;
        const lt = (amt) => `rgb(${Math.min(255,rgb.r+amt)},${Math.min(255,rgb.g+amt)},${Math.min(255,rgb.b+amt)})`;
        const cx = carX + carW / 2;
        const cy = carY + carH / 2;

        // Helper: draw organic car body (wider in middle, tapers at front & rear)
        const drawBody = (ftaper, rtaper, cr) => {
          const ft = carW * ftaper, rt = carW * rtaper;
          ctx.beginPath();
          ctx.moveTo(carX + ft + carW*cr, carY);
          ctx.lineTo(carX + carW - ft - carW*cr, carY);
          ctx.quadraticCurveTo(carX + carW - ft, carY, carX + carW - ft*0.3, carY + carH*0.12);
          ctx.quadraticCurveTo(carX + carW, carY + carH*0.22, carX + carW, carY + carH*0.30);
          ctx.lineTo(carX + carW, carY + carH*0.70);
          ctx.quadraticCurveTo(carX + carW, carY + carH*0.78, carX + carW - rt*0.3, carY + carH*0.88);
          ctx.quadraticCurveTo(carX + carW - rt, carY + carH, carX + carW - rt - carW*cr, carY + carH);
          ctx.lineTo(carX + rt + carW*cr, carY + carH);
          ctx.quadraticCurveTo(carX + rt, carY + carH, carX + rt*0.3, carY + carH*0.88);
          ctx.quadraticCurveTo(carX, carY + carH*0.78, carX, carY + carH*0.70);
          ctx.lineTo(carX, carY + carH*0.30);
          ctx.quadraticCurveTo(carX, carY + carH*0.22, carX + ft*0.3, carY + carH*0.12);
          ctx.quadraticCurveTo(carX + ft, carY, carX + ft + carW*cr, carY);
          ctx.closePath();
        };

        // Drop shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.translate(2, 2);
        drawBody(car.type==='coupe'?0.12:car.type==='suv'?0.04:0.08, car.type==='coupe'?0.10:car.type==='suv'?0.03:0.06, 0.12);
        ctx.fill();
        ctx.restore();

        if (car.type === 'sedan') {
          // ============ SEDAN ============
          drawBody(0.08, 0.06, 0.12);
          const bg = ctx.createLinearGradient(carX, carY, carX+carW, carY);
          bg.addColorStop(0, dk(20)); bg.addColorStop(0.3, lt(15)); bg.addColorStop(0.5, lt(25)); bg.addColorStop(0.7, lt(10)); bg.addColorStop(1, dk(25));
          ctx.fillStyle = bg; ctx.fill();
          ctx.strokeStyle = dk(50); ctx.lineWidth = 1.5; ctx.stroke();

          // Hood line
          ctx.strokeStyle = dk(30); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.10, carY+carH*0.18); ctx.lineTo(carX+carW*0.90, carY+carH*0.18); ctx.stroke();

          // Front windshield
          ctx.fillStyle = 'rgba(30,45,60,0.85)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.14, carY+carH*0.21); ctx.lineTo(carX+carW*0.86, carY+carH*0.21);
          ctx.lineTo(carX+carW*0.78, carY+carH*0.37); ctx.lineTo(carX+carW*0.22, carY+carH*0.37);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(40); ctx.lineWidth = 1; ctx.stroke();
          // Reflection
          ctx.fillStyle = 'rgba(120,160,200,0.12)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.20, carY+carH*0.22); ctx.lineTo(carX+carW*0.50, carY+carH*0.22);
          ctx.lineTo(carX+carW*0.42, carY+carH*0.35); ctx.lineTo(carX+carW*0.26, carY+carH*0.35);
          ctx.closePath(); ctx.fill();

          // Roof
          const rg = ctx.createLinearGradient(carX, cy, carX+carW, cy);
          rg.addColorStop(0, dk(10)); rg.addColorStop(0.5, lt(20)); rg.addColorStop(1, dk(10));
          ctx.fillStyle = rg;
          ctx.fillRect(carX+carW*0.18, carY+carH*0.37, carW*0.64, carH*0.26);
          ctx.strokeStyle = dk(35); ctx.lineWidth = 0.8;
          ctx.strokeRect(carX+carW*0.18, carY+carH*0.37, carW*0.64, carH*0.26);
          // Door line
          ctx.strokeStyle = dk(25); ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(cx, carY+carH*0.37); ctx.lineTo(cx, carY+carH*0.63); ctx.stroke();

          // Side windows
          ctx.fillStyle = 'rgba(30,45,60,0.55)';
          ctx.fillRect(carX+carW*0.06, carY+carH*0.38, carW*0.11, carH*0.24);
          ctx.strokeStyle = dk(35); ctx.lineWidth = 0.6;
          ctx.strokeRect(carX+carW*0.06, carY+carH*0.38, carW*0.11, carH*0.24);
          ctx.fillRect(carX+carW*0.83, carY+carH*0.38, carW*0.11, carH*0.24);
          ctx.strokeRect(carX+carW*0.83, carY+carH*0.38, carW*0.11, carH*0.24);

          // Rear windshield
          ctx.fillStyle = 'rgba(30,45,60,0.75)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.22, carY+carH*0.63); ctx.lineTo(carX+carW*0.78, carY+carH*0.63);
          ctx.lineTo(carX+carW*0.84, carY+carH*0.76); ctx.lineTo(carX+carW*0.16, carY+carH*0.76);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(40); ctx.lineWidth = 1; ctx.stroke();

          // Trunk line
          ctx.strokeStyle = dk(30); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.12, carY+carH*0.79); ctx.lineTo(carX+carW*0.88, carY+carH*0.79); ctx.stroke();

          // Side mirrors
          ctx.fillStyle = dk(15);
          ctx.beginPath(); ctx.ellipse(carX-carW*0.02, carY+carH*0.35, carW*0.05, carH*0.035, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = dk(45); ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(carX+carW*1.02, carY+carH*0.35, carW*0.05, carH*0.035, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

          // Headlights
          const hl1 = ctx.createRadialGradient(carX+carW*0.22,carY+carH*0.03,0, carX+carW*0.22,carY+carH*0.03,carW*0.07);
          hl1.addColorStop(0, 'rgba(255,240,150,0.9)'); hl1.addColorStop(1, 'rgba(255,220,80,0.3)');
          ctx.fillStyle = hl1; ctx.beginPath(); ctx.ellipse(carX+carW*0.22, carY+carH*0.03, carW*0.07, carH*0.02, 0, 0, Math.PI*2); ctx.fill();
          const hl2 = ctx.createRadialGradient(carX+carW*0.78,carY+carH*0.03,0, carX+carW*0.78,carY+carH*0.03,carW*0.07);
          hl2.addColorStop(0, 'rgba(255,240,150,0.9)'); hl2.addColorStop(1, 'rgba(255,220,80,0.3)');
          ctx.fillStyle = hl2; ctx.beginPath(); ctx.ellipse(carX+carW*0.78, carY+carH*0.03, carW*0.07, carH*0.02, 0, 0, Math.PI*2); ctx.fill();

          // Taillights
          ctx.fillStyle = 'rgba(220,40,40,0.9)';
          ctx.beginPath(); ctx.ellipse(carX+carW*0.22, carY+carH*0.965, carW*0.065, carH*0.02, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(carX+carW*0.78, carY+carH*0.965, carW*0.065, carH*0.02, 0, 0, Math.PI*2); ctx.fill();

          // Body shine
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath(); ctx.ellipse(carX+carW*0.35, cy, carW*0.04, carH*0.38, 0, 0, Math.PI*2); ctx.fill();

        } else if (car.type === 'suv') {
          // ============ SUV ============
          drawBody(0.04, 0.03, 0.10);
          const bg = ctx.createLinearGradient(carX, carY, carX+carW, carY);
          bg.addColorStop(0, dk(25)); bg.addColorStop(0.3, lt(10)); bg.addColorStop(0.5, lt(18)); bg.addColorStop(0.7, lt(8)); bg.addColorStop(1, dk(28));
          ctx.fillStyle = bg; ctx.fill();
          ctx.strokeStyle = dk(50); ctx.lineWidth = 1.8; ctx.stroke();

          // Hood line
          ctx.strokeStyle = dk(30); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.08, carY+carH*0.16); ctx.lineTo(carX+carW*0.92, carY+carH*0.16); ctx.stroke();

          // Front windshield
          ctx.fillStyle = 'rgba(25,40,55,0.88)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.12, carY+carH*0.19); ctx.lineTo(carX+carW*0.88, carY+carH*0.19);
          ctx.lineTo(carX+carW*0.82, carY+carH*0.33); ctx.lineTo(carX+carW*0.18, carY+carH*0.33);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(45); ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'rgba(100,140,180,0.10)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.18, carY+carH*0.20); ctx.lineTo(carX+carW*0.45, carY+carH*0.20);
          ctx.lineTo(carX+carW*0.38, carY+carH*0.31); ctx.lineTo(carX+carW*0.22, carY+carH*0.31);
          ctx.closePath(); ctx.fill();

          // Roof panel
          const rg = ctx.createLinearGradient(carX, cy, carX+carW, cy);
          rg.addColorStop(0, dk(8)); rg.addColorStop(0.5, lt(15)); rg.addColorStop(1, dk(8));
          ctx.fillStyle = rg;
          ctx.fillRect(carX+carW*0.14, carY+carH*0.33, carW*0.72, carH*0.34);
          ctx.strokeStyle = dk(35); ctx.lineWidth = 0.8;
          ctx.strokeRect(carX+carW*0.14, carY+carH*0.33, carW*0.72, carH*0.34);

          // Roof rails
          ctx.strokeStyle = dk(40); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.16, carY+carH*0.34); ctx.lineTo(carX+carW*0.16, carY+carH*0.66); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(carX+carW*0.84, carY+carH*0.34); ctx.lineTo(carX+carW*0.84, carY+carH*0.66); ctx.stroke();

          // Roof grooves
          ctx.strokeStyle = dk(20); ctx.lineWidth = 0.6;
          for (let i = 1; i <= 5; i++) {
            const gy = carY + carH*0.36 + (carH*0.28)*(i/6);
            ctx.beginPath(); ctx.moveTo(carX+carW*0.22, gy); ctx.lineTo(carX+carW*0.78, gy); ctx.stroke();
          }

          // Side windows
          ctx.fillStyle = 'rgba(25,40,55,0.5)';
          ctx.fillRect(carX+carW*0.04, carY+carH*0.34, carW*0.09, carH*0.32);
          ctx.strokeStyle = dk(35); ctx.lineWidth = 0.6;
          ctx.strokeRect(carX+carW*0.04, carY+carH*0.34, carW*0.09, carH*0.32);
          ctx.fillRect(carX+carW*0.87, carY+carH*0.34, carW*0.09, carH*0.32);
          ctx.strokeRect(carX+carW*0.87, carY+carH*0.34, carW*0.09, carH*0.32);

          // Rear windshield
          ctx.fillStyle = 'rgba(25,40,55,0.78)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.18, carY+carH*0.67); ctx.lineTo(carX+carW*0.82, carY+carH*0.67);
          ctx.lineTo(carX+carW*0.86, carY+carH*0.79); ctx.lineTo(carX+carW*0.14, carY+carH*0.79);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(45); ctx.lineWidth = 1; ctx.stroke();

          // Trunk line
          ctx.strokeStyle = dk(30); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.10, carY+carH*0.82); ctx.lineTo(carX+carW*0.90, carY+carH*0.82); ctx.stroke();

          // Side mirrors
          ctx.fillStyle = dk(15);
          ctx.beginPath(); ctx.ellipse(carX-carW*0.03, carY+carH*0.34, carW*0.06, carH*0.04, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = dk(45); ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(carX+carW*1.03, carY+carH*0.34, carW*0.06, carH*0.04, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

          // Headlights
          const hl1 = ctx.createRadialGradient(carX+carW*0.20,carY+carH*0.035,0, carX+carW*0.20,carY+carH*0.035,carW*0.08);
          hl1.addColorStop(0, 'rgba(255,235,140,0.95)'); hl1.addColorStop(1, 'rgba(255,220,80,0.2)');
          ctx.fillStyle = hl1; ctx.beginPath(); ctx.ellipse(carX+carW*0.20, carY+carH*0.035, carW*0.08, carH*0.022, 0, 0, Math.PI*2); ctx.fill();
          const hl2 = ctx.createRadialGradient(carX+carW*0.80,carY+carH*0.035,0, carX+carW*0.80,carY+carH*0.035,carW*0.08);
          hl2.addColorStop(0, 'rgba(255,235,140,0.95)'); hl2.addColorStop(1, 'rgba(255,220,80,0.2)');
          ctx.fillStyle = hl2; ctx.beginPath(); ctx.ellipse(carX+carW*0.80, carY+carH*0.035, carW*0.08, carH*0.022, 0, 0, Math.PI*2); ctx.fill();

          // Taillights
          ctx.fillStyle = 'rgba(200,30,30,0.9)';
          ctx.beginPath(); ctx.roundRect(carX+carW*0.12, carY+carH*0.945, carW*0.14, carH*0.025, 2); ctx.fill();
          ctx.beginPath(); ctx.roundRect(carX+carW*0.74, carY+carH*0.945, carW*0.14, carH*0.025, 2); ctx.fill();

          // Body shine
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath(); ctx.ellipse(carX+carW*0.35, cy, carW*0.04, carH*0.40, 0, 0, Math.PI*2); ctx.fill();

        } else {
          // ============ COUPE ============
          drawBody(0.12, 0.10, 0.14);
          const bg = ctx.createLinearGradient(carX, carY, carX+carW, carY);
          bg.addColorStop(0, dk(22)); bg.addColorStop(0.25, lt(12)); bg.addColorStop(0.5, lt(22)); bg.addColorStop(0.75, lt(8)); bg.addColorStop(1, dk(22));
          ctx.fillStyle = bg; ctx.fill();
          ctx.strokeStyle = dk(50); ctx.lineWidth = 1.5; ctx.stroke();

          // Hood line
          ctx.strokeStyle = dk(28); ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.16, carY+carH*0.22); ctx.lineTo(carX+carW*0.84, carY+carH*0.22); ctx.stroke();

          // Front windshield
          ctx.fillStyle = 'rgba(28,42,58,0.88)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.10, carY+carH*0.24); ctx.lineTo(carX+carW*0.90, carY+carH*0.24);
          ctx.lineTo(carX+carW*0.80, carY+carH*0.37); ctx.lineTo(carX+carW*0.20, carY+carH*0.37);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(42); ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'rgba(110,150,190,0.10)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.16, carY+carH*0.25); ctx.lineTo(carX+carW*0.48, carY+carH*0.25);
          ctx.lineTo(carX+carW*0.38, carY+carH*0.35); ctx.lineTo(carX+carW*0.24, carY+carH*0.35);
          ctx.closePath(); ctx.fill();

          // Roof (sporty cabin)
          const rg = ctx.createLinearGradient(carX, cy, carX+carW, cy);
          rg.addColorStop(0, dk(10)); rg.addColorStop(0.5, lt(18)); rg.addColorStop(1, dk(10));
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.18, carY+carH*0.37); ctx.lineTo(carX+carW*0.82, carY+carH*0.37);
          ctx.lineTo(carX+carW*0.80, carY+carH*0.63); ctx.lineTo(carX+carW*0.20, carY+carH*0.63);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(32); ctx.lineWidth = 0.7; ctx.stroke();

          // Side windows
          ctx.fillStyle = 'rgba(28,42,58,0.50)';
          ctx.fillRect(carX+carW*0.06, carY+carH*0.37, carW*0.11, carH*0.26);
          ctx.strokeStyle = dk(32); ctx.lineWidth = 0.5;
          ctx.strokeRect(carX+carW*0.06, carY+carH*0.37, carW*0.11, carH*0.26);
          ctx.fillRect(carX+carW*0.83, carY+carH*0.37, carW*0.11, carH*0.26);
          ctx.strokeRect(carX+carW*0.83, carY+carH*0.37, carW*0.11, carH*0.26);

          // Rear windshield (fastback)
          ctx.fillStyle = 'rgba(28,42,58,0.80)';
          ctx.beginPath();
          ctx.moveTo(carX+carW*0.24, carY+carH*0.63); ctx.lineTo(carX+carW*0.76, carY+carH*0.63);
          ctx.lineTo(carX+carW*0.80, carY+carH*0.74); ctx.lineTo(carX+carW*0.20, carY+carH*0.74);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = dk(42); ctx.lineWidth = 0.8; ctx.stroke();

          // Trunk line
          ctx.strokeStyle = dk(28); ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.16, carY+carH*0.77); ctx.lineTo(carX+carW*0.84, carY+carH*0.77); ctx.stroke();

          // Fender curves
          ctx.strokeStyle = `rgba(${rgbStr},0.3)`; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(carX+carW*0.06, carY+carH*0.25); ctx.quadraticCurveTo(carX+carW*0.03, carY+carH*0.50, carX+carW*0.08, carY+carH*0.75); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(carX+carW*0.94, carY+carH*0.25); ctx.quadraticCurveTo(carX+carW*0.97, carY+carH*0.50, carX+carW*0.92, carY+carH*0.75); ctx.stroke();

          // Side mirrors
          ctx.fillStyle = dk(12);
          ctx.beginPath(); ctx.ellipse(carX-carW*0.02, carY+carH*0.38, carW*0.045, carH*0.03, 0.2, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = dk(45); ctx.lineWidth = 0.7; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(carX+carW*1.02, carY+carH*0.38, carW*0.045, carH*0.03, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();

          // Headlights
          const hl1 = ctx.createRadialGradient(carX+carW*0.24,carY+carH*0.05,0, carX+carW*0.24,carY+carH*0.05,carW*0.09);
          hl1.addColorStop(0, 'rgba(255,240,150,0.92)'); hl1.addColorStop(1, 'rgba(255,220,80,0.15)');
          ctx.fillStyle = hl1; ctx.beginPath(); ctx.ellipse(carX+carW*0.24, carY+carH*0.05, carW*0.09, carH*0.018, -0.15, 0, Math.PI*2); ctx.fill();
          const hl2 = ctx.createRadialGradient(carX+carW*0.76,carY+carH*0.05,0, carX+carW*0.76,carY+carH*0.05,carW*0.09);
          hl2.addColorStop(0, 'rgba(255,240,150,0.92)'); hl2.addColorStop(1, 'rgba(255,220,80,0.15)');
          ctx.fillStyle = hl2; ctx.beginPath(); ctx.ellipse(carX+carW*0.76, carY+carH*0.05, carW*0.09, carH*0.018, 0.15, 0, Math.PI*2); ctx.fill();

          // Taillights
          ctx.fillStyle = 'rgba(210,35,35,0.92)';
          ctx.beginPath(); ctx.ellipse(carX+carW*0.24, carY+carH*0.955, carW*0.07, carH*0.017, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(carX+carW*0.76, carY+carH*0.955, carW*0.07, carH*0.017, 0, 0, Math.PI*2); ctx.fill();

          // Body shine
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath(); ctx.ellipse(carX+carW*0.38, cy, carW*0.035, carH*0.35, 0, 0, Math.PI*2); ctx.fill();
        }
      });

      // === CORNER OFFICE (top-left of office space) ===
      const coW = Math.round(W * 0.19);  // corner office width
      const coH = Math.round(W * 0.19); // corner office height (same as width for square)
      const coOpenW = Math.round(W * 0.06); // opening width
      const glassW = 3; // glass wall thickness

      // Slightly darker carpet inside corner office
      const coGrad = ctx.createLinearGradient(0, 0, coW, coH);
      coGrad.addColorStop(0, '#4A6B50');
      coGrad.addColorStop(1, '#3F5E45');
      ctx.fillStyle = coGrad;
      ctx.fillRect(3, 3, coW - 3, coH - 3);

      // Wooden wall — right side (vertical, with opening at bottom)
      ctx.fillStyle = 'rgba(120,80,45,0.7)';
      ctx.fillRect(coW - glassW, 0, glassW + 2, coH - coOpenW);
      // Wood grain highlight
      ctx.fillStyle = 'rgba(160,110,60,0.25)';
      ctx.fillRect(coW - glassW + 1, 5, 1, coH - coOpenW - 10);
      // Dark brown frame top
      ctx.fillStyle = '#5D3A1A';
      ctx.fillRect(coW - glassW - 1, 0, glassW + 4, 3);
      // Dark brown frame bottom (at opening)
      ctx.fillRect(coW - glassW - 1, coH - coOpenW - 2, glassW + 4, 3);

      // Wooden wall — bottom side (horizontal, with opening at right)
      const coOpenStart = coW - coOpenW;
      ctx.fillStyle = 'rgba(120,80,45,0.7)';
      ctx.fillRect(0, coH - glassW, coOpenStart, glassW + 2);
      // Wood grain highlight
      ctx.fillStyle = 'rgba(160,110,60,0.25)';
      ctx.fillRect(5, coH - glassW + 1, coOpenStart - 10, 1);
      // Dark brown frame left
      ctx.fillStyle = '#5D3A1A';
      ctx.fillRect(0, coH - glassW - 1, 3, glassW + 4);
      // Dark brown frame right (at opening)
      ctx.fillRect(coOpenStart - 2, coH - glassW - 1, 3, glassW + 4);

      // Store corner office dimensions for collision
      this.cornerOffice = { w: coW, h: coH, openW: coOpenW };

      // === BORDERS ===
      const bw2 = 3; // border width

      // Dividing line between office space and parking lot — with a doorway opening on the left
      const doorStart = W * 0.10;
      const doorEnd = doorStart + W * 0.126;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = bw2;
      // Left segment: left edge to door start
      ctx.beginPath();
      ctx.moveTo(0, carpetH);
      ctx.lineTo(doorStart, carpetH);
      ctx.stroke();
      // Right segment: door end to right edge
      ctx.beginPath();
      ctx.moveTo(doorEnd, carpetH);
      ctx.lineTo(W, carpetH);
      ctx.stroke();

      tex.refresh();
      this.add.image(0, 0, 'bg').setOrigin(0).setDepth(-100);
    }

    // ===== PHASER GRAPHICS HELPERS =====
    drawIsoBox(g, cx, cy, w, d, h, top, left, right) {
      const bw = w * this.TW / 2, bd = d * this.TH / 2;
      // Left face
      g.fillStyle(left); g.beginPath();
      g.moveTo(cx-bw, cy-h); g.lineTo(cx, cy+bd-h); g.lineTo(cx, cy+bd); g.lineTo(cx-bw, cy);
      g.closePath(); g.fillPath();
      // Right face
      g.fillStyle(right); g.beginPath();
      g.moveTo(cx+bw, cy-h); g.lineTo(cx, cy+bd-h); g.lineTo(cx, cy+bd); g.lineTo(cx+bw, cy);
      g.closePath(); g.fillPath();
      // Top face
      g.fillStyle(top); g.beginPath();
      g.moveTo(cx, cy-bd-h); g.lineTo(cx+bw, cy-h); g.lineTo(cx, cy+bd-h); g.lineTo(cx-bw, cy-h);
      g.closePath(); g.fillPath();
    }

    shade(hex, amt) {
      let r = (hex >> 16) & 0xFF, g = (hex >> 8) & 0xFF, b = hex & 0xFF;
      r = Math.max(0, Math.min(255, r+amt)); g = Math.max(0, Math.min(255, g+amt)); b = Math.max(0, Math.min(255, b+amt));
      return (r << 16) | (g << 8) | b;
    }

    // ===== OBJECT CREATORS =====
    createDesk(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      // Legs
      this.drawIsoBox(g, p.x-TW*0.32, p.y+TH*0.05, 0.08, 0.08, TH*0.3, 0x6B5535, 0x5A4428, 0x7A6040);
      this.drawIsoBox(g, p.x+TW*0.32, p.y+TH*0.05, 0.08, 0.08, TH*0.3, 0x6B5535, 0x5A4428, 0x7A6040);
      this.drawIsoBox(g, p.x-TW*0.1, p.y+TH*0.18, 0.08, 0.08, TH*0.3, 0x6B5535, 0x5A4428, 0x7A6040);
      this.drawIsoBox(g, p.x+TW*0.1, p.y+TH*0.18, 0.08, 0.08, TH*0.3, 0x6B5535, 0x5A4428, 0x7A6040);
      // Surface
      this.drawIsoBox(g, p.x, p.y-TH*0.1, 0.85, 0.55, TH*0.12, 0xC4A57B, 0xA8895F, 0xB39468);
      // Monitor
      this.drawIsoBox(g, p.x+TW*0.05, p.y-TH*0.22+TH*0.02, 0.1, 0.08, TH*0.06, 0x555555, 0x444444, 0x666666);
      this.drawIsoBox(g, p.x+TW*0.05, p.y-TH*0.22, 0.28, 0.06, TH*0.42, 0x4A4A4A, 0x3A3A3A, 0x5A5A5A);
      // Screen glow
      g.fillStyle(0x1A3A5A); g.fillRect(p.x+TW*0.05-TW*0.04, p.y-TH*0.22-TH*0.42+2, TW*0.08, TH*0.3);
      g.fillStyle(0x50B4FF, 0.15); g.fillRect(p.x+TW*0.05-TW*0.04, p.y-TH*0.22-TH*0.42+2, TW*0.08, TH*0.15);
      // Keyboard
      this.drawIsoBox(g, p.x-TW*0.08, p.y-TH*0.18, 0.22, 0.1, TH*0.03, 0x555555, 0x444444, 0x666666);

      g.setDepth(gx + gy);
      // Interactive hit area
      g.setInteractive(new Phaser.Geom.Rectangle(p.x - TW*0.4, p.y - TH*0.8, TW*0.8, TH*1.2), Phaser.Geom.Rectangle.Contains);
      g.on('pointerover', () => { g.setAlpha(0.85); this.input.setDefaultCursor('pointer'); });
      g.on('pointerout', () => { g.setAlpha(1); this.input.setDefaultCursor('default'); });
      return g;
    }

    createChair(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH;
      this.drawIsoBox(g, p.x, p.y, 0.32, 0.28, TH*0.08, 0x3E3E50, 0x2E2E40, 0x4E4E60);
      this.drawIsoBox(g, p.x, p.y-TH*0.08, 0.3, 0.26, TH*0.06, 0x4A4A5E, 0x3A3A4E, 0x5A5A6E);
      this.drawIsoBox(g, p.x-this.TW*0.04, p.y-TH*0.14, 0.06, 0.24, TH*0.3, 0x3E3E50, 0x2E2E40, 0x4E4E60);
      g.setDepth(gx + gy);
      return g;
    }

    createPlant(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      this.drawIsoBox(g, p.x, p.y, 0.2, 0.2, TH*0.32, 0xA67C52, 0x8B6340, 0xB8905E);
      this.drawIsoBox(g, p.x, p.y-TH*0.32, 0.18, 0.18, TH*0.04, 0x5D4037, 0x4E342E, 0x6D4C41);
      const lx = p.x, ly = p.y - TH*0.6, r = TW*0.1;
      [[0,0,1,0x43A047],[-0.6,0.3,0.85,0x388E3C],[0.5,0.2,0.9,0x4CAF50],[0,-0.6,0.75,0x66BB6A],[-0.4,-0.3,0.7,0x2E7D32]].forEach(([dx,dy,s,c]) => {
        g.fillStyle(c); g.fillCircle(lx+r*dx, ly+r*dy, r*s);
      });
      g.setDepth(gx + gy);
      return g;
    }

    createCooler(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      this.drawIsoBox(g, p.x, p.y, 0.22, 0.2, TH*0.8, 0xCFD8DC, 0xB0BEC5, 0xECEFF1);
      this.drawIsoBox(g, p.x, p.y-TH*0.55, 0.12, 0.12, TH*0.08, 0x90A4AE, 0x78909C, 0xB0BEC5);
      g.fillStyle(0x81D4FA); g.fillCircle(p.x, p.y-TH*1.0, TW*0.065);
      g.setDepth(gx + gy);
      return g;
    }

    createCabinet(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      this.drawIsoBox(g, p.x, p.y, 0.35, 0.25, this.TH*0.75, 0x90A4AE, 0x78909C, 0xB0BEC5);
      g.setDepth(gx + gy);
      return g;
    }

    createShelf(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      this.drawIsoBox(g, p.x, p.y, 0.8, 0.2, TH*1.1, 0x8D6E63, 0x6D4C41, 0xA1887F);
      const colors = [0xC62828, 0x1565C0, 0x2E7D32, 0xF57F17, 0x6A1B9A];
      const sx = p.x + TW*0.32;
      for (let i = 0; i < 3; i++) {
        const sy = p.y - TH*0.25*(i+1) - TH*0.02;
        g.lineStyle(1.5, 0x795548); g.beginPath();
        g.moveTo(sx-TW*0.2, sy); g.lineTo(sx+TW*0.08, sy); g.strokePath();
        for (let j = 0; j < 3; j++) {
          g.fillStyle(colors[(i*3+j)%5]); g.fillRect(sx-TW*0.18+j*TW*0.08, sy-TH*0.15, TW*0.06, TH*0.15);
        }
      }
      g.setDepth(gx + gy);
      return g;
    }

    createTable(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      this.drawIsoBox(g, p.x-TW*0.35, p.y+TH*0.08, 0.06, 0.06, TH*0.25, 0x4E342E, 0x3E2723, 0x5D4037);
      this.drawIsoBox(g, p.x+TW*0.35, p.y+TH*0.08, 0.06, 0.06, TH*0.25, 0x4E342E, 0x3E2723, 0x5D4037);
      this.drawIsoBox(g, p.x, p.y-TH*0.05, 1.0, 0.6, TH*0.1, 0x6D4C41, 0x5D4037, 0x7B5B4F);
      g.setDepth(gx + gy);
      return g;
    }

    spawnIntern(hx, hy) {
      const startPos = this.toScr(hx, hy);
      const intern = {
        g: this.add.graphics(),
        x: startPos.x,
        y: startPos.y,
        col: 0x1E88E5, // Blue suit
        isGirl: false,
        skinCol: 0xFFCCBC,
        hairCol: 0x1A1A1A,
        // Approximate hand color logic from old createPerson
        handCol: 0xF0BBAB, 
        facing: 'down',
        moving: false,
        walkFrame: 0,
        walkTimer: 0,
        isPlayer: false,
        home: { gx: hx, gy: hy },
        aiState: 'WORKING'
      };

      intern.g.setPosition(intern.x, intern.y);
      this.drawCharacter(intern);
      
      this.roomObjects.push(intern.g);
      if (!this.interns) this.interns = [];
      this.interns.push(intern);
      
      const roamTimer = this.time.addEvent({
        delay: 5000 + Math.random() * 10000,
        loop: true,
        callback: () => {
          if (intern.aiState === 'WORKING') {
            intern.aiState = 'WANDERING';
            let wgx = Math.floor(Math.random() * 8) + 1;
            let wgy = Math.floor(Math.random() * 6) + 1;
            if (wgx < 3 && wgy < 3) wgx = 5;
            const target = this.toScr(wgx, wgy);
            
            const dx = target.x - intern.x;
            const dy = target.y - intern.y;
            if (Math.abs(dx) > Math.abs(dy)) {
              intern.facing = dx > 0 ? 'right' : 'left';
            } else {
              intern.facing = dy > 0 ? 'down' : 'up';
            }
            intern.moving = true;

            this.tweens.add({
              targets: intern, x: target.x, y: target.y,
              duration: 3000 + Math.random() * 2000,
              ease: 'Linear',
              onComplete: () => { intern.moving = false; intern.facing = 'down'; }
            });
            roamTimer.delay = 3000 + Math.random() * 5000;
          } else {
            intern.aiState = 'WORKING';
            const target = this.toScr(intern.home.gx, intern.home.gy);
            
            const dx = target.x - intern.x;
            const dy = target.y - intern.y;
            if (Math.abs(dx) > Math.abs(dy)) {
              intern.facing = dx > 0 ? 'right' : 'left';
            } else {
              intern.facing = dy > 0 ? 'down' : 'up';
            }
            intern.moving = true;

            this.tweens.add({
              targets: intern, x: target.x, y: target.y,
              duration: 3000 + Math.random() * 2000,
              ease: 'Linear',
              onComplete: () => { intern.moving = false; intern.facing = 'up'; } // Face desk when home
            });
            roamTimer.delay = 10000 + Math.random() * 10000;
          }
        }
      });
      
      if (!this.internTimers) this.internTimers = [];
      this.internTimers.push(roamTimer);
    }

    createWhiteboard(gx, gy) {
      const p = this.toScr(gx, gy);
      const g = this.add.graphics();
      const TH = this.TH, TW = this.TW;
      this.drawIsoBox(g, p.x, p.y-TH*0.3, 0.7, 0.06, TH*0.7, 0x888888, 0x777777, 0x999999);
      const wx = p.x + TW*0.28, wy = p.y - TH*0.95;
      g.fillStyle(0xF5F5F5); g.fillRect(wx-TW*0.15, wy, TW*0.28, TH*0.5);
      g.lineStyle(1, 0xE53935); g.beginPath(); g.moveTo(wx-TW*0.1, wy+TH*0.1); g.lineTo(wx+TW*0.08, wy+TH*0.15); g.strokePath();
      g.lineStyle(1, 0x1E88E5); g.beginPath(); g.moveTo(wx-TW*0.1, wy+TH*0.25); g.lineTo(wx+TW*0.05, wy+TH*0.22); g.strokePath();
      g.lineStyle(1, 0x43A047); g.beginPath(); g.moveTo(wx-TW*0.08, wy+TH*0.35); g.lineTo(wx+TW*0.06, wy+TH*0.38); g.strokePath();
      g.setDepth(gx + gy);
      return g;
    }

    // ===== BUILD ROOM =====
    _openComputerScreen() {
      const overlay = document.getElementById('game-screen-overlay');
      if (!overlay) return;

      // Show the HTML overlay
      overlay.style.display = 'flex';
      // Re-trigger the animation
      overlay.style.animation = 'none';
      overlay.offsetHeight; // force reflow
      overlay.style.animation = '';

      // Render upgrades into the overlay
      renderUpgrades();

      // Mark state
      this._blueScreen = true;

      // Close button (red dot)
      const closeBtn = document.getElementById('screen-close-btn');
      this._screenCloseHandler = () => {
        this._atDesk = false;
        this._closeComputerScreen();
      };
      closeBtn.addEventListener('click', this._screenCloseHandler);

      // ESC key to close
      this._escHandler = (evt) => {
        if (evt.code === 'Escape') {
          this._atDesk = false;
          this._closeComputerScreen();
        }
      };
      document.addEventListener('keydown', this._escHandler);
    }

    _closeComputerScreen() {
      const overlay = document.getElementById('game-screen-overlay');
      if (overlay) overlay.style.display = 'none';
      this._blueScreen = null;

      // Clean up event listeners
      const closeBtn = document.getElementById('screen-close-btn');
      if (closeBtn && this._screenCloseHandler) {
        closeBtn.removeEventListener('click', this._screenCloseHandler);
        this._screenCloseHandler = null;
      }
      if (this._escHandler) {
        document.removeEventListener('keydown', this._escHandler);
        this._escHandler = null;
      }
    }

    buildRoom() {
      // Destroy old objects
      this.roomObjects.forEach(o => { if (o.destroy) o.destroy(); });
      this.roomObjects = [];
      this.interns = [];
      // Clean up computer interaction state
      if (this._computerPrompt) { this._computerPrompt.destroy(); this._computerPrompt = null; }
      this._deskPos = null;
      this._coComputer = null;
      // Clear colliders but keep car colliders (added in drawBackground)
      this.colliders = this.colliders.filter(c => c.isCar);

      const ups = gameState ? gameState.upgrades : { office:0, team:0, deals:0 };
      const TW = this.TW, TH = this.TH;

      const addObj = (obj, gx, gy, cw, ch, offsetX, offsetY) => {
        this.roomObjects.push(obj);
        // Add collision box centered on the object's screen position
        const p = this.toScr(gx, gy);
        const cx = p.x + (offsetX || 0) - cw/2;
        const cy = p.y + (offsetY || 0) - ch/2;
        this.colliders.push({ x: cx, y: cy, w: cw, h: ch });
        return obj;
      };
      const add = (obj) => { this.roomObjects.push(obj); return obj; };

      // Corner office furniture (always present — it's the boss's office)
      const co = this.cornerOffice;
      if (co) {
        // Small desk with monitor + chair (tucked into top-left corner)
        const ds = co.w * 0.02; // unit scale based on office size
        const furnX = co.w * 0.22; // centered in left portion

        // Chair (against top wall, backrest touching wall)
        const chairY = ds * 3;
        const cg = this.add.graphics();
        // Chair back (against wall)
        cg.fillStyle(0x2E2E40); cg.fillRect(furnX - ds*3, chairY, ds*6, ds*2);
        // Seat
        cg.fillStyle(0x3E3E50); cg.fillRect(furnX - ds*3, chairY + ds*2, ds*6, ds*4);
        cg.fillStyle(0x4A4A5E); cg.fillRect(furnX - ds*3, chairY + ds*2, ds*6, ds*0.8);
        cg.setDepth(10);
        this.roomObjects.push(cg);
        this.colliders.push({ x: furnX - ds*3, y: chairY, w: ds*6, h: ds*6 });

        // Store chair center for E-key interaction
        this._chairPos = { x: furnX, y: chairY + ds*3 };

        // Desk (below chair, person faces down toward desk)
        const deskY = chairY + ds*9;
        const dg = this.add.graphics();
        // Desktop surface (rich mahogany top)
        dg.fillStyle(0xBC8F68); dg.fillRect(furnX - ds*7.5, deskY, ds*15, ds*2.8);
        // Surface edge highlight
        dg.fillStyle(0xD4A87A); dg.fillRect(furnX - ds*7.5, deskY, ds*15, ds*0.6);
        // Surface shadow line
        dg.fillStyle(0x8B6B4A); dg.fillRect(furnX - ds*7.5, deskY + ds*2.4, ds*15, ds*0.4);
        // Desk legs (dark walnut)
        dg.fillStyle(0x4E342E); dg.fillRect(furnX - ds*6, deskY + ds*2.8, ds*1.2, ds*5);
        dg.fillStyle(0x4E342E); dg.fillRect(furnX + ds*5, deskY + ds*2.8, ds*1.2, ds*5);
        // Front panel
        dg.fillStyle(0x6D4C41); dg.fillRect(furnX - ds*6, deskY + ds*3.5, ds*12.2, ds*4);
        // Drawer
        dg.fillStyle(0x5D4037); dg.fillRect(furnX - ds*3, deskY + ds*4, ds*6, ds*2.5);
        // Drawer handle
        dg.fillStyle(0xB08840); dg.fillRect(furnX - ds*1, deskY + ds*5, ds*2, ds*0.6);
        // Keyboard (on desk, between monitor and chair)
        dg.fillStyle(0x333333); dg.fillRect(furnX - ds*2.5, deskY + ds*0.2, ds*4, ds*1.2);
        dg.fillStyle(0x3E3E3E); dg.fillRect(furnX - ds*2.3, deskY + ds*0.35, ds*3.6, ds*0.8);
        // === Monitor (back view — screen faces chair, we see the rear) ===
        // Stand base (flat oval on desk)
        dg.fillStyle(0x3A3A3A); dg.fillRect(furnX - ds*2, deskY + ds*2.2, ds*4, ds*0.8);
        dg.fillStyle(0x444444); dg.fillRect(furnX - ds*1.6, deskY + ds*2.3, ds*3.2, ds*0.5);
        // Stand neck (vertical)
        dg.fillStyle(0x4A4A4A); dg.fillRect(furnX - ds*0.4, deskY + ds*1.5, ds*0.8, ds*1);
        // Monitor back panel (wide dark rectangle, slight depth)
        dg.fillStyle(0x2C2C2C); dg.fillRect(furnX - ds*4, deskY - ds*1.5, ds*8, ds*3);
        // Back panel edge highlight (top edge catches light)
        dg.fillStyle(0x404040); dg.fillRect(furnX - ds*4, deskY - ds*1.5, ds*8, ds*0.4);
        // Back panel bottom edge shadow
        dg.fillStyle(0x1E1E1E); dg.fillRect(furnX - ds*4, deskY + ds*1.1, ds*8, ds*0.4);
        // Ventilation lines
        dg.fillStyle(0x353535); dg.fillRect(furnX - ds*2.5, deskY - ds*0.8, ds*5, ds*0.2);
        dg.fillStyle(0x353535); dg.fillRect(furnX - ds*2.5, deskY - ds*0.3, ds*5, ds*0.2);
        dg.fillStyle(0x353535); dg.fillRect(furnX - ds*2.5, deskY + ds*0.2, ds*5, ds*0.2);
        // Brand logo dot (center of back)
        dg.fillStyle(0x606060); dg.fillRect(furnX - ds*0.4, deskY + ds*0.6, ds*0.8, ds*0.3);
        dg.setDepth(10);
        this.roomObjects.push(dg);
        this.colliders.push({ x: furnX - ds*7.5, y: deskY, w: ds*15, h: ds*7.5 });

        // Store desk position for proximity-based click detection (handled in create/update)
        const hitCX = furnX;
        const hitCY = deskY + ds*2;
        this._deskPos = {
          x: hitCX,
          y: hitCY,
          clickRadius: Math.max(ds * 15, 80), // generous click area around the computer
          promptOffsetY: ds * 8 // offset for the "Click" prompt above the desk
        };
        this._coComputer = dg;

        // Corner office glass wall collisions (with openings to walk through)
        // Right wall (with opening at bottom)
        this.colliders.push({ x: co.w - 5, y: 0, w: 8, h: co.h - co.openW });
        // Bottom wall (with opening at right)
        this.colliders.push({ x: 0, y: co.h - 5, w: co.w - co.openW, h: 8 });

        // --- Animated door panels (Phaser Graphics, no colliders) ---
        if (this._doorRight) this._doorRight.destroy();
        if (this._doorBottom) this._doorBottom.destroy();

        // Right wall door (vertical)
        const rg = this.add.graphics();
        rg.fillStyle(0x78502D, 0.85);
        rg.fillRect(-3, 0, 6, co.openW);
        rg.fillStyle(0xA0703C, 0.2);
        rg.fillRect(-1, 3, 1, co.openW - 6);
        rg.fillStyle(0xB08840);
        rg.fillRect(-1, co.openW / 2 - 3, 2, 6);
        rg.setPosition(co.w, co.h - co.openW);
        rg.setDepth(500);
        this._doorRight = rg;
        this._doorRightHome = { x: co.w, y: co.h - co.openW };
        this.roomObjects.push(rg);

        // Bottom wall door (horizontal)
        const bg = this.add.graphics();
        bg.fillStyle(0x78502D, 0.85);
        bg.fillRect(0, -3, co.openW, 6);
        bg.fillStyle(0xA0703C, 0.2);
        bg.fillRect(3, -1, co.openW - 6, 1);
        bg.fillStyle(0xB08840);
        bg.fillRect(co.openW / 2 - 3, -1, 6, 2);
        bg.setPosition(co.w - co.openW, co.h);
        bg.setDepth(500);
        this._doorBottom = bg;
        this._doorBottomHome = { x: co.w - co.openW, y: co.h };
        this.roomObjects.push(bg);

        this._doorOpen = false;
        this._doorAnimating = false;

        // Door colliders (block player when closed)
        this._doorColliders = [];
        const rDoorCol = { x: co.w - 5, y: co.h - co.openW, w: 8, h: co.openW };
        this.colliders.push(rDoorCol);
        this._doorColliders.push(rDoorCol);
        const bDoorCol = { x: co.w - co.openW, y: co.h - 5, w: co.openW, h: 8 };
        this.colliders.push(bDoorCol);
        this._doorColliders.push(bDoorCol);
      }

        // Main office furniture — handled via Intern Stations
        // Clear old timers
        if (this.internTimers) {
          this.internTimers.forEach(t => t.remove());
          this.internTimers = [];
        }

        // Add 1 desk + chair + intern for each upgrade level
        const itier = ups.intern_station || 0;
        for (let i = 0; i < Math.min(itier, INTERN_SLOTS.length); i++) {
          const slot = INTERN_SLOTS[i];
          
          // Spawn Desk
          addObj(this.createDesk(slot.gx, slot.gy), slot.gx, slot.gy, TW*0.85, TH*0.6, 0, -TH*0.1);
          // Spawn Chair
          addObj(this.createChair(slot.gx, slot.gy+1), slot.gx, slot.gy+1, TW*0.3, TH*0.3, 0, 0);
          // Spawn Intern
          this.spawnIntern(slot.gx, slot.gy+1);
        }
    }

    refreshRoom() {
      this.buildRoom();
    }
  }

  // ===== PHASER GAME =====
  let phaserGame = null;

  function startPhaser() {
    if (phaserGame) {
      // Restart scene to fully rebuild (background + room)
      phaserGame.scene.getScene('FirmScene').scene.restart();
      return;
    }
    const container = document.querySelector('.game-building-area');
    const w = Math.min(container.clientWidth, 900);
    const h = Math.round(w * 0.7);

    phaserGame = new Phaser.Game({
      type: Phaser.CANVAS,
      canvas: document.getElementById('game-canvas'),
      width: w,
      height: h,
      backgroundColor: '#000000',
      scene: [FirmScene],
      banner: false
    });
  }

  // ===== HUD & UPGRADES (HTML) =====
  function renderHUD() {
    gameState.level = calcLevel();
    nameDisp.textContent = gameState.firmName;
    levelDisp.textContent = `Level ${gameState.level} — Investment Bank`;
    coinDisp.textContent = F4FCoins.get().toLocaleString();
    saveGame();
  }

  function renderUpgrades() {
    upGrid.innerHTML = '';
    const coins = F4FCoins.get();
    Object.entries(UPGRADES).forEach(([key, up]) => {
      const tier = gameState.upgrades[key] || 0;
      const maxed = tier >= up.maxTier;
      const nextCost = up.baseCost + (tier * up.costIncrement);
      const afford = !maxed && coins >= nextCost;
      const card = document.createElement('div');
      card.className = 'game-upgrade-card';
      if (maxed) card.classList.add('game-upgrade-maxed');
      if (!maxed && !afford) card.classList.add('game-upgrade-locked');
      card.innerHTML = `
        <div class="game-upgrade-icon">${up.icon}</div>
        <div class="game-upgrade-name">${up.name}</div>
        <div class="game-upgrade-tier">Desk Station (${tier}/${up.maxTier})</div>
        ${maxed ? '<div class="game-upgrade-maxed-text">✓ MAXED</div>' :
          `<div class="game-upgrade-cost${afford ? ' game-affordable' : ''}">🪙 ${nextCost} FC</div>`}
      `;
      if (!maxed && afford) card.addEventListener('click', () => purchaseUpgrade(key));
      upGrid.appendChild(card);
    });
  }

  function purchaseUpgrade(key) {
    const up = UPGRADES[key];
    const tier = gameState.upgrades[key] || 0;
    if (tier >= up.maxTier) return;
    const cost = up.baseCost + (tier * up.costIncrement);
    if (!F4FCoins.spend(cost)) return;
    gameState.upgrades[key] = tier + 1;
    gameState.totalSpent += cost;
    const oldLvl = gameState.level, newLvl = calcLevel();
    saveGame(); renderHUD(); renderUpgrades();
    // Refresh Phaser room
    if (phaserGame) phaserGame.scene.getScene('FirmScene').refreshRoom();
    if (newLvl > oldLvl) showLevelUp(newLvl);
  }

  function showLevelUp(level) {
    const p = document.createElement('div');
    p.className = 'game-coin-popup'; p.style.borderColor = '#8a8aff'; p.style.color = '#8a8aff';
    p.textContent = `⬆ LEVEL UP! Level ${level}`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 1600);
  }

  // ===== SETUP =====
  firmInput.addEventListener('input', () => { startBtn.disabled = firmInput.value.trim().length < 2; });
  startBtn.addEventListener('click', () => {
    const n = firmInput.value.trim(); if (n.length < 2) return;
    createNewGame(n); showMain();
  });

  // Gender selector toggle
  document.querySelectorAll('.game-gender-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.game-gender-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Skin tone selector toggle
  document.querySelectorAll('.game-skin-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      document.querySelectorAll('.game-skin-circle').forEach(c => c.classList.remove('selected'));
      circle.classList.add('selected');
    });
  });

  // Hair color selector toggle
  document.querySelectorAll('.game-hair-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      document.querySelectorAll('.game-hair-circle').forEach(c => c.classList.remove('selected'));
      circle.classList.add('selected');
    });
  });
  firmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !startBtn.disabled) startBtn.click(); });

  function showSetup() {
    setupScreen.style.display = 'flex'; mainScreen.style.display = 'none';
    // Release WASD key captures so text input works normally
    if (phaserGame) {
      const scene = phaserGame.scene.getScene('FirmScene');
      if (scene && scene.input && scene.input.keyboard) {
        scene.input.keyboard.enabled = false;
        scene.input.keyboard.removeCapture([
          Phaser.Input.Keyboard.KeyCodes.W,
          Phaser.Input.Keyboard.KeyCodes.A,
          Phaser.Input.Keyboard.KeyCodes.S,
          Phaser.Input.Keyboard.KeyCodes.D,
          Phaser.Input.Keyboard.KeyCodes.UP,
          Phaser.Input.Keyboard.KeyCodes.LEFT,
          Phaser.Input.Keyboard.KeyCodes.DOWN,
          Phaser.Input.Keyboard.KeyCodes.RIGHT
        ]);
      }
    }
  }
  function showMain() {
    setupScreen.style.display = 'none'; mainScreen.style.display = 'block';
    renderHUD(); renderUpgrades();
    setTimeout(() => {
      startPhaser();
      // Re-enable Phaser keyboard capture
      if (phaserGame) {
        const scene = phaserGame.scene.getScene('FirmScene');
        if (scene && scene.input && scene.input.keyboard) {
          scene.input.keyboard.enabled = true;
        }
        const canvas = phaserGame.canvas;
        if (canvas) canvas.focus();
      }
    }, 100);
  }

  setInterval(() => {
    if (gameState) { coinDisp.textContent = F4FCoins.get().toLocaleString(); renderUpgrades(); }
  }, 2000);

  // Reset
  const resetModal = document.getElementById('reset-modal');
  document.getElementById('reset-firm-btn').addEventListener('click', () => { resetModal.style.display = 'flex'; });
  document.getElementById('reset-cancel').addEventListener('click', () => { resetModal.style.display = 'none'; });
  document.getElementById('reset-confirm').addEventListener('click', () => {
    localStorage.removeItem(GAME_KEY); F4FCoins.reset(); gameState = null;
    resetModal.style.display = 'none';
    if (phaserGame) {
      // Don't destroy — just clear the room and restart the scene later
      const scene = phaserGame.scene.getScene('FirmScene');
      if (scene) {
        scene.roomObjects.forEach(o => { if (o.destroy) o.destroy(); }); scene.roomObjects = [];
        if (scene.player && scene.player.g) { scene.player.g.destroy(); scene.player = null; }
      }
    }
    showSetup();
  });

  // Dev coins
  document.getElementById('dev-coins-btn').addEventListener('click', () => {
    F4FCoins.add(10);
    if (gameState) { renderHUD(); renderUpgrades(); }
  });

  // Init
  if (loadGame()) { showMain(); } else { showSetup(); }
});
