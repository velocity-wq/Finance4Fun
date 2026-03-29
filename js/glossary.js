// ============================================
// FINANCE4FUN — Glossary Search & Filter Engine
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const searchInput = document.getElementById('glossary-search');
  const categoryFilter = document.getElementById('glossary-category');
  const levelFilter = document.getElementById('glossary-level');
  const letterNav = document.getElementById('letter-nav');
  const glossaryList = document.getElementById('glossary-list');
  const glossaryEmpty = document.getElementById('glossary-empty');
  const glossaryCount = document.getElementById('glossary-count');

  let activeLetter = null;

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

  // --- Build letter navigation ---
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = new Set(FINANCE_TERMS.map(t => t.term[0].toUpperCase()));

  alphabet.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.dataset.letter = letter;

    if (!usedLetters.has(letter)) {
      btn.classList.add('disabled');
    } else {
      btn.addEventListener('click', () => {
        if (activeLetter === letter) {
          activeLetter = null;
          btn.classList.remove('active');
        } else {
          // Remove active from all
          letterNav.querySelectorAll('.letter-btn').forEach(b => b.classList.remove('active'));
          activeLetter = letter;
          btn.classList.add('active');
        }
        renderGlossary();
      });
    }

    letterNav.appendChild(btn);
  });

  // --- Render glossary ---
  function renderGlossary() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const level = levelFilter.value;

    // Filter terms
    let filtered = FINANCE_TERMS.filter(term => {
      const searchMatch = !searchTerm || 
        term.term.toLowerCase().includes(searchTerm) || 
        term.definition.toLowerCase().includes(searchTerm);
      const catMatch = category === 'all' || term.category === category;
      const lvlMatch = level === 'all' || term.level === level;
      const letterMatch = !activeLetter || term.term[0].toUpperCase() === activeLetter;
      return searchMatch && catMatch && lvlMatch && letterMatch;
    });

    // Sort alphabetically
    filtered.sort((a, b) => a.term.localeCompare(b.term));

    // Group by first letter
    const grouped = {};
    filtered.forEach(term => {
      const letter = term.term[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    });

    // Render
    glossaryList.innerHTML = '';

    if (filtered.length === 0) {
      glossaryList.style.display = 'none';
      glossaryEmpty.style.display = 'block';
      glossaryCount.textContent = '';
      return;
    }

    glossaryList.style.display = 'block';
    glossaryEmpty.style.display = 'none';
    glossaryCount.textContent = `Showing ${filtered.length} term${filtered.length !== 1 ? 's' : ''}`;

    Object.keys(grouped).sort().forEach(letter => {
      const section = document.createElement('div');
      section.className = 'glossary-section';
      section.id = `letter-${letter}`;

      const heading = document.createElement('div');
      heading.className = 'glossary-letter-heading';
      heading.textContent = letter;
      section.appendChild(heading);

      grouped[letter].forEach(term => {
        const item = document.createElement('div');
        item.className = 'glossary-item';

        const cat = CATEGORIES[term.category];
        const levelClass = `level-${term.level}`;
        const levelName = LEVELS[term.level]?.name || term.level;

        item.innerHTML = `
          <button class="glossary-item-header" aria-expanded="false">
            <span class="glossary-term-name">${highlightMatch(term.term, searchTerm)}</span>
            <div class="glossary-item-tags">
              <span class="tag cat">${cat ? cat.name : term.category}</span>
              <span class="tag ${levelClass}">${levelName}</span>
              <span class="glossary-expand-icon">▼</span>
            </div>
          </button>
          <div class="glossary-item-body">
            <div class="glossary-item-content">
              <p class="definition-text">${highlightMatch(term.definition, searchTerm)}</p>
              <div class="example-text">
                <strong>Example: </strong>${term.example}
              </div>
            </div>
          </div>
        `;

        // Toggle expand
        const header = item.querySelector('.glossary-item-header');
        header.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');
          item.classList.toggle('open');
          header.setAttribute('aria-expanded', !isOpen);
        });

        section.appendChild(item);
      });

      glossaryList.appendChild(section);
    });
  }

  // --- Highlight search matches ---
  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background: var(--color-warm-light); color: inherit; padding: 1px 2px; border-radius: 2px;">$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --- Event listeners ---
  searchInput.addEventListener('input', renderGlossary);
  categoryFilter.addEventListener('change', renderGlossary);
  levelFilter.addEventListener('change', renderGlossary);

  // --- Init ---
  renderGlossary();
});
