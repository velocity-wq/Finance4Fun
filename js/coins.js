// ============================================
// FINANCE4FUN — FinCoin Currency System
// Standalone utility — no dependencies
// ============================================

const F4FCoins = (() => {
  const STORAGE_KEY = 'f4f_coins';

  // --- Web Audio "ching" sound ---
  let audioCtx = null;

  function playChing() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // High-pitched metallic "coin" sound
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.05);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(audioCtx.currentTime);
      osc2.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.2);
      osc2.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Silently fail — audio is a nice-to-have
    }
  }

  function get() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }

  function set(amount) {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, amount)));
  }

  function add(amount) {
    if (amount <= 0) return;
    set(get() + amount);
    playChing();
  }

  function spend(amount) {
    const current = get();
    if (amount > current) return false;
    set(current - amount);
    return true;
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { get, add, spend, reset };
})();
