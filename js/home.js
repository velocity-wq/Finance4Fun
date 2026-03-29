// ============================================
// FINANCE4FUN — Home Page
// Populates categories grid and term count
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Populate categories grid ---
  const grid = document.getElementById('categories-grid');
  if (grid) {
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const count = FINANCE_TERMS.filter(t => t.category === key).length;

      const card = document.createElement('a');
      card.href = `learn.html?category=${key}`;
      card.className = 'category-card animate-in';

      const emojiDiv = document.createElement('div');
      emojiDiv.className = 'cat-emoji';

      if (cat.image) {
        const img = document.createElement('img');
        img.src = cat.image;
        img.alt = cat.name;
        img.className = 'cat-icon-img';
        emojiDiv.appendChild(img);
      } else {
        emojiDiv.textContent = cat.emoji;
      }

      const infoDiv = document.createElement('div');
      infoDiv.className = 'cat-info';

      const h4 = document.createElement('h4');
      h4.textContent = cat.name;

      const p = document.createElement('p');
      p.textContent = `${count} term${count !== 1 ? 's' : ''}`;

      infoDiv.appendChild(h4);
      infoDiv.appendChild(p);
      card.appendChild(emojiDiv);
      card.appendChild(infoDiv);
      grid.appendChild(card);
    });
  }

  // --- Update term count dynamically ---
  const countEl = document.getElementById('term-count');
  if (countEl) countEl.textContent = FINANCE_TERMS.length;
});
