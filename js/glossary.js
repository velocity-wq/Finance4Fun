// ============================================
// FINANCE4FUN — Glossary Search & Filter Engine
// Hardened: safe DOM rendering, sanitized search
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

  // --- Safety check ---
  if (!searchInput || !glossaryList || !glossaryEmpty) {
    console.error('Glossary: Required page elements not found.');
    return;
  }

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
  const usedLetters = new Set(
    FINANCE_TERMS
      .filter(t => t.term && t.term.length > 0)
      .map(t => t.term[0].toUpperCase())
  );

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
          letterNav.querySelectorAll('.letter-btn').forEach(b => b.classList.remove('active'));
          activeLetter = letter;
          btn.classList.add('active');
        }
        renderGlossary();
      });
    }

    letterNav.appendChild(btn);
  });

  // --- Safe text node helper (prevents XSS — never inserts raw HTML) ---
  function createTextEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  }

  // --- Build a glossary item safely using DOM methods ---
  function buildGlossaryItem(term, cat, levelClass, levelName) {
    const item = document.createElement('div');
    item.className = 'glossary-item';

    // Header button
    const header = document.createElement('button');
    header.className = 'glossary-item-header';
    header.setAttribute('aria-expanded', 'false');

    const termName = createTextEl('span', 'glossary-term-name', term.term);

    const tags = document.createElement('div');
    tags.className = 'glossary-item-tags';

    const catTag = createTextEl('span', 'tag cat', cat ? cat.name : term.category);
    const levelTag = createTextEl('span', `tag ${levelClass}`, levelName);
    const expandIcon = createTextEl('span', 'glossary-expand-icon', '▼');

    tags.appendChild(catTag);
    tags.appendChild(levelTag);
    tags.appendChild(expandIcon);

    header.appendChild(termName);
    header.appendChild(tags);

    // Body
    const body = document.createElement('div');
    body.className = 'glossary-item-body';

    const content = document.createElement('div');
    content.className = 'glossary-item-content';

    const defText = createTextEl('p', 'definition-text', term.definition);

    const exampleDiv = document.createElement('div');
    exampleDiv.className = 'example-text';
    const exampleLabel = document.createElement('strong');
    exampleLabel.textContent = 'Example: ';
    exampleDiv.appendChild(exampleLabel);
    exampleDiv.appendChild(document.createTextNode(term.example));

    content.appendChild(defText);
    content.appendChild(exampleDiv);
    body.appendChild(content);

    item.appendChild(header);
    item.appendChild(body);

    // Toggle expand
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      item.classList.toggle('open');
      header.setAttribute('aria-expanded', String(!isOpen));
    });

    return item;
  }

  // --- Render glossary ---
  function renderGlossary() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const level = levelFilter.value;

    // Filter terms
    let filtered = FINANCE_TERMS.filter(term => {
      if (!term.term || !term.definition) return false;
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

    // Clear previous render
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

      const heading = createTextEl('div', 'glossary-letter-heading', letter);
      section.appendChild(heading);

      grouped[letter].forEach(term => {
        const cat = CATEGORIES[term.category];
        const levelClass = `level-${term.level}`;
        const levelName = LEVELS[term.level]?.name || term.level;
        const item = buildGlossaryItem(term, cat, levelClass, levelName);
        section.appendChild(item);
      });

      glossaryList.appendChild(section);
    });
  }

  // --- Debounce search input for performance ---
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderGlossary, 150);
  });

  categoryFilter.addEventListener('change', renderGlossary);
  levelFilter.addEventListener('change', renderGlossary);

  // --- Init ---
  renderGlossary();
});
