// ============================================
// FINANCE4FUN — Flashcard Learning Engine
// Hardened: input safety, keyboard edge cases
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const categoryFilter = document.getElementById('category-filter');
  const levelFilter = document.getElementById('level-filter');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const cardCategory = document.getElementById('card-category');
  const cardTerm = document.getElementById('card-term');
  const cardDefinition = document.getElementById('card-definition');
  const cardExample = document.getElementById('card-example');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const currentNum = document.getElementById('current-num');
  const totalNum = document.getElementById('total-num');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const flashcardArea = document.getElementById('flashcard-area');
  const emptyState = document.getElementById('empty-state');
  const cardImage = document.getElementById('card-image');
  const cardImageEl = document.getElementById('card-image-el');

  // --- Safety check ---
  if (!flashcard || !flashcardArea || !emptyState) {
    console.error('Learn: Required page elements not found.');
    return;
  }

  let currentDeck = [];
  let currentIndex = 0;

  // --- Populate filter dropdowns ---
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${cat.emoji} ${cat.name}`;
    categoryFilter.appendChild(opt);
  });

  Object.entries(LEVELS).forEach(([key, lvl]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${lvl.emoji} ${lvl.name}`;
    levelFilter.appendChild(opt);
  });

  // --- Check for URL params (e.g., from category card click on home) ---
  const urlParams = new URLSearchParams(window.location.search);
  const presetCategory = urlParams.get('category');
  const presetLevel = urlParams.get('level');
  if (presetCategory && CATEGORIES[presetCategory]) {
    categoryFilter.value = presetCategory;
  }
  if (presetLevel && LEVELS[presetLevel]) {
    levelFilter.value = presetLevel;
  }

  // --- Build Deck ---
  function buildDeck() {
    const category = categoryFilter.value;
    const level = levelFilter.value;

    currentDeck = FINANCE_TERMS.filter(term => {
      const catMatch = category === 'all' || term.category === category;
      const lvlMatch = level === 'all' || term.level === level;
      return catMatch && lvlMatch;
    });

    currentIndex = 0;

    if (currentDeck.length === 0) {
      flashcardArea.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      flashcardArea.style.display = 'flex';
      emptyState.style.display = 'none';
      renderCard();
    }
  }

  // --- Render current card ---
  function renderCard() {
    const term = currentDeck[currentIndex];
    if (!term) return;

    // Unflip card
    flashcard.classList.remove('flipped');

    // Update front
    const cat = CATEGORIES[term.category];
    cardCategory.textContent = cat ? cat.name.toUpperCase() : term.category.toUpperCase();
    cardTerm.textContent = term.term;

    // Update image
    if (term.image) {
      cardImageEl.src = term.image;
      cardImageEl.alt = term.term + ' illustration';
      cardImage.style.display = 'block';
    } else {
      cardImage.style.display = 'none';
      cardImageEl.src = '';
      cardImageEl.alt = '';
    }

    // Update back
    cardDefinition.textContent = term.definition;
    cardExample.querySelector('span').textContent = term.example;

    // Update counter
    currentNum.textContent = currentIndex + 1;
    totalNum.textContent = currentDeck.length;

    // Update progress
    const progress = ((currentIndex + 1) / currentDeck.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Card ${currentIndex + 1} of ${currentDeck.length}`;

    // Update button states
    prevBtn.disabled = currentIndex === 0;
    prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
  }

  // --- Flip card ---
  flashcardContainer.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
    // Award FinCoin for studying
    if (typeof F4FCoins !== 'undefined') F4FCoins.add(1);
  });

  // --- Navigation ---
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      currentIndex--;
      renderCard();
    }
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < currentDeck.length - 1) {
      currentIndex++;
      renderCard();
    } else {
      // Loop back to start
      currentIndex = 0;
      renderCard();
    }
  });

  // --- Keyboard navigation ---
  // Only respond when not focused on interactive elements (dropdowns, buttons)
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'select' || tag === 'input' || tag === 'textarea') return;

    if (e.key === 'ArrowLeft') {
      prevBtn.click();
    } else if (e.key === 'ArrowRight') {
      nextBtn.click();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flashcard.classList.toggle('flipped');
    }
  });

  // --- Shuffle ---
  shuffleBtn.addEventListener('click', () => {
    for (let i = currentDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
    }
    currentIndex = 0;
    renderCard();
  });

  // --- Filter changes ---
  categoryFilter.addEventListener('change', buildDeck);
  levelFilter.addEventListener('change', buildDeck);

  // --- Init ---
  buildDeck();
});
